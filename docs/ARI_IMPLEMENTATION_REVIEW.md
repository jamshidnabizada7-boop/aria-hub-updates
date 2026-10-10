# ARI implementation review

## Candidate scope

Repository verified against the Oracle release SHA: `jamshidnabizada7-boop/aria-hub-updates`, baseline main `650cd69bd9eede73d815e87ab7cf8b1c262918d9`. The older `ARIA-HUB-LATEST-MAIN-ORIGINAL` repository was last updated in September and is not the active release. All implementation is on `codex/ari-mascot-companion`; no production deploy, automatic social posting or schedule changes are authorized by this candidate.

## Verification record

- New ARI unit tests: 5 passed, 246 assertions, including public exclusions, canonical destinations, poster opt-in identity, malformed saved values, geometry and actual alpha pixels.
- Full lint baseline before edits: 25 errors and 3 warnings. After initial integration: the same 25 errors and 3 warnings, no new ARI errors. They include existing CommonJS import rules, synchronous state effects and an empty object type in unrelated files.
- Type check: passed after integration; final candidate check recorded by CI.
- First local production build stopped because no local production session secret was supplied. Retried with a fresh disposable build-only secret and an isolated test database URL; no existing credential file was opened.
- Candidate workflow and full repository CI results, screenshots and actual PNG exports: pending completion of the feature-branch review run.

## Changed-file inventory

- `src/lib/ari.ts`: feature toggle, route exclusions, localized actions/copy and matcher step tips.
- `src/components/site/ari/{ari-avatar,ari-tip,ari-companion}.tsx`: optimized decorative imagery, dismissible contextual tips and accessible public navigation guide.
- `src/app/[lang]/layout.tsx`: one public companion mount with enabled public social links.
- `src/components/site/{floating-social,cookie-banner,scroll-to-top,footer,page-shell}.tsx`: coordinated controls, overlay signal, spacing, hide restoration and shared contextual placements.
- `src/components/site/sections/hero.tsx`: modest search-adjacent welcome.
- `src/app/[lang]/{opportunities/page,opportunities/[slug]/page,opportunity-matcher/client,cv-builder/page,services/page,employers/page,employers/post/page,submit-opportunity/page,track/page}.tsx`: contextual guidance in custom page families.
- `src/components/admin/{ari-poster-controls,brand-studio-panel}.tsx`: opt-in localized presets, sizing/alignment, persistence and export props.
- `src/lib/social/{ari-poster,ari-poster-frame,brand,templates}.ts[x]`, `src/lib/social/studio/{types,premium-canvas}.ts[x]`, `src/components/site/opportunity-poster.tsx`: safe reserved artwork band shared by existing renderers.
- `src/app/[lang]/{social-poster/page,studio-render/studio-render-canvas}.tsx`: story format and approved opt-in props without changing access gates.
- `src/app/globals.css`: lightweight float/wave/blink, reduced motion, print suppression and bounded panel.
- `design/ari/`: approved reference/specification, reference-derived transparent masters, inventory, portable source manifest and light/dark contact sheet.
- `public/images/ari/`: responsive optimized WebP derivatives and square profile asset.
- `scripts/prepare-ari-assets.ts`, `scripts/tests/{capture-ari-public-fixtures,seed-ari-candidate,ari-browser-acceptance}.ts`, `tests/ari.test.ts`, `.github/workflows/ari-candidate.yml`: reproducible optimization and isolated candidate verification.
- `docs/ARI_BRAND_USAGE.md`: placement map, editor instructions, correct/wrong usage, provenance and limits.

## Owner review

Review the transparent asset sheet, desktop/mobile screens and actual poster PNGs. In particular, confirm reference-derived artwork fidelity and the smaller content scale in mascot-enabled posters. The current uncapped reading artwork and native A4 print output remain documented limitations. Approve production deployment explicitly only after reviewing this candidate.
