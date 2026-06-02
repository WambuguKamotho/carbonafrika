# API Gateway

Single public entry point that routes `/api/*` to the microservices — the
production replacement for the Next.js dev `rewrites`. Point the mobile app's
`EXPO_PUBLIC_API_URL` (and the web app in prod) at this gateway.

## Run
```bash
npm install            # from repo root
cd apps/gateway && npm run dev      # dev (tsx watch), port 8080
# or: npm run build && npm start    # prod
```

## Env (all optional — sensible localhost defaults)
```
GATEWAY_PORT=8080
AUTH_SERVICE_URL=http://localhost:3001
PROJECT_SERVICE_URL=http://localhost:3002
MARKETPLACE_URL=http://localhost:3003
VERIFY_SERVICE_URL=http://localhost:3004
IOT_SERVICE_URL=http://localhost:3005
WEB_URL=http://localhost:3000          # serves /api/ipfs + /api/geocode (Next routes)
CORS_ORIGIN=*                          # comma-separated allowlist in prod
```

## Routes
| Public | Upstream |
|---|---|
| `/api/auth/*` | auth-service `/auth/*` |
| `/api/admin/*` | auth-service `/admin/*` |
| `/api/projects/*` | project-service `/projects/*` |
| `/api/blog/*` | project-service `/blog/*` |
| `/api/marketplace/*` | marketplace-service `/marketplace/*` |
| `/api/verifications/*` | verification-service `/verifications/*` |
| `/api/iot/*` | iot-service `/iot/*` |
| `/api/ipfs/*`, `/api/geocode/*` | web (Next API routes) |

`GET /health` returns status + resolved targets.

## Production notes
- Put TLS in front (load balancer / ingress); the gateway speaks plain HTTP.
- `xfwd` forwards `X-Forwarded-*`; set `app.set('trust proxy', …)` on the
  services so rate-limiters key on the real client IP.
- IPFS upload + geocode currently live as Next routes — either keep the web app
  running behind `WEB_URL`, or promote them into a small service later.
