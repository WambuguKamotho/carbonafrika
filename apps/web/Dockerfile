FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/web/package.json ./apps/web/

RUN npm ci

COPY packages/types/ ./packages/types/
COPY apps/web/ ./apps/web/

RUN npm run build --workspace=@carbonafrika/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public/

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
