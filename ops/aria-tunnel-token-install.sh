#!/bin/bash
# Install the ARIA HUB production tunnel token securely.
# Usage:  echo "<tunnel-token>" | sudo aria-tunnel-token-install
# The token is read from STDIN (never argv, never logged).
set -e
TOKEN=$(cat)
[ -n "$TOKEN" ] || { echo "no token on stdin"; exit 1; }
umask 027
printf "%s" "$TOKEN" > /etc/cloudflared/aria-hub-production.token
chown root:cloudflared /etc/cloudflared/aria-hub-production.token
chmod 640 /etc/cloudflared/aria-hub-production.token
systemctl unmask aria-cloudflared >/dev/null 2>&1 || true
systemctl restart aria-cloudflared
sleep 6
if systemctl is-active --quiet aria-cloudflared; then
  echo "TUNNEL_ACTIVE"
  journalctl -u aria-cloudflared -n 3 --no-pager | tail -3
else
  echo "TUNNEL_FAILED — check: journalctl -u aria-cloudflared -n 20"
  exit 1
fi
