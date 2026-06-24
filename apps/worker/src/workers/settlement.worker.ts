import { Worker, Queue, type Job } from "bullmq";
import { prisma } from "@carbonafrika/db";

/**
 * Fiat settlement state machine.
 *
 *   PENDING ──collect──▶ COLLECTING  (bank reference generated; buyer instructed to wire)
 *                            │
 *                    [admin confirms payment received]
 *                            │
 *                        COLLECTED ──deliver──▶ DELIVERED  (auto-release timer starts)
 *                                                   │
 *                                               RELEASED  (seller paid out)
 *
 *   Side branches:  DISPUTED (admin),  REFUNDED (admin),  FAILED (terminal worker error).
 *
 * BullMQ jobs on the "settlement" queue:
 *   - "collect"  : generate bank payment reference, flip to COLLECTING (stops here — admin confirms)
 *   - "deliver"  : record delivery (DB-only flip, credits already marked SOLD at purchase creation)
 *   - "release"  : record outbound bank payment reference, flip to RELEASED
 *   - "refund"   : record refund, restore inventory
 *
 * Auto-release is a delayed "release" job queued at the DELIVERED transition.
 */

interface SettlementPayload {
  purchaseId: string;
  bankReference?: string;  // passed by admin on release/refund to record the transfer ref
}

const AUTO_RELEASE_HOURS = parseInt(process.env.AUTO_RELEASE_HOURS ?? "24");

function generateBankReference(purchaseId: string): string {
  const short = purchaseId.slice(0, 8).toUpperCase();
  const ts    = Date.now().toString(36).toUpperCase().slice(-4);
  return `KA-${short}-${ts}`;
}

async function loadPurchase(purchaseId: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      listing: {
        include: {
          credit: {
            include: {
              project: {
                select: {
                  id: true, ownerId: true, title: true,
                  partnerId: true, partnerRoyaltyPercent: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!purchase) throw new Error(`Purchase ${purchaseId} not found`);
  return purchase;
}

async function loadSeller(ownerId: string) {
  const seller = await prisma.user.findUnique({
    where: { id: ownerId },
    select: {
      id: true, name: true, email: true,
      bankAccountName: true, bankName: true, bankAccountNumber: true,
      bankIban: true, bankSwiftBic: true, bankCountry: true,
    },
  });
  if (!seller) throw new Error(`Seller ${ownerId} not found`);
  return seller;
}

/* ── Step 1: COLLECT — generate bank reference, instruct buyer to wire ──────── */
async function runCollect(purchaseId: string) {
  const purchase = await loadPurchase(purchaseId);

  const finalStates = ["COLLECTED", "DELIVERED", "RELEASED", "REFUNDED"];
  if (finalStates.includes(purchase.settlementStatus)) {
    console.log(`[settlement.collect] ${purchaseId} already past COLLECTING (${purchase.settlementStatus}) — skipping`);
    return;
  }

  const bankReference = generateBankReference(purchaseId);

  await prisma.purchase.update({
    where: { id: purchaseId },
    data: {
      settlementStatus: "COLLECTING",
      bankReference,
      settlementError: null,
    },
  });

  console.log(`[settlement.collect] ${purchaseId} COLLECTING — bank ref: ${bankReference}`);
  return { bankReference };
}

/* ── Step 2: DELIVER — admin confirmed payment; record delivery ─────────────── */
async function runDeliver(purchaseId: string, queue: Queue, collectTxHash?: string) {
  const purchase = await loadPurchase(purchaseId);

  if (["DELIVERED", "RELEASED", "REFUNDED"].includes(purchase.settlementStatus)) {
    console.log(`[settlement.deliver] ${purchaseId} already past DELIVERED — skipping`);
    return;
  }
  if (purchase.settlementStatus !== "COLLECTED") {
    throw new Error(`Cannot DELIVER from ${purchase.settlementStatus} — must be COLLECTED first`);
  }

  const autoReleaseAt = new Date(Date.now() + AUTO_RELEASE_HOURS * 60 * 60 * 1000);

  await prisma.purchase.update({
    where: { id: purchaseId },
    data: {
      settlementStatus: "DELIVERED",
      deliveredAt: new Date(),
      autoReleaseAt,
      ...(collectTxHash ? { collectTxHash } : {}),
    },
  });

  await queue.add(
    "release",
    { purchaseId },
    { attempts: 3, delay: AUTO_RELEASE_HOURS * 60 * 60 * 1000 },
  );

  console.log(`[settlement.deliver] ${purchaseId} DELIVERED — auto-release at ${autoReleaseAt.toISOString()}`);
}

/* ── Step 3: RELEASE — admin confirms outbound bank transfer to seller ──────── */
async function runRelease(purchaseId: string, bankReference?: string) {
  const purchase = await loadPurchase(purchaseId);

  if (purchase.settlementStatus === "RELEASED" || purchase.settlementStatus === "REFUNDED") {
    console.log(`[settlement.release] ${purchaseId} already terminal (${purchase.settlementStatus}) — skipping`);
    return;
  }
  if (purchase.settlementStatus === "DISPUTED") {
    console.log(`[settlement.release] ${purchaseId} DISPUTED — admin must resolve before release`);
    return;
  }
  if (purchase.settlementStatus !== "DELIVERED") {
    throw new Error(`Cannot RELEASE from ${purchase.settlementStatus} — must be DELIVERED first`);
  }

  const isResale      = !!purchase.listing.sellerUserId;
  const seller        = await loadSeller(purchase.listing.sellerUserId ?? purchase.listing.credit.project.ownerId);
  const project       = purchase.listing.credit.project;
  const royaltyPct    = isResale ? 0 : (project.partnerRoyaltyPercent ?? 0);
  const partnerRoyalty = !isResale && project.partnerId && royaltyPct > 0
    ? parseFloat((purchase.totalPrice * royaltyPct / 100).toFixed(6))
    : 0;
  const sellerNet = parseFloat((purchase.totalPrice - partnerRoyalty).toFixed(6));

  const payoutRef = bankReference ?? `KA-PAYOUT-${purchaseId.slice(0, 8).toUpperCase()}`;

  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        settlementStatus: "RELEASED",
        txHash: payoutRef,
        releasedAt: new Date(),
      },
    });
    if (project.partnerId && partnerRoyalty > 0) {
      await tx.partnerEarning.create({
        data: {
          partnerId: project.partnerId,
          projectId: project.id,
          purchaseId,
          kind:   "ROYALTY",
          amount: partnerRoyalty,
          note:   `${royaltyPct}% royalty on ${purchase.totalTons}t sale`,
        },
      });
    }
  });

  console.log(
    `[settlement.release] ${purchaseId} RELEASED — ${purchase.currency} ${sellerNet} → ${seller.name}` +
    (partnerRoyalty > 0 ? ` + ${purchase.currency} ${partnerRoyalty} partner royalty` : "") +
    ` (bank ref: ${payoutRef})`,
  );

  return { payoutRef, sellerNet };
}

/* ── Side branch: REFUND — return funds to buyer ───────────────────────────── */
async function runRefund(purchaseId: string, bankReference?: string) {
  const purchase = await loadPurchase(purchaseId);

  if (purchase.settlementStatus === "REFUNDED" || purchase.settlementStatus === "RELEASED") {
    console.log(`[settlement.refund] ${purchaseId} already terminal (${purchase.settlementStatus}) — skipping`);
    return;
  }
  if (!["COLLECTED", "DELIVERED", "DISPUTED"].includes(purchase.settlementStatus)) {
    throw new Error(`Cannot REFUND from ${purchase.settlementStatus} — no funds confirmed yet`);
  }

  const buyerTotal  = purchase.buyerTotal ?? purchase.totalPrice + (purchase.feeAmount ?? 0);
  const refundRef   = bankReference ?? `KA-REFUND-${purchaseId.slice(0, 8).toUpperCase()}`;

  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        settlementStatus: "REFUNDED",
        refundedAt: new Date(),
        txHash: refundRef,
      },
    });

    await tx.listing.update({
      where: { id: purchase.listingId },
      data: {
        status: "ACTIVE",
        totalTons: { increment: purchase.totalTons },
      },
    });
  });

  console.log(`[settlement.refund] ${purchaseId} REFUNDED ${purchase.currency} ${buyerTotal} to buyer (ref: ${refundRef})`);
}

/* ── Worker boot ───────────────────────────────────────────────────────────── */
export function startSettlementWorker(connection: { url: string }) {
  const queue = new Queue("settlement", { connection });
  queue.on("error", (err) => console.warn("[settlement] queue error:", err.message));

  const worker = new Worker<SettlementPayload>(
    "settlement",
    async (job: Job<SettlementPayload>) => {
      const { purchaseId, bankReference } = job.data;
      const stepName = job.name || "collect";
      console.log(`[settlement.${stepName}] processing ${purchaseId}`);

      switch (stepName) {
        case "collect":
        case "settle-purchase":
          return await runCollect(purchaseId);
        case "deliver":
          return await runDeliver(purchaseId, queue, bankReference);
        case "release":
          return await runRelease(purchaseId, bankReference);
        case "refund":
          return await runRefund(purchaseId, bankReference);
        default:
          throw new Error(`Unknown settlement step "${stepName}"`);
      }
    },
    { connection, concurrency: 3, drainDelay: 30000, stalledInterval: 30000 },
  );

  worker.on("failed", async (job, err) => {
    console.error(`[settlement.${job?.name}] ${job?.id} failed:`, err.message);
    if (!job) return;

    await prisma.jobLog.create({
      data: {
        jobId:  job.id!,
        queue:  "settlement",
        status: "failed",
        payload: job.data as never,
        error:  `${job.name}: ${err.message}`,
      },
    }).catch(() => {});

    const maxAttempts = job.opts?.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      await prisma.purchase.update({
        where: { id: (job.data as SettlementPayload).purchaseId },
        data: { settlementStatus: "FAILED", settlementError: `${job.name}: ${err.message}` },
      }).catch(() => {});
    }
  });

  return worker;
}
