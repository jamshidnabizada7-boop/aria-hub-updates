# Opportunity translation schedule

## Current production setup (October 2026)

Opportunity imports and translations now run on the Oracle host, using the
separate `/opt/aria-hub-automation` checkout and the systemd units in
`ops/systemd/`. Imports run at `:05`, `:20`, `:35`, and `:50` UTC; translations
run at `:00` and `:30` UTC. The Oracle social worker is separate. The old
Supabase Cron jobs `aria-opportunity-import` (ID 2) and
`aria-opportunity-translate` (ID 1) are **inactive**, retained only as a
fallback. Vercel's in-process scheduler remains disabled.

The worker reads database credentials from `/etc/aria-hub/social-worker.env`
and AI settings from `/etc/aria-hub/opportunity-worker.env`; never commit their
values. The database role has scoped table grants and row policies for the
opportunity pipeline. Each systemd run handles one bounded import or one
translation chunk and shares the database tick lock. A source is marked as
attempted before scraping, so an interrupted run yields to other sources.
The public opportunity feed and its load-more API have a 60-second Vercel CDN
TTL with stale revalidation; detail pages use a 10-minute page cache.

Check `systemctl list-timers --all 'aria-opportunity*'` and the journals for
`aria-opportunity@import.service` and `aria-opportunity@translate.service`.
Check recent `ImportRun` rows and `AutomationState.state` for successful work.

Emergency rollback: disable the two Oracle timers with
`sudo systemctl disable --now aria-opportunity-import.timer aria-opportunity-translate.timer`,
then reactivate the old Supabase jobs with `select cron.alter_job(1, active := true);`
and `select cron.alter_job(2, active := true);`. Vercel function use will rise
again. Disable the Supabase jobs before re-enabling Oracle timers.

## Previous Vercel schedule (inactive)

Production uses one Supabase Cron job, `aria-opportunity-translate`, every 30
minutes. `pg_net` posts to
`https://www.myariahub.com/api/admin/pipeline/translate` with a dedicated Bearer
secret stored in Supabase Vault as `aria_opportunity_translation_cron`. The
matching `TRANSLATION_CRON_SECRET` exists only in Vercel Production. Never put
either value in source control or in the Cron command text.

Each call works at most **one** translation chunk. The endpoint uses the shared
pipeline lock, a 25-minute duplicate guard, a **48-unit UTC daily cap**, the
existing provider backoff, and a **250 MB database-size stop**. The latter is
half of Supabase Free's 500 MB database limit. The in-process scheduler remains
disabled on Vercel, and this endpoint does not import sources or publish social
posts. Vercel Hobby's 60-second function limit is guarded by a 42-second AI
deadline, leaving time to record a failed attempt and release the lock.

At full pace the job makes at most 48 translation attempts and 48 small HTTP
calls per day, or about 1,440 per 30-day month. The observed database was 29 MB
when the schedule was activated. Actual database, egress, provider, and hosting
usage must still be checked in their dashboards; these application limits do
not cap unrelated site traffic or other database users.

Daily checks: query `AutomationState.state` for `lastOpportunityTranslateAt`,
`lastOpportunityTranslateFinishedAt`, `opportunityTranslateUnits`,
`translateBackoffUntil`; count `Opportunity.faStatus` / `psStatus` and
`TranslationChunk.status`; inspect 2–3 Persian output lengths and sections;
check `pg_database_size(current_database())` and Supabase/Vercel usage.
The scheduled request result is also visible for a short period in
`net._http_response`. If the queue stalls, check the endpoint response and
provider errors. Do not force requests through 429 responses.

To stop without changing application code:

```sql
select cron.unschedule('aria-opportunity-translate');
```

The feature branch stays available until the rollout has been stable for
several days.

## New-listing refresh

`aria-opportunity-import` calls `/api/admin/pipeline/import` every 15 minutes through
the same Supabase Cron and Vault pattern. Its credential is separately stored
as `aria_opportunity_import_cron` / Vercel Production `IMPORT_CRON_SECRET`.
It gives ACBAR, Wazifaha, Jobs.af, O4AF, and Scholarships.af a slot every
12 hours. Unattempted new listings get a retry slot after 15 minutes. Other enabled
opportunity sources run weekly when no primary source is due; news sources are
excluded. One request still handles only one source to stay within Vercel's
function limit. Primary sources crawl up to ten recent list pages, processing
each page before fetching the next and prioritizing unseen URLs. Runs stop at
the 35-second budget; the remaining unseen
count is recorded for the next run. Expired listings are skipped before being
stored. Inline AI enrichment and translation remain queued separately. The
scheduled importer stops starting new runs at 250 MB database size. Existing
source auto-publish settings still decide whether an imported row is published.

Check `lastOpportunityImportDate`, `lastOpportunityImportFinishedAt`,
`lastOpportunityImportSource`, `lastOpportunityImportStatus`, and
`lastOpportunityImportRemainingNew` in
`AutomationState.state`, plus `ImportRun` counts and source health. Some sites
may fail or block scraping; a daily run can finish without a new listing. To
stop this refresh separately:

```sql
select cron.unschedule('aria-opportunity-import');
```
