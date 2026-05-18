import { Router } from "express";
import { z } from "zod";
import { prisma } from "@carbonafrika/db";
import { Queue } from "bullmq";
import { authenticate } from "../middleware/authenticate";

const router = Router();
const connection = { url: process.env.REDIS_URL! };
const mintingQueue = new Queue("minting", { connection });
const notificationQueue = new Queue("notification", { connection });

// List verifications (verifiers and admins)
router.get("/", authenticate, async (req, res) => {
  if (!["VERIFIER", "ADMIN"].includes(req.user!.role)) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  const { status, page = "1", pageSize = "20" } = req.query as Record<string, string>;
  const where = status ? { status: status as never } : {};
  const skip = (parseInt(page) - 1) * parseInt(pageSize);

  const [items, total] = await Promise.all([
    prisma.verification.findMany({
      where,
      skip,
      take: parseInt(pageSize),
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: { id: true, title: true, landType: true, country: true, hectares: true, estimatedTons: true, owner: { select: { id: true, name: true } } },
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

// Assign verifier to a verification
router.patch("/:id/assign", authenticate, async (req, res) => {
  if (!["VERIFIER", "ADMIN"].includes(req.user!.role)) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  const verification = await prisma.verification.findUnique({ where: { id: req.params.id } });
  if (!verification || verification.status !== "PENDING") {
    res.status(404).json({ success: false, error: "Verification not found or already assigned" });
    return;
  }

  const updated = await prisma.verification.update({
    where: { id: req.params.id },
    data: { verifierId: req.user!.sub, status: "IN_PROGRESS" },
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

  const { decision, notes, carbonTons, reportIpfsHash } = parsed.data;

  if (decision === "APPROVED" && !carbonTons) {
    res.status(400).json({ success: false, error: "carbonTons required for approval" });
    return;
  }

  await prisma.$transaction([
    prisma.verification.update({
      where: { id: req.params.id },
      data: { status: decision, notes, carbonTons, reportIpfsHash },
    }),
    prisma.project.update({
      where: { id: verification.projectId },
      data: { status: decision === "APPROVED" ? "VERIFIED" : "REJECTED" },
    }),
  ]);

  if (decision === "APPROVED") {
    const ownerWallet = verification.project.owner.walletAddress;
    if (ownerWallet) {
      await mintingQueue.add("mint-credits", {
        projectId: verification.projectId,
        verificationId: verification.id,
        carbonTons,
        ownerWallet,
      }, { attempts: 3, backoff: { type: "exponential", delay: 10000 } });
    }
  }

  await notificationQueue.add("send-notification", {
    userId: verification.project.owner.id,
    type: "email",
    template: decision === "APPROVED" ? "project_approved" : "project_rejected",
    data: { projectTitle: verification.project.title, carbonTons, notes },
  });

  res.json({ success: true, data: { decision, message: `Project ${decision.toLowerCase()}` } });
});

export default router;
