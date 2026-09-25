# ARIA HUB Brand Studio — Premium Upgrade Plan

## Goal

Evolve the existing deterministic, editable React Brand Studio into a premium social-design engine without replacing the current daily-plan, multilingual, save, PNG export, publish-now, queue, or automation workflows.

The target is not "more templates." The target is professional campaign-level art direction while preserving editable text and source facts.

## Non-negotiables

- Existing 15 template types remain available.
- Existing saved StudioDesign records remain compatible.
- Persian, Pashto and English remain supported.
- Square, portrait and story exports remain supported.
- PNG export and the headless Playwright renderer remain deterministic.
- AI-generated media is treated as reusable artwork, never as authoritative opportunity data.
- No final poster is flattened into an AI image.
- Existing ARIA HUB logo and navy/gold identity are preserved.

## Phase 1 — Audit

Audit:

- BrandStudioPanel
- social template renderer
- themes/layouts
- planner/captions
- OpportunityPoster
- StudioDesign / StudioVisual
- Studio design and visual APIs
- publish queue and headless renderer
- i18n and RTL/LTR behavior

Key findings:

1. Current renderer is technically strong but visually centered around shared shells.
2. StudioVisual behaves primarily as one background visual.
3. Spotlight/OpportunityPoster is separated from the normal layout system.
4. BrandStudioPanel contains growing template-specific conditional editor UI.
5. StudioDesign GET existed but saved rows were not loaded back into BrandStudioPanel.
6. Current designs read like exported UI cards rather than art-directed campaigns.

## Phase 2 — Architecture

### Design family

Separate content template type from visual art direction.

Content template examples:
- spotlight
- deadline
- hiring
- news
- story

Design family examples:
- global-portal
- document-desk
- career-ascent
- editorial-break
- cinematic-person

Flow:

Content -> template type -> design family -> theme/layout -> editable overrides -> render

### Schema-driven editor

Template/design definitions declare:

- supported templates
- supported sizes
- recommended layouts
- editor fields
- visual slots
- labels
- max lengths
- defaults

### Layered media

Support four deterministic media roles:

- background
- hero
- foreground
- overlay

Layer state is stored additively in StudioDesign.overrides.

Properties include:

- asset URL / visual id
- X/Y
- scale
- rotation
- opacity
- blur
- brightness
- contrast
- saturation
- shadow
- glow
- fit
- visibility

## Phase 3 — Foundations

Implemented foundations:

- premium design-family registry
- schema-driven editor field definitions
- layered media model
- deterministic MediaLayer renderer
- premium editor controls
- saved design reload
- premium settings persisted additively in StudioDesign overrides
- headless renderer support

No database migration is required for the foundation.

## Phase 4 — Initial 12 premium directions

### Scholarship / education

1. Global Portal
2. Document Desk
3. Global Object

### Career

4. Career Desk
5. Career Ascent
6. Talent Profile

### Editorial

7. Editorial Break
8. Document Alert

### Story

9. Cinematic Person
10. Big Type Story

### Conceptual / 3D-enhanced

11. 3D Object Hero
12. Surreal Opportunity

Each direction must use a meaningfully different composition strategy, not only a new icon or recolor.

## Phase 5 — Asset workflow

The production renderer must not depend on an AI provider.

Professional media may be produced externally using tools such as Adobe, Higgsfield, Figma or image generation, then saved as reusable StudioVisual assets.

Preferred asset types:

- transparent graduate/student/professional cutouts
- university/campus scenes
- passports/documents
- laptops/workstations
- 3D graduation objects
- globes
- career metaphors
- light/foreground overlays

The Studio remains usable if no generated asset is available by falling back to deterministic React/CSS art.

## Phase 6 — Editor UX

Premium editing should expose:

Content
- headline
- eyebrow
- supporting line
- organization
- country/location
- salary/stipend
- funding
- deadline
- badge
- CTA

Media
- background
- hero
- position
- scale
- rotation
- opacity
- glow

Design
- family
- theme
- compatible layout
- size

Output
- Save Design
- Download PNG
- Publish Now

Legacy templates keep their current controls.

## Phase 7 — Asset management

Keep StudioVisual backward compatible while improving admin operations:

- add
- rename/edit
- category
- URL update
- enable/disable
- ordering
- delete/archive safety
- preview/filter in Studio

Avoid adding a database migration unless richer metadata becomes necessary.

## Phase 8 — Automation compatibility

Manual saved designs:
- Studio design is saved
- exact contentJson is placed into the queue
- headless renderer uses the selected premium family and media layers

Automatic posts:
- existing legacy-safe automation remains the fallback
- premium defaults may later be made configurable per content type
- automation never requires manual editing

## Phase 9 — Quality validation

Validate:

- 15 existing templates
- 12 premium directions
- fa / ps / en
- square / portrait / story
- long and short titles
- missing optional metadata
- with and without media
- save -> reload
- PNG export
- headless render
- publish-now
- legacy saved designs
- TypeScript
- tests
- Prisma validation

## Definition of done

The upgrade is considered complete when:

- existing Brand Studio workflows remain intact
- premium families are selectable and editable
- media layers persist after reload
- premium families render in admin and headless automation
- templates are structurally diverse
- opportunity/job/news/story content receive substantially stronger art direction
- CI is green
- no destructive migration is introduced unnecessarily
