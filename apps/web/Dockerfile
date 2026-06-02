# Production image for the Next.js web app in this Turborepo monorepo.
# Uses `turbo prune` so we only install/build @carbonafrika/web + its workspace
# deps (not the mobile app, services, or contracts) — small, fast, reliable.

# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# 1) Prune the monorepo down to just the web app's subgraph
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2
COPY . .
RUN turbo prune @carbonafrika/web --docker

# 2) Install deps (cached on manifests) then build
FROM base AS builder
WORKDIR /app
RUN npm install -g turbo@^2
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm install
COPY --from=pruner /app/out/full/ .
# `turbo prune` omits root config files; web's tsconfig.json extends this one.
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
# NEXT_PUBLIC_* are inlined into the client bundle at build time, so they must
# be present here (the runtime .env is too late and is dockerignored anyway).
# Passed from docker-compose's `build.args`.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_POLYGON_CHAIN_ID
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_POLYGON_CHAIN_ID=$NEXT_PUBLIC_POLYGON_CHAIN_ID \
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
RUN turbo run build --filter=@carbonafrika/web
RUN rm -rf apps/web/.next/cache

# 3) Minimal runtime: the Next.js standalone server
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
