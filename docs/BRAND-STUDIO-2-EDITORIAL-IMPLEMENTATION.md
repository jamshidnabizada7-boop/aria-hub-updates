# Brand Studio 2.0 — audited implementation and release gates

## Verified repository baseline

Current integration surface is `src/components/admin/brand-studio-panel.tsx`. Existing 15 templates and all planner, Template Lab, premium directions, caption polishing, saved StudioDesign, manual publishing, PNG export, social queue and automation features remain in place. The current renderers live under `src/lib/social/studio/`. Production already has nine editorial cards and twelve premium design directions. **Do not replace them.**

The existing weekday planner (`src/lib/social/plan.ts`) suggests five posts daily; publishing controls and worker implementation are separate. This PR does **not** change queue cadence, scheduling, permissions or active automations.

## Milestone delivered on feature branch

- **Original content tab:** a manual creative workbench independent of the opportunity database; edits, drafts, previews and exports without network publishing.
- **20 multilingual content pillars:** career, applications, interviews, language, student life, productivity, free learning, AI, explainers, questions, humor, authentic stories, myths/facts, quizzes, culture, ARIA HUB features, roundups, deadline alerts, verified news and inspiration.
- **Eight creative directions** mapped to existing premium canvas families, with three choices per pillar. These are compositions, **not** eight newly trained image generators.
- **Editorial quality gate:** warnings for missing copy, overly long headings, repeated text, missing primary sources and unconsented success stories. It does not fact-check the linked pages, determine rights ownership or guarantee editorial safety.
- **Responsive preview and local PNG export** using the existing deterministic rendering stack.
- **Tests** for multilingual categories, duplicate matching, source and consent requirements.

**Critical distinction:** This milestone is useful and executable without an AI provider. It does not yet implement video rendering, external image generation, historical analytics ingestion, a new database-backed campaign manager, or a policy change to the automatic publishing queue. Those remain separate milestones.

## Known risks and next gates

1. **Run test and static analysis before merge:** `bun test tests/brand-studio-editorial.test.ts tests/brand-studio-premium.test.ts`, `bunx tsc --noEmit`, and lint affected files. Connector-only edits were not tested in a local checkout.
2. **Visual QA:** review all supported sizes for fa/ps/en; check mobile thumbnail, clipping, fonts and blank-title preview. Confirm PNG export across Chrome and headless rendering before production.
3. **Media QA:** use only licensed/approved assets and preserve original ARIA HUB logo and ARI continuity.
4. **Editorial QA:** linked sources are only syntax-checked. Human verification of external facts and participant permissions remains mandatory.
5. **Queue rollout:** add a separate feature-flagged social editorial gate with opt-in migration, safety audits, idempotency and an owner-approved switchover. Do not disable live automated posts in this PR.
6. **Analytics:** implement optional Meta/IG API ingestion using real permitted metrics, label organic/paid accurately, and never infer paid views from non-follower views.
7. **AI media and video:** define provider adapters with cost caps, credential management and fallbacks only after approved provider access.
8. **Campaign management:** add durable, localized, source-validated campaign drafts and approval queue behind admin permission checks.

## Design success criteria

The product must generate content worth discussing and saving, not merely visually diverse vacancy announcements. A 14-day organic test should compare median post reach, non-follower reach, saves, shares, comments, watch time and website clicks between topics and formats. View counts alone cannot establish viral potential.

## Safety

Feature branch only. No database schema changes, worker updates, social sends, deployment, or paid API calls are part of this milestone.
