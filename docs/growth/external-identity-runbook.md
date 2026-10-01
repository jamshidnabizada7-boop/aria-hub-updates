# Day 6 — External identity runbook (owner actions; accounts/credentials required)

Goal: the same name, URL, one-liner, founding info, logo and social links on
every platform. Copy-paste content is below. ~2-3 hours total.

## Profile consistency block (use everywhere)

- **Name:** ARIA HUB
- **URL:** https://www.myariahub.com/
- **Tagline:** Jobs, scholarships and global opportunities for Afghanistan.
- **One-sentence description:** ARIA HUB is a multilingual opportunity platform that helps people from Afghanistan discover jobs, scholarships, internships and global programs with clear summaries and direct official application routes.
- **Languages:** English, Dari (Persian), Pashto
- **Logo:** `public/logo.svg` (vector) / `public/logo.jpg`
- **Social links:** the site's live social profiles (footer) + founder LinkedIn
- **Rule:** never list traction numbers that cannot be verified (see `claims-audit.md`).

## 1. LinkedIn Company Page — P0 (free)

1. Create/update the company page with the block above; industry: "Technology, Information and Internet" or "Education".
2. Add a weekly publishing cadence: 1 useful weekday post (employer/partner/product focus).
3. Add the page URL to the site footer social links and to the Organization `sameAs` markup (`src/components/site/json-ld.tsx`) once live.

## 2. Chashma (chashma.info) — P0

Afghanistan tech company/founder directory — strong contextual fit.
1. Create the founder profile and the ARIA HUB company profile with the block above.
2. Record the profile URLs in `outreach-targets.csv` row notes.

## 3. Hamkaar (hamkaar.com/en) — P0

Free multilingual Afghanistan business directory with owner-claim/update flows.
1. Add or claim the ARIA HUB listing.
2. Keep details current — revisit quarterly.

## 4. Crunchbase — P0

1. Register/socially authenticate, then create the complete organization profile (Crunchbase allows registered users to add profiles).
2. Fill only verifiable fields; skip traction numbers.

## 5. StartupBlink — P0

1. Submit ARIA HUB to the Global Startup Ecosystem Map (startupblink.com/startups/add).
2. Follow the confirmation email; record the live profile URL.

## 6. P1 follow-ups (this week or next)

- **F6S** — founder/company profile; use for accelerator/program discovery.
- **PakStartups** — create startup/resource presence if submission is open.
- **P@SHA Startup Hub** — apply only if ARIA HUB honestly meets Pakistan startup eligibility; expect ~2-week review.
- **Startup Buffer** — P2, after core profiles are consistent.

## After each profile goes live

Add the URL to the Organization `sameAs` array in `src/components/site/json-ld.tsx` (or the site's socialLinks settings so it appears automatically), then deploy.
