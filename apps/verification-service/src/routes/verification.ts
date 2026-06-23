import { Router } from "express";
import { z } from "zod";
import { prisma } from "@carbonafrika/db";
import { Queue } from "bullmq";
import { redisConnectionOptions } from "@carbonafrika/types";
import { authenticate } from "../middleware/authenticate";

const router = Router();
const connection = redisConnectionOptions("verification-service");

let mintingQueue: Queue | null = null;
let notificationQueue: Queue | null = null;
try {
  const mq = new Queue("minting",      { connection });
  const nq = new Queue("notification", { connection });
  mq.on("error", (err) => console.warn("[verification-service] mintingQueue:",      err.message));
  nq.on("error", (err) => console.warn("[verification-service] notificationQueue:", err.message));
  mintingQueue = mq;
  notificationQueue = nq;
} catch {
  console.warn("[verification-service] Queue init failed — jobs will be skipped");
}

// List verifications (verifiers and admins)
router.get("/", authenticate, async (req, res) => {
  if (!["VERIFIER", "ADMIN"].includes(req.user!.role)) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  const { status, page = "1", pageSize = "20" } = req.query as Record<string, string>;
  const where = status ? { status: status as never } : {};
  const safeSize = Math.min(parseInt(pageSize) || 20, 100);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const skip = (safePage - 1) * safeSize;

  const [items, total] = await Promise.all([
    prisma.verification.findMany({
      where,
      skip,
      take: safeSize,
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: { id: true, title: true, landType: true, energyType: true, projectType: true, country: true, hectares: true, estimatedTons: true, capacityKw: true, owner: { select: { id: true, name: true } } },
        },
        verifier: { select: { id: true, name: true } },
      },
    }),
    prisma.verification.count({ where }),
  ]);

  res.json({ success: true, data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) } });
});

// Get single verification
router.get("/:id", authenticate, async (req, res) => {
  const verification = await prisma.verification.findUnique({
    where: { id: req.params.id },
    include: {
      project: { include: { owner: { select: { id: true, name: true, walletAddress: true } } } },
      verifier: { select: { id: true, name: true } },
    },
  });

  if (!verification) {
    res.status(404).json({ success: false, error: "Verification not found" });
    return;
  }

  const isOwner = verification.project.ownerId === req.user!.sub;
  const isVerifierOrAdmin = ["VERIFIER", "ADMIN"].includes(req.user!.role);
  if (!isOwner && !isVerifierOrAdmin) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  res.json({ success: true, data: verification });
});

// Assign verifier to a verification.
//  - A VERIFIER self-assigns (must have the project's sector in scope).
//  - An ADMIN may assign a specific verifier by passing { verifierId } (also scope-checked).
// Sectoral scope: a verifier with empty verifierScopes can take any sector
// (back-compat); otherwise the project's projectType must be in their scopes.
router.patch("/:id/assign", authenticate, async (req, res) => {
  if (!["VERIFIER", "ADMIN"].includes(req.user!.role)) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  const verification = await prisma.verification.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { projectType: true } } },
  });
  if (!verification || verification.status !== "PENDING") {
    res.status(404).json({ success: false, error: "Verification not found or already assigned" });
    return;
  }

  // Admin can assign to a chosen verifier; a verifier assigns to themselves.
  const bodyVerifierId = typeof req.body?.verifierId === "string" ? req.body.verifierId : undefined;
  const targetVerifierId = req.user!.role === "ADMIN" && bodyVerifierId ? bodyVerifierId : req.user!.sub;

  const target = await prisma.user.findUnique({
    where: { id: targetVerifierId },
    select: { id: true, role: true, name: true, verifierScopes: true },
  });
  if (!target || !["VERIFIER", "ADMIN"].includes(target.role)) {
    res.status(400).json({ success: false, error: "Assignee must be a verifier" });
    return;
  }
  // Scope only constrains VERIFIERs; admins are unrestricted.
  if (target.role === "VERIFIER" && target.verifierScopes.length > 0 && !target.verifierScopes.includes(verification.project.projectType)) {
    res.status(403).json({
      success: false,
      error: `${target.name}'s scope doesn't cover ${verification.project.projectType.replace("_", " ").toLowerCase()} projects.`,
    });
    return;
  }

  const updated = await prisma.verification.update({
    where: { id: req.params.id },
    data: { verifierId: targetVerifierId, status: "IN_PROGRESS" },
  });

  await prisma.project.update({ where: { id: verification.projectId }, data: { status: "UNDER_REVIEW" } });
  res.json({ success: true, data: updated });
});

// Approve or reject verification
router.patch("/:id/review", authenticate, async (req, res) => {
  if (!["VERIFIER", "ADMIN"].includes(req.user!.role)) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  const schema = z.object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    notes: z.string().optional(),
    carbonTons: z.number().positive().optional(),
    reportIpfsHash: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const verification = await prisma.verification.findUnique({
    where: { id: req.params.id },
    include: { project: { include: { owner: { select: { id: true, walletAddress: true } } } } },
  });

  if (!verification || verification.status !== "IN_PROGRESS") {
    res.status(404).json({ success: false, error: "Verification not found or not in progress" });
    return;
  }

  if (req.user!.role !== "ADMIN" && verification.verifierId !== req.user!.sub) {
    res.status(403).json({ success: false, error: "Not the assigned verifier" });
    return;
  }

  const { decision, notes, carbonTons, reportIpfsHash } = parsed.data;

  if (decision === "APPROVED" && !carbonTons) {
    res.status(400).json({ success: false, error: "carbonTons required for approval" });
    return;
  }

  // Maker-checker: the verifier APPROVES (assessment), but NO credits are minted
  // here. Issuance is a separate admin action (POST /:id/issue) so no single
  // party can put credits into circulation. On APPROVED the project moves to
  // VERIFIED with creditsIssued=false; the admin issues from the verifications
  // queue. On REJECTED it's terminal.
  await prisma.$transaction(async (tx) => {
    await tx.verification.update({
      where: { id: req.params.id },
      data: { status: decision, notes, carbonTons, reportIpfsHash },
    });
    await tx.project.update({
      where: { id: verification.projectId },
      data: { status: decision === "APPROVED" ? "VERIFIED" : "REJECTED" },
    });
    await tx.projectComment.create({
      data: {
        projectId: verification.projectId,
        authorId:  req.user!.sub,
        kind:      decision === "APPROVED" ? "verification_approved" : "verification_rejected",
        body: decision === "APPROVED"
          ? `Carbon assessment complete. ${carbonTons?.toLocaleString()} tonnes CO₂e verified${notes ? `.\n\n${notes}` : "."} Awaiting issuance sign-off by Kabon.`
          : `Verification rejected${notes ? `: ${notes}` : "."}`,
      },
    });
  });

  if (notificationQueue) {
    await notificationQueue.add("send-notification", {
      userId: verification.project.owner.id,
      type: "email",
      template: decision === "APPROVED" ? "project_approved" : "project_rejected",
      data: { projectTitle: verification.project.title, carbonTons, notes },
    });
  }

  res.json({ success: true, data: { decision, message: `Project ${decision.toLowerCase()}` } });
});

// Issue credits — the "checker" half of maker-checker. Only an ADMIN can mint
// credits for an APPROVED verification, separating assessment (verifier) from
// issuance (admin). Mints the DB credit, contributes to the buffer pool, and
// accrues the partner verification payout. On-chain mint is opt-in (owner wallet
// + chain configured).
router.post("/:id/issue", authenticate, async (req, res) => {
  if (req.user!.role !== "ADMIN") {
    res.status(403).json({ success: false, error: "Only an admin can issue credits" });
    return;
  }

  const verification = await prisma.verification.findUnique({
    where: { id: req.params.id },
    include: {
      project: {
        select: {
          id: true, title: true, partnerId: true,
          methodology: { select: { bufferPercent: true } },
          owner: { select: { id: true, walletAddress: true } },
        },
      },
    },
  });
  if (!verification) {
    res.status(404).json({ success: false, error: "Verification not found" });
    return;
  }
  if (verification.status !== "APPROVED") {
    res.status(400).json({ success: false, error: `Verification must be APPROVED before issuance (currently ${verification.status})` });
    return;
  }
  if (verification.creditsIssued) {
    res.status(400).json({ success: false, error: "Credits already issued for this verification" });
    return;
  }
  if (!verification.carbonTons) {
    res.status(400).json({ success: false, error: "Verification has no carbonTons to issue" });
    return;
  }
  // Separation of duties: whoever assessed the project cannot also issue its
  // credits. A second reviewer (another admin/verifier) must sign off.
  if (verification.verifierId && verification.verifierId === req.user!.sub) {
    res.status(403).json({
      success: false,
      error: "The reviewer who assessed this project cannot also issue its credits — a second reviewer must sign off.",
    });
    return;
  }

  const carbonTons = verification.carbonTons;
  const VERIFICATION_USDC = parseFloat(process.env.PARTNER_VERIFICATION_USDC ?? "200");
  const partnerId = verification.project.partnerId;
  const bufferPct  = verification.project.methodology?.bufferPercent ?? 15;
  const bufferTons = parseFloat((carbonTons * bufferPct / 100).toFixed(4));
  const tradeable  = parseFloat((carbonTons - bufferTons).toFixed(4));

  await prisma.$transaction(async (tx) => {
    const tokenSeed = Buffer.from(verification.projectId).toString("hex").slice(0, 16);
    const simTxHash = `0xsim_kc_${tokenSeed}${Date.now().toString(16)}`;

    const credit = await tx.carbonCredit.create({
      data: {
        projectId:   verification.projectId,
        tokenId:     `kc-${tokenSeed}-${Date.now()}`,
        amount:      tradeable,
        bufferTons,
        vintageYear: new Date().getFullYear(),
        status:      "AVAILABLE",
        mintTxHash:  simTxHash,
      },
    });

    if (bufferTons > 0) {
      let pool = await tx.bufferPool.findFirst();
      if (!pool) pool = await tx.bufferPool.create({ data: {} });
      await tx.bufferContribution.create({
        data: { poolId: pool.id, creditId: credit.id, projectId: verification.projectId, tonnes: bufferTons, reason: "issuance" },
      });
      await tx.bufferPool.update({
        where: { id: pool.id },
        data:  { totalReserved: { increment: bufferTons } },
      });
    }

    if (partnerId && VERIFICATION_USDC > 0) {
      await tx.partnerEarning.create({
        data: {
          partnerId,
          projectId: verification.projectId,
          kind:      "VERIFICATION",
          amount:    VERIFICATION_USDC,
          note:      `Verification payout for ${verification.project.title}`,
        },
      });
    }

    await tx.verification.update({
      where: { id: verification.id },
      data:  { creditsIssued: true, issuedById: req.user!.sub, issuedAt: new Date() },
    });

    await tx.projectComment.create({
      data: {
        projectId: verification.projectId,
        authorId:  req.user!.sub,
        kind:      "credits_issued",
        body: `${tradeable.toLocaleString()} tonnes issued and available to list` +
              (bufferTons > 0 ? ` · ${bufferTons.toLocaleString()} t reserved in the buffer pool.` : "."),
      },
    });
  });

  // On-chain minting opt-in — only if owner linked a wallet and chain configured.
  const ownerWallet = verification.project.owner.walletAddress;
  if (ownerWallet && mintingQueue) {
    await mintingQueue.add("mint-credits", {
      projectId: verification.projectId,
      verificationId: verification.id,
      carbonTons,
      ownerWallet,
    }, { attempts: 3, backoff: { type: "exponential", delay: 10000 } }).catch(() => {});
  }

  res.json({ success: true, data: { tradeable, bufferTons, message: "Credits issued" } });
});

export default router;
