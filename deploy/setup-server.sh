#!/usr/bin/env bash
# Bootstrap for an Oracle Cloud Always Free ARM instance (Ubuntu 22.04/24.04).
# Installs Docker, opens HTTP/HTTPS on the host firewall (Oracle ships a
# locked-down iptables ruleset), adds swap, installs the nightly DB backup cron.
# Run once per server:  sudo bash deploy/setup-server.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash deploy/setup-server.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
echo "==> Installing Docker + compose"
apt-get update -y
apt-get install -y docker.io docker-compose-v2 iptables-persistent netfilter-persistent
systemctl enable --now docker
usermod -aG docker "${SUDO_USER:-ubuntu}" || true

echo "==> Opening 80/443 in the host firewall"
# Insert at position 1 so they sit before Oracle's default REJECT-all rule.
iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
netfilter-persistent save

echo "==> Adding 4G swap if none exists (build headroom)"
if ! swapon --show --noheadings | grep -q .; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Installing nightly 03:00 DB backup cron"
mkdir -p /opt/ariahub/backups
install -m 755 /opt/ariahub/deploy/backup-db.sh /usr/local/bin/ariahub-backup-db || true
cat > /etc/cron.d/ariahub-backup <<'CRON'
0 3 * * * root /usr/local/bin/ariahub-backup-db >> /var/log/ariahub-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/ariahub-backup

echo
echo "Done. Next:"
echo "  cd /opt/ariahub/deploy"
echo "  ensure .env exists (see .env.production.example)"
echo "  sudo docker compose up -d --build"
