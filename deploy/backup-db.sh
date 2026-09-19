#!/usr/bin/env bash
# Nightly DB backup: pg_dump | gzip, keep the last 14. Runs via /etc/cron.d.
set -euo pipefail

DIR=/opt/ariahub/backups
STAMP=$(date +%Y%m%d-%H%M)
cd /opt/ariahub/deploy

mkdir -p "$DIR"
docker compose exec -T db pg_dump -U aria ariahub | gzip > "$DIR/ariahub-$STAMP.sql.gz"
ls -1t "$DIR"/ariahub-*.sql.gz | tail -n +15 | xargs -r rm --
echo "backup ok: $DIR/ariahub-$STAMP.sql.gz"
