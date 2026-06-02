import { Router } from "express";
import { z } from "zod";
import { prisma } from "@carbonafrika/db";
import { authenticate, requireRole } from "../middleware/authenticate";

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────────

// List published posts. Cards on /blog only need a slim payload.
router.get("/", async (req, res) => {
  const { tag, page = "1", pageSize = "20" } = req.query as Record<string, string>;
  const safeSize = Math.min(parseInt(pageSize) || 20, 50);
  const safePage = Math.max(parseInt(page) || 1, 1);
  const skip = (safePage - 1) * safeSize;

  const where = {
    status: "PUBLISHED" as const,
    ...(tag ? { tags: { has: tag } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({
      where, skip, take: safeSize,
      orderBy: { publishedAt: "desc" },
      select: {
        id: true, slug: true, title: true, excerpt: true, coverUrl: true,
        tags: true, authorName: true, authorRole: true, publishedAt: true,
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  res.json({ success: true, data: { items, total, page: safePage, pageSize: safeSize } });
});

router.get("/:slug", async (req, res) => {
  const post = await prisma.blogPost.findUnique({ where: { slug: req.params.slug } });
  if (!post || post.status !== "PUBLISHED") {
    res.status(404).json({ success: false, error: "Post not found" });
    return;
  }
  res.json({ success: true, data: post });
});

// ── Admin ───────────────────────────────────────────────────────────────────
// Admin sees ALL posts (drafts + published) at GET /admin (not /blog) — we'll
// mount a separate admin sub-router so the path becomes /blog/admin/*.

const adminRouter = Router();
// VIEWER can read all blog posts (including drafts), but cannot create/edit/delete.
function denyViewerMutations(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  if (req.user?.role === "VIEWER" && req.method !== "GET") {
    res.status(403).json({ success: false, error: "Read-only role cannot perform this action" });
    return;
  }
  next();
}
adminRouter.use(authenticate, requireRole("ADMIN", "VIEWER"), denyViewerMutations);

const postSchema = z.object({
  slug:       z.string().min(3).max(120).regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, digits, hyphens"),
  title:      z.string().min(3).max(200),
  excerpt:    z.string().min(10).max(500),
  body:       z.string().min(20),
  coverUrl:   z.string().url().max(2000).optional(),
  tags:       z.array(z.string().min(1).max(40)).max(10).optional(),
  authorName: z.string().min(2).max(120),
  authorRole: z.string().max(120).optional(),
  status:     z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

adminRouter.get("/", async (req, res) => {
  const { status, search } = req.query as Record<string, string>;
  const where = {
    ...(status && status !== "ALL" && { status: status as never }),
    ...(search && {
      OR: [
        { title:   { contains: search, mode: "insensitive" as never } },
        { excerpt: { contains: search, mode: "insensitive" as never } },
      ],
    }),
  };
  const items = await prisma.blogPost.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  res.json({ success: true, data: items });
});

adminRouter.get("/:id", async (req, res) => {
  const post = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
  if (!post) {
    res.status(404).json({ success: false, error: "Post not found" });
    return;
  }
  res.json({ success: true, data: post });
});

adminRouter.post("/", async (req, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }
  const taken = await prisma.blogPost.findUnique({ where: { slug: parsed.data.slug } });
  if (taken) {
    res.status(409).json({ success: false, error: "Slug already in use" });
    return;
  }
  const post = await prisma.blogPost.create({
    data: {
      ...parsed.data,
      tags: parsed.data.tags ?? [],
      publishedAt: parsed.data.status === "PUBLISHED" ? new Date() : null,
    },
  });
  res.status(201).json({ success: true, data: post });
});

adminRouter.patch("/:id", async (req, res) => {
  const parsed = postSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.blogPost.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ success: false, error: "Post not found" });
    return;
  }
  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const taken = await prisma.blogPost.findUnique({ where: { slug: parsed.data.slug } });
    if (taken) {
      res.status(409).json({ success: false, error: "Slug already in use" });
      return;
    }
  }

  // First time we transition to PUBLISHED, stamp publishedAt.
  const becomingPublished = parsed.data.status === "PUBLISHED" && existing.status !== "PUBLISHED";
  const data = {
    ...parsed.data,
    ...(becomingPublished ? { publishedAt: new Date() } : {}),
  };

  const post = await prisma.blogPost.update({ where: { id: req.params.id }, data });
  res.json({ success: true, data: post });
});

adminRouter.delete("/:id", async (req, res) => {
  await prisma.blogPost.delete({ where: { id: req.params.id } }).catch(() => {});
  res.json({ success: true });
});

router.use("/admin", adminRouter);

export default router;
