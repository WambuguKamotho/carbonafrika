import { Router } from "express";
import { prisma } from "@carbonafrika/db";
import { authenticate } from "../middleware/authenticate";

const router = Router();

// GET /notifications — last 50 for the current user, unread first
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: [{ read: "asc" }, { createdAt: "desc" }],
      take: 50,
    });
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch notifications" });
  }
});

// GET /notifications/count — unread count only (fast poll)
router.get("/count", authenticate, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const count = await prisma.notification.count({ where: { userId, read: false } });
    res.json({ success: true, data: { count } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch count" });
  }
});

// PATCH /notifications/read-all — mark every unread as read (before /:id so it doesn't match)
router.patch("/read-all", authenticate, async (req, res) => {
  try {
    const userId = req.user!.sub;
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update" });
  }
});

// PATCH /notifications/:id/read — mark one as read
router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    const userId = req.user!.sub;
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId },
      data: { read: true },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update" });
  }
});

export default router;
