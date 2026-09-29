# Opportunity translation schedule

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

`aria-opportunity-import` calls `/api/admin/pipeline/import` hourly through
the same Supabase Cron and Vault pattern. Its credential is separately stored
as `aria_opportunity_import_cron` / Vercel Production `IMPORT_CRON_SECRET`.
It gives ACBAR, Wazifaha, Jobs.af, O4AF, and Scholarships.af a slot every
12 hours. Unattempted new listings get an hourly retry slot. Other enabled
opportunity sources run weekly when no primary source is due; news sources are
excluded. One request still handles only one source to stay within Vercel's
function limit. It crawls up to five configured recent list pages, prioritizes
unseen URLs, and processes until its 35-second budget; the remaining unseen
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
