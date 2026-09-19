#!/usr/bin/env bash
# Restore a local data dump (made by deploy/export-local-db.sh) into the
# server's Postgres container.
#
# Usage:  bash deploy/import-data.sh ubuntu@SERVER_IP [dump-file]
# Default dump file: ./aria-local-data.sql (pushed to the server first).
set -euo pipefail

HOST="${1:?usage: import-data.sh ubuntu@SERVER_IP [dump-file]}"
DUMP="${2:-aria-local-data.sql}"
[ -f "$DUMP" ] || { echo "dump file not found: $DUMP"; exit 1; }

scp -q "$DUMP" "$HOST:/tmp/aria-restore.sql"
ssh "$HOST" "sudo docker compose -f /opt/ariahub/deploy/docker-compose.yml exec -T db \
  psql -U aria -d ariahub -v ON_ERROR_STOP=0 -f -" < "$DUMP"
ssh "$HOST" "rm -f /tmp/aria-restore.sql"

echo "Restore finished. Restart the app so caches rebuild:"
echo "  ssh $HOST 'cd /opt/ariahub/deploy && sudo docker compose restart app'"
