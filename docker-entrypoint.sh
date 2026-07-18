#!/bin/sh
# docker-entrypoint.sh — ensures DB schema is in sync, then starts the Next.js server.
#
# Strategy:
#   1. If prisma/migrations/* exists  → run `prisma migrate deploy` (versioned migrations)
#   2. Otherwise                      → run `prisma db push` (schema-first sync)
#
# Resilient to transient DB connectivity issues at startup (e.g. external Postgres).
set -e

MAX_RETRIES=10
RETRY_DELAY=5

echo "==> Waiting for PostgreSQL to be reachable…"
for i in $(seq 1 $MAX_RETRIES); do
  if bunx prisma migrate status >/dev/null 2>&1; then
    echo "   PostgreSQL is reachable."
    break
  fi
  echo "   Attempt $i/$MAX_RETRIES failed — retrying in ${RETRY_DELAY}s…"
  sleep $RETRY_DELAY
done

echo "==> Syncing database schema…"
if [ -d "/app/prisma/migrations" ] && [ "$(ls -A /app/prisma/migrations 2>/dev/null)" ]; then
  echo "   Using versioned migrations (prisma migrate deploy)…"
  bunx prisma migrate deploy || {
    echo "   WARNING: prisma migrate deploy failed. Server will still start."
  }
else
  echo "   No migrations folder detected — using schema-first sync (prisma db push)…"
  bunx prisma db push --accept-data-loss || {
    echo "   WARNING: prisma db push failed. Server will still start."
  }
fi

echo "==> Starting ABW-BOS server…"
exec "$@"

