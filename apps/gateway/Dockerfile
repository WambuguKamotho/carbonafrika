# Production image for the Express API gateway (apps/gateway).
# Pure reverse proxy — no database — so no Prisma step. Uses turbo prune for a
# small, fast build consistent with the other services.
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN npm install -g turbo@^2

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @carbonafrika/gateway --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm install
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN turbo run build --filter=@carbonafrika/gateway

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/gateway/dist ./dist
EXPOSE 8080
CMD ["node", "dist/index.js"]
