# ARIA HUB — Oracle Production Operations

Release-engineering assets for the Oracle production deployment. Copied into
the repo so the deployed state is reproducible from Git (closeout 2026-10-06).
Secrets are NEVER in this directory: tokens live only in `/etc/*` files on the
Oracle host (root-owned, 640) or in the owner's local `deploy-staging/`
(outside any git repo).

## Production layout (Oracle ARM host `ariahub-oracle`)

```
/opt/aria-hub/
├── current -> releases/<id>        # symlink switched by deploys
├── releases/20261006-0441-514bd80  # LIVE production release (514bd80)
├── releases/20261004-1822-03db843  # rollback release (kept)
├── releases/20261006-0441-514bd80  # also serves latest-test via aria-hub-candidate
├── backups/                        # pre-release DB backups
└── (worker checkout: src/ scripts/ package.json … — import/social workers run from here)
```

- Traffic: Cloudflare Named Tunnel (`aria-hub-production`, token at
  `/etc/cloudflared/token.env`, root:cloudflared 640) → Caddy `:8080`
  (apex→www 308, `X-Forwarded-For` sanitized from `CF-Connecting-IP`) →
  Next standalone `127.0.0.1:3000` (production) and `:3100` (candidate).
- Env files (root:ariahub 640): `/etc/aria-hub/web.env` (web + candidate +
  migrations; DATABASE_URL + DIRECT_URL both needed by `prisma migrate`),
  `/etc/aria-hub/import-worker.env`, social worker env.
- Systemd units in this directory are copied to `/etc/systemd/system/`
  verbatim. The candidate unit's `WorkingDirectory=` is repointed by
  `candidate-deploy.sh` to the newest candidate release.

## Deploy / rollback

- `oracle-deploy.sh <sha>` — archive → upload → build (STANDALONE=1) →
  pre-health-check → **switch `current`** → restart web → verify.
- `oracle-rollback.sh` — switch `current` back → restart web → verify.
- `candidate-deploy.sh <sha>` — same build pipeline but **never touches
  `current`**: builds a release dir and repoints `aria-hub-candidate.service`.
  Includes the mandatory post-build step:
  `cp -r .next/static/. .next/standalone/.next/static/` — Next standalone
  does NOT copy page static assets itself; skipping this ships HTML that
  references 404ing chunk CSS (unstyled pages). Found the hard way on
  2026-10-06.
- Both scripts need to run from the repo root parent directory
  (deploy-staging copies) with SSH alias `ariahub-oracle`.

## Database grants

The application/worker DB role is `aria_social_worker` (Supabase pooler
role). Its complete permission matrix is codified in
`prisma/migrations/20261006120000_worker_db_grants/migration.sql` and
guarded by `tests/worker-grant-guardrail.test.ts`. See
`docs/WORKER-DB-ROLES.md` for the audit and the role-separation analysis.

## Cache / DNS

- `cache-rules.json` — the four Cloudflare cache rules (bypass api/admin/
  employers; respect-origin caching for home / listing / detail).
- `dns-records.json` — the Cloudflare DNS record inventory at cutover
  (tunnel IDs are public DNS data). Vercel rollback records: apex
  `A 216.198.79.1` + www `CNAME 3f602c20bd93da93.vercel-dns-017.com`
  (DNS-only), restorable inside Cloudflare in seconds.
- `Caddyfile` — host blocks incl. client-IP sanitization.
