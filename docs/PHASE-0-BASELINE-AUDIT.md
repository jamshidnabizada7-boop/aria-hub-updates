# PHASE 0 — Baseline Audit & Safety Snapshot

Official Opportunity Ingestion & Employer Platform — Master Implementation Plan

- Date: 2026-10-03
- Branch: `feature/official-opportunity-ingestion-v1` (created from `main` @ `f4c3534`)
- Local main == origin/main at audit time (no drift, no stash, no modified tracked files)
- **No application logic was modified in this phase.** Only this document and the local test database bootstrap (see §3).

---

## 1. Git & safety state

| Item | State |
|---|---|
| Repository | `jamshidnabizada7-boop/aria-hub-updates` (remote: HTTPS GitHub) |
| Working copy | `D:\ARIA HUB UPDATE 09 13 2026\workspace-0b1e4235-7c53-4f21-a3d1-75faeb9ab366 (12)` — the repo root (the parent folder is NOT a git repo) |
| HEAD at baseline | `f4c3534` "Capture complete Jobs.af job details and preserve admin repairs" (2026-10-03) |
| Untracked files | 57 (scratch scripts under `scripts/tmp/`, handoff docs, `release-backups/`, `.stage1-integration/`) — none committed |
| Push/PR/deploy | **None performed.** Branch is local-only. |

### Database environment map (verified)

| File | DATABASE_URL target | Role |
|---|---|---|
| `.env` | `postgresql://…@127.0.0.1:5433/ariahub` | **Local dev** (embedded Postgres 18.4 data dir in `.localpg/`) |
| `.env.production.local` | production Supabase | Production credentials — **not touched** |
| test guard (`tests/publish-safety.test.ts:12-19`) | `127.0.0.1:5433/ariahub_test` | Isolated test DB; tests self-guard to localhost + `*_test`/`*_fresh` DB names only |

**Production build intentionally skipped.** `next build` runs with NODE_ENV=production, which loads `.env.production.local`; any build-time DB access would therefore target the production database. The plan's DB-safety rule ("STOP if environment points to production") takes precedence over the optional build step. Baseline confidence comes from `tsc --noEmit` (clean) + full test suite (passing) + a successful build existing in `.next/` (Oct 2). Before any future local build, run with an env override or a sanitized env.

**Known Prisma gotcha discovered:** Prisma CLI lets `.env`/`.env.production.local` values **override** process-environment variables. `prisma db push` with an exported `DATABASE_URL` still connected to the `.env` datasource because the schema's `directUrl = env("DIRECT_URL")` is what migrations use. To target the test DB, the URL must be inlined in a temp schema file (both `url` and `directUrl`), not passed via env. This matters for every future scripted schema operation.

---

## 2. Baseline test results

### `bun test ./tests/` — full suite

| Run | Result |
|---|---|
| Without test DB running | 227 pass, 28 skip, **0 fail** (1.1s) |
| With local Postgres + `ariahub_test` schema pushed | **244 pass, 9 skip, 0 fail** (4.5s) |

**No pre-existing test failures.** Baseline is green.

### Skips and how to unlock them

- 8 × "security closures (Phase 0 regressions)" (`api-guards.test.ts`) — require a running HTTP server on localhost to probe live routes.
- 1 × "browser smoke" (`e2e-smoke.test.ts`) — gated behind `E2E=1` + dev server + local Chrome.
- The DB-backed set unlocked by starting Postgres: `publishDueQueue safety machinery`, `release regression scenarios`, `worker and group release checks`, `composeCaptionWithLimit` (all in `tests/publish-safety.test.ts`).

### Local test-DB bootstrap (repeatable)

```bash
# 1. start the embedded local Postgres (data dir .localpg, port 5433)
./node_modules/@embedded-postgres/windows-x64/native/bin/pg_ctl.exe -D .localpg -o "-p 5433" -l .localpg/pg-run.log start
# 2. create the test DB (trust auth) — only needed once
bun -e 'const {SQL}=require("bun"); const s=new SQL("postgresql://postgres@127.0.0.1:5433/postgres"); await s`CREATE DATABASE ariahub_test`; process.exit(0)'
# 3. push schema (inline URL in a temp schema copy — see Prisma gotcha above)
sed -e 's/env("DATABASE_URL")/"postgresql:\/\/postgres@127.0.0.1:5433\/ariahub_test?sslmode=disable"/' \
    -e 's/env("DIRECT_URL")/"postgresql:\/\/postgres@127.0.0.1:5433\/ariahub_test?sslmode=disable"/' \
    prisma/schema.prisma > prisma/schema.baseline-tmp.prisma
npx prisma db push --schema prisma/schema.baseline-tmp.prisma --skip-generate
rm prisma/schema.baseline-tmp.prisma
# 4. run
DATABASE_URL='postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable' bun test ./tests/
```

### Typecheck & lint

- `tsc --noEmit` (local binary; note: bare `npx tsc` resolves to a squatter npm package on this machine): **clean, 0 errors**.
- `bun run lint` (eslint .): **26,310 problems (2,071 errors, 24,239 warnings)** — pre-existing baseline condition. Breakdown of the 2,071 errors: ~1,922 inside `.stage1-integration/` (an abandoned old Next build tree checked into the working copy), ~90 in root scratch files (`verify.js`, `temp_translator/`), 41 in `scripts/`, **17 in `src/` + 1 in `tests/`**.
  - Real `src/` errors: `react-hooks/set-state-in-effect` in `src/components/admin/multilingual-input.tsx:56`, `src/components/site/cursor-spotlight.tsx:13`, `src/components/site/sections/visas.tsx:30`, `src/components/ui/mdx-editor-component.tsx:34`, `src/app/[lang]/cv-builder/hooks/use-cv-drafts.ts:60`, `src/app/[lang]/cv-builder/components/ExportModal.tsx` (4×); `@typescript-eslint/no-require-imports` in `src/app/api/admin/settings/route.ts:62`; unused eslint-disable in `src/lib/import/scrapers/wazifaha.ts:422`.
  - Hygiene recommendation (later phase, not Phase 0): add `.stage1-integration/`, `temp_translator/`, and root scratch `.js` files to eslint ignores — that alone removes ~92% of reported errors.

---

## 3. Current Prisma state

- `prisma/schema.prisma` — 1,616 lines, ~62 models. PostgreSQL datasource with `url` + `directUrl` (both `env()`).
- Migrations directory exists (latest: `20260928192000_opportunity_location_index_reconcile`). Local dev/test DBs are managed with `db push`; production uses `migrate deploy` (see `docs/DATABASE-MIGRATIONS.md`).
- **Core opportunity models already present** (schema line refs):
  - `Opportunity` (261) — incl. `sourceUrl @unique` (296), `sourceName`, `originalUrl`, `translationStatus`/`faStatus`/`psStatus`/`translationSourceHash`/`translationProgress` (329–333), relation `locations` (278).
  - `OpportunityLocation` (353–371) — country/province/city/district/rawLabel/source/confidence, unique on `[opportunityId, province, city, district, rawLabel]`, indexes on opportunityId/province/country.
  - `OpportunityCategory` (249), `OpportunityMatchProfile` (222), `MatcherFeedback` (209), `ImportSource` (399), `ImportRun` (419), `TranslationChunk` (377), `OpportunitySubmission` (716).
- `ImportSource` columns today: `scraperKey` (maps to registry), `type` (job|scholarship|news), `enabled` (default true), `autoPublish` (default false), `config` (JSON string), `scheduleMinutes`, `lastRunAt/lastRunStatus/lastRunStats`. **Not yet present (Phase 6 targets):** `organizationId`, `sourceRole`, `priority`, `trustScore`, `nextRunAt`, `lastSuccessAt/lastFailureAt`, `consecutiveFailures`, `backoffUntil`, `healthStatus`, `supportsDelta`.
- `User`/`Account`/`Session`/`VerificationToken` models exist (969–1010, labeled NextAuth standard) but **are dormant** — no code queries `db.user`; no NextAuth dependency. Only `AdminUser` (824) is wired, via a custom signed-cookie session (`aria-admin-session`, HMAC w/ `ADMIN_SESSION_SECRET`).
- `Organization` model: **does not exist** (Phase 1 target).

---

## 4. Import pipeline (current architecture to extend)

Files: `src/lib/import/` — orchestrator.ts (751), base-scraper.ts (184), dedupe.ts (134), registry.ts (84), types.ts (89), publication-policy.ts (25), images.ts, public-image-url.ts, utils.ts, preserve-admin-fields.ts, news-import.ts, news-relevance.ts, scrapers/ (9 scrapers + 3 transports).

### Registry (registry.ts:65–75)

```text
wazifaha       WazifahaScraper        HTML/cheerio, heading-aware sections
scholarshipsAf ScholarshipsAfScraper  Yoast job-sitemap XML first, HTML fallback
acbar          AcbarScraper           Laravel HTML, 4-tier transport (headers→curl→clearance cookie→full browser)
o4af           O4afScraper            WP Careerfy HTML, curl fallback (Cloudflare TLS)
wpApi          WpApiScraper           generic WordPress REST API, config-driven
jobsaf         JobsAfScraper          Next.js RSC flight-payload + public detail API + logged-in profile
reliefweb      ReliefWebScraper       API v2 POST; parked "pending" until approved appname
rssNews        RssNewsStubScraper     stub — news must go through news pipeline, never into Opportunity
```

`getScraper()` resolves `ImportSource.scraperKey` → class. New source types (official HTML/RSS/JSON/Greenhouse/Lever) are Phase 7 additions to this registry.

### Pipeline (orchestrator.ts)

`runImport()` → source selection (explicit or oldest `lastRunAt`, one source per invocation, in-flight guard) → `runOneSource()` creates `ImportRun` → per-listing `processListing()`:
1. challenge-title + expired guards → 2. pre-enrichment hash dedupe lookup → 3. apply-link healing (twice: before/after detail) → 4. `healMissingFacts()` → 5. 24h unchanged fast path → 6. detail fetch (`parseDetail`; o4af force-fetched) → 7. quality guards (title-is-URL, junk description <30 chars) → 8. post-enrichment content hash → 9. images (SSRF-safe fetch → sharp webp → Vercel Blob) → 10. AI pipeline (rewrite/SEO/categorize/translate; skipped in `bounded` mode) → 11. category resolution → 12. upsert (update path explicitly omits `status` so scrapers can never change publication state; locations delete+recreate; jobsaf admin-edit preservation via AuditLog) → 13. chunked translation with 90s import-time budget.
- Publication policy (publication-policy.ts): new records `autoPublish ? published : draft`; existing records always keep current status.
- Zero-listings from a historically productive source → run marked `error` with "DEGRADED:" message (no `degraded` enum value exists).
- Scheduling today: in-process 5-min tick (`src/instrumentation.ts`) + external 15-min cron → `automation/tick.ts` (max 2 sources/tick, 30-min floor) + `automation/scheduled-import.ts` (one bounded run per cron call, 250 MB DB budget) + `automation/import-selection.ts` (5 primary aggregators twice daily, secondaries weekly).

### Dedupe (dedupe.ts) — the cross-source gap Phase 4 fixes

Deterministic 3-tier cascade, no confidence score:
1. Exact `sourceUrl` (DB unique constraint) → update.
2. Exact `contentHash` → skip.
3. Fuzzy normalized title+org **scoped to same `sourceName` only** (`take: 200`) → update.
Cross-source duplicates are **intentionally kept as separate rows** (documented past incident: two aggregators fought over one scholarship row). Content hash payload = sourceUrl+title+organization+deadline+description[:500] (+extra fields for jobs.af).

### RawListing (types.ts:9–46)

title*, organization, category, jobType, scholarshipType, location, provinces[], country, deadline, publishedDate, description, responsibilities, eligibility, benefits, requiredDocuments, requirements, guidelines, salary, educationReq, experience, applyUrl, sourceUrl*, originalUrl, website, imageUrl, logoUrl, sourceName*, sourceLanguage, extractedData{}.

---

## 5. Application-link behavior (to preserve & improve in Phase 5)

- `src/lib/apply.ts` (92 lines) — classifier only. Types: `application_email | application_form | direct_application | source_article_fallback | unknown`. Same-host rule: apply host == host(sourceUrl or originalUrl) after www-strip → `source_article_fallback` (never rendered as Apply button). `FORM_URL_RE` covers kobo/gdocs/typeform/jotform/survey/webform/apply-form patterns. Gate: only the first three types are "real" and get the Apply button; fallback/unknown render "How to apply" guidance instead.
- `src/lib/apply-extract.ts` (116 lines) — deterministic extraction (no AI): emails from guidelines → description/requirements → form links → explicit "apply … URL" → scraped applyUrl last. Blacklist by substring: `webinfo@acbar.org`, `info@acbar.org`, `acbar.org`, `wazifaha.org`, `scholarships.af`, `o4af.com` + no-reply prefixes. `extractRealApplyLink()` (no scraped fallback) upgrades source-fallback rows; healing never downgrades a real link.
- **Key Phase 5 nuance already confirmed:** the same-host rule is exact-host, so official same-domain apply URLs (e.g. `careers.org.org/apply/123` on a careers subdomain that IS the source) would currently be demoted to fallback. Phase 5 must make classification sourceRole/organization-domain aware, not just host-equality aware.
- Orchestrator final apply selection: `pipeline.data.applyUrl || listing.applyUrl` where pipeline prefers `extractApplyLink(listing)`.

---

## 6. Translation engine (preserve as-is through all phases)

`src/lib/ai/translate-engine.ts` (670 lines): chunked (CHUNK_SIZE 900), atomic, Persian-first. Fields: 12 public keys (`summary`↔`aiSummary` column). Stages: plan → syncPlan (hash-diff chunks in `TranslationChunk`) → Persian until `faStatus=complete` → only then Pashto → per-chunk translate via provider failover (`groq,cerebras,gemini`, 60s cooldowns, 8 attempts, 24h stale-failure mercy) → atomic commit only at 100% of a language's chunks (single $transaction into i18n JSON). Rate-limit → batch stops, 30-min backoff. Import-time driver `processOpportunityNow(id, 90s)`; background tick + half-hourly cron (48 units/day budget) pick up the rest. Partial results can never become public.

---

## 7. Afghanistan location architecture (preserve)

- `src/lib/geo/provinces.ts`: exactly 34 canonical provinces + ~80 alias mappings + noise words; **no LLM involvement, never guesses a province**; ~140-entry KNOWN_COUNTRIES guard set.
- `src/lib/geo/location-rows.ts` (108 lines): pure derivation `RawListing → OpportunityLocation[]` shared by importer and backfill so both produce identical rows. Provinces only from the whitelist (confidence 1.0); unknown city names kept as city-level rows at 0.7 — **a province is never invented**; district always null today; country slot guarded (a province found in `country` → 'Afghanistan').

---

## 8. Automation (do not repurpose for imports)

- `tick.ts` — combined tick: import (≤2 sources) + translation batch (≤8) + social queue build + FB-group manual-assist jobs + render/publish (900 MB memory gate); DB-locked on AutomationState singleton.
- `social-tick.ts` — independent social loop (deliberately excludes scraping/translation so a slow import can't starve posts).
- `scheduled-import.ts` / `scheduled-translation.ts` — one bounded unit per cron call with DB-size budget guards (250 MB) and Vercel 60s limits.
- Channels in `src/lib/social/channels.ts`: Telegram, Facebook Pages, Instagram, LinkedIn, WhatsApp Cloud, X. Cron entries: `src/app/api/admin/pipeline/{tick,social,import,translate}`.
- Phase 8 worker must be a NEW process (`scripts/opportunity-import-worker.ts`), not an extension of these.

---

## 9. Employer flow & admin (current state)

### Quick submission (anonymous — keep working)
- `/[lang]/employers` (marketing) → `/[lang]/employers/post` → `EmployerPostForm` (client) → POST `/api/opportunities/submit`.
- API: honeypot (`website`) → fake success; 3/min/IP in-memory rate limit; `submitterType: 'employer'` unlocks jobType/salaryRange/location/companyWebsite; validation (title 5–200, description 80–8000 w/ 5-word quality check, https-only URLs, deadline end-of-day UTC); creates `OpportunitySubmission` status `pending` with tracking code `AR-XXXXXXXX`. **No auto-publish** — admin approval required. Community twin at `/[lang]/submit-opportunity` posts the same endpoint.
- Submitter tracking: `/track?ref=` + contact-email match → GET `/api/opportunities/track` (10/min).

### Admin moderation
- `GET/PATCH /api/admin/submissions` — list (≤200, counts incl. pendingEmployers) + approve/reject (only pending; 409 otherwise). Approve creates a **published** Opportunity (sourceName 'Employer'|'Community', applyUrl or mailto, moderation trail in originalUrl) + trilingual decision email (skipped silently without SMTP). Reject stores reviewNote. Audit-logged.
- Admin UI: `submissions-panel.tsx` (400 lines, tabs+filters), `opportunity-form-panel.tsx` (638 lines, trilingual CRUD via `/api/admin/crud?model=opportunity`, AI-translate button), `auto-import-panel.tsx` (594 lines: run/force-all, per-source enable/autoPublish/run, logs).
- Admin nav lives in `src/app/admin/admin-app.tsx` (sidebar keys incl. `autoImport`, `submissions`, `opportunity`, `importSource`, `importRun`).

### Auth state
- Admin: custom `AdminUser` + signed cookie; no middleware guard — each admin route self-guards via `getCurrentAdmin()` (all 25 admin route files verified). Role field exists but is enforced only on social/automation routes.
- **No employer/user auth exists at all** (no NextAuth, no public login pages, `db.user` never queried). Phase 12 must build employer identity from the dormant User models or a new mechanism.

---

## 10. ImportSource rows (local dev DB snapshot, read-only)

Local `.localpg` mirror (`ariahub` @ 127.0.0.1:5433) — 16 rows:

| scraperKey | type | enabled | autoPublish | scheduleMinutes | lastRunStatus |
|---|---|---|---|---|---|
| acbar | job | ✓ | ✓ | 720 | ok |
| jobsaf | job | ✓ | ✓ | 60 | ok |
| o4af | scholarship | ✓ | ✓ | 720 | error |
| reliefweb | job | ✗ | ✗ | 60 | null (never run) |
| rssNews ×4 | news | ✓ | ✓ | 60 | ok/error mix |
| scholarshipsAf | scholarship | ✓ | ✓ | 60 | error |
| wazifaha | job | ✓ | ✓ | 60 | ok |
| wpApi ×6 | scholarship | ✓ | ✓ | (config) | ok |

Local Opportunity counts: 612 published, 147 expired. Top sources: Opportunities For Youth (140), Opportunity Desk (123), AfterSchoolAfrica (122), Wazifaha Jobs (118), Scholarships Corner (89), Jobs.af (82), Scholarship Roar (41), Mladiinfo (20), null (14), o4af (10).

⚠️ This is the **local mirror**; production Supabase row inventory (pilot settings, autoPublish flags, schedules) must be pulled read-only before Phase 2 backfill and Phase 9 seeding — never assume they match.

---

## 11. Consolidated known gaps (pre-existing, with references)

**Import**
- Cross-source duplicates by design (dedupe.ts:91–123) — Phase 4's reason to exist.
- ReliefWeb parked pending approved appname (reliefweb.ts:13–24; orchestrator.ts:336–355).
- o4af detailFetch force-enabled regardless of config (orchestrator.ts:500–505).
- No `degraded` run status (orchestrator.ts:292–299); ACBAR module-level mutable cookie/blocked state (acbar.ts:55–63); scheduled ACBAR runs skip browser path (acbar.ts:174–176).
- jobs.af: no server pagination (jobs-af.ts:218–224); logged-in DOM parser unpinned (jobs-af.ts:452–454); admin-edit protection only for jobsaf (orchestrator.ts:657–660).
- Fuzzy dedupe 200-row cap (dedupe.ts:105–106); in-memory fetch cache (base-scraper.ts:15–17); no per-listing transaction (orchestrator.ts:15).

**Apply links**
- Exact-host same-host rule can't distinguish official careers subdomains (apply.ts:72–75) — core Phase 5 bug.
- Substring blacklist over-matches (apply-extract.ts:30); narrow form-URL patterns miss typeform/jotform in body text (apply-extract.ts:60,102).

**Translation**
- `resetStaleFailures` blanket-resets failed rows (translate-engine.ts:490–497); `translationProgress.attempts` never populated (translate-engine.ts:310).

**Geo**
- District never populated (location-rows.ts:79); only first city kept from multi-city strings (provinces.ts:170–182); typo alias `'kapesa'` (provinces.ts:68).

**Employer/admin**
- Broken "Retry Failed" button — POSTs to `/api/admin/import/retry-failed` which doesn't exist (auto-import-panel.tsx:139).
- Approve publishes EN-only content while the email claims full fa/ps (submissions route:115–136 vs submission-notify.ts:31–32).
- No vercel.json crons declared (instrumentation comment references a 15-min backstop); in-memory rate limits reset per serverless instance; admin roles mostly unenforced; no CSRF token; no admin provisioning path (no prisma seed).
- No employer authentication whatsoever (Phase 12 must assess viability of dormant User models first — per plan instruction, do not assume).

**Build hygiene**
- `.stage1-integration/` (abandoned old build tree) inflates eslint 25×; should be eslint-ignored and/or excluded from search indexes in a later phase.

---

## 12. Phase 0 Definition of Done — checklist

- [x] No functional changes (only this doc + local test-DB bootstrap)
- [x] Baseline documented (this file)
- [x] Local feature branch created: `feature/official-opportunity-ingestion-v1`
- [x] Tests run: 244 pass / 9 env-gated skips / 0 fail; typecheck clean
- [x] No push, no PR, no deployment, no production contact (verified: only 127.0.0.1 DBs touched)
- [x] STOP — awaiting explicit **CONTINUE** for Phase 1
