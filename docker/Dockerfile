# === Stage 1: Dependencies ===
FROM node:22-slim AS deps
WORKDIR /app

# System deps for building native modules (node-canvas for chartjs-node-canvas)
RUN apt-get update && apt-get install -y \
    openssl \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# === Stage 2: Build ===
FROM deps AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# === Stage 3a: Production — Next.js app ===
# Uses standalone output (minimal node_modules trace for the web server)
FROM node:22-slim AS runner-app
WORKDIR /app
ENV NODE_ENV=production

# curl for healthcheck + openssl for Prisma
RUN apt-get update && apt-get install -y curl openssl && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 cfreporting

# Copy Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma runtime (needed by the app for database queries)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma ./prisma

USER cfreporting
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]

# === Stage 3b: Production — BullMQ worker ===
# Needs full production deps (canvas, bullmq, etc.) + compiled worker
FROM node:22-slim AS runner-worker
WORKDIR /app
ENV NODE_ENV=production

# Runtime libs for node-canvas (no dev headers needed, just shared libs)
RUN apt-get update && apt-get install -y \
    openssl \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 cfreporting

# Copy full production node_modules (worker needs canvas, bullmq, ioredis, etc.)
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled worker bundle
COPY --from=builder /app/dist ./dist

# Copy Prisma schema + generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER cfreporting
CMD ["node", "dist/workers/index.js"]

# === Stage 3c: Production — Prisma migration runner ===
# One-shot container: runs migrations then exits
FROM node:22-slim AS runner-migrate
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Prisma CLI (from devDependencies) + client + schema
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

CMD ["npx", "prisma", "migrate", "deploy"]
