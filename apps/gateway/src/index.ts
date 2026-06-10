import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createProxyMiddleware, type Options } from "http-proxy-middleware";

/**
 * Public API gateway. One entry point that fans out to the microservices,
 * mirroring the Next.js dev rewrites so the mobile app (and the web app in
 * production) can target a single stable URL instead of six ports.
 *
 *   /api/auth/*          → auth-service        /auth/*
 *   /api/admin/*         → auth-service        /admin/*
 *   /api/projects/*      → project-service     /projects/*
 *   /api/blog/*          → project-service     /blog/*
 *   /api/marketplace/*   → marketplace-service /marketplace/*
 *   /api/verifications/* → verification-service/verifications/*
 *   /api/iot/*           → iot-service         /iot/*
 *   /api/ipfs/*          → web (Next route)    /api/ipfs/*
 *   /api/geocode/*       → web (Next route)    /api/geocode/*
 *
 * IPFS + geocode live as Next API routes, so in production keep the Next web app
 * running and point WEB_URL at it (or reimplement them as services later).
 */

const app = express();
app.set("trust proxy", 1); // behind LB/ingress in prod — for real client IP forwarding
const PORT = parseInt(process.env.GATEWAY_PORT ?? "8080", 10);

const TARGETS = {
  auth:    process.env.AUTH_SERVICE_URL    ?? "http://localhost:3001",
  project: process.env.PROJECT_SERVICE_URL ?? "http://localhost:3002",
  mkt:     process.env.MARKETPLACE_URL     ?? "http://localhost:3003",
  verify:  process.env.VERIFY_SERVICE_URL  ?? "http://localhost:3004",
  iot:     process.env.IOT_SERVICE_URL     ?? "http://localhost:3005",
  web:     process.env.WEB_URL             ?? "http://localhost:3000",
};

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN ?? "*")
  .split(",")
  .map((s) => s.trim());

app.use(helmet());
app.use(
  cors({
    origin: ALLOWED_ORIGINS.includes("*")
      ? true
      : (origin, cb) => (!origin || ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"))),
    credentials: true,
  }),
);

// NOTE: no body parser — the proxy must stream the raw request body (multipart
// IPFS uploads included) straight through to the target.

app.get("/health", (_req, res) => res.json({ status: "ok", service: "gateway", targets: TARGETS }));

function proxy(target: string, rewrite: Record<string, string>): express.RequestHandler {
  const options: Options = {
    target,
    changeOrigin: true,
    pathRewrite: rewrite,
    xfwd: true,                       // forward X-Forwarded-* so services see the real client IP
    proxyTimeout: 30_000,
    onError(err, _req, res) {
      console.error(`[gateway] proxy error → ${target}:`, err.message);
      if (!(res as express.Response).headersSent) {
        (res as express.Response).status(502).json({ success: false, error: "Upstream service unavailable" });
      }
    },
  };
  return createProxyMiddleware(options);
}

// Order matters: more specific prefixes (/api/projects) are fine because each
// mount only matches its own prefix.
app.use("/api/auth",          proxy(TARGETS.auth,    { "^/api/auth": "/auth" }));
app.use("/api/admin",         proxy(TARGETS.auth,    { "^/api/admin": "/admin" }));
app.use("/api/notifications", proxy(TARGETS.auth,    { "^/api/notifications": "/notifications" }));
app.use("/api/projects",      proxy(TARGETS.project, { "^/api/projects": "/projects" }));
app.use("/api/blog",          proxy(TARGETS.project, { "^/api/blog": "/blog" }));
app.use("/api/marketplace",   proxy(TARGETS.mkt,     { "^/api/marketplace": "/marketplace" }));
app.use("/api/verifications", proxy(TARGETS.verify,  { "^/api/verifications": "/verifications" }));
app.use("/api/iot",           proxy(TARGETS.iot,     { "^/api/iot": "/iot" }));
// Next.js API routes — keep their path unchanged.
app.use("/api/ipfs",          proxy(TARGETS.web,     { "^/api/ipfs": "/api/ipfs" }));
app.use("/api/geocode",       proxy(TARGETS.web,     { "^/api/geocode": "/api/geocode" }));

app.use((_req, res) => res.status(404).json({ success: false, error: "Not found" }));

app.listen(PORT, () => {
  console.log(`gateway running on port ${PORT}`);
  console.table(TARGETS);
});
