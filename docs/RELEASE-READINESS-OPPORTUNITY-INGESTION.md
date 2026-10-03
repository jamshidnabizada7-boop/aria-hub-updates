# RELEASE READINESS AUDIT — Official Opportunity Ingestion & Employer Platform

Phase 26 — report only. **Nothing has been pushed or deployed.** Activation
requires Ahmad Jamshid's explicit **PUSH / DEPLOY** authorization.

- Date: 2026-10-03
- Branch: `feature/official-opportunity-ingestion-v1` (LOCAL ONLY)
- Baseline: `main` @ `f4c3534`; HEAD: `c950956`
- Commits ahead of main: **42** — 37 plan commits (Phases 0–25, by the
  implementation session) + 5 interleaved commits by the owner/another
  session (`b3b6d18`, `c467d0c`, `d344570`, `456dfc7`, `7041013` — ISR/CDN
  cache intervals + static-file proxy bypass). **The release diff therefore
  includes those five non-plan changes too** — review them deliberately.
- Diff: 104 files changed, +11,527 / −42.

---

## 1. What was built (per plan phase)

| Phase | Deliverable | Commit |
|---|---|---|
| 0 | Baseline audit (`docs/PHASE-0-BASELINE-AUDIT.md`) | 84e5c8c |
| 1 | `Organization` model + optional `Opportunity.organizationRef` | adcdc59 |
| 2 | Org resolution & backfill engine (`src/lib/organizations/`), `OrganizationAlias`, dry-run-by-default backfill | 9162f68 |
| 3 | `OpportunitySourceObservation` model + role/trust helpers + backfill | 25a1f1d |
| 4 | Canonical cross-source dedupe (`canonical-resolver.ts`, 4-level hierarchy, official-promotion merge) | cfa4dc2 |
| 5 | Apply Destination Resolver V2 (role/domain-aware, evidence + confidence) | 76d2475 |
| 6 | ImportSource V2 (ownership, priority, trust, backoff, health) + scheduler helpers | 0606c30 |
| 7 | 5 generic official-source adapters (officialHtml, rssOpportunity, jsonApi, greenhouse, lever) | 0d130c8 |
| 8 | Oracle import worker (local-verified; systemd template prepared only) | 2f2df49 |
| 9 | Verified official-source seed (ReliefWeb OCHA RSS + Acted careers) | 7f9d74d |
| 10 | Discovery Inbox (merge/keep/publish/reject/trust/pause) | 9f35b90 |
| 11 | Admin Organization Management panel | 9f12c96 |
| 12 | Employer auth + `OrganizationMember` + claiming (manual approval) | cd71726 |
| 13 | Employer dashboard (ownership-enforced job management) | 8291b8f |
| 14 | Professional employer job form (both quick-post and dashboard) | 3bc27a1 |
| 15 | Public organization pages (`/[lang]/organizations/[slug]`) | 5c9d0cf |
| 16 | Freshness & update detection (explicit close only) | 03ec24f |
| 17 | Verification / trust system (`verificationStatus` + conservative badges) | 8ce1c93 |
| 18 | Translation integration (all creation paths enter the Persian-first queue) | d8a01df |
| 19 | Source health & alerting (derived alerts + admin strip) | 15efb4f |
| 20 | Discovery speed analytics (detection/publication latency, competitor lead) | f215f3e |
| 21 | Source suggestion engine (aggregator discoveries → candidates) | 7b2ae0b |
| 22 | Security hardening (SSRF guard, rate limits, sanitization audit) | 99000bf |
| 23 | Mandatory-case test matrix (20/20 covered; 1 resolver bug fixed) | 327c7b0 |
| 24 | Performance review (indexes verified, hot-path audit) | 87dae84 |
| 25 | Local end-to-end simulation (6/6 scenarios through real `runImport`) | fd484c5 |

## 2. Data model changes (9 migrations, ALL additive)

`20261003000000` Organization · `20261003090000` OrganizationAlias ·
`20261003110000` OpportunitySourceObservation · `20261003120000` apply
evidence columns · `20261003130000` ImportSource V2 columns ·
`20261003160000` User.passwordHash + OrganizationMember ·
`20261003170000` OpportunitySubmission.professional ·
`20261003180000` Opportunity.verificationStatus · `20261003190000`
OrganizationSourceSuggestion.

No column was ever removed or retyped. Legacy `Opportunity.sourceName /
sourceUrl / originalUrl` remain the live identity fields. Old code (rollback)
is compatible with the migrated schema — new columns/tables are simply inert.

## 3. New environment variables

| Variable | Required | Purpose |
|---|---|---|
| `EMPLOYER_SESSION_SECRET` | prod: yes (falls back to `ADMIN_SESSION_SECRET`; hard-fails without a strong secret in production) | employer session signing |
| `WORKER_ALLOW_REMOTE=1` | worker only | unlocks the import worker's local-DB refusal (rollout step 10) |
| `RELIEFWEB_APPNAME` | optional | pre-existing; ReliefWeb API scraper still parked "pending" (the OCHA RSS source works without it) |

No Vercel environment changes are required for the application itself.

## 4. New services / APIs / pages

- **Worker:** `scripts/opportunity-import-worker.ts` (+ `worker:imports`)
  with `deploy/aria-hub-import-worker.service` — PREPARED, NOT INSTALLED.
- **Admin APIs:** `/api/admin/discovery`, `/api/admin/organizations`,
  `/api/admin/import/alerts`, `/api/admin/analytics/discovery`.
- **Employer APIs:** `/api/employers/auth/[action]`, `/api/employers/claims`,
  `/api/employers/jobs`, `/api/employers/jobs/[id]`.
- **Public pages:** `/[lang]/organizations/[slug]`.
- **Authenticated pages:** `/[lang]/employers/login`, `/[lang]/employers/dashboard`.
- **Admin UI:** Discovery Inbox + Organizations panels in the admin shell.

## 5. Test results (local, ariahub_test)

- Full suite: **404 pass / 9 skip / 3 fail** (416 tests, 50 files).
- The 3 failures are **pre-existing and unrelated**: the owner's own
  `performance-boost.test.ts` expectations still assert the OLD 300s
  revalidate/llms.txt behavior their own commits (`b3b6d18`, `c467d0c`,
  `7041013`) changed to 1800/proxy. Decision needed: update those
  expectations at release time.
- 9 skips are environment-gated (8 security-closure HTTP probes + 1 E2E
  browser smoke needing a dev server/Chrome).
- New coverage added by this plan: 20 files / ~130 cases incl. the real
  translation engine with a scripted provider, a 6-scenario end-to-end
  simulation through real `runImport`, and an index-coverage guardrail.

## 6. Known risks

1. **Only 2 verified official sources seeded** (ReliefWeb OCHA RSS, Acted) —
   the architecture is proven; scaling to 10–15 needs the Workday-class
   portal adapter (deferred by plan) or manually verified HTML configs.
2. **Production `ImportSource` inventory not yet pulled** — the local mirror
   has 16 rows; production rows (pilot settings) must be inventoried
   read-only BEFORE running the organization backfill in production.
3. **AI enrichment unexercised locally** (no provider config on this
   machine) — imports store original content and queue translation; the
   first production runs should be watched via the health alerts.
4. **Employer auth is minimal by design** — no email verification, no
   password reset yet; claiming is admin-gated, and the blast radius of a
   bad actor is limited to pending rows that admins must approve.
5. **Owner's perf-test failures** must be reconciled (update expectations
   or revert their cache intervals) before a green release gate.
6. **Rate limiters are in-memory** — they reset on cold start (burst
   mitigation only, documented).
7. **Two local-only scripts refuse non-local DBs by design**
   (`backfill-organizations.ts`, `backfill-source-observations.ts`,
   `backfill-verification-status.ts`) — production backfills need an
   explicit override decision (see §8).

## 7. Database migration steps (when authorized)

1. **Backup production DB** (Supabase snapshot).
2. Review the 9 migration SQL files (all additive; total new columns: ~20,
   new tables: 5).
3. `prisma migrate deploy` (production uses migrate deploy — never db push).
4. Deploy the application (Vercel).
5. Read-only inventory of production `ImportSource` rows.
6. Run backfills in this order (each: dry-run first, review, then apply):
   a. organization backfill (creates orgs from `Opportunity.organization`,
      links opportunities — preserves display strings);
   b. source-observation backfill (759-equivalent rows for prod);
   c. verification-status backfill.
   → These three scripts hard-refuse non-local DATABASE_URL; for the
   production run either (i) set an explicit allow flag (small patch) or
   (ii) execute the equivalent SQL/logic via a psql session from the backup
   host. Decide at rollout; do not improvise.
7. Seed the official sources (the Phase 9 seed script, re-verified against
   production baseUrls) — `autoPublish=false` hardcoded.

## 8. Rollback plan

- **Application:** Vercel instant rollback to the previous deployment; the
  old code runs cleanly against the migrated schema (all changes additive,
  legacy fields untouched, no behavioral coupling: old code never reads the
  new columns).
- **Database:** restore the pre-migration snapshot if needed; alternatively
  leave the schema in place (inert to old code) and roll only the app.
- **Worker:** never installed during the rollout's early stages — nothing to
  roll back; disable with `systemctl stop aria-hub-import-worker` if needed.
- **Feature blast-radius containment:** official sources ship with
  `autoPublish=false`, so nothing from them reaches the public site until a
  human publishes; the Discovery Inbox contains all uncertain imports.

## 9. Production rollout plan (deferred — needs explicit authorization)

1. Backup production DB.
2. Review migration SQL (§2).
3. Apply backward-compatible schema (`migrate deploy`).
4. Deploy application.
5. Keep official sources `autoPublish=false`.
6. Seed the small verified official-source set.
7. Observe imports for several days (health alerts + Discovery Inbox).
8. Validate canonical merges (ACBAR/Wazifaha sightings folding into
   official rows) and Apply links (evidence/confidence fields).
9. Enable the Oracle import worker (`WORKER_ALLOW_REMOTE=1` in
   `/etc/aria-hub/import-worker.env`, install the systemd unit).
10. Monitor for several days; expand sources gradually.
11. Only later consider trusted-source auto-publish.

## 10. Final state

- Branch `feature/official-opportunity-ingestion-v1` @ `c950956` — local.
- Working tree clean (tracked files); 9 migrations ready; 404/407 tests
  green (3 owner-caused failures documented).
- **No push. No PR. No deployment. No production changes.** Everything
  waits for explicit authorization.
