import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { Queue } from "bullmq";
import { prisma } from "@carbonafrika/db";
import { redisConnectionOptions } from "@carbonafrika/types";
import { authenticate, requireRole } from "../middleware/authenticate";
import { writeAudit } from "../lib/audit";
import ExcelJS from "exceljs";

const router = Router();

// Throttle admin mutations (defense-in-depth against a leaked admin token).
const adminWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many actions — slow down." },
});
const limitWrites = (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) =>
  req.method === "GET" ? next() : adminWriteLimiter(req, res, next);

// VIEWER role gets read-only access to the entire admin surface — useful for
// investors, press, auditors. The middleware below permits VIEWER on GETs and
// rejects any other HTTP method.
function denyViewerMutations(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  if (req.user?.role === "VIEWER" && req.method !== "GET") {
    res.status(403).json({ success: false, error: "Read-only role cannot perform this action" });
    return;
  }
  next();
}

router.use(authenticate, requireRole("ADMIN", "VIEWER"), denyViewerMutations, limitWrites);

// One-time invite tokens are 32 url-safe bytes — long enough to be unguessable.
function generateInviteToken() {
  return crypto.randomBytes(32).toString("base64url");
}
const INVITE_EXPIRY_DAYS = 7;

// Settlement queue producer — used by admin to nudge the state machine.
// Safe to no-op if Redis is unavailable; routes still respond, the worker can be
// kicked manually when Redis comes back.
let settlementQueue:   Queue | null = null;
let notificationQueue: Queue | null = null;
try {
  const connection = redisConnectionOptions("auth-service.admin");
  const sq = new Queue("settlement",   { connection });
  const nq = new Queue("notification", { connection });
  sq.on("error", (err) => console.warn("[admin] settlementQueue:",   err.message));
  nq.on("error", (err) => console.warn("[admin] notificationQueue:", err.message));
  settlementQueue   = sq;
  notificationQueue = nq;
} catch {
  console.warn("[admin] queue init failed — Redis unavailable");
}

const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://kabon.africa";

// Community-partner programme rates. Tuned for path A; tweak via env if needed.
const DEFAULT_PARTNER_ROYALTY_PERCENT  = parseFloat(process.env.PARTNER_ROYALTY_PERCENT  ?? "3");      // % of seller's share per credit sale
const PARTNER_ONBOARDING_USDC          = parseFloat(process.env.PARTNER_ONBOARDING_USDC  ?? "30");
const PARTNER_VERIFICATION_USDC        = parseFloat(process.env.PARTNER_VERIFICATION_USDC ?? "200");

// List all users
router.get("/users", async (req, res) => {
  const { role, page = "1", pageSize = "25", search } = req.query as Record<string, string>;

  const where = {
    ...(role && { role: role as never }),
    ...(search && {
      OR: [
        { name:  { contains: search, mode: "insensitive" as never } },
        { email: { contains: search, mode: "insensitive" as never } },
      ],
    }),
  };

  const safeSize = Math.min(parseInt(pageSize) || 25, 100);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const skip = (safePage - 1) * safeSize;
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: safeSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true,
        country: true, kycVerified: true, createdAt: true,
        walletAddress: true, verifierScopes: true,
        _count: { select: { projects: true, purchases: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ success: true, data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

// Update user role or KYC
router.patch("/users/:id", async (req, res) => {
  const schema = z.object({
    // Full role set — admin can promote any user to any role here. Use with care:
    // setting role=ADMIN gives full platform privileges, VIEWER gives read-only
    // admin access.
    role:        z.enum(["LANDOWNER", "BUYER", "VERIFIER", "ADMIN", "COMMUNITY_PARTNER", "VIEWER"]).optional(),
    kycVerified: z.boolean().optional(),
    // Sectors a verifier may assess. Empty array = all sectors.
    verifierScopes: z.array(z.enum(["LAND_RESTORATION", "CLEAN_ENERGY"])).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: parsed.data,
    select: { id: true, name: true, email: true, role: true, kycVerified: true },
  });

  writeAudit(req, {
    action: parsed.data.role ? "user.role_change" : "user.kyc_change",
    targetType: "User", targetId: user.id,
    summary: `${user.name}: ${parsed.data.role ? `role → ${parsed.data.role}` : `KYC ${parsed.data.kycVerified ? "verified" : "revoked"}`}`,
    metadata: parsed.data,
  });

  res.json({ success: true, data: user });
});

// Single purchase — full details (admin only)
// Export all purchases as CSV or Excel — must be before /purchases/:id to avoid route collision
router.get("/purchases/export", async (req, res) => {
  const format = (req.query.format as string) === "xlsx" ? "xlsx" : "csv";
  const { retired, search, status } = req.query as Record<string, string>;

  const where = {
    ...(retired === "true"  && { retired: true }),
    ...(retired === "false" && { retired: false }),
    ...(status  && { settlementStatus: status as never }),
    ...(search  && {
      OR: [
        { buyer:   { name:  { contains: search, mode: "insensitive" as never } } },
        { buyer:   { email: { contains: search, mode: "insensitive" as never } } },
        { listing: { credit: { project: { title: { contains: search, mode: "insensitive" as never } } } } },
      ],
    }),
  };

  const rows = await prisma.purchase.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10000,
    select: {
      id: true,
      bankReference: true,
      totalTons: true,
      totalPrice: true,
      feeAmount: true,
      buyerTotal: true,
      currency: true,
      settlementStatus: true,
      collectTxHash: true,
      txHash: true,
      createdAt: true,
      collectedAt: true,
      deliveredAt: true,
      releasedAt: true,
      refundedAt: true,
      retired: true,
      retiredAt: true,
      disputeReason: true,
      buyer: { select: { name: true, email: true, country: true } },
      listing: {
        select: {
          pricePerTon: true,
          credit: {
            select: {
              project: {
                select: {
                  title: true,
                  country: true,
                  owner: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const HEADERS = [
    "Purchase ID", "Bank Reference", "Status",
    "Buyer Name", "Buyer Email", "Buyer Country",
    "Project", "Project Country", "Seller Name", "Seller Email",
    "Tonnes", "Price/t", "Subtotal", "Fee", "Buyer Total", "Currency",
    "Inbound Ref", "Outbound Ref",
    "Created At", "Collected At", "Delivered At", "Released At", "Refunded At",
    "Retired", "Retired At",
    "Dispute Reason",
  ];

  function toRow(p: (typeof rows)[number]): (string | number | boolean | null)[] {
    const proj = p.listing.credit.project;
    return [
      p.id,
      p.bankReference ?? "",
      p.settlementStatus,
      p.buyer.name,
      p.buyer.email ?? "",
      p.buyer.country ?? "",
      proj.title,
      proj.country ?? "",
      proj.owner.name,
      proj.owner.email ?? "",
      p.totalTons,
      p.listing.pricePerTon,
      p.totalPrice,
      p.feeAmount ?? "",
      p.buyerTotal ?? "",
      p.currency,
      p.collectTxHash ?? "",
      p.txHash ?? "",
      p.createdAt.toISOString(),
      p.collectedAt?.toISOString() ?? "",
      p.deliveredAt?.toISOString() ?? "",
      p.releasedAt?.toISOString() ?? "",
      p.refundedAt?.toISOString() ?? "",
      p.retired ? "Yes" : "No",
      p.retiredAt?.toISOString() ?? "",
      p.disputeReason ?? "",
    ];
  }

  const filename = `purchases-${new Date().toISOString().slice(0, 10)}`;

  if (format === "csv") {
    const escape = (v: string | number | boolean | null) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const lines = [
      HEADERS.map(escape).join(","),
      ...rows.map(r => toRow(r).map(escape).join(",")),
    ].join("\r\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    res.send(lines);
    return;
  }

  // xlsx
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kabon.Africa";
  const ws = wb.addWorksheet("Purchases");

  ws.columns = HEADERS.map((h, i) => ({
    header: h,
    key: String(i),
    width: [36, 20, 14, 20, 26, 14, 30, 16, 20, 26, 10, 10, 12, 10, 12, 10, 24, 24, 22, 22, 22, 22, 22, 8, 22, 30][i] ?? 16,
  }));

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A3C2B" } };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  rows.forEach(r => ws.addRow(toRow(r)));

  ws.autoFilter = { from: "A1", to: `${String.fromCharCode(65 + HEADERS.length - 1)}1` };

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

router.get("/purchases/:id", async (req, res) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.id },
    include: {
      buyer: {
        select: {
          id: true, name: true, email: true, country: true, role: true,
          walletAddress: true, kycVerified: true, createdAt: true,
        },
      },
      listing: {
        include: {
          credit: {
            include: {
              project: {
                select: {
                  id: true, title: true, country: true, projectType: true,
                  energyType: true, landType: true, mediaUrls: true,
                  owner: { select: { id: true, name: true, email: true, country: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!purchase) {
    res.status(404).json({ success: false, error: "Purchase not found" });
    return;
  }

  res.json({ success: true, data: purchase });
});

// List all purchases — admin view with filtering
router.get("/purchases", async (req, res) => {
  const { page = "1", pageSize = "25", retired, search } = req.query as Record<string, string>;
  const safeSize = Math.min(parseInt(pageSize) || 25, 100);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const skip = (safePage - 1) * safeSize;

  const where = {
    ...(retired === "true"  && { retired: true }),
    ...(retired === "false" && { retired: false }),
    ...(search && {
      OR: [
        { buyer:   { name:  { contains: search, mode: "insensitive" as never } } },
        { buyer:   { email: { contains: search, mode: "insensitive" as never } } },
        { listing: { credit: { project: { title: { contains: search, mode: "insensitive" as never } } } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      skip,
      take: safeSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, totalTons: true, totalPrice: true, currency: true,
        retired: true, retiredAt: true, createdAt: true,
        settlementStatus: true,
        buyer: { select: { id: true, name: true, email: true } },
        listing: {
          select: {
            credit: {
              select: {
                project: { select: { id: true, title: true, country: true } },
              },
            },
          },
        },
      },
    }),
    prisma.purchase.count({ where }),
  ]);

  res.json({ success: true, data: { items, total, page: safePage, pageSize: safeSize } });
});

// Platform stats
router.get("/stats", async (_req, res) => {
  const [
    totalUsers, totalProjects, activeProjects, verifiedProjects,
    pendingVerifications, inProgressVerifications,
    totalCredits, totalPurchases, retiredCredits, purchaseRevenue,
    projectsByStatus, usersByRole,
    recentVerifications, recentUsers, recentPurchases,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.project.count({ where: { status: "VERIFIED" } }),
    prisma.verification.count({ where: { status: "PENDING" } }),
    prisma.verification.count({ where: { status: "IN_PROGRESS" } }),
    prisma.carbonCredit.aggregate({ _sum: { amount: true } }),
    prisma.purchase.count(),
    prisma.purchase.count({ where: { retired: true } }),
    prisma.purchase.aggregate({ _sum: { totalPrice: true } }),
    prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.verification.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, status: true, createdAt: true,
        project: { select: { id: true, title: true, country: true } },
        verifier: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, country: true, createdAt: true },
    }),
    prisma.purchase.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, totalTons: true, totalPrice: true, currency: true, retired: true, createdAt: true,
        buyer: { select: { name: true } },
        listing: { select: { credit: { select: { project: { select: { title: true, country: true } } } } } },
      },
    }),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalProjects,
      activeProjects,
      verifiedProjects,
      pendingVerifications,
      inProgressVerifications,
      totalCreditsIssued: totalCredits._sum.amount ?? 0,
      totalPurchases,
      retiredCredits,
      totalRevenue: purchaseRevenue._sum.totalPrice ?? 0,
      projectsByStatus: Object.fromEntries(projectsByStatus.map(r => [r.status, r._count._all])),
      usersByRole:      Object.fromEntries(usersByRole.map(r => [r.role, r._count._all])),
      recentVerifications,
      recentUsers,
      recentPurchases,
    },
  });
});

// ── Settlement actions ───────────────────────────────────────────────────────
// Admin endpoints that drive the fiat settlement state machine.

// Confirm payment received: admin confirms the buyer's inbound bank transfer.
// Moves COLLECTING → COLLECTED → triggers deliver job.
router.post("/purchases/:id/confirm-payment", async (req, res) => {
  const schema = z.object({ bankReference: z.string().min(1).max(100).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.id },
    select: { id: true, settlementStatus: true },
  });
  if (!purchase) {
    res.status(404).json({ success: false, error: "Purchase not found" });
    return;
  }
  if (purchase.settlementStatus !== "COLLECTING") {
    res.status(400).json({
      success: false,
      error: `Cannot confirm payment from ${purchase.settlementStatus} — must be COLLECTING`,
    });
    return;
  }

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: {
      settlementStatus: "COLLECTED",
      collectedAt: new Date(),
      ...(parsed.data.bankReference ? { collectTxHash: parsed.data.bankReference } : {}),
    },
  });

  if (settlementQueue) {
    await settlementQueue.add(
      "deliver",
      { purchaseId: purchase.id, bankReference: parsed.data.bankReference },
      { attempts: 3 },
    );
  }

  writeAudit(req, {
    action: "purchase.confirm_payment",
    targetType: "Purchase",
    targetId: purchase.id,
    summary: `Confirmed inbound bank transfer${parsed.data.bankReference ? ` (ref: ${parsed.data.bankReference})` : ""}`,
  });
  res.json({ success: true, message: "Payment confirmed. Credits will be delivered to buyer." });
});

// Release: admin confirms outbound bank transfer has been sent to seller.
router.post("/purchases/:id/release", async (req, res) => {
  const schema = z.object({ bankReference: z.string().min(1).max(100).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.id },
    select: { id: true, settlementStatus: true },
  });
  if (!purchase) {
    res.status(404).json({ success: false, error: "Purchase not found" });
    return;
  }
  if (!["DELIVERED", "DISPUTED", "COLLECTED"].includes(purchase.settlementStatus)) {
    res.status(400).json({
      success: false,
      error: `Cannot release from ${purchase.settlementStatus}`,
    });
    return;
  }

  if (purchase.settlementStatus === "DISPUTED" || purchase.settlementStatus === "COLLECTED") {
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { settlementStatus: "DELIVERED", deliveredAt: new Date(), autoReleaseAt: new Date() },
    });
  }

  if (settlementQueue) {
    await settlementQueue.add(
      "release",
      { purchaseId: purchase.id, bankReference: parsed.data.bankReference },
      { attempts: 3 },
    );
  }
  writeAudit(req, {
    action: "purchase.release",
    targetType: "Purchase",
    targetId: purchase.id,
    summary: `Released payment to seller${parsed.data.bankReference ? ` (ref: ${parsed.data.bankReference})` : ""}`,
  });
  res.json({ success: true, message: "Release queued. Seller will be paid shortly." });
});

// Refund: send buyer their money back, restore inventory.
router.post("/purchases/:id/refund", async (req, res) => {
  const schema = z.object({ reason: z.string().min(5).max(1000).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.id },
    select: { id: true, settlementStatus: true, disputeReason: true },
  });
  if (!purchase) {
    res.status(404).json({ success: false, error: "Purchase not found" });
    return;
  }
  if (!["COLLECTED", "DELIVERED", "DISPUTED"].includes(purchase.settlementStatus)) {
    res.status(400).json({
      success: false,
      error: `Cannot refund from ${purchase.settlementStatus}`,
    });
    return;
  }

  // Stamp the dispute reason for the audit trail if admin supplied one
  if (parsed.data.reason) {
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: {
        disputeReason: purchase.disputeReason
          ? `${purchase.disputeReason}\n\n[admin]: ${parsed.data.reason}`
          : `[admin]: ${parsed.data.reason}`,
      },
    });
  }

  if (settlementQueue) await settlementQueue.add("refund", { purchaseId: purchase.id }, { attempts: 3 });
  writeAudit(req, { action: "purchase.refund", targetType: "Purchase", targetId: purchase.id, summary: "Refunded buyer", metadata: { reason: parsed.data.reason } });
  res.json({ success: true, message: "Refund queued. Buyer will be reimbursed shortly." });
});

// Mark a purchase DISPUTED for admin review (used when an admin notices a
// problem the buyer hasn't reported themselves).
router.post("/purchases/:id/dispute", async (req, res) => {
  const schema = z.object({ reason: z.string().min(5).max(1000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.id },
    select: { id: true, settlementStatus: true },
  });
  if (!purchase) {
    res.status(404).json({ success: false, error: "Purchase not found" });
    return;
  }
  if (!["COLLECTED", "DELIVERED"].includes(purchase.settlementStatus)) {
    res.status(400).json({
      success: false,
      error: `Cannot dispute from ${purchase.settlementStatus}`,
    });
    return;
  }

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: {
      settlementStatus: "DISPUTED",
      disputeOpenedAt: new Date(),
      disputeReason: `[admin]: ${parsed.data.reason}`,
    },
  });

  writeAudit(req, { action: "purchase.dispute", targetType: "Purchase", targetId: purchase.id, summary: "Marked disputed", metadata: { reason: parsed.data.reason } });
  res.json({ success: true, message: "Purchase marked DISPUTED — auto-release paused." });
});

// ── Buyer inquiries ─────────────────────────────────────────────────────────
// Every prospective buyer hits POST /auth/inquiry (public). Rows land here
// for admin to triage. Approve = create User + magic-link email. Reject =
// status update with reason.

router.get("/inquiries", async (req, res) => {
  const { status, page = "1", pageSize = "25", search } = req.query as Record<string, string>;
  const safeSize = Math.min(parseInt(pageSize) || 25, 100);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const skip = (safePage - 1) * safeSize;

  const where = {
    ...(status && status !== "ALL" && { status: status as never }),
    ...(search && {
      OR: [
        { companyName: { contains: search, mode: "insensitive" as never } },
        { contactName: { contains: search, mode: "insensitive" as never } },
        { email:       { contains: search, mode: "insensitive" as never } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.buyerInquiry.findMany({
      where, skip, take: safeSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.buyerInquiry.count({ where }),
  ]);

  res.json({ success: true, data: { items, total, page: safePage, pageSize: safeSize } });
});

router.get("/inquiries/:id", async (req, res) => {
  const inquiry = await prisma.buyerInquiry.findUnique({ where: { id: req.params.id } });
  if (!inquiry) {
    res.status(404).json({ success: false, error: "Inquiry not found" });
    return;
  }
  res.json({ success: true, data: inquiry });
});

router.post("/inquiries/:id/approve", async (req, res) => {
  const inquiry = await prisma.buyerInquiry.findUnique({ where: { id: req.params.id } });
  if (!inquiry) {
    res.status(404).json({ success: false, error: "Inquiry not found" });
    return;
  }
  if (inquiry.status !== "PENDING") {
    res.status(400).json({ success: false, error: `Cannot approve a ${inquiry.status} inquiry` });
    return;
  }

  // If a user with this email already exists, link the inquiry to them rather
  // than creating a duplicate.
  const existing = await prisma.user.findUnique({ where: { email: inquiry.email } });
  const token   = generateInviteToken();
  const expires = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data:  {
          role: "BUYER",
          kycVerified: true,
          inviteToken: token,
          inviteTokenExpiry: expires,
          country: inquiry.country ?? existing.country,
        },
      })
    : await prisma.user.create({
        data: {
          name:        inquiry.contactName,
          email:       inquiry.email,
          role:        "BUYER",
          kycVerified: true,   // approval IS the KYC step in this flow
          country:     inquiry.country,
          phone:       inquiry.phone,
          inviteToken:       token,
          inviteTokenExpiry: expires,
        },
      });

  await prisma.buyerInquiry.update({
    where: { id: inquiry.id },
    data:  {
      status: "APPROVED",
      reviewedById: req.user!.sub,
      reviewedAt: new Date(),
      createdUserId: user.id,
    },
  });

  const inviteUrl = `${PUBLIC_APP_URL}/redeem-invite?token=${token}`;

  writeAudit(req, { action: "inquiry.approve", targetType: "BuyerInquiry", targetId: inquiry.id, summary: `Approved buyer ${inquiry.companyName} → created user ${user.id}` });

  // Email best-effort — admin gets the URL back either way so they can copy it manually
  // (useful in dev where Redis or the email provider may be down).
  if (notificationQueue) {
    await notificationQueue.add("send-notification", {
      userId: user.id,
      type:   "email",
      template: "buyer_invite",
      data: {
        contactName: inquiry.contactName,
        companyName: inquiry.companyName,
        inviteUrl,
        expiresAt: expires.toISOString(),
      },
    }, { attempts: 3 }).catch(() => {});
  }

  res.json({
    success: true,
    data: {
      inquiryId:    inquiry.id,
      userId:       user.id,
      inviteToken:  token,
      inviteUrl,
      inviteExpiry: expires.toISOString(),
    },
  });
});

router.post("/inquiries/:id/reject", async (req, res) => {
  const schema = z.object({ reason: z.string().min(5).max(2000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const inquiry = await prisma.buyerInquiry.findUnique({ where: { id: req.params.id } });
  if (!inquiry) {
    res.status(404).json({ success: false, error: "Inquiry not found" });
    return;
  }
  if (inquiry.status !== "PENDING") {
    res.status(400).json({ success: false, error: `Cannot reject a ${inquiry.status} inquiry` });
    return;
  }

  await prisma.buyerInquiry.update({
    where: { id: inquiry.id },
    data: {
      status: "REJECTED",
      reviewedById: req.user!.sub,
      reviewedAt: new Date(),
      rejectionReason: parsed.data.reason,
    },
  });

  writeAudit(req, { action: "inquiry.reject", targetType: "BuyerInquiry", targetId: inquiry.id, summary: `Rejected buyer ${inquiry.companyName}`, metadata: { reason: parsed.data.reason } });
  res.json({ success: true });
});

// ── Community-partner applications ──────────────────────────────────────────
// Mirrors the buyer-inquiry queue. Approve creates a User with role
// COMMUNITY_PARTNER and emails them an invite link to set their password.

router.get("/partner-applications", async (req, res) => {
  const { status, page = "1", pageSize = "25", search } = req.query as Record<string, string>;
  const safeSize = Math.min(parseInt(pageSize) || 25, 100);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const skip = (safePage - 1) * safeSize;

  const where = {
    ...(status && status !== "ALL" && { status: status as never }),
    ...(search && {
      OR: [
        { fullName:     { contains: search, mode: "insensitive" as never } },
        { email:        { contains: search, mode: "insensitive" as never } },
        { organization: { contains: search, mode: "insensitive" as never } },
        { country:      { contains: search, mode: "insensitive" as never } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.partnerApplication.findMany({
      where, skip, take: safeSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.partnerApplication.count({ where }),
  ]);

  res.json({ success: true, data: { items, total, page: safePage, pageSize: safeSize } });
});

router.get("/partner-applications/:id", async (req, res) => {
  const application = await prisma.partnerApplication.findUnique({ where: { id: req.params.id } });
  if (!application) {
    res.status(404).json({ success: false, error: "Application not found" });
    return;
  }
  res.json({ success: true, data: application });
});

router.post("/partner-applications/:id/approve", async (req, res) => {
  const application = await prisma.partnerApplication.findUnique({ where: { id: req.params.id } });
  if (!application) {
    res.status(404).json({ success: false, error: "Application not found" });
    return;
  }
  if (application.status !== "PENDING") {
    res.status(400).json({ success: false, error: `Cannot approve a ${application.status} application` });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: application.email } });
  const token   = generateInviteToken();
  const expires = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data:  {
          role: "COMMUNITY_PARTNER",
          kycVerified: true,
          inviteToken: token,
          inviteTokenExpiry: expires,
          country: application.country ?? existing.country,
        },
      })
    : await prisma.user.create({
        data: {
          name:        application.fullName,
          email:       application.email,
          role:        "COMMUNITY_PARTNER",
          kycVerified: true,
          country:     application.country,
          phone:       application.phone,
          inviteToken:       token,
          inviteTokenExpiry: expires,
        },
      });

  await prisma.partnerApplication.update({
    where: { id: application.id },
    data:  {
      status: "APPROVED",
      reviewedById: req.user!.sub,
      reviewedAt:   new Date(),
      createdUserId: user.id,
    },
  });

  const inviteUrl = `${PUBLIC_APP_URL}/redeem-invite?token=${token}`;

  writeAudit(req, { action: "partner.approve", targetType: "PartnerApplication", targetId: application.id, summary: `Approved partner ${application.fullName} → created user ${user.id}` });

  if (notificationQueue) {
    await notificationQueue.add("send-notification", {
      userId: user.id,
      type:   "email",
      template: "partner_invite",
      data: {
        partnerName: application.fullName,
        organization: application.organization ?? "your community",
        inviteUrl,
        expiresAt: expires.toISOString(),
      },
    }, { attempts: 3 }).catch(() => {});
  }

  res.json({
    success: true,
    data: {
      applicationId: application.id,
      userId:        user.id,
      inviteToken:   token,
      inviteUrl,
      inviteExpiry:  expires.toISOString(),
    },
  });
});

router.post("/partner-applications/:id/reject", async (req, res) => {
  const schema = z.object({ reason: z.string().min(5).max(2000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const application = await prisma.partnerApplication.findUnique({ where: { id: req.params.id } });
  if (!application) {
    res.status(404).json({ success: false, error: "Application not found" });
    return;
  }
  if (application.status !== "PENDING") {
    res.status(400).json({ success: false, error: `Cannot reject a ${application.status} application` });
    return;
  }

  await prisma.partnerApplication.update({
    where: { id: application.id },
    data: {
      status: "REJECTED",
      reviewedById: req.user!.sub,
      reviewedAt:   new Date(),
      rejectionReason: parsed.data.reason,
    },
  });

  writeAudit(req, { action: "partner.reject", targetType: "PartnerApplication", targetId: application.id, summary: `Rejected partner ${application.fullName}`, metadata: { reason: parsed.data.reason } });
  res.json({ success: true });
});

// ── Resale requests (secondary market) ──────────────────────────────────────
// Buyers file resale requests via marketplace-service. Admin reviews here:
// approve = relist the credits with the buyer as seller; reject = decline with
// reason. Mirrors the inquiry / partner-application queues.

router.get("/resale-requests", async (req, res) => {
  const { status, page = "1", pageSize = "25", search } = req.query as Record<string, string>;
  const safeSize = Math.min(parseInt(pageSize) || 25, 100);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const skip = (safePage - 1) * safeSize;

  const where = {
    ...(status && status !== "ALL" && { status: status as never }),
    ...(search && {
      OR: [
        { buyer:    { name:  { contains: search, mode: "insensitive" as never } } },
        { buyer:    { email: { contains: search, mode: "insensitive" as never } } },
        { purchase: { listing: { credit: { project: { title: { contains: search, mode: "insensitive" as never } } } } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.resaleRequest.findMany({
      where, skip, take: safeSize,
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { id: true, name: true, email: true, walletAddress: true } },
        purchase: {
          select: {
            id: true, totalTons: true, totalPrice: true, currency: true,
            settlementStatus: true, retired: true, resold: true,
            listing: { select: { credit: { select: { project: { select: { id: true, title: true, country: true } } } } } },
          },
        },
      },
    }),
    prisma.resaleRequest.count({ where }),
  ]);

  res.json({ success: true, data: { items, total, page: safePage, pageSize: safeSize } });
});

router.get("/resale-requests/:id", async (req, res) => {
  const request = await prisma.resaleRequest.findUnique({
    where: { id: req.params.id },
    include: {
      buyer: { select: { id: true, name: true, email: true, country: true, walletAddress: true, kycVerified: true } },
      purchase: {
        select: {
          id: true, totalTons: true, totalPrice: true, buyerTotal: true, currency: true,
          settlementStatus: true, retired: true, resold: true, createdAt: true,
          listing: {
            select: {
              pricePerTon: true,
              credit: { select: { vintageYear: true, project: { select: { id: true, title: true, country: true } } } },
            },
          },
        },
      },
    },
  });
  if (!request) {
    res.status(404).json({ success: false, error: "Resale request not found" });
    return;
  }
  res.json({ success: true, data: request });
});

router.post("/resale-requests/:id/approve", async (req, res) => {
  const schema = z.object({
    pricePerTon: z.number().positive().optional(),   // admin override; defaults to the buyer's proposed price
    note:        z.string().max(1000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const request = await prisma.resaleRequest.findUnique({
    where: { id: req.params.id },
    include: {
      purchase: {
        select: {
          id: true, retired: true, resold: true, settlementStatus: true,
          listing: { select: { creditId: true } },
        },
      },
    },
  });
  if (!request) {
    res.status(404).json({ success: false, error: "Resale request not found" });
    return;
  }
  if (request.status !== "REQUESTED") {
    res.status(400).json({ success: false, error: `Cannot approve a ${request.status} request` });
    return;
  }
  if (request.purchase.retired) {
    res.status(400).json({ success: false, error: "Underlying purchase has been retired — cannot relist." });
    return;
  }
  if (request.purchase.resold) {
    res.status(400).json({ success: false, error: "Underlying purchase is already relisted." });
    return;
  }

  const pricePerTon = parsed.data.pricePerTon ?? request.proposedPricePerTon;
  const creditId    = request.purchase.listing.creditId;

  const listing = await prisma.$transaction(async (tx) => {
    const newListing = await tx.listing.create({
      data: {
        creditId,
        pricePerTon,
        totalTons:          request.tons,
        currency:           request.currency,
        status:             "ACTIVE",
        isResale:           true,
        sellerUserId:       request.buyerId,
        resaleOfPurchaseId: request.purchaseId,
      },
    });
    await tx.purchase.update({
      where: { id: request.purchaseId },
      data:  { resold: true },
    });
    await tx.resaleRequest.update({
      where: { id: request.id },
      data: {
        status:              "APPROVED",
        approvedPricePerTon: pricePerTon,
        adminNote:           parsed.data.note,
        reviewedById:        req.user!.sub,
        reviewedAt:          new Date(),
        listingId:           newListing.id,
      },
    });
    return newListing;
  });

  if (notificationQueue) {
    await notificationQueue.add("send-notification", {
      userId: request.buyerId,
      type:   "email",
      template: "resale_approved",
      data: { listingId: listing.id, tons: request.tons, pricePerTon },
    }, { attempts: 3 }).catch(() => {});
  }

  writeAudit(req, { action: "resale.approve", targetType: "ResaleRequest", targetId: request.id, summary: `Relisted ${request.tons}t at $${pricePerTon}/t`, metadata: { listingId: listing.id, pricePerTon } });
  res.json({ success: true, data: { resaleRequestId: request.id, listingId: listing.id, pricePerTon, tons: request.tons } });
});

router.post("/resale-requests/:id/reject", async (req, res) => {
  const schema = z.object({ reason: z.string().min(5).max(2000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const request = await prisma.resaleRequest.findUnique({ where: { id: req.params.id }, select: { id: true, status: true, buyerId: true } });
  if (!request) {
    res.status(404).json({ success: false, error: "Resale request not found" });
    return;
  }
  if (request.status !== "REQUESTED") {
    res.status(400).json({ success: false, error: `Cannot reject a ${request.status} request` });
    return;
  }

  await prisma.resaleRequest.update({
    where: { id: request.id },
    data: {
      status:          "REJECTED",
      rejectionReason: parsed.data.reason,
      reviewedById:    req.user!.sub,
      reviewedAt:      new Date(),
    },
  });

  writeAudit(req, { action: "resale.reject", targetType: "ResaleRequest", targetId: request.id, summary: "Rejected resale request", metadata: { reason: parsed.data.reason } });

  if (notificationQueue) {
    await notificationQueue.add("send-notification", {
      userId: request.buyerId,
      type:   "email",
      template: "resale_rejected",
      data: { reason: parsed.data.reason },
    }, { attempts: 3 }).catch(() => {});
  }

  res.json({ success: true });
});

// ── Buffer pool (permanence reserve) ─────────────────────────────────────────
// The pool accumulates a slice of every issuance (written by the verification
// service) and can be drawn down by an admin when a project reverses — pooled
// tonnes are "spent" to keep buyers' offsets whole. This is the internal ledger
// + the drawdown action; the public aggregate lives on /standard via
// project-service GET /buffer-pool/stats.

router.get("/buffer-pool", async (req, res) => {
  const { reason, page = "1", pageSize = "50" } = req.query as Record<string, string>;
  const safeSize = Math.min(parseInt(pageSize) || 50, 200);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const skip = (safePage - 1) * safeSize;

  const pool = await prisma.bufferPool.findFirst();
  const where = reason && reason !== "ALL" ? { reason } : {};

  const [items, total, byReason] = await Promise.all([
    prisma.bufferContribution.findMany({
      where, skip, take: safeSize,
      orderBy: { createdAt: "desc" },
      include: {
        credit: { select: { tokenId: true, project: { select: { id: true, title: true, country: true } } } },
      },
    }),
    prisma.bufferContribution.count({ where }),
    prisma.bufferContribution.groupBy({ by: ["reason"], _sum: { tonnes: true }, _count: { _all: true } }),
  ]);

  // Drawdown rows store projectId directly (credit is null), so resolve those titles too.
  const drawdownProjectIds = [...new Set(items.filter(i => !i.credit && i.projectId).map(i => i.projectId!))];
  const drawdownProjects = drawdownProjectIds.length
    ? await prisma.project.findMany({ where: { id: { in: drawdownProjectIds } }, select: { id: true, title: true, country: true } })
    : [];
  const projMap = new Map(drawdownProjects.map(p => [p.id, p]));

  const totalReserved = pool?.totalReserved ?? 0;
  const totalDrawn    = pool?.totalDrawn ?? 0;

  res.json({
    success: true,
    data: {
      pool: { totalReserved, totalDrawn, net: totalReserved - totalDrawn },
      byReason: Object.fromEntries(byReason.map(r => [r.reason, { tonnes: r._sum.tonnes ?? 0, count: r._count._all }])),
      items: items.map(i => ({
        id: i.id,
        tonnes: i.tonnes,
        reason: i.reason,
        note: i.note,
        createdAt: i.createdAt,
        project: i.credit?.project ?? (i.projectId ? projMap.get(i.projectId) ?? null : null),
        tokenId: i.credit?.tokenId ?? null,
      })),
      total, page: safePage, pageSize: safeSize,
    },
  });
});

// Record a reversal drawdown — pull tonnes OUT of the pool to backfill a
// reversed project. Cannot draw more than the available net balance.
router.post("/buffer-pool/drawdown", async (req, res) => {
  const schema = z.object({
    tonnes:    z.number().positive(),
    projectId: z.string().optional(),
    note:      z.string().min(5).max(1000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const pool = await prisma.bufferPool.findFirst();
  if (!pool) {
    res.status(400).json({ success: false, error: "Buffer pool is empty — nothing has been issued yet." });
    return;
  }
  const net = pool.totalReserved - pool.totalDrawn;
  if (parsed.data.tonnes > net) {
    res.status(400).json({
      success: false,
      error: `Cannot draw ${parsed.data.tonnes} t — only ${net.toFixed(4)} t available in the pool.`,
    });
    return;
  }

  // If a projectId is supplied, validate it exists so the ledger entry is real.
  if (parsed.data.projectId) {
    const proj = await prisma.project.findUnique({ where: { id: parsed.data.projectId }, select: { id: true } });
    if (!proj) {
      res.status(404).json({ success: false, error: "Project not found" });
      return;
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.bufferContribution.create({
      data: {
        poolId:    pool.id,
        tonnes:    parsed.data.tonnes,
        reason:    "reversal_backfill",
        projectId: parsed.data.projectId ?? null,
        note:      `[${req.user!.sub}] ${parsed.data.note}`,
      },
    });
    const updated = await tx.bufferPool.update({
      where: { id: pool.id },
      data:  { totalDrawn: { increment: parsed.data.tonnes } },
    });
    return { entry, updated };
  });

  writeAudit(req, {
    action: "buffer.drawdown", targetType: "BufferPool", targetId: pool.id,
    summary: `Drew ${parsed.data.tonnes}t from buffer pool`,
    metadata: { tonnes: parsed.data.tonnes, projectId: parsed.data.projectId ?? null, note: parsed.data.note, entryId: result.entry.id },
  });

  res.json({
    success: true,
    data: {
      entryId: result.entry.id,
      pool: {
        totalReserved: result.updated.totalReserved,
        totalDrawn:    result.updated.totalDrawn,
        net:           result.updated.totalReserved - result.updated.totalDrawn,
      },
    },
  });
});

// ── Audit log ────────────────────────────────────────────────────────────────
// Read-only trail of privileged actions. VIEWER can read it too.
router.get("/audit-logs", async (req, res) => {
  const { action, page = "1", pageSize = "50" } = req.query as Record<string, string>;
  const safeSize = Math.min(parseInt(pageSize) || 50, 200);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const skip = (safePage - 1) * safeSize;

  const where = action && action !== "ALL" ? { action } : {};

  const [items, total, actions] = await Promise.all([
    prisma.auditLog.findMany({ where, skip, take: safeSize, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);

  // Resolve actor names in one query for display.
  const actorIds = [...new Set(items.map(i => i.actorId).filter(Boolean) as string[])];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } })
    : [];
  const actorMap = new Map(actors.map(a => [a.id, a]));

  res.json({
    success: true,
    data: {
      items: items.map(i => ({ ...i, actor: i.actorId ? actorMap.get(i.actorId) ?? null : null })),
      actions: actions.map(a => a.action),
      total, page: safePage, pageSize: safeSize,
    },
  });
});

// ── Partner programme settings ──────────────────────────────────────────────
// Exposes the platform-wide default royalty + milestone amounts so the
// frontend can preview them honestly.
router.get("/partner-programme/settings", async (_req, res) => {
  res.json({
    success: true,
    data: {
      defaultRoyaltyPercent: DEFAULT_PARTNER_ROYALTY_PERCENT,
      onboardingPayout:      PARTNER_ONBOARDING_USDC,
      verificationPayout:    PARTNER_VERIFICATION_USDC,
      currency: "USDC",
    },
  });
});

export default router;
