import { Router, type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { authenticate } from "../middleware/authenticate";
import { co2ForKwh, co2ForFuelDisplaced } from "../lib/emissions";

const router = Router();
const db = new PrismaClient();

// ── Device authentication middleware ──────────────────────────────────────────
async function authenticateDevice(req: Request, res: Response, next: () => void) {
  const key = req.headers["x-device-key"] as string | undefined;
  if (!key) { res.status(401).json({ success: false, error: "Missing X-Device-Key header" }); return; }

  const device = await db.ioTDevice.findUnique({
    where: { deviceKey: key },
    include: { project: { select: { country: true } } },
  });
  if (!device || !device.active) { res.status(401).json({ success: false, error: "Unknown or inactive device" }); return; }

  (req as Request & { device: typeof device }).device = device;
  next();
}

// ── POST /iot/readings ────────────────────────────────────────────────────────
router.post("/readings", authenticateDevice as any, async (req: Request, res: Response) => {
  const device = (req as any).device;

  const {
    kwhGenerated, fuelDisplacedKg, householdsServed,
    temperatureC, humidityPct, soilMoisturePct, rainfallMm, windSpeedMs,
    gasFlowM3h, pressureKpa,
    recordedAt,
  } = req.body;

  const country = device.project?.country ?? 'Kenya';

  let co2AvoidedKg: number | null = null;
  if (kwhGenerated != null) {
    const kg = await co2ForKwh(kwhGenerated, country);
    co2AvoidedKg = (co2AvoidedKg ?? 0) + kg;
  }
  if (fuelDisplacedKg != null) {
    const kg = await co2ForFuelDisplaced(fuelDisplacedKg);
    co2AvoidedKg = (co2AvoidedKg ?? 0) + kg;
  }

  const reading = await db.deviceReading.create({
    data: {
      deviceId:  device.id,
      projectId: device.projectId,
      kwhGenerated:     kwhGenerated     ?? null,
      co2AvoidedKg:     co2AvoidedKg,
      householdsServed: householdsServed ?? null,
      fuelDisplacedKg:  fuelDisplacedKg  ?? null,
      temperatureC:     temperatureC     ?? null,
      humidityPct:      humidityPct      ?? null,
      soilMoisturePct:  soilMoisturePct  ?? null,
      rainfallMm:       rainfallMm       ?? null,
      windSpeedMs:      windSpeedMs      ?? null,
      gasFlowM3h:       gasFlowM3h       ?? null,
      pressureKpa:      pressureKpa      ?? null,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    },
  });

  await db.ioTDevice.update({
    where: { id: device.id },
    data: { lastSeenAt: new Date() },
  });

  res.status(201).json({ success: true, data: reading });
});

// ── POST /iot/devices — Admin registers a new device ──────────────────────────
router.post("/devices", authenticate, async (req: Request, res: Response) => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ success: false, error: "Admins only" });
    return;
  }

  const { projectId, deviceType, label, lat, lng } = req.body;
  if (!projectId || !deviceType) {
    res.status(400).json({ success: false, error: "projectId and deviceType are required" });
    return;
  }

  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) { res.status(404).json({ success: false, error: "Project not found" }); return; }

  // Generate a secure random API key — shown once, burned into device firmware
  const deviceKey = `ka_iot_${randomBytes(24).toString("hex")}`;

  const device = await db.ioTDevice.create({
    data: { projectId, deviceType, label: label ?? null, lat: lat ?? null, lng: lng ?? null, deviceKey },
  });

  res.status(201).json({
    success: true,
    data: {
      ...device,
      _notice: "Save this deviceKey now — it will not be shown again in full.",
    },
  });
});

// ── GET /iot/devices/:id/readings — Last N readings for a device ──────────────
router.get("/devices/:id/readings", authenticate, async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
  const readings = await db.deviceReading.findMany({
    where: { deviceId: req.params.id },
    orderBy: { recordedAt: "desc" },
    take: limit,
  });
  res.json({ success: true, data: readings });
});

// ── GET /iot/projects/:projectId/readings — All readings for a project ────────
router.get("/projects/:projectId/readings", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const readings = await db.deviceReading.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { recordedAt: "desc" },
      take: limit,
      include: { device: { select: { deviceType: true, label: true } } },
    });
    res.json({ success: true, data: readings });
  } catch (err) {
    // Surface as JSON so the client error-formatter can parse it instead of
    // tripping on Express's default "Internal Server Error" plaintext.
    const msg = err instanceof Error ? err.message : "Database error";
    console.error("[iot-service] /projects/:projectId/readings failed:", msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// ── GET /iot/projects/:projectId/devices — All devices for a project ──────────
router.get("/projects/:projectId/devices", async (req: Request, res: Response) => {
  const devices = await db.ioTDevice.findMany({
    where: { projectId: req.params.projectId },
    select: {
      id: true, deviceType: true, label: true, lat: true, lng: true,
      active: true, lastSeenAt: true, createdAt: true,
    },
  });
  res.json({ success: true, data: devices });
});

// ── GET /iot/devices — Admin: list all devices (paginated) ────────────────────
router.get("/devices", authenticate, async (req: Request, res: Response) => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ success: false, error: "Admins only" });
    return;
  }

  const safeSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
  const safePage = Math.max(parseInt(req.query.page as string) || 1, 1);

  const [devices, total] = await Promise.all([
    db.ioTDevice.findMany({
      skip: (safePage - 1) * safeSize,
      take: safeSize,
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, title: true, projectType: true, energyType: true, country: true } },
        _count: { select: { readings: true } },
      },
    }),
    db.ioTDevice.count(),
  ]);

  const safeDevices = devices.map(({ deviceKey: _k, ...rest }) => rest);

  res.json({ success: true, data: { devices: safeDevices, total, page: safePage, pageSize: safeSize } });
});

// ── PATCH /iot/devices/:id — Admin: toggle active, update label ───────────────
router.patch("/devices/:id", authenticate, async (req: Request, res: Response) => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ success: false, error: "Admins only" });
    return;
  }

  const { active, label, lat, lng } = req.body;
  const updated = await db.ioTDevice.update({
    where: { id: req.params.id },
    data: {
      ...(active !== undefined && { active }),
      ...(label  !== undefined && { label }),
      ...(lat    !== undefined && { lat }),
      ...(lng    !== undefined && { lng }),
    },
  });
  const { deviceKey: _k, ...safeDevice } = updated;
  res.json({ success: true, data: safeDevice });
});

export default router;
