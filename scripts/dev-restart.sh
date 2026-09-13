#!/bin/bash
# Restart the ARIA HUB dev server with the correct Neon DATABASE_URL.
# The platform shell exports DATABASE_URL=file:... (sqlite scaffold) which
# overrides .env — this script forces the production Neon URL.
#
# LD_PRELOAD=ipv4only.so: sandbox IPv6 route broke (AAAA -> ECONNREFUSED) and
# the Prisma engine tries AAAA first, killing every connection. The shim
# narrows getaddrinfo() to IPv4 (see scripts/ipv4only.c). Harmless when IPv6
# comes back — everything here is reachable over IPv4.
pkill -f "next-server" 2>/dev/null
pkill -f "bun run dev" 2>/dev/null
sleep 3
cd /home/z/my-project

# DB URL resolution (same order as dev-watchdog.sh):
# 1. DATABASE_URL_OVERRIDE env  2. scripts/.dev-db-url file  3. Neon default
DBFILE=/home/z/my-project/scripts/.dev-db-url
if [ -z "$DATABASE_URL_OVERRIDE" ] && [ -f "$DBFILE" ]; then
  DATABASE_URL_OVERRIDE="$(cat "$DBFILE")"
fi
# CLEAR_NEXT=1 wipes Turbopack's incremental cache — use when the
# "Failed to write app endpoint /page" panic loop gets stuck.
if [ "${CLEAR_NEXT:-0}" = "1" ]; then
  rm -rf .next
  echo ".next cache cleared"
fi
rm -f dev.log dev-warmup.log
setsid nohup env \
  LD_PRELOAD=/home/z/my-project/scripts/ipv4only.so \
  DATABASE_URL="${DATABASE_URL_OVERRIDE:-${DATABASE_URL:?set DATABASE_URL in .env}" \
  AI_PROVIDER=zai \
      NODE_OPTIONS="--max-old-space-size=1536" \
  IMPORT_GLOBAL_TIMEOUT_MS=600000 \
  bun run dev > /dev/null 2>&1 < /dev/null &
disown
# Pre-compile key routes sequentially (detached) — prevents the Turbopack
# "Failed to write app endpoint /page" panic loop triggered by concurrent
# first-compiles from browser tabs (see scripts/dev-warmup.sh).
setsid nohup bash /home/z/my-project/scripts/dev-warmup.sh > /dev/null 2>&1 < /dev/null &
disown
echo "dev server restarting on :3000 (LD_PRELOAD ipv4only active, warmup started)"
