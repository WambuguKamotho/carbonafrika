import "./loadEnv";

import express from "express";

// Keep process alive if BullMQ/Redis fires unhandled rejections in dev
process.on("unhandledRejection", (reason) => {
  console.warn("[marketplace] Unhandled rejection (likely Redis/BullMQ):", reason);
});
import cors from "cors";
import helmet from "helmet";
import marketplaceRoutes from "./routes/marketplace";

const app = express();
app.set("trust proxy", 1); // behind gateway/LB in prod — for rate-limit + real client IP
const PORT = process.env.MARKETPLACE_PORT || 3003;

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map(s => s.trim());

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => (!origin || ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"))),
  credentials: true,
}));
app.use(express.json({ limit: "500kb" }));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "marketplace-service" }));
app.use("/marketplace", marketplaceRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[marketplace-service error]", err.message);
  const isProd = process.env.NODE_ENV === "production";
  res.status(500).json({ success: false, error: isProd ? "Internal server error" : err.message });
});

app.listen(PORT, () => {
  console.log(`marketplace-service running on port ${PORT}`);
});
