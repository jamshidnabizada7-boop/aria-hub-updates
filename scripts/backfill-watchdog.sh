#!/bin/bash
# MANUAL SESSION TOOL — do NOT schedule alongside the app: it drains the same
# translation queue as the in-app automation tick and doubles the AI quota burn.
# Persistent backfill watchdog: retries the translation backfill every 10 min
# for up to 12 hours. Each attempt translates up to 20 records. Stops when
# no records remain pending. Survives 429 rate-limit windows by waiting.
cd /home/z/my-project
for i in $(seq 1 72); do
  echo "=== attempt $i $(date +%H:%M:%S) ===" >> backfill-translate.log
  bun run scripts/backfill-translate.ts --limit=20 --only=translate >> backfill-translate.log 2>&1
  if tail -20 backfill-translate.log | grep -q "0 pending"; then
    echo "=== BACKFILL COMPLETE ===" >> backfill-translate.log
    break
  fi
  sleep 600
done
