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

## Expanded implementation on this branch (October 11, 2026)

The initial workbench has been extended with:

- Persistent `StudioCampaign` Prisma records with draft/approved/archive lifecycle. A new migration is **required before using the feature**.
- Protected admin campaign CRUD and human review approval; server-side recent-approved-headline duplicate check.
- Reusable enabled StudioVisual assets in the creative preview.
- Real manual Facebook/Instagram metric snapshots in `StudioCampaignMetric`, with separate paid, organic and unknown classifications, and median reach reporting. **This is not Meta Graph API sync.**
- On-demand, provider-backed AI headline suggestions via the existing ZAI provider. The admin initiates requests; nothing runs on a timer.
- Optional AI artwork via OpenAI images + durable Blob. Requires explicit paid-use acknowledgment and `STUDIO_IMAGE_GENERATION_ENABLED=true`, `OPENAI_API_KEY`, and `BLOB_READ_WRITE_TOKEN`. New artwork is stored DISABLED until reviewed.
- Offline FFmpeg storyboard to MP4 CLI plus opt-in web rendering from 2–6 enabled StudioVisual assets. Requires `STUDIO_REEL_RENDER_ENABLED=true`, installed FFmpeg and a durable Blob token. It is a silent slide Reel, not generated motion footage.
- Approved final PNG upload and manual-only social queue adapter with idempotent `queueId`. Workers won't auto-publish these rows. Final delivery requires a distinct, confirmed administrator action.
- Opt-in lower-volume automatic opportunity pilot. `AutomationState.state.editorialPilotEnabled=true` caps daily social opportunities to at most 3 (default 2); false/absent preserves current behavior. Requires explicit owner decision before activation.

### Not built / not demonstrated

- Provider-grade AI video generation, narration, audio licensing and cinematic scene motion.
- Programmatic cross-platform Meta Graph Insights sync or historical Meta export parsing.
- Full agency-grade editing timeline, multi-slide interactive carousel editor, drag-and-drop composition editor.
- ARI mascot artwork approval/integration: the approved asset must be found and explicitly cleared. The candidate mascot branch was not merged here.
- A robust independently running scheduling dashboard beyond the existing automation interfaces.
- Claims of virality, reach improvements or paid/organic causal attribution.

### Operational and safety checks

1. Apply the new Prisma migration to an isolated/staging database, run Prisma generation and test before any production migration.
2. Run `bunx tsc --noEmit`, all tests, `bun test tests/brand-studio-editorial*.test.ts tests/brand-studio-reel-export.test.ts`, and `bun run build`.
3. Test campaign create/save/reload, edit invalidation, approval, upload, queue idempotence, and manual publish with **synthetic channels only**, then validate real channel permissions deliberately.
4. Preview assets in all three languages and sizes. Verify story height 1920, long RTL headings and every output. Review usage rights for each image and student story.
5. Keep generation feature flags unset, and do not run provider inference or write large media until budget and storage are confirmed.
6. Keep production queue pilot unset. Its code path is dormant unless the owner configures it.
7. Manual queue rows created by `/api/admin/studio/queue` are ready but **never picked up by automatic workers**. Publishing uses the existing admin publish-now action and needs a final explicit confirmation.
8. Existing production website, automatic queue, opportunity imports and translation systems are unchanged in the feature branch.

### Useful feature entry points

- `src/components/admin/editorial-workbench.tsx`
- `src/lib/social/editorial/strategy.ts` and `analytics.ts`
- `src/app/api/admin/studio/campaigns/route.ts`
- `src/app/api/admin/studio/poster/route.ts`
- `src/app/api/admin/studio/queue/route.ts`
- `src/app/api/admin/studio/metrics/route.ts`
- `src/app/api/admin/studio/analytics/route.ts`
- `src/app/api/admin/studio/ideas/route.ts`
- `src/app/api/admin/studio/generate-art/route.ts`
- `src/app/api/admin/studio/reel/route.ts`
- `scripts/studio/render-storyboard.ts`

### Release gate

**Do not merge solely because TypeScript passes.** Require database, UI, export, manual queue and no-send tests. A production migration needs owner approval and a rollback plan. This draft pull request is development work, not a live release.
