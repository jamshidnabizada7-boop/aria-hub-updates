# ARIA HUB — FINAL PRODUCTION STATE

Snapshot: 2026-10-06, release closeout. This document is the authoritative
description of what is deployed and how to reproduce it.

## Production SHA

`514bd801a180bb5877b42a2152d30daff5d18ace` (branch
`feature/official-opportunity-ingestion-v1`) — plus the release-closeout
commit (grants migration, worker-grant guardrail test, `ops/` deployment
assets, `docs/`). The closeout commit touches no application runtime code:
migration SQL (additive GRANTs, already applied manually to production),
tests, and documentation only. **Oracle production stays on the `514bd80`
artifact; no redeploy is required or performed for the closeout.**

## Oracle release

- Live web: `/opt/aria-hub/releases/20261006-0441-514bd80`
  (`/opt/aria-hub/current` symlink), standalone server on `127.0.0.1:3000`
  via `aria-hub-web.service`.
- Rollback: `/opt/aria-hub/releases/20261004-1822-03db843` (kept intact).
- Candidate/test: same release served on `127.0.0.1:3100` via
  `aria-hub-candidate.service`, public at `latest-test.myariahub.com`
  (kept during observation; cleanup plan below).
- Worker checkout: `/opt/aria-hub` (src/scripts = 514bd80; backup of the
  pre-refresh checkout at `/root/worker-checkup-backup-20261006.tar.gz`).

## Cloudflare architecture

Named Tunnel `aria-hub-production` (cloudflared systemd service, token file
`/etc/cloudflared/token.env`, root:cloudflared 640) → Caddy `:8080`
(apex→www 308; `X-Forwarded-For` rewritten from `CF-Connecting-IP` so rate
limits are spoof-proof) → Next standalone. DNS: `myariahub.com` apex + `www`
proxied CNAMEs to `<tunnel-id>.cfargotunnel.com`. Four cache rules
(`ops/cache-rules.json`): bypass `/api/`, `/admin`, `/*/employers`;
respect-origin caching for home, opportunities listing, opportunity detail.
First-visit `aria-lang` Set-Cookie bypasses cache once, then MISS→HIT.
Rollback to Vercel (kept warm, not deleted): inside Cloudflare reset apex to
`A 216.198.79.1` and www to `CNAME 3f602c20bd93da93.vercel-dns-017.com`
(DNS-only).

## Supabase database

Project `ftmnqcjqqupkzafwevwn` (Postgres 17). Migrations: 26 (schema up to
date). Web connects as `postgres` (pooler); workers as shared role
`aria_social_worker` (see `docs/WORKER-DB-ROLES.md`; grants codified in
`20261006120000_worker_db_grants`). Pre-release backup:
`/opt/aria-hub/backups/20261005-091212-pre-final-release`.

## Service states (2026-10-06)

| Service | State |
|---|---|
| aria-hub-web | ACTIVE |
| aria-hub-import-worker | ACTIVE (checkout = 514bd80) |
| aria-hub-social-worker | ACTIVE (running process predates refresh by design; disk code = 514bd80, next natural restart aligns it) |
| aria-cloudflared | ACTIVE |
| old import timer | DISABLED (no such unit; `ARIA_DISABLE_SCHEDULER=1`) |
| translation timer | DISABLED (`IMPORT_TRANSLATE_ON_IMPORT` unset) |
| aria-hub-candidate | ACTIVE (latest-test) |

## Manual translation policy

AI/auto translation is permanently OFF by owner policy. Translations are
manual batches (FA first, then PS). Records whose text was repaired during
the accuracy audit (9) are re-queued `faStatus/psStatus = pending` in
TranslationChunk for manual translation. `IMPORT_TRANSLATE_ON_IMPORT` is
unset.

## Source status

18 import sources, all `certification = testing`, **all `autoPublish =
false`** (enforced gate). Healthy: Acted (official), ACBAR, Jobs.af, Wazifaha,
Scholarships Corner/af, Opportunity Desk, AfterSchoolAfrica, o4af, Mladiinfo,
Scholarship Roar, Opportunities For Youth (blocked, pre-existing), news
sources (excluded from the opportunity worker by scheduler filter).
**ReliefWeb (both rows): `pending_configuration`** — deliberately not
healthy; it must not be marked healthy until the owner registers an appname.

## ReliefWeb pending owner action

1. Sign in at https://reliefweb.int (or create an account).
2. Register an application at the ReliefWeb API application page
   (https://reliefweb.int/notifications/subscribe — API "appname"
   registration) with a descriptive appname, e.g. `ariahub-opportunities`.
3. Send the approved appname to be set as `RELIEFWEB_APPNAME` in
   `/etc/aria-hub/import-worker.env`, then flip the two ReliefWeb sources out
   of `pending_configuration`. Until then the scheduler skips them and Admin
   analytics shows them as pending, not healthy.

## Rollback release

`03db843` release directory intact + tested symlink rollback
(`ops/oracle-rollback.sh`). Vercel warm fallback (DNS flip inside
Cloudflare) as secondary.

## GitHub HEAD

GitHub main = the closeout branch tip (`115dd15` + this documentation commit;
`git ls-remote origin main` is authoritative). The release branch
`feature/official-opportunity-ingestion-v1` points to the same tip. The
deployed production ARTIFACT is the commit `514bd80` — the commits after it
(closeout `a8fecb2`, guardrail-quoting fix `115dd15`, and this doc) contain
only the grants migration (already applied manually to production), tests,
`ops/` assets and documentation: no application-runtime changes, so no
redeploy is required.

Vercel: Git integration was connected (`jamshidnabizada7-boop/aria-hub-updates`)
and was **disconnected** during the closeout — verified
"Disconnected jamshidnabizada7-boop/aria-hub-updates"; no deployment was
triggered by the push (latest Vercel deployment predates it). The existing
Vercel production deployment stays available as a warm fallback.

## Vercel state

Untouched, warm, Hobby quota exceeded for new builds; Git integration
disconnected/disabled in the closeout so pushes cannot trigger builds.
Existing production deployment remains available as a rollback target.

## Automatic Persian & Pashto translation (2026-10-06)

`aria-hub-translation-worker.service` — independent Oracle worker that drains
the TranslationChunk queue: Persian completes and commits atomically before
any Pashto work on the same record; public i18n fields only change in that
atomic commit; publication/autoPublish is never touched. Provider chain
`AI_PROVIDERS=groq,gemini,openrouter,cerebras` with 60s cooldowns + failover;
worker budgets TRANSLATION_WORKER_CONCURRENCY=1, MAX_PER_HOUR=60,
MAX_PER_DAY=300 (env file `/etc/aria-hub/translation-worker.env`, root:ariahub
640). Chunk claims + 15-min orphan recovery; MANUAL/MANUAL_STALE translation
origin is never overwritten by AI (source change marks it stale for human
refresh); integrity gate rejects lost/changed URLs, emails and critical
numbers (Persian-digit tolerant); expiry guard skips dead listings; every
4th unit is a Pashto turn so fa-complete rows are not starved.

**Admin override (§38)** — emergency controls without SSH are systemd:
`sudo systemctl stop aria-hub-translation-worker` (pause),
`sudo systemctl start aria-hub-translation-worker` (resume),
`sudo systemctl restart aria-hub-translation-worker` (retry loop). Failed
chunks retry automatically after 24h; admin can also requeue via the
Translation Queue (Content Health shows pending/failed counters).
**Observability (§39)** — Content Health exposes fa/ps complete + failed +
pending counters; per-chunk provider/model/attempt audit lives in
TranslationChunk (provider, model, lastAttemptAt, completedAt).

## Known deferred items

- Role separation `aria_import_worker` vs `aria_social_worker` — recommended,
  deferred (see `docs/WORKER-DB-ROLES.md`).
- SMTP for employer password-reset emails (admin-assisted flow is live and
  honestly worded).
- ReliefWeb appname registration (owner action above).
- Organization profile enrichment (websites/logos/descriptions — currently
  thin but honest; no fabricated data).
- `latest-test.myariahub.com` cleanup (plan below) — execute only on
  separate authorization.
- Fulbright Foreign Student Program 2027 — in review (draft); republish only
  if/when an official Afghan cycle is announced.

## latest-test cleanup plan (do NOT execute without authorization)

1. `sudo systemctl disable --now aria-hub-candidate` and remove the unit
   (or repoint it to the next candidate).
2. Remove the `latest-test` ingress hostname from the tunnel config
   (Cloudflare dashboard → tunnel `aria-hub-production` → public hostnames).
3. Delete the `latest-test` DNS CNAME record in the Cloudflare zone.
4. Keep: production tunnel, `current` symlink, `03db843` rollback release,
   and (optionally) the release directory as a comparison artifact until the
   next candidate is built.

## Verification quickstart (fresh environment)

```bash
# fresh DB (role pre-created so the grants migration exercises fully)
psql -c "CREATE ROLE aria_social_worker NOLOGIN;"
export DATABASE_URL=... DIRECT_URL=...
npx prisma migrate deploy            # 26 migrations incl. worker grants
bun test tests/worker-grant-guardrail.test.ts   # asserts the matrix
bun test ./tests                     # full suite
```
