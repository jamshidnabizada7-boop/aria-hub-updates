#!/bin/bash
# Probe DB candidate URLs from Oracle. Prints only role names, booleans,
# and server identity — never connection strings or credentials.
set -u
fail() { echo "RESULT: $1 CONNECT_FAIL"; }

probe() {
  local label="$1" url="$2"
  [ -z "$url" ] && { echo "RESULT: $label MISSING"; return; }
  local user ver priv
  user=$(psql "$url" -t -A -c "SELECT current_user" 2>/tmp/probe-err.log) || { echo "RESULT: $label CONNECT_FAIL ($(head -c 120 /tmp/probe-err.log | tr -d '\n'))"; return; }
  ver=$(psql "$url" -t -A -c "SHOW server_version" 2>/dev/null | head -1)
  priv=$(psql "$url" -t -A -c "SELECT has_table_privilege(current_user,'Page','SELECT')::int || has_table_privilege(current_user,'Opportunity','SELECT')::int || has_table_privilege(current_user,'Employer','SELECT')::int || has_table_privilege(current_user,'ImportSource','SELECT')::int" 2>/dev/null)
  echo "RESULT: $label user=$user pg=$ver page_opp_employer_srcsel=$priv"
}

VERCEL_URL=$(grep -m1 "^DATABASE_URL=" /tmp/vercel-env.txt | sed 's/^DATABASE_URL=//; s/^"//; s/"$//')
WORKER_URL=$(grep -m1 "^DATABASE_URL=" /etc/aria-hub/import-worker.env | sed 's/^DATABASE_URL=//; s/^"//; s/"$//')

probe vercel-env "$VERCEL_URL"
probe import-worker "$WORKER_URL"
rm -f /tmp/vercel-env.txt /tmp/probe-err.log
