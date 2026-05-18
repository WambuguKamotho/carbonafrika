import { Router } from "express";
import { z } from "zod";
import { prisma } from "@carbonafrika/db";
import { authenticate, requireRole } from "../middleware/authenticate";
import { enqueueVerification, enqueueNotification } from "../lib/queue";

const router = Router();

const createProjectSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  landType: z.enum(["FOREST", "SAVANNA", "GRASSLAND", "FARMLAND", "WETLAND", "MANGROVE"]),
  country: z.string(),
  region: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  hectares: z.number().positive(),
  estimatedTons: z.number().positive(),
  ipfsDocumentHash: z.string().optional(),
});

// List projects (public — buyers browse)
router.get("/", async (req, res) => {
  const { landType, country, status, page = "1", pageSize = "20" } = req.query as Record<string, string>;

  const where = {
    ...(landType && { landType: landType as never }),
    ...(country && { country }),
    status: (status as never) || "ACTIVE",
  };

  const skip = (parseInt(page) - 1) * parseInt(pageSize);
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: parseInt(pageSize),
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, country: true } },
        credits: { where: { status: "AVAILABLE" }, select: { id: true, amount: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  res.json({
    success: true,
    data: { items, total, page: parseInt(page), pageSize: parseInt(pageSize), totalPages: Math.ceil(total / parseInt(pageSize)) },
  });
});

// Get single project
router.get("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, name: true, country: true, walletAddress: true } },
      verifications: { orderBy: { createdAt: "desc" }, take: 1 },
      credits: { where: { status: "AVAILABLE" } },
    },
  });

  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }

  res.json({ success: true, data: project });
});

// Create project (landowners only)
router.post("/", authenticate, requireRole("LANDOWNER", "ADMIN"), async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const project = await prisma.project.create({
    data: { ...parsed.data, ownerId: req.user!.sub, status: "PENDING" },
  });

  // Create a verification record and queue the job
  const verification = await prisma.verification.create({
    data: { projectId: project.id, status: "PENDING" },
  });

  await enqueueVerification({ projectId: project.id, verificationId: verification.id });
  await enqueueNotification({
    userId: req.user!.sub,
    type: "email",
    template: "project_submitted",
    data: { projectTitle: project.title, projectId: project.id },
  });

  res.status(201).json({ success: true, data: project });
});

// Update project (owner only)
router.patch("/:id", authenticate, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }
  if (project.ownerId !== req.user!.sub && req.user!.role !== "ADMIN") {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }
  if (!["PENDING", "REJECTED"].includes(project.status)) {
    res.status(400).json({ success: false, error: "Cannot edit a project under review or verified" });
    return;
  }

  const schema = z.object({
    title: z.string().min(5).optional(),
    description: z.string().min(20).optional(),
    ipfsDocumentHash: z.string().optional(),
    satelliteImageUrl: z.string().url().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const updated = await prisma.project.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ success: true, data: updated });
});

// My projects
router.get("/me/projects", authenticate, async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { ownerId: req.user!.sub },
    orderBy: { createdAt: "desc" },
    include: {
      verifications: { orderBy: { createdAt: "desc" }, take: 1 },
      credits: true,
    },
  });

  res.json({ success: true, data: projects });
});

export default router;
