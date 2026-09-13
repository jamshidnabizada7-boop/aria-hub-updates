#!/bin/bash
# MANUAL SESSION TOOL — do NOT schedule alongside the app: it drains the same
# translation queue as the in-app automation tick and doubles the AI quota burn.
# Chunked backfill: each run translates up to 25 records in a fresh process
# (low memory footprint), sleeping between chunks. Survives OOM kills by
# simply moving to the next chunk on the next loop iteration.
cd /home/z/my-project
for i in $(seq 1 40); do
  echo "=== chunk $i $(date +%H:%M:%S) ===" >> backfill-translate.log
  bun run scripts/backfill-translate.ts --limit=25 --only=translate >> backfill-translate.log 2>&1
  # Stop condition: no more pending records
  if tail -20 backfill-translate.log | grep -q "0 pending"; then
    echo "=== BACKFILL COMPLETE ===" >> backfill-translate.log
    break
  fi
  sleep 5
done
