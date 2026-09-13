#!/bin/bash
# R21 QA runner — resilient browser verification despite dev-server OOM flapping.
# Loops until each check passes or attempts exhaust. Writes /tmp/r21_qa_report.txt
REPORT=/tmp/r21_qa_report.txt
: > "$REPORT"
log(){ echo "[$(date +%H:%M:%S)] $*" >> "$REPORT"; }

wait_up(){
  # wait for server to answer 200 on the given path (max 240s)
  local path="$1" waited=0
  while [ $waited -lt 240 ]; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path" --max-time 90 2>/dev/null)
    [ "$code" = "200" ] && return 0
    sleep 10; waited=$((waited+10))
  done
  return 1
}

bb(){ # agent-browser wrapper with one retry (daemon can be busy)
  local out
  out=$(agent-browser "$@" 2>&1 | tail -1)
  if echo "$out" | grep -qE "✗|error|Error"; then
    sleep 5
    out=$(agent-browser "$@" 2>&1 | tail -1)
  fi
  echo "$out"
}

qa_page(){
  local path="$1" tag="$2" attempt=1
  while [ $attempt -le 4 ]; do
    log "── $tag attempt $attempt: waiting for $path"
    if ! wait_up "$path"; then log "$tag: server never came up; retrying"; attempt=$((attempt+1)); continue; fi
    log "$tag: server up; opening browser"
    bb set viewport 1440 900 > /dev/null
    out=$(bb open "http://localhost:3000$path")
    log "$tag open: $out"
    echo "$out" | grep -q "✗" && { attempt=$((attempt+1)); sleep 10; continue; }
    sleep 4
    # scroll to bottom slowly to trigger infinite scroll / load-more
    for i in 1 2 3 4 5 6; do bb scroll down 900 > /dev/null; sleep 1.2; done
    sleep 2
    # capture end-of-page state
    txt=$(bb read 2>/dev/null | tail -c 3000)
    echo "$txt" > "/tmp/r21_${tag}_end.txt"
    bb screenshot "/tmp/r21_${tag}_bottom.png" > /dev/null 2>&1
    log "$tag: bottom captured"
    # scroll back to top and capture
    bb eval "window.scrollTo(0,0)" > /dev/null 2>&1; sleep 1.5
    bb screenshot "/tmp/r21_${tag}_top.png" > /dev/null 2>&1
    log "$tag: top captured ✓"
    return 0
  done
  log "$tag: FAILED after $attempt attempts"
  return 1
}

qa_page "/en/opportunities" "opp_en"
qa_page "/fa/opportunities" "opp_fa"
qa_page "/en" "home_en"
log "QA RUN COMPLETE"
