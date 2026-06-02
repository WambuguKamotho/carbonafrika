# Production image for iot-service. See auth-service/Dockerfile for the
# turbo-prune rationale.
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN npm install -g turbo@^2

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @carbonafrika/iot-service --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm install
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/tsconfig.base.json ./tsconfig.base.json
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN turbo run build --filter=@carbonafrika/iot-service

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/iot-service/dist ./dist
EXPOSE 3005
CMD ["node", "dist/index.js"]
