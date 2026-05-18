FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY apps/auth-service/package.json ./apps/auth-service/

RUN npm ci

COPY packages/ ./packages/
COPY apps/auth-service/ ./apps/auth-service/

RUN npx prisma generate --schema=packages/db/prisma/schema.prisma
RUN npm run build --workspace=@carbonafrika/auth-service

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/auth-service/dist ./dist

EXPOSE 3001
CMD ["node", "dist/index.js"]
