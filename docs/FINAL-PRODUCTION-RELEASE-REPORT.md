# FINAL PRODUCTION RELEASE REPORT

Official Opportunity Ingestion & Employer Platform — ONE controlled
production release executed 2026-10-04 (04:20–05:05 UTC), per the authorized
15-step procedure. **Manual-only translation policy applied.**

| # | Item | Result |
|---|---|---|
| 1 | Production commit SHA | `03db843` (pushed `f4c3534..03db843` to `main`, fast-forward; includes all 37 plan commits + the 5 preserved ISR commits + reconciliation) |
| 2 | Migration result | `prisma migrate deploy` — 9 additive migrations applied; `_prisma_migrations` now 20 rows; verified: 5 new tables + all new columns present |
| 3 | Backup confirmation | `release-backups/prod-backup-20261004-073937/` — 80 tables / 4,188 rows NDJSON + manifest (row counts, checksums, migration state). Timestamped 2026-10-04 07:39 PKT. Project `ftmnqcjqqupkzafwevwn` |
| 4 | Organization backfill | DRY-RUN first (report saved) → APPLY: **303 organizations created, 732 opportunities connected**; display strings preserved; ambiguous pairs reported, never merged |
| 5 | Observation backfill | DRY-RUN first → APPLY: **1,372 observations created** (1,358 aggregator / 14 discovery-Manual); legacy fields untouched |
| 6 | Verification backfill | **1,372 rows → `single_source`** (correct: every row had exactly one aggregator sighting) |
| 7 | Official sources seeded | `ReliefWeb Jobs (OCHA)` (rssOpportunity) + `Acted Vacancies` (officialHtml) — both URLs re-verified live (200) before insert; **autoPublish=false hardcoded** |
| 8 | Vercel deployment | ONE production deployment, `● Ready` in 2m (`aria-hub-updates-nvtqrzmog…`); no preview deployments |
| 9 | ISR/CDN verification | Post-deploy: home `HIT` (Age climbing), detail `HIT` (Age climbing), `/llms.txt` PRERENDER public — **no regression to high-ISR behavior**; all 15 checked routes HTTP 200 (home×3 langs, feed×3 langs, existing detail, organization pages×3 langs, /admin, /employers/login); Apply UI renders |
| 10 | Old import timer disabled | **YES** — `aria-opportunity-import.timer` stopped + disabled (was active/15-min) |
| 11 | New import worker running | **YES** — `aria-hub-import-worker.service` installed on Oracle (`/opt/aria-hub`, new code shipped, Prisma client regenerated, dedicated `/etc/aria-hub/import-worker.env` with `WORKER_ALLOW_REMOTE=1`); active at ~87 MB; runs verified: Mladiinfo ok, ReliefWeb pending-as-designed |
| 12 | Translation timer disabled | **YES** — `aria-opportunity-translate.timer` stopped + disabled per MANUAL-ONLY decision; code/config left in place for future reactivation |
| 13 | Social worker unchanged | **YES** — `aria-hub-social-worker.service` active/running, never restarted, zero journal errors |
| 14 | Controlled import result | OCHA source, `--bounded` (no AI calls): found 20, imported **15 drafts**, partial at the 35s budget (remainder follows next run — exercised the partial path correctly) |
| 15 | Duplicate/canonical result | No duplicates; aggregator sightings would fold via Level-A (vacancy) — OCHA items carry no parseable org name, so organizationId is null for them (resolved via Discovery Inbox over time); 732 legacy rows already canonically linked |
| 16 | Apply URL result | OCHA rows: `application_email` / evidence `employer-email-extracted` / confidence 75; one no-destination row correctly renders "How to apply" guidance |
| 17 | Translation pending-state | **Holds** — imported rows: faStatus null (never started; engine-eligible), psStatus null; **zero AI translation ran** (bounded import + translate timer disabled + `IMPORT_TRANSLATE_ON_IMPORT` opt-in gate now default-off in code) |
| 18 | Production errors | Two transient, both fixed during rollout: (a) new tables lacked grants for the app role `aria_social_worker` → GRANTs applied; (b) worker initially picked news sources → patched to job/scholarship only (matches the old scheduler's filter) |
| 19 | Rollback readiness | FULL: pre-migration row backup + Supabase snapshot; all migrations additive (old code runs against migrated schema); instant Vercel rollback; old timer units still on disk (`systemctl enable` reverses); new sources are drafts |

## Follow-ups flagged (owner action)

1. **One unpushed local commit** (`03db843..HEAD`): the worker's
   news-exclusion filter + the production backup script — already LIVE on
   the Oracle box; a small follow-up push to main will trigger one Vercel
   build (scripts-only change, no behavior change on Vercel). Await your
   go-ahead.
2. Performance-test expectations were reconciled pre-release (now green);
   no action needed.
3. Discovery Inbox review recommended for the OCHA rows without
   organizations; official sources stay `autoPublish=false` until you say
   otherwise.
4. Ambiguous org pairs from the backfill are saved in
   `release-backups/prod-org-backfill-dry-run.json` for admin review in the
   Organizations panel.
