#!/usr/bin/env bash
# ARIA HUB — Oracle web deployment (runs on the owner's Windows machine via Git Bash)
#
# Usage:  deploy/oracle-deploy.sh <approved-git-sha>
#
# What it does:
#   1. exports the approved SHA as a tarball (no Vercel interaction, no git push)
#   2. uploads it to the Oracle host
#   3. extracts to /opt/aria-hub/releases/<date>-<sha>, applies the Oracle
#      adapter overlay (CV PDF chromium + CDN cache headers), installs deps,
#      runs prisma generate + the standalone build, then health-checks the NEW
#      release on port 3100 BEFORE it receives traffic
#   4. only after a green health check: switches /opt/aria-hub/current and
#      restarts aria-hub-web (never the import/social workers)
#   5. post-restart health check with automatic rollback on failure
#   6. prunes all but the 3 newest releases
set -euo pipefail

SHA="${1:?usage: oracle-deploy.sh <approved-git-sha>}"
HOST="${ARIA_ORACLE_HOST:-ariahub-oracle}"
RELEASE_ID="$(date +%Y%m%d-%H%M)-${SHA:0:7}"
REL="/opt/aria-hub/releases/$RELEASE_ID"
STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
OVR="/opt/aria-hub/deploy/oracle-overrides"

echo "==> exporting $SHA"
git archive "$SHA" -- . ':!videos' ':!.github' ':!release-backups' | gzip -1 > "/tmp/aria-$SHA.tar.gz"

echo "==> uploading to $HOST"
scp -o ServerAliveInterval=30 "/tmp/aria-$SHA.tar.gz" "$HOST:/tmp/aria-$SHA.tar.gz"

echo "==> building release $RELEASE_ID on Oracle"
ssh "$HOST" RELEASE="$REL" SHA="$SHA" STAMP="$STAMP" OVR="$OVR" 'bash -s' <<'REMOTE'
set -e
sudo test -d "$RELEASE" && { echo "FATAL: release dir already exists: $RELEASE"; exit 1; }
sudo mkdir -p "$RELEASE"
sudo tar -xzf "/tmp/aria-${SHA}.tar.gz" -C "$RELEASE"
sudo chown -R ariahub:ariahub /opt/aria-hub/releases
# Oracle adapter overlay (no-op once the adapter is merged into the deployed SHA)
if [ -d "$OVR" ]; then
  sudo bash -ec "cd '$OVR' && find . -type f | while read -r f; do
    mkdir -p '$RELEASE/'\$(dirname \"\$f\"); cp '$OVR/'\$f '$RELEASE/'\$f
  done"
  sudo chown -R ariahub:ariahub "$RELEASE"
  echo "overlay applied from $OVR"
fi
sudo -u ariahub bash -ec "cd '$RELEASE' && export PATH=/usr/local/bin:/usr/bin:/bin && \
  bun install --frozen-lockfile && \
  bunx prisma generate && \
  set -a && . /etc/aria-hub/web.env && set +a && \
  export STANDALONE=1 NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=3072 && \
  node node_modules/next/dist/bin/next build"
echo "$SHA" > "$RELEASE/RELEASE_SHA"; echo "$STAMP" > "$RELEASE/RELEASE_TIME"
[ -f "$RELEASE/.next/standalone/server.js" ] || { echo "FATAL: standalone server missing"; exit 1; }
[ -d "$RELEASE/.next/standalone/.next/static" ] || { echo "FATAL: static assets missing"; exit 1; }
[ -d "$RELEASE/.next/standalone/public" ] || { echo "FATAL: public assets missing"; exit 1; }
echo "==> pre-switch health check on :3100"
sudo -u ariahub bash -ec "cd '$RELEASE' && set -a && . /etc/aria-hub/web.env && set +a && \
  PORT=3100 HOSTNAME=127.0.0.1 node .next/standalone/server.js & SRV=\$!; sleep 8; \
  curl -sf --max-time 10 http://127.0.0.1:3100/api/health; RC=\$?; kill \$SRV 2>/dev/null; exit \$RC"
echo "PRECHECK_OK"
REMOTE

echo "==> switching /opt/aria-hub/current -> $REL and restarting web"
ssh "$HOST" REL="$REL" 'bash -s' <<'SWITCH'
set -e
PREV=$(readlink -f /opt/aria-hub/current 2>/dev/null || true)
echo "previous release: ${PREV:-none}"
sudo -u ariahub ln -sfn "$REL" /opt/aria-hub/current.new
mv -Tf /opt/aria-hub/current.new /opt/aria-hub/current
sudo systemctl restart aria-hub-web
sleep 8
if curl -sf --max-time 10 http://127.0.0.1:3000/api/health | grep -q '"ok":true'; then
  echo "DEPLOY_OK current=$REL"
else
  echo "HEALTH CHECK FAILED — rolling back"
  if [ -n "$PREV" ] && [ -d "$PREV" ]; then
    sudo -u ariahub ln -sfn "$PREV" /opt/aria-hub/current.new
mv -Tf /opt/aria-hub/current.new /opt/aria-hub/current
    sudo systemctl restart aria-hub-web
    sleep 8
    curl -sf --max-time 10 http://127.0.0.1:3000/api/health && echo "ROLLBACK_OK" || echo "ROLLBACK ALSO UNHEALTHY — INVESTIGATE"
  fi
  exit 1
fi
SWITCH

echo "==> pruning old releases (keeping 3 newest)"
ssh "$HOST" 'cd /opt/aria-hub/releases && ls -1dt */ 2>/dev/null | tail -n +4 | while read -r d; do echo "removing $d"; rm -rf "/opt/aria-hub/releases/$d"; done'
rm -f "/tmp/aria-$SHA.tar.gz"
echo "==> done: $RELEASE_ID deployed"
