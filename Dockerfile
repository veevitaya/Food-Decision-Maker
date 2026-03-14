FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config and root manifests first for layer caching
COPY pnpm-workspace.yaml* ./
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/algorithms/package.json ./packages/algorithms/

RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm -F api run build

# Prune dev dependencies (non-interactive in Docker build)
RUN CI=true pnpm prune --prod

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=3002

COPY package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "dist/index.cjs"]
