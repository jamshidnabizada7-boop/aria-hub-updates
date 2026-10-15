# Navigation and action controls — 15 October 2026

## User examples and repairs

- Organizations directory: bare Next/Previous links replaced by shared, labelled 48px controls, page position, and unavailable-direction states. Search and Following filters remain in pagination links. Out-of-range pages redirect to the last valid page.
- Organization profile: contextual All organizations return, clearer identity panel, equally sized follow/official website actions, and a separate representative management card. The management action still enters the existing authenticated claim flow; viewing it grants no access.
- Shared pagination also covers discovery collections, success stories, and visa listings. Direction, labels and page numbers follow English, Dari or Pashto. Discovery campaign parameters and story type filters remain intact.
- Parent return links added to applicant dashboard/subpages, get started, CV builder, saved opportunities, matcher, document templates/letters, organization pages, preparation hubs/practice setup, services, visas, deadlines, employer entry/posting, submission/tracking, and static information pages. Existing article and opportunity breadcrumbs remain intact.
- Prep return links now use translated labels and RTL arrows. Nested anchor/button back controls were removed. The template editor's icon return control now has a translated accessible name and a 48px target.
- Older employer, advertising, submission and preparation hero headers now clear the fixed navbar on phones.

## Shared components

`src/components/site/page-navigation.tsx` supplies action styling, explicit parent routes and list pagination. Body text/footer links keep ordinary link styling. These controls use the established theme tokens and have visible keyboard focus. Parent navigation never depends on browser history or an external referrer.

`PortalBackNavigation` derives the parent from the current applicant route: dashboard to home, applicant subpages to dashboard. It neither loads applicant data nor changes authorization.

## Verification

- TypeScript and targeted ESLint checks.
- Local browser: 42 isolated synthetic organizations, first/last pages, Next with preserved q filter, previous href, English and Pashto page state, Dari organization action layout.
- At 390px: no horizontal overflow; organization actions and pagination links measured 48px tall; keyboard Tab reached the next action with visible focus.
- All synthetic organizations removed after verification; no real follows, claims, submissions or applications sent.
- Oracle production build, preflight and live verification recorded after deployment below.

## Live release

- Runtime commit: `258268c`, `/opt/aria-hub/releases/20261015-navigation-258268c`.
- Full Oracle standalone build passed. Preflight: organization directory/profile, templates and employer posting returned 200 in en/fa/ps; out-of-range filtered directory redirected to a valid page; absent organization returned 404; unauthenticated employer inbox and WhatsApp webhook remained 403.
- Public health reported `ok: true`, database up. Web, import worker, social worker and applicant channel timer active; 3.3 GB disk available after release.
- Production browser verified Aarhus management control, 48px action height, All organizations return and reopening the profile, plus Next opening directory page 2 of 8.
- Screenshot proof: `../admin-audit-evidence/organization-navigation-live-20261015.png` and `../admin-audit-evidence/directory-pagination-live-20261015.png`.
- Local preview server stopped, test database stopped, synthetic records removed, and temporary viewport reset. No real follows, applications, claims or subscriber messages were submitted.
