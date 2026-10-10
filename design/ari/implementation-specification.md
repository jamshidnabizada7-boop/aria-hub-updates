# CODEX TASK — Implement approved ARI mascot throughout ARIA HUB

You are the senior full-stack engineer, motion designer, brand-system designer, accessibility reviewer, and QA owner for ARIA HUB. **Implement this work in the actual active repository; do not stop at a plan or mockup.** Create a feature branch and deliver tested, reviewable changes. Do not deploy or publish social posts without my explicit approval.

## 0. Verify repository and existing architecture FIRST

- Canonical website: https://www.myariahub.com (localized `/en`, `/fa`, `/ps`). The spelling `myariahhub.com` is not the primary domain.
- The connected GitHub repositories include `jamshidnabizada7-boop/aria-hub-updates` and `jamshidnabizada7-boop/ARIA-HUB-LATEST-MAIN-ORIGINAL`. **Verify which is the current production/development codebase before making changes.** The `aria-hub-updates` repository appears closer to the live site (it contains the Letter Builder, employer pages, Social Poster, and upgraded CV Builder); do not modify an obsolete repository merely because of its name.
- Observed stack in `aria-hub-updates`: Next.js App Router 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Prisma, Bun tests, existing i18n (`en`, `fa`, `ps`). Follow repository conventions and current configuration; do not introduce a second design system.
- Examine the existing components before coding: `src/components/site/home.tsx`, `src/components/site/sections/hero.tsx`, `src/components/site/floating-social.tsx`, `src/app/[lang]/layout.tsx`, `src/lib/i18n.ts`, and the existing opportunity, CV, letter, and matcher pages. Look for existing layout/widget shells to avoid mounting ARI more than once.
- Critically, reuse the existing social-poster infrastructure where present: `src/components/site/opportunity-poster.tsx`, `src/app/[lang]/social-poster/page.tsx`, `src/lib/social/brand.ts`, `src/lib/social/templates.tsx`, `src/lib/social/studio/premium-canvas.tsx`, `src/lib/social/themes.ts`, admin Social Kit / studio, and related poster/export APIs. Preserve their current permissions, rendering, QR codes, and localization.

## 1. Exact visual identity — approved design, not a redesign

I will attach `ARI_Approved_Mascot_Reference.png` (approved six-character brand board). This board is the **single source of truth**. The user explicitly rejected the unrelated bird, blob, and other proposed mascots; do not create them.

Keep ARI recognizable: small rounded white-to-ice-blue hood/teardrop body; deep navy faceplate; expressive bright-blue eyes; cyan/violet glow; tiny arms/feet; the delicate orbit and little sparkle. The primary version is **Classic ARI**. The approved **Stellar, Minimal, Scholar, Global, and Nature ARI** are role-specific variants, not six unrelated mascots.

- Classic = global website companion and welcome.
- Minimal = small icon where clarity at 48–64px matters.
- Scholar = educational tools, scholarships, CV/letter resources.
- Global = international opportunities and global programs.
- Stellar/Nature = occasional campaigns only where relevant.
- Keep the existing ARIA HUB logo/wordmark and favicon intact by default. ARI is the brand mascot, **not a replacement for the official logo**.
- Keep colors compatible with the existing navy/gold ARIA HUB brand and the approved mascot's white/cyan/blue/violet look. Avoid heavy redesign of site backgrounds.

## 2. Build genuine reusable image assets

Put clean deliverables in an organized location such as `public/images/ari/` and source documents in `design/ari/`. Produce, as the reference permits:

- `classic`, `minimal`, `scholar`, `global`, plus `waving`, `thinking`, `happy`, `celebrating`, `reading` variants, with consistent proportions.
- Transparent high-quality PNG masters, optimized WebP images, responsive derivatives (64/128/256/512/1024px as appropriate), a 40–64px launcher icon, a crisp square profile/social avatar, and high-resolution transparent artwork for posters.
- A small visual proof/contact sheet of all assets on BOTH light and dark backgrounds.

IMPORTANT: The reference is a multi-character concept board, **not a ready-made transparency sprite sheet**. Carefully isolate the approved character without preserving adjacent text, outlines, backgrounds, or other characters. Do not fake transparency with white pixels. If a pose cannot be isolated cleanly and consistently, do not ship a visibly rough cutout or silently invent a new character. Complete reliable integrations using available approved assets, document the missing production asset, and ask for an isolated master artwork before enabling affected placements. Do not claim a generated vector is the original if it has been approximated. Never hotlink the original ChatGPT image or depend on transient attachment URLs.

## 3. Place ARI with purpose across the live site

Use restrained, context-aware integration. Do not add an oversized mascot to every section.

**Global floating ARI guide:** implement a compact, accessible persistent launcher on suitable public localized pages, initially collapsed, optionally opening a small guidance panel. Inspect `FloatingSocial` and avoid overlap with existing WhatsApp/social buttons, scroll-to-top, cookie banner, ads, sticky nav, mobile safe-area, and browser keyboard. Integrate as a coordinated action dock or well-separated control, not two competing floating piles. Position logically for RTL and LTR. Exclude admin/auth, full-screen editors, print/PDF, and other conflict-heavy surfaces as required.

**Homepage (`/[lang]`):** add a modest ARI welcome element near the hero/search or how-it-works area, with a useful action such as “Find opportunities.” Preserve the search-first hero, statistics, cards, and current CTAs.

**Listings (`/[lang]/opportunities`) and category filters:** contextual ARI help for finding jobs, scholarships, internships, deadlines, and using filters; an ARI-powered empty-state illustration or tip only where it adds value.

**Opportunity details (`/[lang]/opportunities/[slug]`):** a small ARI “Application checklist” or “Need help preparing?” section using actual listing fields and verified links. Never invent eligibility, scholarship amounts, application dates, official instructions, chances of admission, or application status. Preserve official outbound apply links.

**Opportunity Matcher:** use ARI as an optional step-by-step visual guide, progress/empty-result help, and result explanations, without changing the existing real matching logic or presenting inferred match scores as admission probabilities.

**CV Builder and Letter Builder:** small Scholar ARI contextual tips, completion/validation feedback, or links to existing writing help. Respect autosaved drafts, existing AI writing assistant, personal data privacy, and export behavior. No mascot embedded in exported CVs or formal letters.

**Interview Prep and other career tools if present:** use ARI sparingly for onboarding, guidance, and encouragement. Do not overlay timed practice sessions or important controls.

**Services, About, Contact, Employers, Submit Opportunity, Track Submission:** contextual entry points only, e.g. “Explore services,” “Post an opportunity,” “How review works,” or “Contact the team.” Do not interfere with forms and reference-code inputs.

**Blog, Success Stories, Press:** subtle footer/CTA mascot use only where appropriate; avoid obstructing reading. Add the mascot to downloadable press/brand assets if the existing press kit can reasonably support it.

## 4. ARI's interaction and personality

Create a lightweight reusable client component (suggested `AriCompanion`, `AriLauncher`, `AriAvatar`, `AriTip`), with a configuration/registry per page rather than scattering duplicate hardcoded markup.

- States: idle (gentle float), greeting (one wave), thinking (subtle expression), success (brief celebration), quiet/inactive.
- Interactions: tap/click or keyboard activation opens the panel; escape closes; clear close/minimize; prevent aggressive auto-popup; no unsolicited repeated toast or audio. Add a user “Hide ARI” control with a remembered preference.
- Useful initial panel options: Find Jobs, Find Scholarships, Opportunity Matcher, Build a CV, Write a Letter, Contact ARIA HUB. Change hints based on current page. All link destinations must be actual valid localized routes.
- **Do not market ARI as a functioning AI conversational bot unless it is backed by a secure, existing, tested service.** The first deliverable can be an excellent guided-navigation assistant. If you find an appropriate existing chat/AI backend, document the privacy, cost, rate limiting, moderation, and failure behavior before integrating; never send CV text or personal fields without explicit user action and disclosure.
- Respect prefers-reduced-motion, keyboard focus, screen readers, touch targets >=44px, semantic controls, and good contrast. Avoid excessive client JS, heavy animation, layout shift, hydration mismatch, image flicker, and third-party trackers.
- Fully localize into English (`en`), Dari/Persian (`fa`), and Pashto (`ps`) using the repo's translation method; correctly support RTL direction, alignment, and Unicode fonts. Do not leave English fallback labels in user-visible FA/PS UI.

## 5. Integrate ARI into the EXISTING poster / Social Studio system

The codebase already has opportunity posters and Social Studio templates. Extend that design system; **do not replace the real ARIA HUB logo, poster palette, QR code, social publishing rules, or existing approved layouts**.

- Add ARI as an optional, editable, safe-position media/character layer to the shared poster templates and Studio (when architecture supports it). Presets: `none`, `classic`, `scholar`, `global`, `celebrating` (based only on approved extracted assets).
- Make it optional per design/template, with resize and safe placement; never cover headlines, dates, organization, official apply link, CTA/QR, or disclaimer. Put it in ~10–20% of the visual area depending on format. Do not add ARI to every automatically generated post by default.
- Support existing sizes 1080x1080 square, 1080x1350 portrait, 1080x1920 story, plus a poster-ready A4 300-dpi master/export only if feasible without breaking the current renderer. Confirm real resolution and legible Dari/Pashto in actual PNG output, not just on-screen HTML.
- Use real, database-backed content; never invent scholarships, salaries, deadlines, statistics, organizations, testimonials, or success claims.
- Add a few non-published sample posters illustrating jobs, scholarships, and site-awareness messaging in each supported language, alongside reusable blank templates. Preserve existing export and automated social delivery behavior. Do not automatically post or queue content without approval.
- Create `docs/ARI_BRAND_USAGE.md`: correct/wrong mascot usage, clear space, sizes, dark/light examples, when to omit it, asset inventory, and how editors add ARI to a poster.

## 6. Quality, safety, and implementation standards

- Inspect existing architecture and tests, then implement in sensible commits on a feature branch; do not rewrite unrelated pages or database schema.
- Add a feature flag/config toggle (e.g. `NEXT_PUBLIC_ARI_ENABLED` or an existing site-setting mechanism) so the floating companion can be disabled or rolled out separately. Poster support should not depend on the widget feature flag.
- Do not open/read/commit secrets, `.env`, credentials, user CV contents, or private applicant data. Do not modify authentication, payment, analytics, ad placement, or production worker schedules unless absolutely required; document any such need.
- Test `en`, `fa`, `ps` on mobile and desktop, light/dark themes, 320px phone widths, modal collisions, initial load, navigation, reduced-motion settings, print/PDF exports, and poster render/export. Test visual assets on light/dark with no halos or background rectangles.
- Run the repo's lint, tests, type check, and production build; fix issues caused by this change and report existing unrelated failures separately. Verify via screenshots or visual QA wherever tooling allows.
- Do not invent successful tests, claim deployment, or claim that a chat backend works if untested.

## 7. Definition of done / delivery

Deliver: (1) a concise audited placement map, (2) reusable approved ARI asset pack and visual contact sheet, (3) integrated website launcher plus contextual placements, (4) optional ARI layers/presets in existing poster workflow, (5) English/Dari/Pashto localization, (6) brand usage documentation, (7) screenshots at desktop/mobile and sample exported posters, (8) exact changed files and test/build results, and (9) any asset limitations or manual review steps.

**Start by verifying the actual working repository and the provided approved image. Then implement—do not ask me to approve a new mascot.** If perfect transparent extraction is impossible from the board, preserve brand fidelity, deliver the safe parts, and clearly request the missing transparent master rather than shipping a wrong mascot.
