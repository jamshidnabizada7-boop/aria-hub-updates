# ARIA HUB — Complete Hosting Guide for Ahmad Jamshid
### myariahub.com on Oracle Cloud Always Free — website + PostgreSQL database on one free server

**Status:** everything technical is already prepared in this `deploy/` folder. You only do
the 4 account/console steps in Parts 1–4 (about 30 minutes, needs your bank card) and
run **one command** in Part 5. The database chapter (Part 6) explains everything about
your PostgreSQL hosting: where it lives, how to open it, back it up, restore it, and
import your current data.

---

## What you get (free forever, Always Free tier)

| Thing | What you get |
|---|---|
| Server | ARM VM: 2 CPUs, 12 GB RAM, up to 200 GB disk |
| Traffic | **10 TB / month** outbound (≈ 100× more than Vercel's free tier) |
| Website | Next.js app in Docker, auto-restarts, HTTPS via Caddy |
| **Database** | **PostgreSQL 16 in Docker, same server, sized only by your 200 GB disk** |
| Backups | Automatic `pg_dump` every night at 03:00, last 14 kept |
| Cost | $0. Card = identity check only (~$1 temporary hold, never charged) |

## What is ALREADY prepared (do not redo)

- ✅ Full deploy kit in `deploy/`: `Dockerfile`, `docker-compose.yml` (postgres + app + Caddy),
  `Caddyfile.prod`, `setup-server.sh`, `backup-db.sh`, deploy/import scripts
- ✅ SSH key pair: `deploy/oracle_ed25519` (private) + `deploy/oracle_ed25519.pub`
  (public — you will paste this into Oracle in Part 2)
- ✅ DNS findings: your domain is at **Porkbun**; today `myariahub.com` points to
  **Vercel** (A record `216.198.79.1`, www → CNAME `...vercel-dns-017.com`).
  Part 4 replaces those — the site keeps running on Vercel until you switch.
- ✅ All secrets from your local `.env` (AI keys, admin session, SMTP…) are carried
  to the server automatically by the deploy script.
- ✅ Your signup details (for Part 1): **Ahmad Jamshid Nabizada**,
  **jamshidnabizada7@gmail.com**, **+92 329 0171669**, billing country **Pakistan**,
  home region **UAE East (Dubai)**, cloud account name **ariahub**.

---

## Part 1 — Create the Oracle Cloud account (≈10 min, needs your card)

1. Open <https://cloud.oracle.com/> → **Start for free**.
2. Fill **Account Information**:
   - Country: **Pakistan** (must match your card's country)
   - First name: `Ahmad Jamshid` · Last name: `Nabizada`
   - Email: `jamshidnabizada7@gmail.com`
   - Solve the **"I am human"** captcha (click the checkbox, finish the picture rounds
     until a green ✓) → **Verify my email**
3. Check Gmail for a **6-digit code**, enter it → **Verify**.
4. Create a strong password (save it in your password manager — this is your console login).
5. Choose **Home Region: UAE East (Dubai)** — ⚠️ cannot be changed later, and Dubai is
   the closest Oracle region to your Afghan audience.
6. Cloud account name: `ariahub` (if taken: `ariahub-pk`).
7. **Add your Visa card.** Oracle makes a small temporary hold (~$1) to verify you.
   You are NOT charged — Always Free never bills. If the card is declined, retry once;
   debit cards from Pakistani banks sometimes need a credit card instead.
   After verification Oracle calls/SMS `+92 329 0171669` with a code in some flows — enter it.
8. Wait for "Your account is ready" → click **Start using Oracle Cloud** / sign in to the Console.

> If verification "hangs" for hours: it usually clears within a day. Nothing is wrong — retry later.

## Part 2 — Create the server instance (≈5 min)

In the Oracle Console (top-left ☰ menu → **Compute → Instances → Create instance**):

| Setting | Value |
|---|---|
| Name | `ariahub` |
| Image | **Canonical Ubuntu 22.04** — make sure it says **aarch64 (ARM)** |
| Shape | **VM.Standard.A1.Flex** (Ampere) → **2 OCPU** / **12 GB RAM** |
| Boot volume | Expand to **100 GB** |
| SSH keys | Paste the public key: open file **`deploy/oracle_ed25519.pub`** in Notepad, copy the whole `ssh-ed25519 AAAA…` line into "Paste public keys" |
| Networking | Leave defaults (public IP: **assign a public IPv4**) |

Click **Create**. When the card turns green **RUNNING**, copy the **Public IP address**
(something like `152.67.x.x`). Write it down — it's used in Parts 4 and 5.

> **"Out of host capacity" error?** Oracle's free ARM machines are in high demand.
> Retry the same evening or next morning — availability comes and goes. Try changing
> Availability Domain if your region has more than one.

## Part 3 — Open ports 80 + 443 (≈3 min)

Oracle blocks web ports by default at TWO levels; we fix both.

**Level 1 — Cloud (Console):**
☰ → **Networking → Virtual Cloud Networks** → click your VCN → click your **subnet**
→ **Default Security List** → **Add Ingress Rules** — add TWO rules:

- Source CIDR: `0.0.0.0/0` · IP Protocol: **TCP** · Destination Port: **80**
- Source CIDR: `0.0.0.0/0` · IP Protocol: **TCP** · Destination Port: **443**

**Level 2 — inside Ubuntu:** handled automatically by the deploy script (Part 5) — skip.

## Part 4 — Point the domain (Porkbun, ≈3 min)

Log in at <https://porkbun.com> → **Domain Management** → `myariahub.com` → **DNS Records**:

1. **DELETE** the old Vercel records: the **A record** → `216.198.79.1` and the
   **CNAME** for `www` → `…vercel-dns-017.com`. (Your site keeps working on Vercel
   until DNS propagates, so do this any time before/with Part 5.)
2. **ADD** two records, both to your server's IP from Part 2:

| Type | Host | Answer | TTL |
|---|---|---|---|
| A | (leave empty = apex) | `YOUR_SERVER_IP` | 300 |
| A | `www` | `YOUR_SERVER_IP` | 300 |

3. Save. DNS propagates in minutes-to-an-hour (check: `nslookup myariahub.com`).

---

## Part 5 — Deploy (ONE command)

On this Windows machine, in **Git Bash**, inside the project folder:

```bash
bash deploy/deploy-from-windows.sh ubuntu@YOUR_SERVER_IP myariahub.com
```

It automatically: packs the project → uploads to `/opt/ariahub` → builds the server
`.env` **from your local `.env`** (all API keys carried over) → installs Docker,
opens the firewall, adds swap, installs the nightly DB backup cron → builds and
starts the 3 containers (postgres, app, caddy). First build: ~5–10 minutes.

**Verify:**

```bash
ssh ubuntu@YOUR_SERVER_IP 'cd /opt/ariahub/deploy && sudo docker compose ps'   # all Up/healthy
curl -I https://www.myariahub.com                                               # HTTP/2 200
```

Caddy obtains the HTTPS certificate automatically on first visit. Done — website AND
database are live on your domain. 🎉

---

## Part 6 — YOUR DATABASE: the complete reference

**Where it lives:** PostgreSQL 16 runs as a Docker container named
`ariahub-db-1` on the same server. Its data is stored in the Docker volume
`pgdata` on the server's 100–200 GB disk — the database can grow to fill that
disk; there is **no 500 MB free-tier database limit** like Neon/Supabase.

**Credentials:** username `aria`, database `ariahub`, password = the random
`POSTGRES_PASSWORD` generated at deploy time. See it any time:

```bash
ssh ubuntu@YOUR_SERVER_IP 'grep POSTGRES /opt/ariahub/deploy/.env'
```

**Internal connection string (used by the app automatically):**

```
postgresql://aria:<POSTGRES_PASSWORD>@db:5432/ariahub
```

### 6.1 Open a SQL shell

```bash
ssh ubuntu@YOUR_SERVER_IP
cd /opt/ariahub/deploy
sudo docker compose exec db psql -U aria -d ariahub
# example: \dt  (list tables)   \q  (quit)
```

### 6.2 Access the DB from your PC (e.g. Prisma Studio, DBeaver, pgAdmin)

Port 5432 is **deliberately closed** to the internet (security). Use an SSH tunnel:

```bash
ssh -L 5433:localhost:5432 ubuntu@YOUR_SERVER_IP \
  "sudo docker compose -f /opt/ariahub/deploy/docker-compose.yml exec -T db \
   socat TCP-LISTEN:5432,fork,reuseaddr TCP:localhost:5432" 2>/dev/null
```

…then connect your tool to `localhost:5433`, user `aria`, db `ariahub`,
password from `.env`. (If `socat` is missing: `ssh ubuntu@IP 'sudo apt-get install -y socat'`.)

Prisma Studio from the project folder against the tunnel:

```bash
DATABASE_URL="postgresql://aria:<POSTGRES_PASSWORD>@localhost:5433/ariahub" bunx prisma studio
```

### 6.3 Backups (automatic) and restore

- **Automatic:** every night 03:00 server time → gzipped dump in
  `/opt/ariahub/backups/ariahub-YYYYMMDD-HHMM.sql.gz`, last **14** kept.
  Log: `/var/log/ariahub-backup.log`.
- **Manual backup now:**

```bash
ssh ubuntu@YOUR_SERVER_IP 'sudo /usr/local/bin/ariahub-backup-db'
```

- **Copy a backup to your PC:**

```bash
scp ubuntu@YOUR_SERVER_IP:/opt/ariahub/backups/ariahub-XXXX.sql.gz .
```

- **Restore a backup:**

```bash
ssh ubuntu@YOUR_SERVER_IP 'cd /opt/ariahub/deploy && \
  gunzip -c /opt/ariahub/backups/ariahub-XXXX.sql.gz | \
  sudo docker compose exec -T db psql -U aria -d ariahub'
```

- **Recommended extra:** once a week, copy the newest backup off the server
  (to your PC or Google Drive) with the `scp` command above — protects against
  losing the whole VM.

### 6.4 Bring your current local data to the server (one-time)

Your dev database (opportunities, users, CMS content) can be migrated:

```bash
# Terminal 1: keep the local dev DB running
bun run dev

# Terminal 2: dump local → import into the server
bash deploy/export-local-db.sh
bash deploy/import-data.sh ubuntu@YOUR_SERVER_IP
```

Skip this if you prefer re-importing content through the admin panel.

### 6.5 Schema changes (Prisma)

Edit `prisma/schema.prisma` locally → redeploy (Part 5 command again) → the
`migrate` service runs `prisma db push` automatically before the app restarts.
Verify: `ssh ubuntu@IP 'cd /opt/ariahub/deploy && sudo docker compose logs migrate'`.

### 6.6 Disk / growth

- Check usage: `ssh ubuntu@IP 'df -h / && sudo docker system df'`
- Always Free allows **200 GB total** block storage. Start with the 100 GB boot
  volume; if the DB grows, stop the instance in the Console → Edit → Boot volume
  → increase size → restart, then `ssh ubuntu@IP 'sudo growpart /dev/sda 1 && \
  sudo resize2fs /dev/sda1'`.

---

## Part 7 — Day-to-day operations

| Task | Command |
|---|---|
| App logs | `ssh ubuntu@IP 'cd /opt/ariahub/deploy && sudo docker compose logs -f app'` |
| Restart app | `… sudo docker compose restart app` |
| Restart everything | `… sudo docker compose down && sudo docker compose up -d` |
| **Deploy new code** | re-run `bash deploy/deploy-from-windows.sh ubuntu@IP myariahub.com` (takes ~3–5 min, brief downtime) |
| DB shell | see 6.1 · DB backups: see 6.3 |
| Server updates | `ssh ubuntu@IP 'sudo apt update && sudo apt upgrade -y && sudo reboot'` (monthly) |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `out of host capacity` (Part 2) | retry later / other availability domain — free ARM is in demand |
| Site `ERR_CONNECTION_REFUSED` | Part 3 Level-1 rules missing, or DNS not propagated yet (`nslookup myariahub.com`) |
| HTTPS error / wrong cert | DNS must point at the server **before** Caddy can issue the cert; wait 10 min, then `sudo docker compose restart caddy` |
| 502 Bad Gateway | `sudo docker compose ps` → app restarting? Check `logs app` (usually a missing env var — add to `deploy/.env`, then `sudo docker compose up -d`) |
| Deploy script fails at SSH | `ssh -i deploy/oracle_ed25519 ubuntu@IP true` must succeed first |
| DB "password authentication failed" | the app's `DATABASE_URL` is generated by compose — don't override it in `deploy/.env` |

---

## TL;DR — when your card is ready

1. Oracle signup (Part 1) — details above, card = verification only
2. Create instance (Part 2) — Ubuntu 22.04 **aarch64**, A1.Flex 2/12, key = `deploy/oracle_ed25519.pub`, note the IP
3. Two ingress rules TCP 80 + 443 (Part 3)
4. Porkbun: delete Vercel records, add A `@` + A `www` → your IP (Part 4)
5. `bash deploy/deploy-from-windows.sh ubuntu@IP myariahub.com` (Part 5)
6. Database: everything in Part 6 (shell, tunnel, backups, import, growth)

That's the whole thing. Anything else — invite me in the chat and I'll do it with you.
