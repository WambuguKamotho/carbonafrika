# Production image for the IoT ingestion service (apps/iot-service).
# Depends on @carbonafrika/db (Prisma) + @carbonafrika/types, so we install the
# full monorepo, generate the Prisma client, then turbo builds the service and
# its workspace deps in order.
# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY . .
RUN npm install
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN npx turbo run build --filter=@carbonafrika/iot-service

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/iot-service/dist ./apps/iot-service/dist
EXPOSE 3005
CMD ["node", "apps/iot-service/dist/index.js"]
