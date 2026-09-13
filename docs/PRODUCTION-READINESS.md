# Production readiness runbook

Status after the 10-phase hardening program (Sept 2026). The first
production build passes the strict gates (type-check + lint-free compile +
prerender) and the production smoke test is green.

## Build & deploy

```bash
bun install
bunx prisma generate
# First time on an existing database — mark the baseline as applied (never runs):
DATABASE_URL="<prod-url>" bunx prisma migrate resolve --applied 000000000000_init
bunx prisma migrate status        # must say "up to date"

# Windows dev build:
bunx next build && bunx next start
# Linux container build (standalone server bundle):
STANDALONE=1 bunx next build      # then run .next/standalone/server.js
```

CI (`.github/workflows/ci.yml`) runs on every push: install → `prisma
validate` + generate → schema push to an ephemeral Postgres 18 → `tsc
--noEmit` → full test suite (DB-backed tests run against the service
database; server-dependent tests skip).

## Required environment variables (production)

| Variable | Why it is non-optional |
|---|---|
| `DATABASE_URL` | Postgres connection (Neon or self-hosted). |
| `ADMIN_SESSION_SECRET` | Without it the app **refuses to boot** — the admin-session HMAC would be forgeable. 32+ random chars. |
| `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` | One-time bootstrap for the admin account (min 8 chars; seed scripts + seed API read these — no hardcoded credentials exist anymore). |
| `CRON_SECRET` | Auth for the 15-min `/api/admin/pipeline/tick` cron backstop. Missing → the backstop 401s silently. |
| `SOCIAL_RENDER_TOKEN` | Gates `/[lang]/studio-render` — without it anyone can render branded posters from your domain. The pipeline appends `&t=` automatically. |
| `CREDENTIALS_SECRET` | Encrypts channel tokens at rest (falls back to ADMIN_SESSION_SECRET). |

Recommended: `ADMIN_ALERT_EMAIL` (publishing failure alerts),
`SMTP_HOST/PORT/USER/PASS/FROM` (digests + decision emails),
`NEXT_PUBLIC_SITE_URL` (canonical links + poster image base),
`GROQ_API_KEY` or `OPENAI_API_KEY` (AI features + translation backlog).

## Smoke test (run after every deploy)

```bash
BASE=https://your-host
curl -s -o /dev/null -w "%{http_code}\n" $BASE/en                       # 200
curl -s -o /dev/null -w "%{http_code}\n" $BASE/api/health               # 200 {"ok":true}
curl -s -o /dev/null -w "%{http_code}\n" $BASE/api/admin/seed           # 401
curl -s -o /dev/null -w "%{http_code}\n" $BASE/en/blog/nope-does-not-exist  # 404
```

## Known trade-offs & follow-ups

- **Loading skeletons vs 404 status**: a route-level `loading.tsx` streams a
  200 shell, which makes `notFound()` ship as 200-with-404-content. The
  blanket `/[lang]/loading.tsx` was removed in favor of correct 404s; if
  skeletons are wanted back, add them per-SEGMENT and never above detail
  routes.
- **Rotation debt**: the Neon credentials leaked in Sept 2026 were scrubbed
  from the repo, but they must be ROTATED in the Neon dashboard; the admin
  password (if it was ever `admin123`) must be changed in /admin.
- **Translation backlog**: ~475 opportunities await fa/ps translation; the
  tick drains it once AI credentials exist (`.z-ai-config` or provider keys).
- **ACBAR source**: the bot-protection clearance is built (headless-browser
  cookie capture) and proven; the source was IP-blocked during testing and
  recovers automatically via the 10-min cooldown.
- **Monitoring**: wire an uptime checker to `/api/health`; errors surface in
  `PipelineRun`/`ImportRun` history (admin panel) — add Sentry for
  client-side coverage.
- **Backups**: schedule `scripts/db-export.mjs` to cold storage; the import
  tooling restores row-by-row in FK order.

## Verification commands

```bash
bunx tsc --noEmit          # must exit 0
bun test tests/            # 30 pass, 1 gated skip (E2E=1 for the browser test)
bun run scripts/duplicate-report.mjs   # 0 duplicate groups required
E2E=1 bun test tests/e2e-smoke.test.ts # optional browser flow
```
