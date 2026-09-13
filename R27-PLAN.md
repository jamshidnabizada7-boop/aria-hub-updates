# R27 — Scraper Junk Root-Cause Fix (Comprehensive)

Owner report: "STILL I SEE SOME ARE INCOMPLETE OR HAVE VERY TOO LESS INFORMATION
SCRAPED WHICH THEY ARE JUNKED … ON ALL AREAS JOBS SCHOLARSHIPS. DO A COMPLETE
COMPREHENSIVE [AUDIT] TO FIND THE ROOT VERIFY IT CHECK IT AND FIX IT."

## Diagnosis (verified against live DB + live HTML, 2026-09-13)

DB state: 616 opportunities / 47 news / 16 import sources.

| # | Symptom (owner screenshot) | Root cause | Scale |
|---|---|---|---|
| 1 | Card titles show raw `https://scholarships.af/opportunity/…` URLs | Pre-R26.4 rows were inserted with `title = sitemap URL`. R26.4 repaired **base** `title`/`description` but left `titleI18n.{en,fa,ps}`, `descriptionI18n`, `aiSummary`, `seoTitle`, `ogTitle`, `seoDescription`, `ogDescription` (+ their i18n twins) holding the URL. `getLocalizedContent()` prefers `i18n[lang] → i18n.en → base`, so the **URL beats the clean title** on cards, detail pages and meta tags in every language. Re-imports never heal them: the orchestrator's URL-title guard *skips* those listings forever, leaving stale junk rows untouched. | 25 rows (all Scholarships.af) |
| 2 | "Too little information" on jobs | Jobs.af is a client-rendered Next.js SPA; detail pages serve **no description** (verified live: 31 KB shell, site-wide og:description only, no per-job description in the RSC flight). The scraper's synthesized fact-sheet (~290 chars) is the maximum honestly scrapable — but it omits fields jobs.af *does* expose: `fixedSalary`, `salaryGrade`, `probationPeriod`, `isExtendable`. | 53/54 Jobs.af rows |
| 3 | Two near-empty scholarship rows | `desc == title` (DAAD Postgraduate, 101 chars) and a mid-list fragment (`<p>All Countries BUT:…`, 164 chars) — detail fetch picked the wrong element / partial body. | 2 rows |
| 4 | One junk news row | Ariana News row: empty excerpt, content = "Source: … URL" only. | 1 row |
| 5 | *Latent* regression risk | Nothing stops the AI pipeline from writing a URL-looking title into `seoTitle`/`ogTitle`/`titleI18n` again; and `getLocalizedContent()` will happily render any future junk i18n value. | prevention |

Healthy (no action): Wazifaha (avg 9.6k chars), Opportunity Desk, Opportunities For
Youth, Scholarships Corner, AfterSchoolAfrica, Scholarship Roar, o4af, Mladiinfo,
(manual) seeds — all avg ≥ 1.7k chars, zero thin rows.

## Fix plan

### A. Defense in depth (code)
1. **`src/lib/i18n-content.ts` — junk-value guard** in `getLocalizedContent()`:
   a localized value that is essentially a bare URL (optionally wrapped in a
   single tag) is treated as missing → fall through to next fallback (base
   field). Self-contained regex (no imports → safe for client bundles).
   This makes the whole bug class *undisplayable* even if data regresses.
2. **`src/lib/ai/pipeline.ts` — title sanitation** before any field write:
   if `listing.title` is URL-ish after `cleanTitleJunk`, derive a human title
   via `prettifySlug(listing.sourceUrl)` (imported from the scholarships-af
   scraper). Never persist URL titles into `seo*`/`og*`/`i18n` containers.
3. **`src/lib/opportunity-queries.ts` — `cleanSummary()`**: a summary whose
   stripped text is a bare URL → `''` (cards then hide the summary line).
4. **`src/lib/import/scrapers/jobs-af.ts`**: richer synthesis + extractedData
   (`fixedSalary`, `salaryGrade`, `probationPeriod`, `isExtendable`).

### B. Data repair (`scripts/r27-repair-junk.mjs`, idempotent, --dry-run)
1. **Pass 1 — scrub URL-contaminated display fields** (any row where
   `aiSummary`/`seoTitle`/`ogTitle`/`seoDescription`/`ogDescription` is
   URL-ish, or an i18n container holds a URL-only value in any language):
   rebuild from the CLEAN base fields — `titleI18n = {en: title}` (keep
   non-URL fa/ps), `descriptionI18n = {en: description}`, `aiSummary` =
   220-char plain summary, `aiSummaryI18n = {en: …}`, `seoTitle/ogTitle =
   title`, `seoDescription/ogDescription = 155-char summary`, SEO/OG i18n
   twins rebuilt likewise; `translationStatus = 'pending'` so the automation
   tick re-translates the repaired rows.
2. **Pass 2 — re-scrape thin rows** (desc == title, or stripped desc < 200
   chars): re-fetch `sourceUrl` via curl with the fixed longest-
   `.jobsearch-description` extraction; update description (+ rebuild
   aiSummary/i18n seeds); delete only on confirmed soft-404.
3. **Pass 3 — news**: delete the single content-is-link-only row (empty
   excerpt, no article body).
4. Report per-pass counts.

### C. Verification
- Re-run the audit queries → expect **0** URL-ish values in every audited
  field, **0** rows below the thin thresholds (except legitimate manual seeds
  and Jobs.af fact-sheets).
- `bun run lint` — 0 new errors in touched files.
- agent-browser: `/en/opportunities` + `/fa/opportunities` — no URL titles on
  cards; open the repaired DAAD detail page — real title/summary/body;
  meta tags clean; RTL dot leaders still aligned (R26.4 fix intact).

### Out of scope (unchanged)
- News i18n rows containing URLs *inside* legitimate text (YouTube/source
  attributions) — those are real content, not junk.
- DB hosting move, publish-channel tokens (owner actions).
