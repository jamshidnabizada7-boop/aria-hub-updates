#!/bin/bash
# Sequentially pre-compiles key routes after a dev-server (re)start.
#
# WHY: Next 16 Turbopack panics ("Failed to write app endpoint /page") fire
# when several requests race the FIRST compile of the same route. On-demand
# first-hits from a browser (page + RSC prefetch + assets at once) hit this
# constantly; each panic kills the server, the watchdog restarts it, open
# tabs auto-reload, and the loop repeats (once measured: 44 panics/min).
# Compiling every route ONCE, sequentially, with curl removes the race:
# afterwards panics drop to ~zero for the rest of the session.
#
# Usage: scripts/dev-warmup.sh [base_url]   (detached by dev-restart.sh)
BASE="${1:-http://localhost:3000}"
LOG=/home/z/my-project/dev-warmup.log

ROUTES=(
  # R21: this box has 4GB RAM; Turbopack keeps every compiled route in
  # memory, so warming ALL routes after each restart OOM-loops the server
  # (boot ~1GB + 35 routes ≈ 3GB+ → kernel kill → restart → warmup → …).
  # Warm only the highest-traffic routes; everything else compiles on demand.
  /en
  /fa
  /en/opportunities
)

echo "[warmup] $(date '+%F %T') waiting for server..." > "$LOG"
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE/en" 2>/dev/null)
  [ "$code" = "200" ] || [ "$code" = "307" ] && break
  sleep 2
done

ok=0; fail=0
for r in "${ROUTES[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 120 "$BASE$r" 2>/dev/null)
  if [ "$code" = "200" ] || [ "$code" = "307" ] || [ "$code" = "308" ]; then
    ok=$((ok+1))
  else
    fail=$((fail+1))
    echo "[warmup] $(date '+%T') $r -> $code" >> "$LOG"
    # one gentle retry after a panic (watchdog needs a moment)
    sleep 20
    code2=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 120 "$BASE$r" 2>/dev/null)
    echo "[warmup] retry $r -> $code2" >> "$LOG"
  fi
done
echo "[warmup] $(date '+%F %T') DONE ok=$ok fail=$fail" >> "$LOG"
