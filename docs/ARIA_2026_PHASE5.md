# ARIA HUB 2026 — Phase 5 public page integration

Status: source implementation committed on `feat/aria-hub-ui-refresh-2026-10` in draft PR #56. Not merged; Oracle production and production database untouched.

## What was added

The shared public layout is at `src/app/[lang]/redesign-preview/(public)/layout.tsx` and applies:
- `ARIA_REDESIGN_PREVIEW_ENABLED=true` guard, `noindex,nofollow`.
- Shared Plus Jakarta Sans / Estedad (Phase 1) and the scoped .aria-v2 design system.
- Compact, multilingual navigation and a single reusable `AriaPublicFooter`, used on the redesigned homepage too.
- Newsletter remains separate from personalized matching/email alerts.
- Responsive content cards, labels, meta, headlines, pagination, contact form and articles.

**Preview URL prefixes (not yet deployed):**

| Preview path | Data source | Preserved behavior |
|---|---|---|
| `/{lang}/redesign-preview/services` | Published `getSiteData().services` | Existing contact flow and admin publication |
| `/{lang}/redesign-preview/visas` | Published `getSiteData().visas` | Existing visa-prep tools; no invented country eligibility |
| `/{lang}/redesign-preview/blog` | `listBlogPosts`, `listBlogCategories` | Published content + category filter |
| `/{lang}/redesign-preview/blog/{slug}` | `getBlogPost`, `listRelatedPosts` | Original article content rendered through existing sanitizer |
| `/{lang}/redesign-preview/organizations` | Published public-safe organization query | Keyword, pagination, following-only filter and existing follow button |
| `/{lang}/redesign-preview/organizations/{slug}` | `getPublicOrganization` | Safe public profile, active listings, existing follow mechanism |
| `/{lang}/redesign-preview/success-stories` | Published `listSuccessStories`, `getStoryFacets` | Existing read/view/share destinations retained |
| `/{lang}/redesign-preview/employers` | Static user guidance | Employer login, account permissions, posting and dashboard remain on original secure routes |
| `/{lang}/redesign-preview/about` | Published CMS `Page` or existing trilingual fallback document | No invented company claims |
| `/{lang}/redesign-preview/contact` | `getSiteData().settings` plus existing `/api/contact` | Existing validation, rate limiting and DB persistence retained |

`{lang}` can be `en`, `fa` (Persian, Afghanistan), or `ps` (Pashto).

## Source changes

New:
- `src/components/site/redesign/aria-public.css`
- `src/components/site/redesign/aria-public-footer.tsx`
- `src/components/site/redesign/aria-contact-form.tsx`
- `src/app/[lang]/redesign-preview/(public)/layout.tsx`
- Phase 5 page files in `src/app/[lang]/redesign-preview/(public)/`.

Updated:
- `src/components/site/redesign/aria-preview-nav.tsx`: Phase 5 menu links and translations.
- `src/components/site/redesign/aria-home-preview.tsx`: resource discovery cards and common footer.
- `src/app/[lang]/redesign-preview/page.tsx`: new shared footer styling import.

## Guardrails

- No application backend or database schema changes.
- No fabricated organizations, services, visa fees, application requirements, story counts or official links.
- Non-public or unapproved stories/services/visa records are filtered out by the existing query logic.
- The organization detail route uses only the existing public-safe organization projection; unpublished/expired opportunities are excluded.
- Organization follow actions use the existing authenticated follow endpoint.
- Contact submission requires a user action, uses existing API validation and is not triggered on page load.
- For employer authentication and job management, the new public preview links to existing secure employer pages. No parallel employer auth workflow.
- Content on pages that may affect immigration decisions includes a warning to verify current official sources.
- Previews are NOT secure merely because of noindex and a feature flag. Staging must be access-restricted independently.

## Phase 6 test plan / known gaps

1. Confirm exact Oracle production commit and deployed runtime configuration before any release.
2. Use an isolated checkout and staging database/credentials. Run `bun install --frozen-lockfile`, `bun run build`, TypeScript/lint/tests, and record results.
3. Verify every preview route in en/fa/ps at mobile sizes 360/390/768/1024/1440, RTL, keyboard, labels, responsive layouts, no horizontal scroll.
4. Test org search, following, slug detail, published-only opportunities, and organization follow as logged out/logged in/cross-account.
5. Test blog category filter and article detail with HTML, mixed script, long text and sanitization. Confirm no draft appears.
6. Test visa requirements and document arrays where translated/untranslated, no unsupported claims or broken formatting.
7. Test stories, pagination, filters, share links. Avoid submitting a story on production staging test.
8. Test Contact only with safe staging database; do not send test records to the actual production contact queue. Verify validation, rate limits, success/failure state.
9. Employer entry points must lead to authorized employer dashboard/login and use existing secure post form. Test with test employer account.
10. Verify public shared footer links, preview-to-preview navigation, language switching, active account navigation, and canonical external routes.
11. Update sitemap, canonical metadata, route redirects and main homepage ONLY after user staging sign-off; preserve SEO.
12. Confirm performance budgets, font loading, Core Web Vitals, content accessibility, and rollback plan. Then merge/release in stages.

Known not-yet-redesigned elements: existing employer management internals, admin/Brand Studio tools, long-form legal pages and remaining specialist workflows. Their current live UIs and actions remain intact. They should be assessed in Phase 6 before claiming whole-site visual parity.

No production deployment occurred as part of Phase 5.

## GitHub Actions observation (2026-10-18)

The PR branch workflows **CI** and **Applicant Candidate Verification** both reached PostgreSQL migration deployment but failed the isolated database drift check before TypeScript checking and production compilation.

Captured drift report included:
- Removed `McpSecurityState` table
- Changed `EmployerApplication` foreign keys
- Changed `OrganizationFollow` foreign keys

The migration CLI said all existing migrations were applied, but the schema drift check exited code 2. Subsequent steps (Type check, tests, production build, browser QA) were skipped, so **Phase 5 is not build-verified**. These files do not modify Prisma schema or migrations. Reconcile the repository schema/migration history against the isolated test database, then rerun CI before any Phase 6 release. **Do not apply database repairs to Oracle production as part of this UI change.**
