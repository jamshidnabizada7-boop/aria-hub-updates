# ARIA HUB Social Publishing Worker

This worker is the production-safe social distribution loop for the 30–40/day opportunity automation.

It exists because scraping, AI translation, Chromium rendering, and external publishing should not all depend on one web request or one serverless process.

## What it does

Every cycle:

1. makes sure today's opportunity-only queue exists;
2. renders upcoming opportunity posts;
3. stores media on durable object storage;
4. publishes due deliveries;
5. records per-platform delivery state.

It does **not** scrape sources or run AI translation.

The existing all-in-one automation tick remains a backstop and admin action, but scheduled publishing no longer has to wait for scraping.

## Safety

- DB lock prevents two persistent workers from running the same social cycle.
- Render rows are claimed with compare-and-swap before Chromium starts.
- Publish rows and per-platform SocialDelivery records are idempotent.
- Opportunity posts require a real image and will not silently downgrade to text-only.
- When the worker runs outside Vercel, set `SOCIAL_REQUIRE_DURABLE_MEDIA=1`.
- `BLOB_READ_WRITE_TOKEN` is required for the recommended Oracle deployment so Meta/LinkedIn receive a genuinely public image URL.

## Required environment

Create `/etc/aria-hub/social-worker.env` on the worker host:

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SITE_URL="https://www.myariahub.com"
SOCIAL_RENDER_BASE_URL="https://www.myariahub.com"
BLOB_READ_WRITE_TOKEN="..."
SOCIAL_REQUIRE_DURABLE_MEDIA="1"

# optional tuning
SOCIAL_WORKER_INTERVAL_MS="60000"
SOCIAL_WORKER_RENDER_LIMIT="5"
SOCIAL_WORKER_PUBLISH_LIMIT="5"
```

Do not place platform access tokens in this file. Facebook, LinkedIn, WhatsApp, Instagram, Telegram and X credentials remain encrypted in PublishChannel credentials in the database.

## Oracle VM setup

Example layout:

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin ariahub
sudo mkdir -p /opt/aria-hub /etc/aria-hub
sudo chown -R ariahub:ariahub /opt/aria-hub

# deploy/clone the same application revision into /opt/aria-hub
cd /opt/aria-hub
bun install --frozen-lockfile
bun run db:generate

sudo cp deploy/aria-hub-social-worker.service /etc/systemd/system/
sudo chmod 600 /etc/aria-hub/social-worker.env
sudo systemctl daemon-reload
sudo systemctl enable --now aria-hub-social-worker
```

Inspect it with:

```bash
systemctl status aria-hub-social-worker
journalctl -u aria-hub-social-worker -f
```

## Vercel backstop

The app also exposes:

```
POST /api/admin/pipeline/social
```

Authentication is either an admin session or `x-cron-secret: <CRON_SECRET>`.

The Vercel endpoint intentionally uses a smaller rendering batch because it has a short function budget. A persistent worker is the preferred primary scheduler for 30–40 opportunity posts/day.

## Capacity

Default opportunity automation:

- 30 posts/day
- 5 posts/batch
- 6 Afghanistan-time windows
- 2-minute staggering within each batch
- 14-day repeat cooldown

The persistent worker checks once per minute by default. It does not create extra posts; it only processes rows whose scheduled time has arrived.

## Failure behavior

If durable media cannot be created:

- the queue row becomes failed;
- no Facebook/LinkedIn/WhatsApp/Instagram opportunity delivery is sent as text-only;
- the failure remains visible in Automation.

If one platform fails:

- successful platform deliveries remain successful;
- only the failed delivery is retried according to delivery policy;
- already successful channels are not posted again.

## Deployment order

The stacked automation PRs must be applied in order before this worker:

1. opportunity lifecycle/public-count truth;
2. opportunity-only distribution planner;
3. SocialDelivery + durable media;
4. Meta publishing;
5. LinkedIn REST publishing;
6. WhatsApp capability modes;
7. this worker/runtime PR.

The SocialDelivery migration must be deployed before enabling the worker.
