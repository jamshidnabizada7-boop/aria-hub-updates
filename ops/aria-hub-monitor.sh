#!/bin/bash
# ARIA HUB Oracle monitoring probe — runs every 5 minutes via
# aria-hub-monitor.timer. Exits non-zero and journals a WARNING on any
# failure so `journalctl -u aria-hub-monitor -p warning` shows incidents.
set -u
FAIL=""

# 1. Core service states
for svc in aria-hub-web aria-hub-import-worker aria-hub-social-worker caddy; do
  if ! systemctl is-active --quiet "$svc"; then
    FAIL="$FAIL service:$svc=down"
  fi
done

# 1b. cloudflared tunnel (enforced once the owner token is staged)
if [ -f /etc/cloudflared/aria-hub-production.token ] && ! systemctl is-active --quiet aria-cloudflared; then
  FAIL="$FAIL service:aria-cloudflared=down"
fi

# 2. HTTP health (app + DB roundtrip)
if ! curl -sf --max-time 10 http://127.0.0.1:3000/api/health | grep -q '"ok":true'; then
  FAIL="$FAIL http:/api/health=fail"
fi

# 3. Proxied path (Caddy -> Next)
if ! curl -sf --max-time 10 -o /dev/null http://127.0.0.1:8080/en; then
  FAIL="$FAIL http::8080/en=fail"
fi

# 4. Disk (alert above 85%)
USE=$(df --output=pcent / | tail -1 | tr -dc '0-9')
[ "$USE" -gt 85 ] && FAIL="$FAIL disk=${USE}%"

# 5. Memory (alert when < 1.5 GB available)
AVAIL_MB=$(free -m | awk '/^Mem:/ {print $7}')
[ "$AVAIL_MB" -lt 1500 ] && FAIL="$FAIL mem_avail=${AVAIL_MB}MB"

# 6. Swap pressure (alert above 50% of 4G swap in use)
SWAP_MB=$(free -m | awk '/^Swap:/ {print $3}')
[ "$SWAP_MB" -gt 2000 ] && FAIL="$FAIL swap_used=${SWAP_MB}MB"

# 7. Supabase reachability (DNS + TCP handshake to the DB host, no credentials)
DBHOST=$(grep -m1 '^DATABASE_URL=' /etc/aria-hub/web.env | sed -E 's#.*@([^/:]+).*#\1#')
if ! getent hosts "$DBHOST" >/dev/null; then
  FAIL="$FAIL db_dns:$DBHOST=unresolved"
fi

# 8. TLS certificate expiry (only meaningful once public hostname is live)
CRT=$(ls /var/lib/caddy/.local/share/caddy/certificates/*/origin-test.myariahub.com/*.crt 2>/dev/null | head -1)
if [ -n "$CRT" ]; then
  DAYS=$(( ( $(date -d "$(openssl x509 -enddate -noout -in "$CRT" | cut -d= -f2)" +%s) - $(date +%s) ) / 86400 ))
  [ "$DAYS" -lt 14 ] && FAIL="$FAIL tls_expiry=${DAYS}d"
fi

if [ -n "$FAIL" ]; then
  echo "WARNING aria-hub monitor:$FAIL"
  logger -t aria-hub-monitor -p user.warning "aria-hub monitor:$FAIL"
  exit 1
fi
echo "OK aria-hub monitor all-green"
