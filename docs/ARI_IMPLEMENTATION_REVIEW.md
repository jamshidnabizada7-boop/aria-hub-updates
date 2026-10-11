# ARI implementation review

## Candidate scope

Repository verified against the Oracle release SHA: `jamshidnabizada7-boop/aria-hub-updates`, baseline main `650cd69bd9eede73d815e87ab7cf8b1c262918d9`. The older `ARIA-HUB-LATEST-MAIN-ORIGINAL` repository was last updated in September and is not the active release. All implementation is on `codex/ari-mascot-companion`; no production deploy, automatic social posting or schedule changes are authorized by this candidate.

## Verification record

- New ARI unit tests: 5 passed, 246 assertions, including public exclusions, canonical destinations, poster opt-in identity, malformed saved values, geometry and actual alpha pixels.
- Full lint baseline before edits: 25 errors and 3 warnings. After initial integration: the same 25 errors and 3 warnings, no new ARI errors. They include existing CommonJS import rules, synchronous state effects and an empty object type in unrelated files.
- Verified implementation revision: `8214bbe6c74da376f8dd1a0b14f44965e79415fa`. Subsequent review-document updates do not change application code.
- Type check and production builds passed locally and in CI. The first local build stopped because no local production session secret was supplied; the successful retry used a fresh disposable build-only secret and an isolated test database URL. No existing credential file was opened.
- [Repository CI](https://github.com/jamshidnabizada7-boop/aria-hub-updates/actions/runs/38088775197): passed.
- [Applicant Candidate Verification](https://github.com/jamshidnabizada7-boop/aria-hub-updates/actions/runs/38088775318): passed.
- [ARI candidate review](https://github.com/jamshidnabizada7-boop/aria-hub-updates/actions/runs/38088775267): passed, **523 browser checks**, no reported issues. Tests ran against a disposable localhost test database with external browser requests blocked.
- Review artifact: `ari-review-8af6292fe4924a61a52670d016b0fd4139958c88` (GitHub's tested pull-request merge revision). It contains **73 actual PNGs**: 18 home guide screenshots, 30 contextual page screenshots, 18 published-listing poster exports, 6 awareness/blank-template exports and 1 actual existing Studio Download PNG.
- Website coverage: EN/FA/PS, 320/390/1440-pixel home viewports, light/dark, reduced motion, keyboard opening, Escape/focus return, reload persistence, hide/restore, modal obstruction and print omission. Public forms/tools have contextual tips with no floating overlay. Saved Studio ARI overrides reload correctly.
- Listing exports: exact 1080×1080, 1080×1350 and 1080×1920. The real Studio download is a 1080×1080 PNG. All 18 listing QR codes decoded to their expected localized canonical opportunity URLs. Sixteen decoded directly; two English story PNGs required lossless nearest-neighbor 2× magnification for the software decoder. This is a decoding check, not a claim of phone-camera or print proofing.
- Publishing verification: zero new delivery-queue rows and zero external delivery calls. These review images were neither posted nor queued.

## Changed-file inventory

- `src/lib/ari.ts`: feature toggle, route exclusions, localized actions/copy and matcher step tips.
- `src/components/site/ari/{ari-avatar,ari-tip,ari-companion}.tsx`: optimized decorative imagery, dismissible contextual tips and accessible public navigation guide.
- `src/app/[lang]/layout.tsx`: one public companion mount with enabled public social links.
- `src/components/site/{floating-social,cookie-banner,scroll-to-top,footer,page-shell}.tsx`: coordinated controls, overlay signal, spacing, hide restoration and shared contextual placements.
- `src/components/site/sections/hero.tsx`: modest search-adjacent welcome.
- `src/app/[lang]/{opportunities/page,opportunities/[slug]/page,opportunity-matcher/client,cv-builder/page,services/page,employers/page,employers/post/page,submit-opportunity/page,track/page}.tsx`: contextual guidance in custom page families.
- `src/app/[lang]/press/page.tsx`: localized downloadable ARI asset pack link.
- `src/components/admin/{ari-poster-controls,brand-studio-panel}.tsx`: opt-in localized presets, sizing/alignment, persistence and export props.
- `src/lib/social/{ari-poster,ari-poster-frame,brand,templates}.ts[x]`, `src/lib/social/studio/{types,premium-canvas}.ts[x]`, `src/components/site/opportunity-poster.tsx`: safe reserved artwork band shared by existing renderers.
- `src/app/[lang]/{social-poster/page,studio-render/studio-render-canvas}.tsx`: story format and approved opt-in props without changing access gates.
- `src/app/globals.css`: lightweight float/wave/blink, reduced motion, print suppression and bounded panel.
- `design/ari/`: approved reference/specification, reference-derived transparent masters, inventory, portable source manifest and light/dark contact sheet.
- `public/images/ari/`: 60 responsive optimized WebP derivatives from 12 transparent masters, a 512×512 square profile PNG and the reusable ZIP asset pack.
- `scripts/prepare-ari-assets.ts`, `scripts/tests/{capture-ari-public-fixtures,seed-ari-candidate,ari-browser-acceptance}.ts`, `tests/ari.test.ts`, `.github/workflows/ari-candidate.yml`: reproducible optimization and isolated candidate verification.
- `docs/ARI_BRAND_USAGE.md`: placement map, editor instructions, correct/wrong usage, provenance and limits.

## Owner review

Review the transparent asset sheet, desktop/mobile screens and actual poster PNGs in the successful ARI workflow's downloadable artifact. In particular, confirm reference-derived artwork fidelity and the smaller content scale in mascot-enabled posters. The reading artwork now follows the approved uncapped Common Poses reference. Original artist-isolated masters, exact layered pose animation and a native A4 print renderer remain limitations documented in `ARI_BRAND_USAGE.md`.

The candidate is available as [draft PR #54](https://github.com/jamshidnabizada7-boop/aria-hub-updates/pull/54). It remains unmerged and undeployed. The specification requires explicit approval before production deployment or social publishing; review this concrete candidate before approving deployment.
