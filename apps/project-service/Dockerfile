FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g turbo

FROM base AS builder
COPY . .
RUN turbo prune --scope=@carbonafrika/project-service --docker

FROM base AS installer
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm ci

COPY --from=builder /app/out/full/ .
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN npm run build --workspace=apps/project-service

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=installer /app/apps/project-service/dist ./dist
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/packages ./packages

EXPOSE 3002
CMD ["node", "dist/index.js"]
