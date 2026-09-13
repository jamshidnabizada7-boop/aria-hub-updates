#!/bin/bash
# ARIA HUB — one-shot sandbox recovery.
# The sandbox periodically resets: background processes are killed, some empty
# runtime dirs vanish, .env reverts to the sqlite scaffold default and pgdata
# perms break. This script brings the whole stack back idempotently:
#   1. repair embedded-postgres data dir (perms + missing empty runtime dirs)
#   2. boot postgres :5433 (database ariahub)
#   3. pin .env to the local postgres URL
#   4. ensure prisma client exists
#   5. restart the dev server (dev-restart.sh: ipv4only preload + warmup)
# Safe to run any number of times.
set -u
cd /home/z/my-project

PGDATA=/home/z/my-project/db/pgdata

# 1) repair pgdata ------------------------------------------------------------
if [ -d "$PGDATA" ]; then
  chmod 700 "$PGDATA" 2>/dev/null
  # postgres refuses to start if these (usually-empty) dirs are missing
  for d in pg_notify pg_tblspc pg_replslot pg_twophase pg_commit_ts \
           pg_snapshots pg_serial pg_stat pg_stat_tmp \
           pg_wal/archive_status pg_logical/mappings pg_logical/snapshots; do
    mkdir -p "$PGDATA/$d"
    chmod 700 "$PGDATA/$d" 2>/dev/null
  done
  echo "[recover] pgdata repaired"
else
  echo "[recover] WARNING: $PGDATA missing — pg-boot will initialise an EMPTY cluster;" \
       "restore with: node scripts/db-import.mjs --url postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable --file download/canonical-export-r23.json"
fi

# 2) boot postgres (skip if already accepting connections) --------------------
if ! node -e "const n=require('net');const s=n.connect(5433,'127.0.0.1');s.on('connect',()=>{process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),1500)" 2>/dev/null; then
  echo "[recover] booting postgres…"
  setsid nohup node scripts/pg-boot.mjs > logs/pg-boot.log 2>&1 < /dev/null &
  for i in $(seq 1 30); do
    sleep 1
    if node -e "const n=require('net');const s=n.connect(5433,'127.0.0.1');s.on('connect',()=>{process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),1000)" 2>/dev/null; then
      echo "[recover] postgres up after ${i}s"; break
    fi
  done
else
  echo "[recover] postgres already up"
fi

# 3) pin .env -----------------------------------------------------------------
if ! grep -q "5433/ariahub" .env 2>/dev/null; then
  printf 'DATABASE_URL=postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable\n' > .env
  echo "[recover] .env pinned to local postgres"
fi

# 4) prisma client ------------------------------------------------------------
if [ ! -d node_modules/.prisma/client ] || [ ! -d node_modules/@prisma/client ]; then
  echo "[recover] generating prisma client…"
  npx prisma generate 2>&1 | tail -1
fi

# 5) dev server ---------------------------------------------------------------
if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://localhost:3000/en 2>/dev/null)" != "200" ]; then
  echo "[recover] starting dev server…"
  bash scripts/dev-restart.sh
else
  echo "[recover] dev server already serving"
fi

echo "[recover] done"
