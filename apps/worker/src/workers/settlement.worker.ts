import { Worker, Queue, type Job } from "bullmq";
import { prisma } from "@carbonafrika/db";
import { ethers } from "ethers";

/**
 * Escrow settlement state machine.
 *
 *   PENDING ──collect──▶ COLLECTING ──confirmations──▶ COLLECTED
 *                                                          │
 *                                                          ▼
 *                                                      DELIVERED  (auto-release timer starts)
 *                                                          │
 *                                                          ▼
 *                                                       RELEASED  (seller paid)
 *
 *   Side branches:  DISPUTED (admin),  REFUNDED (admin),  FAILED (terminal worker error).
 *
 * Each transition is driven by a named BullMQ job on the "settlement" queue.
 *   - "collect"  : transferFrom(buyer → treasury) and wait N confirmations
 *   - "deliver"  : record delivery (DB-only for now; chain transfer is phase 2)
 *   - "release"  : transfer(treasury → seller) and wait N confirmations
 *   - "refund"   : transfer(treasury → buyer) and wait N confirmations
 *
 * Auto-release is implemented as a delayed "release" job queued at the DELIVERED transition.
 * If the buyer confirms early (or an admin force-releases), we enqueue an immediate "release"
 * job — the delayed one runs later but is idempotent (finds RELEASED, no-ops).
 */

interface SettlementPayload {
  purchaseId: string;
}

const PLATFORM_FEE_BPS    = parseInt(process.env.PLATFORM_FEE_BPS ?? "200");        // 2%
const BLOCK_CONFIRMATIONS = parseInt(process.env.BLOCK_CONFIRMATIONS ?? "3");        // Polygon PoS — 3 is plenty
const AUTO_RELEASE_HOURS  = parseInt(process.env.AUTO_RELEASE_HOURS  ?? "24");

const USDC_ABI = [
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

function isBlockchainConfigured() {
  return !!(
    process.env.DEPLOYER_PRIVATE_KEY &&
    process.env.POLYGON_RPC_URL &&
    process.env.USDC_ADDRESS &&
    process.env.PLATFORM_TREASURY_ADDRESS
  );
}

function getUsdc() {
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
  const signer   = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
  return {
    provider,
    signer,
    usdc: new ethers.Contract(process.env.USDC_ADDRESS!, USDC_ABI, signer),
  };
}

function deterministicSimHash(prefix: string, purchaseId: string) {
  return `0xsim_${prefix}_${Buffer.from(purchaseId).toString("hex").slice(0, 56)}`;
}

async function loadPurchase(purchaseId: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      buyer: { select: { id: true, name: true, email: true, walletAddress: true } },
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
    select: { id: true, name: true, email: true, walletAddress: true },
  });
  if (!seller) throw new Error(`Seller ${ownerId} not found`);
  return seller;
}

/* ── Step 1: COLLECT — pull USDC from buyer into platform treasury ─────────── */
async function runCollect(purchaseId: string, queue: Queue) {
  const purchase = await loadPurchase(purchaseId);

  // Idempotency — skip if we've moved past COLLECTING
  const finalStates = ["COLLECTED", "DELIVERED", "RELEASED", "REFUNDED"];
  if (finalStates.includes(purchase.settlementStatus)) {
    console.log(`[settlement.collect] ${purchaseId} already past COLLECTED (${purchase.settlementStatus}) — skipping`);
    return;
  }

  await prisma.purchase.update({
    where: { id: purchaseId },
    data: { settlementStatus: "COLLECTING", settlementError: null },
  });

  const feeAmount  = purchase.feeAmount  ?? parseFloat((purchase.totalPrice * (PLATFORM_FEE_BPS / 10000)).toFixed(6));
  const buyerTotal = purchase.buyerTotal ?? parseFloat((purchase.totalPrice + feeAmount).toFixed(6));

  let collectTxHash: string;
  let simulated = false;

  if (isBlockchainConfigured() && purchase.buyer.walletAddress) {
    const { usdc } = getUsdc();
    const decimals: number = await usdc.decimals();
    const buyerUnits = ethers.parseUnits(buyerTotal.toFixed(6), decimals);

    // Pre-flight: buyer must have approved treasury for at least buyerTotal
    const allowance: bigint = await usdc.allowance(
      purchase.buyer.walletAddress,
      process.env.PLATFORM_TREASURY_ADDRESS!,
    );
    if (allowance < buyerUnits) {
      throw new Error(
        `Buyer USDC allowance ${ethers.formatUnits(allowance, decimals)} < required ${buyerTotal}. ` +
        `Buyer must approve(treasury, ${buyerTotal}) before settlement.`,
      );
    }

    const tx = await (usdc as ethers.Contract).transferFrom!(
      purchase.buyer.walletAddress,
      process.env.PLATFORM_TREASURY_ADDRESS!,
      buyerUnits,
    );
    const receipt = await tx.wait(BLOCK_CONFIRMATIONS);
    collectTxHash = receipt.hash;
    console.log(`[settlement.collect] ${purchaseId} on-chain: ${collectTxHash} (${BLOCK_CONFIRMATIONS} confs)`);
  } else {
    simulated = true;
    collectTxHash = deterministicSimHash("collect", purchaseId);
    console.warn(`[settlement.collect] ${purchaseId} simulated (chain not configured or no buyer wallet)`);
  }

  await prisma.purchase.update({
    where: { id: purchaseId },
    data: {
      settlementStatus: "COLLECTED",
      collectTxHash,
      collectedAt: new Date(),
    },
  });

  // Hand off to deliver step
  await queue.add("deliver", { purchaseId }, { attempts: 3 });

  return { collectTxHash, simulated };
}

/* ── Step 2: DELIVER — record that the buyer holds the credits ─────────────── */
/*  For now this is a DB-only flip; the listing/credit status was already       */
/*  updated to SOLD inside the purchase-creation transaction. Real on-chain     */
/*  ERC-1155 transfer is a phase-2 add-on.                                       */
async function runDeliver(purchaseId: string, queue: Queue) {
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
      deliveredAt:      new Date(),
      autoReleaseAt,
      deliverTxHash:    deterministicSimHash("deliver", purchaseId),  // DB-only placeholder
    },
  });

  // Notify the buyer their credits are delivered + start the auto-release timer
  if (purchase.buyer.email) {
    await prisma.user.findUnique({ where: { id: purchase.buyer.id }, select: { id: true } });
    // Best-effort — notification queue is hooked separately in marketplace-service / worker
  }

  // Schedule the delayed auto-release. If the buyer confirms first, an
  // immediate release job will run first; this delayed one will then find
  // RELEASED state and no-op.
  await queue.add(
    "release",
    { purchaseId },
    { attempts: 3, delay: AUTO_RELEASE_HOURS * 60 * 60 * 1000 },
  );

  console.log(`[settlement.deliver] ${purchaseId} DELIVERED — auto-release at ${autoReleaseAt.toISOString()}`);
}

/* ── Step 3: RELEASE — pay seller from treasury ────────────────────────────── */
async function runRelease(purchaseId: string) {
  const purchase = await loadPurchase(purchaseId);

  // Idempotency — already released, refunded, disputed, or never collected
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

  // On a resale, the seller is the reselling buyer (listing.sellerUserId), not
  // the project owner. Primary sales fall back to the project owner.
  const isResale = !!purchase.listing.sellerUserId;
  const seller   = await loadSeller(purchase.listing.sellerUserId ?? purchase.listing.credit.project.ownerId);

  // Partner royalty comes out of the seller's share (totalPrice). Locked at
  // attribution time on Project.partnerRoyaltyPercent so existing projects
  // don't change retroactively. Royalty applies to primary sales only — the
  // partner already earned on the first sale; a buyer reselling later doesn't
  // owe them again.
  const project       = purchase.listing.credit.project;
  const royaltyPct    = isResale ? 0 : (project.partnerRoyaltyPercent ?? 0);
  const partnerRoyalty = !isResale && project.partnerId && royaltyPct > 0
    ? parseFloat((purchase.totalPrice * royaltyPct / 100).toFixed(6))
    : 0;
  const sellerNet     = parseFloat((purchase.totalPrice - partnerRoyalty).toFixed(6));

  let txHash: string;
  let simulated = false;

  if (isBlockchainConfigured() && seller.walletAddress) {
    const { usdc } = getUsdc();
    const decimals: number = await usdc.decimals();
    const ownerUnits = ethers.parseUnits(sellerNet.toFixed(6), decimals);

    const tx = await (usdc as ethers.Contract).transfer!(seller.walletAddress, ownerUnits);
    const receipt = await tx.wait(BLOCK_CONFIRMATIONS);
    txHash = receipt.hash;
    console.log(`[settlement.release] ${purchaseId} on-chain payout: ${txHash}`);
  } else {
    simulated = true;
    txHash = deterministicSimHash("pay", purchaseId);
    console.warn(`[settlement.release] ${purchaseId} simulated (chain not configured or seller has no wallet)`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        settlementStatus: "RELEASED",
        txHash,
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
    `[settlement.release] ${purchaseId} RELEASED — $${sellerNet} → ${seller.name}` +
    (partnerRoyalty > 0 ? ` + $${partnerRoyalty} partner royalty` : "") +
    (simulated ? " (simulated)" : ""),
  );

  return { txHash, simulated };
}

/* ── Side branch: REFUND — admin returns funds to buyer ────────────────────── */
async function runRefund(purchaseId: string) {
  const purchase = await loadPurchase(purchaseId);

  if (purchase.settlementStatus === "REFUNDED" || purchase.settlementStatus === "RELEASED") {
    console.log(`[settlement.refund] ${purchaseId} already terminal (${purchase.settlementStatus}) — skipping`);
    return;
  }
  if (!["COLLECTED", "DELIVERED", "DISPUTED"].includes(purchase.settlementStatus)) {
    throw new Error(`Cannot REFUND from ${purchase.settlementStatus} — no funds in treasury yet`);
  }

  const feeAmount  = purchase.feeAmount  ?? 0;
  const buyerTotal = purchase.buyerTotal ?? purchase.totalPrice + feeAmount;

  let refundTxHash: string;
  let simulated = false;

  if (isBlockchainConfigured() && purchase.buyer.walletAddress) {
    const { usdc } = getUsdc();
    const decimals: number = await usdc.decimals();
    const refundUnits = ethers.parseUnits(buyerTotal.toFixed(6), decimals);

    const tx = await (usdc as ethers.Contract).transfer!(purchase.buyer.walletAddress, refundUnits);
    const receipt = await tx.wait(BLOCK_CONFIRMATIONS);
    refundTxHash = receipt.hash;
  } else {
    simulated = true;
    refundTxHash = deterministicSimHash("refund", purchaseId);
  }

  // Restore inventory back to the listing so it can be re-sold
  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        settlementStatus: "REFUNDED",
        refundedAt: new Date(),
        txHash: refundTxHash,
      },
    });

    // Re-open the listing for the refunded tons (best-effort — admin can also adjust)
    await tx.listing.update({
      where: { id: purchase.listingId },
      data: {
        status: "ACTIVE",
        totalTons: { increment: purchase.totalTons },
      },
    });
  });

  console.log(`[settlement.refund] ${purchaseId} REFUNDED $${buyerTotal} to buyer${simulated ? " (simulated)" : ""}`);
}

/* ── Worker boot ───────────────────────────────────────────────────────────── */
export function startSettlementWorker(connection: { url: string }) {
  // Producer queue used by the worker itself to enqueue the next step
  const queue = new Queue("settlement", { connection });
  queue.on("error", (err) => console.warn("[settlement] queue error:", err.message));

  const worker = new Worker<SettlementPayload>(
    "settlement",
    async (job: Job<SettlementPayload>) => {
      const { purchaseId } = job.data;
      const stepName = job.name || "collect";  // legacy jobs without name default to collect
      console.log(`[settlement.${stepName}] processing ${purchaseId}`);

      switch (stepName) {
        case "collect":
        case "settle-purchase":  // back-compat with the existing job name
          return await runCollect(purchaseId, queue);
        case "deliver":
          return await runDeliver(purchaseId, queue);
        case "release":
          return await runRelease(purchaseId);
        case "refund":
          return await runRefund(purchaseId);
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

    // Only flip Purchase to FAILED on the final attempt — transient failures should retry
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
