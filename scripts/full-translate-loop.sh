#!/bin/bash
# MANUAL SESSION TOOL — do NOT schedule alongside the app: it drains the same
# translation queue as the in-app automation tick and doubles the AI quota burn.
# Gentle full-trilingual backfill loop: batch of 10, then 10-min pause.
# Self-stops after 6h or when nothing is pending.
cd /home/z/my-project
END=$((SECONDS + 21600))
while [ $SECONDS -lt $END ]; do
  echo "=== batch start $(date +%H:%M:%S) ===" >> full-translate.log
  OUT=$(bun run scripts/backfill-full-translate.ts --only=translate --limit=10 2>&1 | tail -20)
  echo "$OUT" >> full-translate.log
  PENDING=$(echo "$OUT" | grep -oE "[0-9]+ pending full translation" | tail -1 | grep -oE "^[0-9]+")
  if [ "${PENDING:-1}" = "0" ]; then echo "ALL DONE $(date)" >> full-translate.log; break; fi
  sleep 600
done
