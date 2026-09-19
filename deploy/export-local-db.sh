#!/usr/bin/env bash
# Dump the local dev Postgres (embedded-postgres, Windows) so its data can be
# restored on the server: deploy/import-data.sh runs the restore there.
#
# NOTE: the local DB must be RUNNING (start `bun run dev` first, then run this
# in a second terminal — pg_dump needs a live server).
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

PG_DUMP=$(ls node_modules/@embedded-postgres/*/native/bin/pg_dump.exe 2>/dev/null | head -1) \
  || PG_DUMP=$(ls node_modules/@embedded-postgres/*/native/bin/pg_dump 2>/dev/null | head -1) \
  || { echo "pg_dump not found under node_modules/@embedded-postgres"; exit 1; }

DB_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)
[ -n "$DB_URL" ] || { echo "DATABASE_URL not found in .env"; exit 1; }

OUT="$REPO/aria-local-data.sql"
"$PG_DUMP" --no-owner --no-privileges --clean --if-exists "$DB_URL" > "$OUT"
echo "Dumped to $OUT ($(du -h "$OUT" | cut -f1))"
echo "Send it to the server, then run: bash deploy/import-data.sh SERVER_IP"
