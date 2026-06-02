import "./loadEnv";

import express from "express";

// Keep process alive if BullMQ/Redis fires unhandled rejections in dev
process.on("unhandledRejection", (reason) => {
  console.warn("[project-service] Unhandled rejection (likely Redis/BullMQ):", reason);
});
import cors from "cors";
import helmet from "helmet";
import projectRoutes from "./routes/projects";
import blogRoutes    from "./routes/blog";

const app = express();
app.set("trust proxy", 1); // behind gateway/LB in prod — for rate-limit + real client IP
const PORT = process.env.PROJECT_PORT || 3002;

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map(s => s.trim());

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => (!origin || ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"))),
  credentials: true,
}));
app.use(express.json({ limit: "500kb" }));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "project-service" }));
app.use("/projects", projectRoutes);
app.use("/blog",     blogRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[project-service error]", err.message);
  const isProd = process.env.NODE_ENV === "production";
  res.status(500).json({ success: false, error: isProd ? "Internal server error" : err.message });
});

app.listen(PORT, () => {
  console.log(`project-service running on port ${PORT}`);
});
