#!/usr/bin/env bash
# Export the production Neon database to a local SQL file.
# Output: aria-neon-YYYYMMDD.sql (schema + data, restorable into any Postgres).
#
# Usage:  bash deploy/export-neon.sh [output-file]
# Needs the pg18 client tools in tools/pg18 (see the repo owner's machine).
set -euo pipefail

cd "$(dirname "$0")/.."

NEON_URL="${1:-${NEON_URL:-}}"
[ -n "$NEON_URL" ] || NEON_URL=$(grep -E '^DIRECT_URL=' vercel-env.txt | cut -d= -f2-)
[ -n "$NEON_URL" ] || { echo "set NEON_URL or DIRECT_URL in vercel-env.txt"; exit 1; }

OUT="${2:-aria-neon-$(date +%Y%m%d).sql}"
PG_DUMP=tools/pg18/pg_dump.exe
[ -f "$PG_DUMP" ] || PG_DUMP=pg_dump

"$PG_DUMP" --no-owner --no-privileges --clean --if-exists "$NEON_URL" > "$OUT"
echo "exported: $OUT ($(du -h "$OUT" | cut -f1))"
