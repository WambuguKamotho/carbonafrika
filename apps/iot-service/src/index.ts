import "./loadEnv";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import iotRoutes from "./routes/iot";

const app = express();
app.set("trust proxy", 1); // behind gateway/LB in prod — for rate-limit + real client IP
const PORT = process.env.IOT_PORT || 3005;

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map(s => s.trim());

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => (!origin || ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"))),
  credentials: true,
}));
app.use(express.json({ limit: "500kb" }));

// Rate limit device ingestion endpoint to prevent sensor flooding
const readingsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many readings — slow down" },
});
app.use("/iot/readings", readingsLimiter);

app.get("/health", (_req, res) => res.json({ status: "ok", service: "iot-service" }));
app.use("/iot", iotRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[iot-service error]", err.message);
  const isProd = process.env.NODE_ENV === "production";
  res.status(500).json({ success: false, error: isProd ? "Internal server error" : err.message });
});

app.listen(PORT, () => {
  console.log(`iot-service running on port ${PORT}`);
});
