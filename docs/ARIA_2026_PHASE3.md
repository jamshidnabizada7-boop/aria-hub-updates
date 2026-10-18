# ARIA HUB 2026 — Phase 3 opportunity discovery

Status: implemented on isolated `feat/aria-hub-ui-refresh-2026-10` branch, **not released**.

## Screens available after an approved staging deployment

The pages are opt-in, require `ARIA_REDESIGN_PREVIEW_ENABLED=true`, and declare `robots: noindex,nofollow`:

- `/{lang}/redesign-preview` — Phase 2 homepage, now wired to the Phase 3 directory.
- `/{lang}/redesign-preview/opportunities` — Phase 3 discovery and filters.
- `/{lang}/redesign-preview/opportunities/{slug}` — Phase 3 details.

`{lang}` is `en`, `fa`, or `ps`.

These are NOT available by default on production, nor do they replace the current public pages.

## Data reuse and behavior

- Queries: `getFacets`, `listOpportunities`, `getOpportunityBySlug`, `getRelatedOpportunities`. No new database tables, migrations, data imports, user writes, or cron jobs.
- Filters: keyword, category, country, province, deadline (7/30/90), ordering (newest/deadline/title), include-expired.
- URL compatibility: regular opportunity pages keep their existing `q`, `category`, `country`, `province`, `deadline`, `sort`, `show` API and routes. Legacy `location` is accepted on the preview directory as a country filter.
- Server-rendered first page and numbered pagination work without client JavaScript. Client uses the existing `/api/opportunities/list` endpoint for explicit Load more; handles deduplication, retries, loading and abort-on-unmount.
- Bookmark buttons reuse the existing saved-slugs mechanism. They are kept **outside** listing links (no nested interactive elements).
- Detail view reuses `renderListingContent` to display sanitized content.
- Apply links are only shown after `normalizeApplyUrl` + `classifyOpportunityApplyUrl` + `isRealApplyLink`. Expired opportunities do not show direct Apply; native-employer applications continue via canonical details. When no verified application URL is present, the preview directs users to canonical detail instructions.
- Verified organization/source badge only appears when `verificationStatus` confirms it. No invented statistics or proof.
- All page content is rendered in English / Persian (Afghanistan) / Pashto. Both RTL and LTR layouts share a scoped CSS theme.
- UI styling is scoped to `.aria-v2`; no modification to the current public listing/card/detail styles.

## Files

New:
- `src/components/site/redesign/aria-opportunity-card.tsx`
- `src/components/site/redesign/aria-opportunity-results.tsx`
- `src/components/site/redesign/aria-directory.css`
- `src/app/[lang]/redesign-preview/opportunities/page.tsx`
- `src/app/[lang]/redesign-preview/opportunities/[slug]/page.tsx`

Updated:
- `src/components/site/redesign/aria-home-preview.tsx` (links/search into preview)
- `src/components/site/redesign/aria-preview-nav.tsx` (preview menu and language paths)

## Must pass before a production merge

1. Confirm the exact Git commit deployed to Oracle and ensure this feature branch is based on a suitable source snapshot. The repo's older deployment README is not reliable evidence of the current Oracle server release.
2. On an isolated checkout, run `bun install --frozen-lockfile`, `bun run build`, `bun test ./tests/`. Check compilation, in particular font subsets and the new nested Next.js routes.
3. Run manual E2E on desktop and mobile at 360, 390, 768, 1024 and 1440 widths. No clipped filters, no text overlap, no horizontal page scroll.
4. Exercise for en/fa/ps: simple keyword, category chip, country + province, deadline, sort, show expired, reset, numbered pagination, Load more, Load more retry, a saved card, an expired detail, a native-employer listing, a true external application form, a fallback-only source listing and a translated/untranslated long title.
5. Verify filters/params produce the same opportunity ID set as the existing directory on equivalent queries (allowing sorting/timing differences from cache).
6. Confirm no draft records appear; only status not draft can be opened in details. Check canonical and noindex policies; make sure previews cannot be crawled.
7. Confirm application CTA points only to real application destinations and has safe `rel=\"noopener noreferrer\"` for HTTP external links.
8. Check semantic labels, keyboard navigation, form focus, saved buttons, contrast and reduced-motion.
9. Do not enable the preview feature flag on the public production domain without authentication/access controls. A flag and noindex are **not** access control.
10. Obtain user approval for a deployment, use a rollback-capable build, and only later replace the existing public directory/detail templates.

## Open verification gaps

- No actual Oracle SSH/source-parity confirmation.
- No Next.js build, browser or database-backed E2E executed in the GitHub connector session.
- The redesigned pages are source-complete drafts but not production-ready until those checks pass.
