#!/bin/bash
# MANUAL SESSION TOOL — do NOT schedule alongside the app: it drains the same
# translation queue as the in-app automation tick and doubles the AI quota burn.
# Patient trilingual blog translation loop: 1 post per attempt, 15-min pause.
# Self-stops after 6h or when no pending rows remain. Designed to coexist with
# the opportunity backfill loop (it loses 429 battles gracefully and retries).
cd /home/z/my-project
END=$((SECONDS + 21600))
while [ $SECONDS -lt $END ]; do
  echo "=== blog batch start $(date +%H:%M:%S) ===" >> blog-translate.log
  OUT=$(DATABASE_URL="${DATABASE_URL:?set DATABASE_URL in .env}" \
    bun run scripts/translate-blog.ts --limit=1 2>&1 | tail -8)
  echo "$OUT" >> blog-translate.log
  PENDING=$(echo "$OUT" | grep -oE "remaining≈[0-9]+" | grep -oE "[0-9]+" | tail -1)
  if [ "${PENDING:-1}" = "0" ]; then echo "BLOG ALL DONE $(date)" >> blog-translate.log; break; fi
  sleep 900
done
