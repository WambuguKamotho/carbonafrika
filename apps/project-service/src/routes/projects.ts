import { Router } from "express";
import { z } from "zod";
import { prisma, Prisma } from "@carbonafrika/db";
import { authenticate, requireRole } from "../middleware/authenticate";
import { enqueueVerification, enqueueNotification } from "../lib/queue";
import { fetchNdvi } from "../lib/satellite";

const router = Router();

type ProjectTypeRow = { id: string; energyType: string | null; circularType: string | null; projectType: string };

async function mergeProjectTypeFields(projects: Array<{ id: string; energyType?: string | null; circularType?: string | null; projectType?: string }>) {
  if (projects.length === 0) return;
  const ids = projects.map(p => p.id);
  const rows = await prisma.$queryRaw<ProjectTypeRow[]>`
    SELECT id, "energyType", "circularType", "projectType" FROM "Project" WHERE id IN (${Prisma.join(ids)})
  `;
  const map = new Map(rows.map(r => [r.id, r]));
  for (const p of projects) {
    const r = map.get(p.id);
    if (r) {
      p.energyType   = r.energyType;
      p.circularType = r.circularType;
      p.projectType  = r.projectType;
    }
  }
}


// Every project must declare a Kabon Carbon Standard methodology at creation
// time. The methodology dictates the buffer % and monitoring cadence applied
// when credits are eventually issued.
const methodologyCodeSchema = z.string().regex(/^KCS-[A-Z]+-\d{2}$/, "Invalid methodology code");

// Default royalty for partner attributions. Sourced from env so admin can tune
// without redeploying. Locked onto Project.partnerRoyaltyPercent at attribution
// time so future tweaks don't apply retroactively.
const DEFAULT_PARTNER_ROYALTY_PERCENT = parseFloat(process.env.PARTNER_ROYALTY_PERCENT ?? "3");

const createProjectSchema = z.discriminatedUnion("projectType", [
  // Land restoration project
  z.object({
    projectType:    z.literal("LAND_RESTORATION"),
    title:          z.string().min(5).max(200),
    description:    z.string().min(20).max(5000),
    landType:       z.enum(["FOREST", "SAVANNA", "GRASSLAND", "FARMLAND", "WETLAND", "MANGROVE"]),
    country:        z.string().max(100),
    region:         z.string().max(100).optional(),
    lat:            z.number().min(-90).max(90),
    lng:            z.number().min(-180).max(180),
    boundary:       z.any().optional(),
    hectares:       z.number().positive(),
    estimatedTons:  z.number().positive(),
    methodologyCode: methodologyCodeSchema,
    partnerCode:    z.string().min(4).max(40).optional(),  // partner user id or short code
    ipfsDocumentHash: z.string().optional(),
    mediaUrls:      z.array(z.string().url()).optional(),
  }),
  // Clean energy project
  z.object({
    projectType:       z.literal("CLEAN_ENERGY"),
    title:             z.string().min(5).max(200),
    description:       z.string().min(20).max(5000),
    energyType:        z.enum(["BIOGAS", "SOLAR_PV", "BIOCHARCOAL", "COOKSTOVES", "MICRO_HYDRO", "WIND"]),
    country:           z.string().max(100),
    region:            z.string().max(100).optional(),
    lat:               z.number().min(-90).max(90),
    lng:               z.number().min(-180).max(180),
    boundary:          z.any().optional(),
    hectares:          z.number().positive(),
    estimatedTons:     z.number().positive(),
    capacityKw:        z.number().positive().optional(),
    householdsServed:  z.number().int().positive().optional(),
    fuelDisplacedKgY:  z.number().positive().optional(),
    methodologyCode:   methodologyCodeSchema,
    partnerCode:       z.string().min(4).max(40).optional(),
    ipfsDocumentHash:  z.string().optional(),
    mediaUrls:         z.array(z.string().url()).optional(),
  }),
  // Circular economy project (manufacturing, recycling, industrial efficiency)
  z.object({
    projectType:          z.literal("CIRCULAR_ECONOMY"),
    title:                z.string().min(5).max(200),
    description:          z.string().min(20).max(5000),
    circularType:         z.enum(["PLASTIC_RECYCLING", "EWASTE_RECYCLING", "ORGANIC_COMPOSTING", "TEXTILE_RECYCLING", "WASTE_HEAT_RECOVERY", "INDUSTRIAL_EFFICIENCY"]),
    country:              z.string().max(100),
    region:               z.string().max(100).optional(),
    lat:                  z.number().min(-90).max(90),
    lng:                  z.number().min(-180).max(180),
    boundary:             z.any().optional(),
    hectares:             z.number().positive(),
    estimatedTons:        z.number().positive(),
    materialTonsPerYear:  z.number().positive().optional(),
    capacityKw:           z.number().positive().optional(),
    householdsServed:     z.number().int().positive().optional(),
    fuelDisplacedKgY:     z.number().positive().optional(),
    methodologyCode:      methodologyCodeSchema,
    partnerCode:          z.string().min(4).max(40).optional(),
    ipfsDocumentHash:     z.string().optional(),
    mediaUrls:            z.array(z.string().url()).optional(),
  }),
]);

// Public methodology library — used by the project-creation form and the
// public /standard page. No auth, no pagination — there are only ~10 of these.
router.get("/methodologies", async (_req, res) => {
  const items = await prisma.methodology.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { code: "asc" }],
  });
  res.json({ success: true, data: items });
});

router.get("/methodologies/:code", async (req, res) => {
  const m = await prisma.methodology.findUnique({ where: { code: req.params.code } });
  if (!m) {
    res.status(404).json({ success: false, error: "Methodology not found" });
    return;
  }
  res.json({ success: true, data: m });
});

// Public buffer-pool stats — surfaced on the /standard page and certificates.
router.get("/buffer-pool/stats", async (_req, res) => {
  const pool = await prisma.bufferPool.findFirst();
  const [contributionCount, projectsCount] = await Promise.all([
    prisma.bufferContribution.count(),
    prisma.project.count({ where: { status: { in: ["ACTIVE", "VERIFIED"] } } }),
  ]);
  res.json({
    success: true,
    data: {
      totalReserved: pool?.totalReserved ?? 0,
      totalDrawn:    pool?.totalDrawn    ?? 0,
      net:           (pool?.totalReserved ?? 0) - (pool?.totalDrawn ?? 0),
      contributionCount,
      projectsCovered: projectsCount,
    },
  });
});

// List projects (public — buyers browse)
router.get("/", async (req, res) => {
  const { landType, energyType, projectType, country, status, page = "1", pageSize = "20" } = req.query as Record<string, string>;

  const where = {
    ...(landType    && { landType:    landType    as never }),
    ...(energyType  && { energyType:  energyType  as never }),
    ...(projectType && { projectType: projectType as never }),
    ...(country     && { country }),
    status: (status as never) || "ACTIVE",
  };

  const safeSize = Math.min(parseInt(pageSize) || 20, 100);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const skip = (safePage - 1) * safeSize;
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: safeSize,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, country: true } },
        credits: { where: { status: "AVAILABLE" }, select: { id: true, amount: true } },
        methodology: { select: { code: true, name: true, bufferPercent: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  await mergeProjectTypeFields(items);

  res.json({
    success: true,
    data: { items, total, page: safePage, pageSize: safeSize, totalPages: Math.ceil(total / safeSize) },
  });
});

// Admin: list ALL projects across all statuses
router.get("/admin/all", authenticate, requireRole("ADMIN", "VIEWER"), async (req, res) => {
  const { status, page = "1", pageSize = "100" } = req.query as Record<string, string>;

  const where = {
    ...(status && status !== "ALL" && { status: status as never }),
  };

  const safeSize = Math.min(parseInt(pageSize) || 100, 200);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const skip = (safePage - 1) * safeSize;

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: safeSize,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { verifications: true, credits: true } },
      },
    }),
    prisma.project.count({ where }),
  ]);

  await mergeProjectTypeFields(items);

  res.json({
    success: true,
    data: { items, total, page: safePage, pageSize: safeSize },
  });
});

// Get single project
router.get("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, name: true, country: true } },
      verifications: { orderBy: { createdAt: "desc" }, take: 1 },
      credits: { where: { status: "AVAILABLE" } },
      methodology: true,
    },
  });

  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }

  await mergeProjectTypeFields([project]);

  res.json({ success: true, data: project });
});

// Create project (landowners only).
// Project starts in PENDING and is invisible to the public until an ADMIN
// approves it (POST /projects/admin/:id/approve). Admin approval is the
// first gate; verifier carbon assessment is the second.
router.post("/", authenticate, requireRole("LANDOWNER", "ADMIN"), async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  // Validate the methodology exists and matches the project category — prevents
  // a land-restoration project from picking a clean-energy methodology.
  const methodology = await prisma.methodology.findUnique({
    where: { code: parsed.data.methodologyCode },
    select: { code: true, category: true, active: true },
  });
  if (!methodology || !methodology.active) {
    res.status(400).json({ success: false, error: "Unknown or inactive methodology" });
    return;
  }
  const expectedCategory =
    parsed.data.projectType === "LAND_RESTORATION" ? "Land Restoration" :
    parsed.data.projectType === "CLEAN_ENERGY"     ? "Clean Energy" :
    "Circular Economy";
  if (methodology.category !== expectedCategory) {
    res.status(400).json({
      success: false,
      error: `Methodology ${methodology.code} is for ${methodology.category} projects, not ${expectedCategory}`,
    });
    return;
  }

  // Resolve optional partner attribution. Refuse silently-bad codes — if the
  // landowner typed in a stranger's id, we don't want to fabricate a relationship.
  let resolvedPartnerId: string | null = null;
  if (parsed.data.partnerCode) {
    const partner = await prisma.user.findFirst({
      where: { id: parsed.data.partnerCode, role: "COMMUNITY_PARTNER" },
      select: { id: true },
    });
    if (!partner) {
      res.status(400).json({ success: false, error: "Unknown community partner code" });
      return;
    }
    resolvedPartnerId = partner.id;
  }

  const { boundary, partnerCode, ...rest } = parsed.data as any;
  void partnerCode;  // consumed above; don't write to Project as a column

  const project = await prisma.project.create({
    data: {
      ...rest,
      ...(boundary ? { boundary } : {}),
      ownerId: req.user!.sub,
      status: "PENDING",
      ...(resolvedPartnerId ? {
        partnerId: resolvedPartnerId,
        partnerRoyaltyPercent: DEFAULT_PARTNER_ROYALTY_PERCENT,
      } : {}),
    },
  });

  // No Verification row, no verifier queue — those are deferred to admin approval.
  // The owner just gets a "we got your submission" email and the admins see it in
  // the pending approvals queue.
  await enqueueNotification({
    userId: req.user!.sub,
    type: "email",
    template: "project_submitted",
    data: { projectTitle: project.title, projectId: project.id },
  });

  res.status(201).json({ success: true, data: project });
});

// ── Admin approval gate ─────────────────────────────────────────────────────
// Two routes — approve and reject — move PENDING projects forward.
// Approve transitions PENDING → UNDER_REVIEW and starts the existing verifier
// flow (Verification row + queue job).
router.post("/admin/:id/approve", authenticate, requireRole("ADMIN"), async (req, res) => {
  const schema = z.object({ note: z.string().max(1000).optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { id: true, title: true, ownerId: true, status: true, partnerId: true },
  });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }
  if (project.status !== "PENDING") {
    res.status(400).json({ success: false, error: `Cannot approve a ${project.status} project` });
    return;
  }

  // If a community partner brought this project, accrue their onboarding milestone
  // payout in the same transaction so the ledger never disagrees with project state.
  const ONBOARDING_USDC = parseFloat(process.env.PARTNER_ONBOARDING_USDC ?? "30");

  const verification = await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: project.id },
      data: {
        status: "UNDER_REVIEW",
        adminReviewedById: req.user!.sub,
        adminReviewedAt: new Date(),
        rejectionReason: null,
      },
    });
    const v = await tx.verification.create({
      data: { projectId: project.id, status: "PENDING" },
    });
    await tx.projectComment.create({
      data: {
        projectId: project.id,
        authorId: req.user!.sub,
        body: parsed.data.note?.trim() || "Approved by admin. Forwarded to verifier team.",
        kind: "approval",
      },
    });
    if (project.partnerId && ONBOARDING_USDC > 0) {
      await tx.partnerEarning.create({
        data: {
          partnerId: project.partnerId,
          projectId: project.id,
          kind:      "ONBOARDING",
          amount:    ONBOARDING_USDC,
          note:      `Onboarding payout for ${project.title}`,
        },
      });
    }
    return v;
  });

  await enqueueVerification({ projectId: project.id, verificationId: verification.id });
  await enqueueNotification({
    userId: project.ownerId,
    type: "email",
    template: "project_approved_admin",
    data: { projectTitle: project.title, projectId: project.id, note: parsed.data.note ?? null },
  });

  res.json({ success: true, data: { id: project.id, status: "UNDER_REVIEW", verificationId: verification.id } });
});

router.post("/admin/:id/reject", authenticate, requireRole("ADMIN"), async (req, res) => {
  const schema = z.object({ reason: z.string().min(5).max(2000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { id: true, title: true, ownerId: true, status: true },
  });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }
  if (project.status !== "PENDING") {
    res.status(400).json({ success: false, error: `Cannot reject a ${project.status} project` });
    return;
  }

  await prisma.$transaction([
    prisma.project.update({
      where: { id: project.id },
      data: {
        status: "REJECTED",
        adminReviewedById: req.user!.sub,
        adminReviewedAt: new Date(),
        rejectionReason: parsed.data.reason,
      },
    }),
    prisma.projectComment.create({
      data: {
        projectId: project.id,
        authorId: req.user!.sub,
        body: parsed.data.reason,
        kind: "rejection",
      },
    }),
  ]);

  await enqueueNotification({
    userId: project.ownerId,
    type: "email",
    template: "project_rejected_admin",
    data: { projectTitle: project.title, projectId: project.id, reason: parsed.data.reason },
  });

  res.json({ success: true, data: { id: project.id, status: "REJECTED" } });
});

// ── Project comments ────────────────────────────────────────────────────────
// Conversation between admin and project owner during review. Visible only to
// the owner and admins (never public). Anyone with access can post.
router.get("/:id/comments", authenticate, async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { id: true, ownerId: true },
  });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }
  if (req.user!.sub !== project.ownerId && req.user!.role !== "ADMIN") {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  const comments = await prisma.projectComment.findMany({
    where: { projectId: project.id },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, role: true } } },
  });

  res.json({ success: true, data: comments });
});

router.post("/:id/comments", authenticate, async (req, res) => {
  const schema = z.object({ body: z.string().min(1).max(5000) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { id: true, title: true, ownerId: true },
  });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }
  if (req.user!.sub !== project.ownerId && req.user!.role !== "ADMIN") {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  const comment = await prisma.projectComment.create({
    data: {
      projectId: project.id,
      authorId:  req.user!.sub,
      body:      parsed.data.body.trim(),
      kind:      "comment",
    },
    include: { author: { select: { id: true, name: true, role: true } } },
  });

  // Notify the other party. Admins → notify the owner; owner → notify all admins.
  if (req.user!.role === "ADMIN" && req.user!.sub !== project.ownerId) {
    await enqueueNotification({
      userId: project.ownerId,
      type: "email",
      template: "project_comment",
      data: { projectTitle: project.title, projectId: project.id, body: parsed.data.body, fromAdmin: true },
    });
  }
  // Owner → admin notification is best-effort: we don't have a multi-recipient
  // template; admins can poll the pending-approvals view. Skipping for now.

  res.status(201).json({ success: true, data: comment });
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
    mediaUrls: z.array(z.string().url()).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const updated = await prisma.project.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ success: true, data: updated });
});

// Update boundary (owner or admin — no status restriction)
router.patch("/:id/boundary", authenticate, async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id }, select: { id: true, ownerId: true } });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }
  if (project.ownerId !== req.user!.sub && req.user!.role !== "ADMIN") {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  const schema = z.object({ boundary: z.any().nullable() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const updated = await prisma.project.update({
    where: { id: req.params.id },
    data: { boundary: parsed.data.boundary ?? Prisma.JsonNull },
    select: { id: true, boundary: true },
  });
  res.json({ success: true, data: updated });
});

// Admin: update project status
router.patch("/:id/status", authenticate, requireRole("ADMIN"), async (req, res) => {
  const schema = z.object({
    status: z.enum(["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "ACTIVE", "COMPLETED"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status },
    select: { id: true, title: true, status: true },
  });

  res.json({ success: true, data: project });
});

// Satellite snapshots for a project (public)
router.get("/:id/satellites", async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }

  const snapshots = await prisma.satelliteSnapshot.findMany({
    where: { projectId: req.params.id },
    orderBy: { capturedAt: "desc" },
    take: 20,
  });

  res.json({ success: true, data: snapshots });
});

// On-demand NDVI fetch — surfaces the latest Sentinel-2 reading and stores a
// new SatelliteSnapshot row. Used by the project page when the snapshot list
// is empty (e.g. the verification worker missed it) and by future "refresh"
// buttons. Rate-limited at the caller layer; here we keep it simple.
router.post("/:id/satellites/refresh", authenticate, async (req, res) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    select: { id: true, ownerId: true, lat: true, lng: true, hectares: true, status: true },
  });
  if (!project) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }
  // Anyone with project access may refresh: the project owner, an ADMIN, or a VERIFIER.
  if (
    project.ownerId !== req.user!.sub &&
    req.user!.role !== "ADMIN" &&
    req.user!.role !== "VERIFIER" &&
    req.user!.role !== "VIEWER"
  ) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  try {
    const r = await fetchNdvi(project.lat, project.lng, project.hectares);
    const snapshot = await prisma.satelliteSnapshot.create({
      data: {
        projectId:  project.id,
        ndvi:       r.ndvi,
        cloudCover: r.cloudCover,
        capturedAt: r.capturedAt,
        source:     r.source,
        imageUrl:   r.imageUrl,
      },
    });
    res.json({ success: true, data: snapshot });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Satellite fetch failed";
    res.status(502).json({ success: false, error: msg });
  }
});

// My projects
router.get("/me/projects", authenticate, async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { ownerId: req.user!.sub },
    orderBy: { createdAt: "desc" },
    include: {
      verifications: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, carbonTons: true } },
      credits: { select: { id: true, amount: true, status: true, mintTxHash: true, tokenId: true, createdAt: true } },
    },
  });

  await mergeProjectTypeFields(projects);

  res.json({ success: true, data: projects });
});

export default router;
