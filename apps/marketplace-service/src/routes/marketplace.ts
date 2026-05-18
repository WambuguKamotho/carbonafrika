import { Router } from "express";
import { z } from "zod";
import { prisma } from "@carbonafrika/db";
import { Queue } from "bullmq";
import { authenticate } from "../middleware/authenticate";

const router = Router();
const connection = { url: process.env.REDIS_URL! };
const notificationQueue = new Queue("notification", { connection });
const settlementQueue = new Queue("settlement", { connection });

const createListingSchema = z.object({
  creditId: z.string(),
  pricePerTon: z.number().positive(),
  totalTons: z.number().positive(),
  currency: z.enum(["USDC", "MATIC", "ETH"]).default("USDC"),
});

// Browse all active listings
router.get("/", async (req, res) => {
  const { landType, country, minPrice, maxPrice, page = "1", pageSize = "20" } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (minPrice || maxPrice) {
    where["pricePerTon"] = {
      ...(minPrice && { gte: parseFloat(minPrice) }),
      ...(maxPrice && { lte: parseFloat(maxPrice) }),
    };
  }

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      skip,
      take: parseInt(pageSize),
      orderBy: { createdAt: "desc" },
      include: {
        credit: {
          include: {
            project: {
              select: {
                id: true, title: true, landType: true, country: true, region: true,
                lat: true, lng: true, hectares: true,
                owner: { select: { id: true, name: true } },
                ...(landType && { where: { landType: landType as never } }),
                ...(country && { where: { country } }),
              },
            },
          },
        },
      },
    }),
    prisma.listing.count({ where }),
  ]);

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
            include: {
              owner: { select: { id: true, name: true, country: true, walletAddress: true } },
              verifications: { orderBy: { createdAt: "desc" }, take: 1 },
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

// Purchase credits
router.post("/:id/purchase", authenticate, async (req, res) => {
  const schema = z.object({ tons: z.number().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id },
    include: { credit: { include: { project: { select: { ownerId: true, title: true } } } } },
  });

  if (!listing || listing.status !== "ACTIVE") {
    res.status(404).json({ success: false, error: "Listing not found or not active" });
    return;
  }
  if (parsed.data.tons > listing.totalTons) {
    res.status(400).json({ success: false, error: "Requested tons exceed available amount" });
    return;
  }

  const totalPrice = parsed.data.tons * listing.pricePerTon;

  const purchase = await prisma.$transaction(async (tx) => {
    const p = await tx.purchase.create({
      data: {
        listingId: listing.id,
        buyerId: req.user!.sub,
        totalTons: parsed.data.tons,
        totalPrice,
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

  // Queue settlement + notifications
  await settlementQueue.add("settle-purchase", { purchaseId: purchase.id }, { attempts: 3 });
  await notificationQueue.add("send-notification", {
    userId: listing.credit.project.ownerId,
    type: "email",
    template: "credit_sold",
    data: { projectTitle: listing.credit.project.title, tons: parsed.data.tons, totalPrice, currency: listing.currency },
  });

  res.status(201).json({ success: true, data: purchase });
});

// Retire credits (buyer converts to NFT certificate)
router.post("/purchases/:purchaseId/retire", authenticate, async (req, res) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.purchaseId },
    include: { listing: { include: { credit: { include: { project: { select: { title: true } } } } } } },
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

  // Queue retirement job (worker calls smart contract to burn + mint NFT)
  const retirementQueue = new Queue("retirement", { connection });
  await retirementQueue.add("retire-credits", { purchaseId: purchase.id }, { attempts: 3 });

  res.json({ success: true, message: "Retirement initiated. NFT certificate will be issued shortly." });
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
              project: { select: { id: true, title: true, landType: true, country: true } },
            },
          },
        },
      },
    },
  });

  res.json({ success: true, data: purchases });
});

export default router;
