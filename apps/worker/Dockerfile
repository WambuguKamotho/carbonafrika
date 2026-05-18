FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY apps/worker/package.json ./apps/worker/

RUN npm ci

COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN npm run build --workspace=@carbonafrika/worker

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/worker/dist ./dist

CMD ["node", "dist/index.js"]
