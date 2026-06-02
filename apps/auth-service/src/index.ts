import "./loadEnv";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";

const app = express();
app.set("trust proxy", 1); // behind gateway/LB in prod — for rate-limit + real client IP
const PORT = process.env.AUTH_PORT || 3001;

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map(s => s.trim());

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => (!origin || ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"))),
  credentials: true,
}));
app.use(express.json({ limit: "500kb" }));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "auth-service" }));
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[auth-service error]", err.message);
  const isProd = process.env.NODE_ENV === "production";
  res.status(500).json({ success: false, error: isProd ? "Internal server error" : err.message });
});

app.listen(PORT, () => {
  console.log(`auth-service running on port ${PORT}`);
});
