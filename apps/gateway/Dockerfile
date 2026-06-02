# Production image for the Express API gateway (apps/gateway).
# Pure reverse proxy — no database — so the build is simple: full monorepo
# install (node_modules is excluded by .dockerignore), then turbo builds just
# the gateway subgraph.
# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npx turbo run build --filter=@carbonafrika/gateway

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/gateway/dist ./apps/gateway/dist
EXPOSE 8080
CMD ["node", "apps/gateway/dist/index.js"]
