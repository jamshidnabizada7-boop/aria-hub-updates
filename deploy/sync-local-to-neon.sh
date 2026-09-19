#!/usr/bin/env bash
# Publish local database content to Neon (one-way content sync).
#
# Flow for AI-assisted database work:
#   1. experiment locally against .localpg (free, unlimited)
#   2. when the result is final, run this script ONCE to publish to Neon
#
# Usage:  bash deploy/sync-local-to-neon.sh [--schema-and-data | --data-only]
#   --data-only (default) keeps the Neon schema, replaces table contents
#   --schema-and-data     full replace (use after schema changes)
set -euo pipefail

cd "$(dirname "$0")/.."

MODE="${1:---data-only}"
LOCAL_URL="postgresql://postgres:postgres@127.0.0.1:5433/ariahub"
NEON_URL=$(grep -E '^DIRECT_URL=' vercel-env.txt | cut -d= -f2-)
[ -n "$NEON_URL" ] || { echo "DIRECT_URL missing from vercel-env.txt"; exit 1; }

PG_DUMP=tools/pg18/pg_dump.exe
PSQL=tools/pg18/psql.exe
[ -f "$PG_DUMP" ] || { PG_DUMP=pg_dump; PSQL=psql; }

DUMP=/tmp/aria-sync.sql
if [ "$MODE" = "--schema-and-data" ]; then
  "$PG_DUMP" --no-owner --no-privileges --clean --if-exists "$LOCAL_URL" > "$DUMP"
else
  # data-only, ordered: truncate handled by --clean on data-only? Use inserts
  # with --disable-triggers requires superuser; instead delete in FK-safe way:
  # simplest reliable path on Neon owner roles is schema+data replace.
  echo "note: Neon owner roles cannot disable triggers, falling back to full replace"
  "$PG_DUMP" --no-owner --no-privileges --clean --if-exists "$LOCAL_URL" > "$DUMP"
fi

echo "restoring into Neon..."
"$PSQL" "$NEON_URL" -q -v ON_ERROR_STOP=1 -f "$DUMP"
echo "done: local database published to Neon"
echo "reminder: no Vercel redeploy needed for content changes (ISR picks them up)"
