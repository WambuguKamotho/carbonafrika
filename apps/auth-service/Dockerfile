# Production image for auth-service. Uses `turbo prune` to build only this
# service + its workspace deps (@carbonafrika/db, @carbonafrika/types), so the
# dependency packages are compiled in the right order (fixes "Cannot find
# module '@carbonafrika/db'") and the image stays small.
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN npm install -g turbo@^2

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @carbonafrika/auth-service --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm install
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN turbo run build --filter=@carbonafrika/auth-service

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/auth-service/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]
