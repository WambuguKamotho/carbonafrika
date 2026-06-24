import { Router } from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prisma, Prisma } from "@carbonafrika/db";
import { Queue } from "bullmq";
import { redisConnectionOptions } from "@carbonafrika/types";
import { authenticate, requireRole } from "../middleware/authenticate";

const router = Router();

// Defense-in-depth: throttle all mutating requests (purchase, resell, retire,
// listing, dispute). Reads are unthrottled. Keyed per IP.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests — slow down and try again shortly." },
});
router.use((req, res, next) => (req.method === "GET" ? next() : writeLimiter(req, res, next)));

type ProjectTypeRow = { id: string; energyType: string | null; projectType: string };

async function mergeProjectTypeFields(projects: Array<{ id: string; energyType?: string | null; projectType?: string }>) {
  if (projects.length === 0) return;
  const ids = projects.map(p => p.id);
  const rows = await prisma.$queryRaw<ProjectTypeRow[]>`
    SELECT id, "energyType", "projectType" FROM "Project" WHERE id IN (${Prisma.join(ids)})
  `;
  const map = new Map(rows.map(r => [r.id, r]));
  for (const p of projects) {
    const r = map.get(p.id);
    if (r) {
      p.energyType  = r.energyType;
      p.projectType = r.projectType;
    }
  }
}

const connection = redisConnectionOptions("marketplace-service");

let notificationQueue: Queue | null = null;
let settlementQueue: Queue | null = null;

try {
  const nq = new Queue("notification", { connection });
  const sq = new Queue("settlement", { connection });
  nq.on("error", (err) => console.warn("[marketplace] notificationQueue:", err.message));
  sq.on("error", (err) => console.warn("[marketplace] settlementQueue:", err.message));
  notificationQueue = nq;
  settlementQueue = sq;
} catch {
  console.warn("[marketplace] Queue init failed — jobs will be skipped (Redis unavailable)");
}

const createListingSchema = z.object({
  creditId: z.string(),
  pricePerTon: z.number().positive(),
  totalTons: z.number().positive(),
  currency: z.enum(["USD", "KES", "EUR", "GBP"]).default("USD"),
});

// Browse all active listings
router.get("/", async (req, res) => {
  const { landType, energyType, country, minPrice, maxPrice, page = "1", pageSize = "20" } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (minPrice || maxPrice) {
    where["pricePerTon"] = {
      ...(minPrice && { gte: parseFloat(minPrice) }),
      ...(maxPrice && { lte: parseFloat(maxPrice) }),
    };
  }

  // Build project-level filter — applied via credit relation
  const projectFilter: Record<string, unknown> = {};
  if (landType)   projectFilter["landType"]  = landType;
  if (energyType) projectFilter["energyType"] = energyType;
  if (country)    projectFilter["country"]    = country;

  const creditWhere = Object.keys(projectFilter).length > 0
    ? { credit: { project: projectFilter } }
    : {};

  const safeSize = Math.min(parseInt(pageSize) || 20, 100);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const skip = (safePage - 1) * safeSize;
  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where: { ...where, ...creditWhere },
      skip,
      take: safeSize,
      orderBy: { createdAt: "desc" },
      include: {
        credit: {
          include: {
            project: {
              select: {
                id: true, title: true,
                projectType: true, landType: true, energyType: true,
                capacityKw: true, householdsServed: true,
                country: true, region: true,
                lat: true, lng: true, hectares: true,
                mediaUrls: true,
                owner: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.listing.count({ where: { ...where, ...creditWhere } }),
  ]);

  await mergeProjectTypeFields(items.map(i => i.credit.project));

  res.json({
    success: true,
    data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) },
  });
});

// Get single listing
router.get("/:id", async (req, res) => {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
    include: {
      credit: {
        include: {
          project: {
            select: {
              id: true, title: true, description: true,
              projectType: true, landType: true, energyType: true,
              capacityKw: true, householdsServed: true, fuelDisplacedKgY: true,
              country: true, region: true, hectares: true, estimatedTons: true,
              onChainId: true, mediaUrls: true,
              owner: { select: { id: true, name: true, country: true } },
              verifications: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { status: true, carbonTons: true, notes: true, txHash: true },
              },
            },
          },
        },
      },
      purchases: { select: { id: true, totalTons: true, createdAt: true } },
    },
  });

  if (!listing) {
    res.status(404).json({ success: false, error: "Listing not found" });
    return;
  }

  await mergeProjectTypeFields([listing.credit.project]);

  res.json({ success: true, data: listing });
});

// Create listing (credit owner)
router.post("/", authenticate, async (req, res) => {
  const parsed = createListingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const credit = await prisma.carbonCredit.findUnique({
    where: { id: parsed.data.creditId },
    include: { project: { select: { ownerId: true } } },
  });

  if (!credit) {
    res.status(404).json({ success: false, error: "Credit not found" });
    return;
  }
  if (credit.project.ownerId !== req.user!.sub) {
    res.status(403).json({ success: false, error: "Not your credit" });
    return;
  }
  if (credit.status !== "AVAILABLE") {
    res.status(400).json({ success: false, error: "Credit is not available for listing" });
    return;
  }
  if (parsed.data.totalTons > credit.amount) {
    res.status(400).json({ success: false, error: "Listing amount exceeds credit balance" });
    return;
  }

  const [listing] = await prisma.$transaction([
    prisma.listing.create({ data: parsed.data }),
    prisma.carbonCredit.update({ where: { id: parsed.data.creditId }, data: { status: "LISTED" } }),
  ]);

  res.status(201).json({ success: true, data: listing });
});

const PLATFORM_FEE_BPS = parseInt(process.env.PLATFORM_FEE_BPS ?? "200"); // 2% default

// Purchase credits — buyers only. Sellers (LANDOWNER) and platform staff (ADMIN, VERIFIER) must not buy.
// Gates:
//   - Buyer must be KYC verified
//   - Seller must have bank details on file so we can pay them out
router.post("/:id/purchase", authenticate, requireRole("BUYER"), async (req, res) => {
  const schema = z.object({ tons: z.number().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const buyer = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { id: true, kycVerified: true },
  });
  if (!buyer) {
    res.status(401).json({ success: false, error: "Buyer not found" });
    return;
  }
  if (!buyer.kycVerified) {
    res.status(403).json({
      success: false,
      error: "KYC_REQUIRED",
      message: "Complete KYC verification before purchasing carbon credits.",
    });
    return;
  }

  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
    include: {
      credit: {
        include: {
          project: { select: { ownerId: true, title: true, owner: { select: { bankAccountNumber: true } } } },
        },
      },
    },
  });

  if (!listing || listing.status !== "ACTIVE") {
    res.status(404).json({ success: false, error: "Listing not found or not active" });
    return;
  }
  if (parsed.data.tons > listing.totalTons) {
    res.status(400).json({ success: false, error: "Requested tons exceed available amount" });
    return;
  }
  if (!listing.credit.project.owner.bankAccountNumber) {
    res.status(409).json({
      success: false,
      error: "SELLER_PAYOUT_UNAVAILABLE",
      message: "This seller has not configured bank details yet. Try again later or contact support.",
    });
    return;
  }

  const totalPrice = parseFloat((parsed.data.tons * listing.pricePerTon).toFixed(6));
  const feeAmount  = parseFloat((totalPrice * (PLATFORM_FEE_BPS / 10000)).toFixed(6));
  const buyerTotal = parseFloat((totalPrice + feeAmount).toFixed(6));

  const purchase = await prisma.$transaction(async (tx) => {
    const p = await tx.purchase.create({
      data: {
        listingId: listing.id,
        buyerId: req.user!.sub,
        totalTons: parsed.data.tons,
        totalPrice,
        feeAmount,
        buyerTotal,
        currency: listing.currency,
      },
    });

    const remainingTons = listing.totalTons - parsed.data.tons;
    if (remainingTons <= 0) {
      await tx.listing.update({ where: { id: listing.id }, data: { status: "SOLD" } });
      await tx.carbonCredit.update({ where: { id: listing.creditId }, data: { status: "SOLD" } });
    } else {
      await tx.listing.update({ where: { id: listing.id }, data: { totalTons: remainingTons } });
    }

    return p;
  });

  // Start the escrow state machine — worker handles collect → deliver → release
  if (settlementQueue) await settlementQueue.add("collect", { purchaseId: purchase.id }, { attempts: 3 });
  if (notificationQueue) await notificationQueue.add("send-notification", {
    userId: listing.credit.project.ownerId,
    type: "email",
    template: "credit_sold",
    data: { projectTitle: listing.credit.project.title, tons: parsed.data.tons, totalPrice, currency: listing.currency },
  });

  res.status(201).json({ success: true, data: purchase });
});

// Buyer confirms receipt of credits — short-circuits the 24h auto-release timer.
router.post("/purchases/:purchaseId/confirm", authenticate, requireRole("BUYER"), async (req, res) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.purchaseId },
    select: { id: true, buyerId: true, settlementStatus: true },
  });
  if (!purchase) {
    res.status(404).json({ success: false, error: "Purchase not found" });
    return;
  }
  if (purchase.buyerId !== req.user!.sub) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }
  if (purchase.settlementStatus !== "DELIVERED") {
    res.status(400).json({
      success: false,
      error: `Cannot confirm receipt while settlement is ${purchase.settlementStatus}`,
    });
    return;
  }

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { buyerConfirmedAt: new Date() },
  });

  // Queue an immediate release. The delayed auto-release job (also queued at DELIVERED)
  // will still fire later, but it is idempotent — it will find RELEASED and no-op.
  if (settlementQueue) await settlementQueue.add("release", { purchaseId: purchase.id }, { attempts: 3 });

  res.json({ success: true, message: "Receipt confirmed — funds will be released to the seller now." });
});

// Buyer opens a dispute — freezes the auto-release until an admin resolves it.
router.post("/purchases/:purchaseId/dispute", authenticate, requireRole("BUYER"), async (req, res) => {
  const schema = z.object({ reason: z.string().min(5).max(1000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.purchaseId },
    select: { id: true, buyerId: true, settlementStatus: true },
  });
  if (!purchase) {
    res.status(404).json({ success: false, error: "Purchase not found" });
    return;
  }
  if (purchase.buyerId !== req.user!.sub) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }
  if (!["COLLECTED", "DELIVERED"].includes(purchase.settlementStatus)) {
    res.status(400).json({
      success: false,
      error: `Cannot dispute while settlement is ${purchase.settlementStatus}`,
    });
    return;
  }

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: {
      settlementStatus: "DISPUTED",
      disputeOpenedAt: new Date(),
      disputeReason: parsed.data.reason,
    },
  });

  res.json({
    success: true,
    message: "Dispute opened — funds are frozen pending admin review.",
  });
});

// Retire credits (buyer converts to NFT certificate) — only the owning BUYER may retire (ownership re-checked below).
router.post("/purchases/:purchaseId/retire", authenticate, requireRole("BUYER"), async (req, res) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.purchaseId },
    include: {
      listing: {
        include: {
          credit: {
            include: { project: { select: { title: true, createdAt: true } } },
          },
        },
      },
    },
  });

  if (!purchase) {
    res.status(404).json({ success: false, error: "Purchase not found" });
    return;
  }
  if (purchase.buyerId !== req.user!.sub) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }
  if (purchase.retired) {
    res.status(400).json({ success: false, error: "Already retired" });
    return;
  }
  if (purchase.resold) {
    res.status(400).json({ success: false, error: "These credits have been relisted for resale and can no longer be retired." });
    return;
  }
  // Block retirement while a resale request is open — the buyer must cancel it first.
  const openResale = await prisma.resaleRequest.findFirst({
    where: { purchaseId: purchase.id, status: "REQUESTED" },
    select: { id: true },
  });
  if (openResale) {
    res.status(400).json({ success: false, error: "You have a pending resale request on these credits. Cancel it before retiring." });
    return;
  }

  const metaSchema = z.object({
    reason:    z.string().max(100).optional(),
    note:      z.string().max(500).optional(),
    retiredAt: z.string().optional(),
  });
  const meta = metaSchema.safeParse(req.body);
  const retiredAt = meta.success && meta.data.retiredAt
    ? new Date(meta.data.retiredAt)
    : new Date();

  // Phase D: retiredAt cannot be before the project was created, and not more than 1 year in the future
  const projectCreatedAt = purchase.listing.credit.project.createdAt;
  if (retiredAt < projectCreatedAt) {
    res.status(400).json({ success: false, error: `Retirement date cannot be before the project was created (${projectCreatedAt.toISOString().slice(0, 10)})` });
    return;
  }
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  if (retiredAt > oneYearFromNow) {
    res.status(400).json({ success: false, error: "Retirement date cannot be more than 1 year in the future" });
    return;
  }

  // Mark retired immediately so the buyer cannot double-retire while the worker processes
  await prisma.purchase.update({
    where: { id: purchase.id },
    data: {
      retired: true,
      retirementReason: meta.success ? (meta.data.reason ?? null) : null,
      retirementNote:   meta.success ? (meta.data.note   ?? null) : null,
      retiredAt,
    },
  });

  // Queue blockchain job — worker fills in retirementTxHash + nftTokenId when done
  try {
    const retirementQueue = new Queue("retirement", { connection });
    retirementQueue.on("error", () => {});
    await retirementQueue.add("retire-credits", { purchaseId: purchase.id }, { attempts: 3 });
  } catch { /* Redis unavailable — retirement queued on next Redis restart */ }

  res.json({ success: true, message: "Retirement initiated. NFT certificate will be issued shortly." });
});

// ── Buyer resale (secondary market) ──────────────────────────────────────────
// Buyers can't self-list. They file a resale request on a purchase they own;
// an admin reviews and, on approval, relists the credits with the buyer as the
// seller. See ResaleRequest model + admin.ts /resale-requests endpoints.

// Request to resell credits from a settled purchase.
router.post("/purchases/:purchaseId/resell-request", authenticate, requireRole("BUYER"), async (req, res) => {
  const schema = z.object({
    pricePerTon: z.number().positive(),
    note:        z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.purchaseId },
    select: { id: true, buyerId: true, settlementStatus: true, retired: true, resold: true, totalTons: true, currency: true },
  });
  if (!purchase) {
    res.status(404).json({ success: false, error: "Purchase not found" });
    return;
  }
  if (purchase.buyerId !== req.user!.sub) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }
  if (purchase.retired) {
    res.status(400).json({ success: false, error: "Retired credits cannot be resold." });
    return;
  }
  if (purchase.resold) {
    res.status(400).json({ success: false, error: "These credits are already relisted." });
    return;
  }
  // Buyer only truly owns the credits once they've been delivered into escrow.
  if (!["DELIVERED", "RELEASED"].includes(purchase.settlementStatus)) {
    res.status(400).json({
      success: false,
      error: `Credits aren't settled yet (status ${purchase.settlementStatus}). You can resell once they're delivered.`,
    });
    return;
  }
  const existing = await prisma.resaleRequest.findFirst({
    where: { purchaseId: purchase.id, status: "REQUESTED" },
    select: { id: true },
  });
  if (existing) {
    res.status(400).json({ success: false, error: "You already have a pending resale request on these credits." });
    return;
  }

  const request = await prisma.resaleRequest.create({
    data: {
      purchaseId:          purchase.id,
      buyerId:             req.user!.sub,
      tons:                purchase.totalTons,
      proposedPricePerTon: parsed.data.pricePerTon,
      currency:            purchase.currency,
      buyerNote:           parsed.data.note,
    },
  });

  if (notificationQueue) await notificationQueue.add("send-notification", {
    type: "admin_alert",
    template: "resale_requested",
    data: { resaleRequestId: request.id, tons: purchase.totalTons, pricePerTon: parsed.data.pricePerTon },
  }).catch(() => {});

  res.status(201).json({ success: true, data: request });
});

// My resale requests
router.get("/me/resale-requests", authenticate, requireRole("BUYER"), async (req, res) => {
  const requests = await prisma.resaleRequest.findMany({
    where: { buyerId: req.user!.sub },
    orderBy: { createdAt: "desc" },
  });
  res.json({ success: true, data: requests });
});

// Cancel a still-pending resale request
router.post("/resale-requests/:id/cancel", authenticate, requireRole("BUYER"), async (req, res) => {
  const request = await prisma.resaleRequest.findUnique({
    where: { id: req.params.id },
    select: { id: true, buyerId: true, status: true },
  });
  if (!request) {
    res.status(404).json({ success: false, error: "Resale request not found" });
    return;
  }
  if (request.buyerId !== req.user!.sub) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }
  if (request.status !== "REQUESTED") {
    res.status(400).json({ success: false, error: `Cannot cancel a ${request.status} request` });
    return;
  }

  await prisma.resaleRequest.update({
    where: { id: request.id },
    data: { status: "CANCELLED" },
  });
  res.json({ success: true });
});

// My purchases
router.get("/me/purchases", authenticate, async (req, res) => {
  const purchases = await prisma.purchase.findMany({
    where: { buyerId: req.user!.sub },
    orderBy: { createdAt: "desc" },
    include: {
      listing: {
        include: {
          credit: {
            include: {
              project: { select: { id: true, title: true, landType: true, energyType: true, country: true, mediaUrls: true } },
            },
          },
        },
      },
      resaleRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, proposedPricePerTon: true, approvedPricePerTon: true, rejectionReason: true, listingId: true, createdAt: true },
      },
    },
  });

  const projectsFromPurchases = purchases.map(p => p.listing.credit.project);
  await mergeProjectTypeFields(projectsFromPurchases);

  res.json({ success: true, data: purchases });
});

export default router;
