#!/usr/bin/env bash
# ARIA HUB — Oracle web rollback (runs on the owner's machine via Git Bash)
#
# Usage:  deploy/oracle-rollback.sh [release-id]
#   Without an argument: rolls back to the second-newest release directory.
#   With an argument:    rolls back to that exact release id.
#
# Rollback = switch /opt/aria-hub/current symlink + restart aria-hub-web +
# health check. Takes seconds; no rebuild. Workers are never touched.
set -euo pipefail
HOST="${ARIA_ORACLE_HOST:-ariahub-oracle}"

ssh "$HOST" 'bash -s' <<'REMOTE'
set -e
cd /opt/aria-hub/releases
CURRENT=$(readlink -f /opt/aria-hub/current || true)
echo "current release: ${CURRENT:-none}"
if [ -n "${1:-}" ]; then
  TARGET="/opt/aria-hub/releases/$1"
else
  TARGET=$(ls -1dt */ | grep -v -F "${CURRENT##*/}" | head -1 || true)
  TARGET="/opt/aria-hub/releases/${TARGET%/}"
fi
[ -d "$TARGET" ] || { echo "target release not found: $TARGET"; exit 1; }
[ "$TARGET" = "$CURRENT" ] && { echo "already on $TARGET"; exit 0; }
echo "rolling back to: $TARGET"
sudo -u ariahub ln -sfn "$TARGET" /opt/aria-hub/current.new
mv -Tf /opt/aria-hub/current.new /opt/aria-hub/current
sudo systemctl restart aria-hub-web
sleep 8
if curl -sf --max-time 10 http://127.0.0.1:3000/api/health | grep -q '"ok":true'; then
  echo "ROLLBACK_OK current=$TARGET"
else
  echo "ROLLBACK_TARGET_UNHEALTHY — check journalctl -u aria-hub-web"
  exit 1
fi
REMOTE
