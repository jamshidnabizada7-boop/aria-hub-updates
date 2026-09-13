#!/bin/bash
# Keeps the ARIA HUB dev server alive during sandbox sessions.
# The 4GB sandbox OOM/crash-kills next-server periodically (see worklog
# Tasks 2-b / CRON-R2); this watchdog restarts it within seconds using the
# correct Neon DATABASE_URL (the platform shell exports a sqlite URL that
# overrides .env). Output goes to dev.log.
cd /home/z/my-project || exit 1

# DB URL resolution order:
# 1. DATABASE_URL_OVERRIDE env (explicit)
# 2. scripts/.dev-db-url file (persisted choice — survives any restart path,
#    e.g. local postgres while production Neon is quota-blocked)
# 3. production Neon URL
DBFILE=/home/z/my-project/scripts/.dev-db-url
if [ -z "$DATABASE_URL_OVERRIDE" ] && [ -f "$DBFILE" ]; then
  DATABASE_URL_OVERRIDE="$(cat "$DBFILE")"
fi
DBURL="${DATABASE_URL_OVERRIDE:-${DATABASE_URL:?set DATABASE_URL in .env}"

while true; do
  if ! pgrep -f "next-server \(v" > /dev/null 2>&1; then
    echo "[dev-watchdog] $(date '+%F %T') starting dev server" >> /home/z/my-project/dev.log
    setsid nohup env \
      LD_PRELOAD=/home/z/my-project/scripts/ipv4only.so \
      DATABASE_URL="$DBURL" \
      AI_PROVIDER=zai \
      NODE_OPTIONS="--max-old-space-size=1536" \
      IMPORT_GLOBAL_TIMEOUT_MS=600000 \
      bun run dev >> /home/z/my-project/dev.log 2>&1 < /dev/null &
    disown
    # Re-warm key routes so browser tabs reloading after the restart don't
    # race first-compiles (the Turbopack panic loop trigger).
    setsid nohup bash /home/z/my-project/scripts/dev-warmup.sh > /dev/null 2>&1 < /dev/null &
    disown
    sleep 30 # give it time to boot before re-checking
  else
    # Proactive memory guard: on this 4GB sandbox the kernel OOM-kills
    # next-server around ~2.8GB RSS. Restarting a bit EARLIER is a controlled
    # ~30s blip instead of an uncontrolled kill at a random moment.
    RSS_KB=$(ps -o rss= -C node 2>/dev/null | sort -rn | head -1)
    if [ -n "$RSS_KB" ] && [ "$RSS_KB" -gt 2662400 ]; then # 2.6GB
      echo "[dev-watchdog] $(date '+%F %T') RSS ${RSS_KB}KB > 2.6GB — proactive restart" >> /home/z/my-project/dev.log
      pkill -f "next-server" 2>/dev/null
      pkill -f "bun run dev" 2>/dev/null
      sleep 3
    fi
  fi
  sleep 8
done
