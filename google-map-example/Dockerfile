# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# Needed to build better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY public ./public

RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS runtime
WORKDIR /usr/src/app
COPY --from=base /usr/src/app/node_modules ./node_modules
COPY --from=base /usr/src/app/dist ./dist
COPY public ./public

ENV PORT=4000 \
    PROVIDER_FALLBACK=none \
    CACHE_TTL_PLACES=604800000 \
    CACHE_TTL_GEOCODE=1209600000 \
    PREFETCH_INTERVAL_MS=43200000 \
    DB_PATH=/usr/src/app/data/app.db

EXPOSE 4000
CMD ["node", "dist/index.js"]
