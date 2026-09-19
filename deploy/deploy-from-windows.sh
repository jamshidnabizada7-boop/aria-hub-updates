#!/usr/bin/env bash
# Push ARIA HUB from this Windows machine (Git Bash) to the Oracle server and
# bring the whole stack up: source → /opt/ariahub, .env generated from your
# local .env secrets, docker build + run, HTTPS via Caddy.
#
# Usage:   bash deploy/deploy-from-windows.sh ubuntu@SERVER_IP [DOMAIN]
# Example: bash deploy/deploy-from-windows.sh ubuntu@152.67.1.2 myariahub.com
#
# Prereqs: the server exists and admits your SSH key (`ssh ubuntu@IP true` works).
set -euo pipefail

HOST="${1:?usage: deploy-from-windows.sh ubuntu@SERVER_IP [DOMAIN]}"
DOMAIN="${2:-myariahub.com}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"

command -v ssh >/dev/null || { echo "ssh not found — run from Git Bash"; exit 1; }
ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" true 2>/dev/null \
  || { echo "SSH to $HOST failed. Add your key first: ssh -i KEY $HOST"; exit 1; }

echo "==> 1/4 Packing source (public/ incl. videos is included; node_modules etc. excluded)"
tar czf - \
  --exclude='./node_modules' \
  --exclude='./.next' \
  --exclude='./out' \
  --exclude='./.git' \
  --exclude='./db' \
  --exclude='./logs' \
  --exclude='./dev.log' \
  --exclude='./tsconfig.tsbuildinfo' \
  --exclude='./_advideo' \
  --exclude='./remotion' \
  --exclude='./agent-ctx' \
  --exclude='./tool-results' \
  --exclude='./download' \
  --exclude='./upload' \
  --exclude='./examples' \
  --exclude='./mini-services' \
  --exclude='./docs' \
  --exclude='./ARIA-HUB-*.mp4' \
  --exclude='./promo_ad*.mp4' \
  --exclude='./test_*.mp4' \
  --exclude='./test_*.mp3' \
  --exclude='./test_*.png' \
  --exclude='./still-scene*.png' \
  --exclude='./browser_preview_verified.png' \
  . | ssh "$HOST" "sudo mkdir -p /opt/ariahub && sudo chown -R \$(whoami): /opt/ariahub && tar xzf - -C /opt/ariahub"

echo "==> 2/4 Generating server .env from your local .env (secrets carried over 1:1)"
{
  echo "DOMAIN=$DOMAIN"
  echo "NEXT_PUBLIC_SITE_URL=https://www.$DOMAIN"
  echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)"
  echo "CHROME_PATH=/usr/bin/chromium"
  echo
  echo "# ── carried over from the workstation .env ──"
  # Everything except vars this kit controls/rewrites. DATABASE_URL is rewritten
  # by docker-compose to point at the db container.
  grep -vE '^(DATABASE_URL|PORT)=' .env || true
} > /tmp/ariahub.env
ssh "$HOST" "mkdir -p /opt/ariahub/deploy && mv /tmp/ariahub.env /opt/ariahub/deploy/.env && chmod 600 /opt/ariahub/deploy/.env"

echo "==> 3/4 Server bootstrap (docker, firewall, swap, backup cron — idempotent)"
ssh "$HOST" "sudo bash /opt/ariahub/deploy/setup-server.sh"

echo "==> 4/4 Building and starting the stack (first build takes a few minutes)"
ssh -t "$HOST" "cd /opt/ariahub/deploy && sudo -E docker compose up -d --build"

echo
echo "Deployed. Check health:"
echo "  ssh $HOST 'cd /opt/ariahub/deploy && sudo docker compose ps && curl -sI https://www.$DOMAIN | head -3'"
