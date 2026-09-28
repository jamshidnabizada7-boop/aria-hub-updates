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

`aria-opportunity-import` calls `/api/admin/pipeline/import` once daily through
the same Supabase Cron and Vault pattern. Its credential is separately stored
as `aria_opportunity_import_cron` / Vercel Production `IMPORT_CRON_SECRET`.
It chooses the least recently run enabled job or scholarship source. Each run
reads at most **one list page**, processes at most **three listings**, and has
a **25-second scrape/processing budget**. It skips inline AI enrichment and
translation; the translation queue processes new published rows at its own
bounded pace. It also reserves one run per UTC day and stops at 250 MB database
size. Existing source auto-publish settings still decide whether an imported
row is published.

Check `lastOpportunityImportDate`, `lastOpportunityImportFinishedAt`,
`lastOpportunityImportSource`, and `lastOpportunityImportStatus` in
`AutomationState.state`, plus `ImportRun` counts and source health. Some sites
may fail or block scraping; a daily run can finish without a new listing. To
stop this refresh separately:

```sql
select cron.unschedule('aria-opportunity-import');
```
