# syntax=docker/dockerfile:1.7

# =============================================================================
# ABW-BOS — Multi-stage Dockerfile
# Production-grade Next.js 16 standalone build with Prisma + Bun runtime.
# =============================================================================

# ---------- 1. Base image with Bun ----------
FROM oven/bun:1.3 AS base
WORKDIR /app

# ---------- 2. Dependencies layer ----------
FROM base AS deps
# Install OS deps needed for Prisma engine + sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy lockfile + manifests first for caching
COPY package.json bun.lock* ./
COPY prisma ./prisma

# Install dependencies (production + dev, we need prisma CLI for migrate)
RUN bun install --frozen-lockfile

# Generate Prisma client
RUN bunx prisma generate

# ---------- 3. Build layer ----------
FROM deps AS builder
COPY . .

# Build-time env (no secrets here — real secrets come from env at runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the Next.js standalone output
RUN bun run build

# ---------- 4. Runner (production image) ----------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Install minimal runtime OS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 1001 nextjs

# Copy standalone Next.js output
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

# Copy Prisma migrations + schema (for `prisma migrate deploy` at startup)
COPY --from=builder --chown=nextjs:nextjs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nextjs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nextjs /app/node_modules/@prisma ./node_modules/@prisma

# Copy package.json + prisma CLI for migrate
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nextjs /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Entrypoint script: runs migrations, then starts the server
COPY --chown=nextjs:nextjs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/auth/me >/dev/null 2>&1 || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bun", ".next/standalone/server.js"]
