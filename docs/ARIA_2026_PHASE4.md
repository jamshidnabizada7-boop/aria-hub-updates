# ARIA HUB 2026 redesign — Phase 4 private applicant workspace

**Implementation:** isolated branch `feat/aria-hub-ui-refresh-2026-10`, draft PR #56. NOT deployed to Oracle, NOT merged into main.

## Staging preview routes

All routes are nested under `/{lang}/redesign-preview/portal` where `lang` is `en`, `fa` or `ps`. A staging deployment must explicitly set `ARIA_REDESIGN_PREVIEW_ENABLED=true` and must enforce staging access control outside the Next.js preview flag. The routes are unactionable if previews are disabled.

- `/`: authenticated dashboard
- `/profile`: existing `ProfileEditor` against `/api/applicant/profile`
- `/matcher`: existing five-stage `AdvancedMatcher` component
- `/cvs`: existing private `CVLibrary` including extraction review
- `/cv-builder`: existing `CVBuilderClient` including print/export and configuration
- `/career`: existing `CareerClient` for application tracking and assistance
- `/notifications`: existing `ApplicantNotifications` with opt-in preferences
- `/settings`: existing `ProfileEditor` and `PortalSettings`

The complete new workspace uses the Phase 1/2 shared typography, navy/orange/cream palette, responsive tab navigation and CSS scoped to `.aria-v2.aria-portal`.

## Security and data preservation

- All routes require authenticated applicant sessions through `currentApplicant()`; the parent layout also checks `applicantEnabled()`. Disabled modules are not linked in the tab nav and return 404 when entered manually.
- No changes to existing account tables, authentication endpoints, user file storage, matcher ranking logic, CV export logic, eligibility scoring, notification worker, privacy opt-in, or application API.
- The dashboard reads real applicant-only counts and notifications from the Prisma applicant profile and source tables.
- The Quest card uses honest 0–6 profile-setup progression. No XP value is displayed: an XP ledger was **not present** in the inspected Prisma applicant schema, so we do not pretend a numeric XP balance exists.
- Private uploaded CV bytes never enter the server-rendered dashboard; the CV library owns the private storage operations and extraction review.
- The application assistant retains its explicit optional AI-consent gate and manual application-submission rule.
- Saving a matcher search is **not** treated as consent for in-app or email notifications.
- `robots: noindex,nofollow` is applied to the private preview layout, but robots metadata does not replace authentication or staging access controls.
- All actual UI copy is localized for English, Persian (Afghanistan), and Pashto. Mixed-language data fields use `dir="auto"` where practical.

## New/updated files

New:
- `src/app/[lang]/redesign-preview/portal/layout.tsx`
- `src/app/[lang]/redesign-preview/portal/page.tsx`
- `src/app/[lang]/redesign-preview/portal/profile/page.tsx`
- `src/app/[lang]/redesign-preview/portal/matcher/page.tsx`
- `src/app/[lang]/redesign-preview/portal/cvs/page.tsx`
- `src/app/[lang]/redesign-preview/portal/cv-builder/page.tsx`
- `src/app/[lang]/redesign-preview/portal/career/page.tsx`
- `src/app/[lang]/redesign-preview/portal/notifications/page.tsx`
- `src/app/[lang]/redesign-preview/portal/settings/page.tsx`
- `src/components/site/redesign/aria-portal.css`
- `src/components/site/redesign/aria-active-link.tsx`

Updated:
- `src/components/site/redesign/aria-preview-nav.tsx`: route preview navigation into the new career workspace, preserve server-verified authenticated header
- Phase 4 layout uses active link indicator

## Required staging QA BEFORE merge/release

1. **Oracle parity**: determine actual source commit and environment flags on production Oracle, avoiding changes to live database or deployment.
2. **Build**: run `bun install --frozen-lockfile`, `bun run build`, lint/type checking, and repository tests in an isolated checkout with appropriate staging env.
3. **Security**: preview disabled -> 404, logged-out -> login, account-disabled -> blocked, cross-account ID checks unchanged, all internal API auth/cookie behavior unchanged.
4. **Dashboard parity**: compare counts to existing portal for multiple users; verify profile completion, notifications, tracked applications, organizations followed and empty states. Verify no made-up XP totals.
5. **Profile**: edit full name, headline and residence; reload to confirm persistence; check permissions and failure state.
6. **Matcher**: complete all 5 stages, save/pause/delete search; verify eligibility/unknown status, never claim acceptance probability.
7. **CV Library**: PDF/DOCX/image upload and private download/review/delete; check loading, error and file-size conditions; test another account cannot read documents.
8. **CV Builder**: create/update/duplicate drafts, edit template, export/print PDF, restore drafts, verify RTL and normal letter size. Compare behavior to existing page.
9. **Career**: track a real published opportunity, change status/notes/follow-up date, generate guided text and test AI-consent off/on.
10. **Notifications**: default OFF, explicit opt-in and opt-out, in-app and email preference round-trip; no unexpected emails/push.
11. **Usability**: keyboard focus, screen readers, visible active tabs, logical text order, 360/390/768/1024/1440 viewport widths and right-to-left long titles.
12. **Print and performance**: prevent interface chrome appearing in CV output; review network payload and content masking.
13. **Release**: staging sign-off, rollback plan, optional rollout to a small fraction of traffic, then merge the draft after approvals.

## Gaps

- No full Next.js compilation or E2E browser run has occurred in this connector environment.
- The Oracle production commit is not confirmed against GitHub.
- Backend XP linkage requires a separate audit; it was **not** fabricated or silently created.
- Some CTA links inside reused widgets still go to canonical public pages; that is intentional to preserve working actions until later full-site rollout.
