# ARIA HUB — Visibility & Growth Roadmap execution package

Owner: Ahmad Jamshid · Started: 2026-10-01 · Source: *ARIA HUB Visibility & Growth Roadmap 2026-2027* (research edition 1 Oct 2026).

## Status matrix — First 14 days

| Day | Deliverable | Status | Where |
|---|---|---|---|
| 1 | Master positioning line, tagline, 50-target CRM, UTM naming | **DONE** (docs) | `positioning-and-utm.md`, `outreach-targets.csv` |
| 2 | Public-claims audit + proof folder | **DONE** (docs) | `claims-audit.md`, `proof/README.md` |
| 3 | `/press` + `/partners` landing pages | **DONE** (code, awaiting deploy) | `src/app/[lang]/press`, `src/app/[lang]/partners` |
| 4 | GSC + Bing verified, sitemap, canonical, hreflang | **VERIFIED ALREADY LIVE** | sitemap.xml has hreflang alternates; `public/googlecf657019f33e2585.html` (GSC), `public/9761dc99a8ec4438bcfc3d1481ea2264.txt` (Bing) |
| 5 | Organization/WebSite + JobPosting structured data, expired handling | **VERIFIED ALREADY LIVE** | `src/components/site/json-ld.tsx` (Organization+WebSite+FAQ graph on homepage), `src/lib/seo-job-schema.ts` (JobPosting with `validThrough` expiry policy) |
| 6 | External identity (LinkedIn, Chashma, Hamkaar, Crunchbase, StartupBlink) | **PREPARED — needs owner accounts** | `external-identity-runbook.md` |
| 7 | Founder profile assets | **DONE** (docs) | `founder-profile-assets.md` |
| 8 | Partnership wave A (5 emails) | **DRAFTED — needs owner send** | `outreach-waves.md` |
| 9 | Partnership wave B (5 messages) | **DRAFTED — needs owner send** | `outreach-waves.md` |
| 10 | Local ecosystem wave (5 contacts) | **DRAFTED — needs owner send** | `outreach-waves.md` |
| 11 | Partner feed specification | **DONE + MVP shipped** (code, awaiting deploy) | `partner-feed-spec.md`, `src/app/api/partners/feed/route.ts`, `public/embed/opportunities-widget.js` |
| 12 | Ambassador program: 10 candidates, code of conduct | **DONE** (public page + playbook); recruitment needs owner | `/ambassador` page, `ambassador-playbook.md` |
| 13 | First webinar: date + registration landing page | **PAGE DONE** (code); date proposal needs owner confirmation | `/webinar` page, `webinar-plan.md` |
| 14 | Founder-led evidence post | **DRAFTED — needs owner publish** | `founder-post-day14.md` |

## What shipped in code (this working tree, uncommitted)

- `src/app/[lang]/press`, `/partners`, `/webinar`, `/ambassador` — trilingual (en/fa/ps) pages with metadata, hreflang alternates, DB-overridable content.
- `src/lib/growth-page-content.ts` — built-in trilingual fallback docs.
- `src/lib/seo-metadata.ts` — SEO entries for the four new pages.
- `src/app/sitemap.ts` — new routes in the sitemap with hreflang.
- `src/lib/i18n.ts` + `src/components/site/footer.tsx` — footer links "Partner With Us" and "Press Kit" (all three languages).
- `src/app/api/partners/feed/route.ts` — public JSON feed with filters + partner UTM attribution.
- `public/embed/opportunities-widget.js` — no-code embed widget for partner sites.
- `src/components/site/webinar-register-form.tsx` — registration joins the newsletter subscriber list (consented follow-up channel).

Typecheck (`tsc --noEmit`): clean. Deploy happens when the owner pushes (Vercel).

## Operating rules (from the roadmap)

1. Every week creates at least one **durable asset** (backlink, directory profile, partner relationship, evergreen guide, subscriber, referral source, integration).
2. Outreach = **3 touches maximum**, then stop unless they engage.
3. Never quote a public number without a **dated evidence export** (see `proof/README.md`).
4. Never scale a channel before tracking (UTM) proves where results come from.
