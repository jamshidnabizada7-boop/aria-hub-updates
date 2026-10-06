#!/usr/bin/env bash
# Candidate-only deploy (FINAL AUDIT CLOSURE GATE): builds HEAD into a new
# release dir and repoints aria-hub-candidate.service. NEVER touches
# /opt/aria-hub/current or aria-hub-web.
set -euo pipefail
HOST="${ARIA_ORACLE_HOST:-ariahub-oracle}"
SHA="${1:?usage: candidate-deploy.sh <sha>}"
cd "$(dirname "$0")/.."
cd "workspace-0b1e4235-7c53-4f21-a3d1-75faeb9ab366 (12)"
STAMP=$(date -u +%Y%m%d-%H%M)
REL="20261006-${STAMP#20261006-}-${SHA:0:7}"
RELEASE="/opt/aria-hub/releases/$REL"
echo "==> archiving $SHA -> release $REL"
git archive "$SHA" -- . ':!videos' ':!.github' ':!release-backups' | gzip -1 > "/tmp/aria-$SHA.tar.gz"
echo "==> uploading"
scp -o ServerAliveInterval=30 "/tmp/aria-$SHA.tar.gz" "$HOST:/tmp/aria-$SHA.tar.gz"
ssh "$HOST" RELEASE="$RELEASE" SHA="$SHA" REL="$REL" 'bash -s' <<'REMOTE'
set -e
REL="$RELEASE"
sudo mkdir -p "$REL"
sudo tar -xzf "/tmp/aria-$SHA.tar.gz" -C "$REL"
sudo chown -R ariahub:ariahub "$REL"
echo "==> building ($REL)"
sudo -u ariahub bash -ec "cd '$REL' && export PATH=/usr/local/bin:/usr/bin:/bin && \
  bun install --frozen-lockfile && \
  bunx prisma generate && \
  set -a && . /etc/aria-hub/web.env && set +a && \
  export STANDALONE=1 NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=3072 && \
  node node_modules/next/dist/bin/next build"
# Next standalone does NOT copy page static assets automatically — without
# this the HTML references chunk CSS/JS that 404 (unstyled pages).
sudo -u ariahub bash -ec "mkdir -p '$REL/.next/standalone/.next/static' && cp -r '$REL/.next/static/.' '$REL/.next/standalone/.next/static/'"
sudo bash -c "echo \"$SHA\" > \"$REL/RELEASE_SHA\"; date -u +%Y-%m-%dT%H:%M:%SZ > \"$REL/RELEASE_TIME\"; chown ariahub:ariahub \"$REL\"/RELEASE_*"
[ -f "$REL/.next/standalone/server.js" ] || { echo "FATAL: standalone server missing"; exit 1; }
[ -d "$REL/.next/standalone/.next/static" ] || { echo "FATAL: static assets missing"; exit 1; }
[ -d "$REL/.next/standalone/public" ] || { echo "FATAL: public assets missing"; exit 1; }
echo "BUILD_OK $REL"
REMOTE
echo "==> repointing aria-hub-candidate -> $RELEASE (current/production UNTOUCHED)"
ssh "$HOST" RELEASE="$RELEASE" 'bash -s' <<'SWITCH'
set -e
sudo sed -i "s|^WorkingDirectory=.*|WorkingDirectory=$RELEASE|" /etc/systemd/system/aria-hub-candidate.service
sudo systemctl daemon-reload
sudo systemctl restart aria-hub-candidate
sleep 8
if curl -sf --max-time 10 http://127.0.0.1:3100/api/health | grep -q '"ok":true'; then
  echo "CANDIDATE_DEPLOY_OK $RELEASE"
else
  echo "CANDIDATE HEALTH FAILED"; exit 1
fi
SWITCH
rm -f "/tmp/aria-$SHA.tar.gz"
echo "==> done: candidate on $REL; production current still: $(ssh "$HOST" readlink /opt/aria-hub/current)"
