#!/bin/bash
# Detached launcher: survives tool-call/session boundaries (setsid inside a file,
# not inline — the sandbox reaps inline background jobs when the shell exits).
cd /home/z/my-project
if pgrep -f "bash scripts/dev-watchdog.sh" > /dev/null 2>&1; then
  echo "watchdog already running"
  exit 0
fi
setsid nohup bash scripts/dev-watchdog.sh > /home/z/my-project/watchdog.log 2>&1 < /dev/null &
echo "watchdog started (pid $!)"
