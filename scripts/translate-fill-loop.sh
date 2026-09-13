#!/bin/bash
# translate-fill-loop.sh — R21-c trilingual completeness driver.
# Runs scripts/translate-fill-all.mjs in passes (checkpointed/resumable) until
# scripts/i18n-audit.mjs reports 0 missing fa/ps cells, or 6h elapse.
# Survives LLM 429 storms: each pass resumes from scripts/.translate-progress.json.
#
# Usage:
#   bash scripts/translate-fill-loop.sh                        # local DB (.env)
#   bash scripts/translate-fill-loop.sh "postgresql://…"       # any postgres URL (e.g. Neon)
cd /home/z/my-project
DB="${1:-}"
END=$((SECONDS + 21600))
while [ $SECONDS -lt $END ]; do
  echo "=== pass start $(date +%H:%M:%S) ===" >> translate-fill.log
  node scripts/translate-fill-all.mjs $DB >> translate-fill.log 2>&1
  MISSING=$(node scripts/i18n-audit.mjs $DB 2>/dev/null | grep -oE 'cells missing fa or ps: [0-9]+' | grep -oE '[0-9]+$')
  echo "=== pass done, missing=${MISSING:-?} $(date) ===" >> translate-fill.log
  if [ "${MISSING:-1}" = "0" ]; then echo "ALL DONE $(date)" >> translate-fill.log; break; fi
  sleep 300
done
