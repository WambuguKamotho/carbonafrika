# Production Readiness — Kabon.Africa

## What runs in production
| Component | What it is | Notes |
|---|---|---|
| **web** | Next.js 14 (`output: standalone`) | The buyer/owner/admin website |
| **gateway** | Express reverse proxy (`apps/gateway`) | One public API entrypoint → all services |
| **auth / project / marketplace / verification / iot** | Express microservices (3001–3005) | Internal; only reached via the gateway |
| **worker** | BullMQ worker (settlement, minting, retirement, notifications) | No HTTP port |
| **notification** | BullMQ worker + Resend email | Internal |
| **Postgres** | Primary datastore | |
| **Redis** | BullMQ queues | |

Public surface = **2 hostnames**: the web app and the gateway (`api.*`). Everything else is private.

## Code/config done for production
- ✅ Web production build passes (`next build`).
- ✅ React aligned to 18/18 (removed unused `react-leaflet@5` that forced React 19).
- ✅ `useSearchParams` Suspense boundaries on request-access / redeem-invite / partner-application.
- ✅ All services + gateway `app.set("trust proxy", 1)` (correct client IP + rate limiting behind LB).
- ✅ Mobile `eas.json` sets `EXPO_PUBLIC_API_URL` per profile (prod → `https://api.kabon.africa`).

## Secrets / env you MUST set (do NOT ship dev values)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — regenerate 256-bit random (dev ones are placeholders).
- `ENCRYPTION_KEY` — 64 hex chars; **must persist** (losing it makes encrypted bank fields unreadable).
- `DATABASE_URL`, `REDIS_URL` — managed instances.
- `CORS_ORIGIN` — set to the real web origin(s), comma-separated. No `*` in prod.
- Gateway: `AUTH_SERVICE_URL … IOT_SERVICE_URL`, `WEB_URL` (internal hostnames), `GATEWAY_PORT`.
- `RESEND_API_KEY`, `FROM_EMAIL` — so invite/notification emails actually send.
- `PINATA_API_KEY`, `PINATA_SECRET_KEY` — IPFS uploads.
- `PUBLIC_APP_URL` — used in invite magic-links.
- Payments (only when going live): `DEPLOYER_PRIVATE_KEY`, `POLYGON_RPC_URL`, `USDC_ADDRESS`, `PLATFORM_TREASURY_ADDRESS`. Keep the key in a vault / use a multisig.
- `NODE_ENV=production` everywhere.

## Database
- Switch from `prisma db push` to **`prisma migrate deploy`** (migrations are baselined at `0_init`).
- Enable automated backups on the managed Postgres.

## Pre-launch hardening (from the audit, still open)
- Verification maker-checker is enforced ✅; payments remain simulated until the chain envs are set (by design for now).
- Treasury hot-key custody → use a multisig (Gnosis Safe) before real USDC flows.
- Add a Content-Security-Policy rollout review; rotate any committed secrets.

---

## Hosting — budget-friendly, Africa-first

This is ~10 processes + Postgres + Redis. Cheapest sane setups, low traffic:

### Recommended (cheapest, full control): one VPS + Docker Compose
- **Hetzner CPX21** (~€8/mo, 3 vCPU / 4 GB) or **DigitalOcean 4 GB droplet** (~$24/mo).
- Run gateway + 5 services + 2 workers + Postgres + Redis from a single `docker-compose.yml`.
- **Caddy** in front for automatic free TLS (Let's Encrypt) + routing `kabon.africa` → web and `api.kabon.africa` → gateway.
- One bill, one box. Perfect for YC-stage / pre-revenue.

### Managed alternative (less ops): Railway or Fly.io
- **Railway** — deploy each service + managed Postgres + Redis in one project; usage-based, ~$10–20/mo at low traffic.
- **Fly.io** — has a **Johannesburg (`jnb`) region** → lowest latency for African users; pair with **Upstash Redis** + **Neon Postgres** (both have free tiers).

### Split option (offload stateful tiers to free tiers)
- **Neon** (Postgres, free tier) + **Upstash** (Redis, free tier) + a small VPS/Railway for Node + **Vercel** (web). Keeps the hard-to-run parts managed and free early on.

### Mobile
- **EAS Build** free tier for APK/AAB; submit to Play Store / App Store when ready.

## .africa domain
- `.africa` is run by **ZACR / Registry.Africa**. Cloudflare Registrar does **not** sell it.
- Register via an accredited registrar: **Afrihost, Truehost, Domains.co.za** (local) or **GoDaddy** (intl). ~$15–25/yr.
- Then move **DNS to Cloudflare (free)** for DNS + CDN + TLS, regardless of registrar.
- Records:
  - `kabon.africa` → web app
  - `api.kabon.africa` → gateway
  - `www` → redirect to apex
