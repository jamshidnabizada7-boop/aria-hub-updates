# Admin and website audit — 14 October 2026

## Findings and changes

| Finding | Resolution |
| --- | --- |
| More than 60 sidebar tasks mixed categories, content and raw database rows | 16 workspaces, related task tabs, localized workspace labels, task search and bookmarkable panel hashes. Existing dashboard/action shortcuts resolve to the same workspace. |
| Import dashboard, sources and raw run CRUD repeated the import workflow | Sources live beside Auto Import. Run history stays inside Auto Import; the legacy run shortcut resolves there. Generic editing of worker history is blocked. |
| Manual Counter records did not control the live homepage statistics | Retired the misleading counter editor and mapped its shortcut to Website & visibility. Counts remain derived from actual data. Existing counter records are preserved. |
| Template manager listed only published records and sent edit/delete to nonexistent URLs | Removed that obsolete component. Templates now use the authenticated canonical CRUD endpoint, include drafts, translations, categories, file URLs and structured writing guidance. |
| Bookmarks, ratings and interview sessions offered manual creation/editing | Read-only review in UI and API. Session response bodies are excluded from the generic list response. These are user activity, not public CMS sections. |
| Generic Sections editor exposed keys, order and titles that do not control the fixed homepage layout | Replaced with an allowlisted visibility manager showing counts, homepage on/off, empty content, edit links and public previews. CV Builder configuration has its own manager. No section or content records were deleted. |
| Process Steps were queried but ignored by Home | Home now renders the published CMS Process Steps component. No published steps means the section has no content. |
| Hidden sections looked like broken records | Visibility manager distinguishes homepage-off from no published content; standalone pages remain independent. Team, visas, gallery, pricing, payments, partners and testimonials retain their existing homepage switches. |
| Shared site bundle could retain edits for 30 minutes | CMS/settings saves expire the `site-data` tag and relevant rendered paths. Opportunity caches also expire when shared content changes. |
| Tools and social defaults could override saved visibility | Menu trees now honor hidden parents, and social links use saved enabled rows. The navigation reconciliation makes actual editable menu records for available tools/resources. |
| Opportunity category menu rows all stored `/opportunities` | Reconciliation sets category-specific query URLs; Travel & Visa points to `/visas`. |
| Gallery footer pointed at a disabled homepage anchor; albums had no visitor surface | Public multilingual `/gallery` with album filters and media viewing; gallery-item album selector uses real album IDs. Footer points to the standalone gallery. |
| Organizations had public detail pages but no directory and details lacked site navigation | Public paginated/searchable multilingual `/organizations`, safe public fields and active counts; organization profiles now include the shared site navigation/footer. |
| Existing tools and resources were difficult to discover | Editable Tools/Explore groups include letters, templates, interviews, visa preparation, organizations, gallery, news, stories, about and partners. Both new directories are in the sitemap. |
| Source type reused the gallery image/video selector | Source configuration offers job, scholarship, fellowship, training and news, with a job default. |
| Structured template guidance needed a usable multiline editor | Spaces and new lines are preserved while editing; trimmed arrays are saved at submit. New templates start as drafts. |
| Menu parent choices could silently hide whole subtrees through cycles | API rejects self-parenting, descendant cycles and nonexistent parents. Category slugs derive from names when no title is present. |
| Table columns repeated titles beside raw translation JSON | Translation copies and duplicate status columns are omitted from summaries. Field labels are readable, and menu parents/gallery albums show names. Translation tabs remain available in editors. |
| Disabled homepage anchors and nested resource menus were confusing | Off sections have no dead anchor preview link. Resource links appear directly under More. |

## Complete task organization

- Dashboard: dashboard.
- Opportunities & review: listings, opportunity categories, submissions, discovery inbox, content health.
- Brand & publishing: Brand Studio, Automation (including group distribution), post ideas.
- Imports & sources: Auto Import, source configuration; run history remains in Auto Import.
- Applicants & delivery: applicant operations, organizations/employer moderation.
- Inbox & subscribers: contact messages, opportunity alert subscriptions, newsletter contacts. These lists retain separate consent and purposes.
- Services & visas: services, service categories, visa products. Visa preparation is a separate educational workflow.
- News & stories: news, news categories, community success stories.
- CV & document tools: CV Builder settings, document templates/categories, comments and read-only ratings/bookmarks.
- Interview preparation: questions/categories, experiences, read-only sessions.
- Visa preparation: countries/categories, questions, documents, experiences, rejections.
- Website & visibility: homepage visibility, menu items, footer links, social links, custom pages.
- About & trust: why ARIA HUB, process, FAQs, testimonials, partners, team, comparison, CTA banners.
- Gallery & albums: media and album management.
- Orders & promotions: orders, advertisements, pricing, payment methods.
- Settings & contacts: site settings, languages, departments, branches.

## Visibility rules

Published/active records appear only on their intended public surfaces. Drafts, rejected submissions, subscriber contacts, messages, private applicant files, processing history and account activity are not public content. Empty or deliberately disabled sections are not auto-enabled. A custom published page has a URL but needs a menu/footer entry to be discoverable. Built-in editorial pages can be overridden using their exact Page slug.

Navigation reconciliation is dry by default (`scripts/reconcile-admin-navigation.ts`). Apply backs up existing menu/footer rows to a restricted Oracle directory and records an audit entry; it makes no permanent deletions. Credentials, app permissions, billing and worker schedules are unchanged.

## Verification

TypeScript passed. Four catalog/navigation checks passed, and five isolated Postgres workflow checks passed, covering real template saves, draft visibility, read-only enforcement, private-response exclusion, homepage controls, unsupported keys, authentication, menu-cycle rejection and shallow resource navigation. Oracle build and live browser verification are recorded after deployment below.
