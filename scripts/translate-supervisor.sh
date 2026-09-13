#!/bin/bash
# MANUAL SESSION TOOL — do NOT schedule alongside the app: it drains the same
# translation queue as the in-app automation tick and doubles the AI quota burn.
# translate-supervisor.sh — keeps scripts/translate-fill-all.mjs running until
# ALL fa/ps translations are complete. The fill script is checkpointed
# (scripts/.translate-progress.json), so restarts resume exactly where the
# previous run stopped. Survives OOM kills, 429-storm crashes, and sandbox
# restarts (re-run this script after a sandbox reset).
LOG=/tmp/translate-fill.log
cd /home/z/my-project
echo "$(date '+%F %T') supervisor started (pid $$)" >> "$LOG"
while true; do
  node scripts/translate-fill-all.mjs >> "$LOG" 2>&1
  code=$?
  if [ $code -eq 0 ]; then
    echo "$(date '+%F %T') fill loop finished cleanly (exit 0) — all done" >> "$LOG"
    break
  fi
  echo "$(date '+%F %T') fill loop crashed (exit $code) — restarting in 15s" >> "$LOG"
  sleep 15
done
