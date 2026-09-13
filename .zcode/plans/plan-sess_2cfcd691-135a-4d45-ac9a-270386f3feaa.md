Brand Studio full upgrade — implementation plan

Goal (per your answers): 4 theme palettes, modern layout variants per format, side-panel text editing that flows into automated posts, story size, and the quick fixes (double PNG export, theme-aware QR, AI captions usable). All canvases keep inline styles so PNG/playwright exports stay pixel-exact.

STAGE 1 — Theme foundation (new file src/lib/social/themes.ts)
- StudioTheme token contract (background gradient, accent + soft/line/faint variants, text, on-accent, glows, dot grid, CTA band gradient + text, QR colors, logo chip, surface/border) + StudioThemeId, resolveTheme().
- 4 palettes: Midnight (current brand values), Emerald (deep green/mint), Sunset (plum/amber), Ivory (light minimal — includes dark CTA band + logo chip so the logo stays legible).
- StudioLayout ('classic' | 'minimal' | 'bold') + resolveLayout; PosterSize gains 'story' (1080×1920).

STAGE 2 — Canvas redesign (src/lib/social/templates.tsx rewrite)
- BrandShell, Ambience, AccentHeadline, KickerChip take the resolved theme; every hardcoded color (glows, dot grid, CTA gradient, logo chip) becomes a theme token.
- SocialCanvas accepts themeId + layout; implements per-format layout variants: classic (current card style), minimal (typography-led editorial: flat bg, top-aligned headline, thin accent rules, no big card) for all 8 formats; bold (oversized display type + accent band) for spotlight/quote/stat/deadline.
- data-studio-canvas="1" hook preserved for the playwright renderer.

STAGE 3 — Spotlight unification (src/components/site/opportunity-poster.tsx)
- Replace the duplicated local palette with the theme system (theme prop, defaults to Midnight so the public /social-poster page is unchanged). Urgency pills stay semantic (red/amber/green).

STAGE 4 — Render pipeline passthrough
- publisher.ts buildCanvasProps embeds themeId + layout into contentJson (JSON-safe strings); renderQueueImage viewport height adapts for story size; studio-render-canvas parses and passes theme/layout.
- Automation defaults: AutomationState gains studioTheme/studioLayout (editable in the panel); buildTodaysQueue applies them to every generated row.

STAGE 5 — Editing + persistence
- New Prisma model StudioDesign { contentRef, forDate, templateType, themeId, layout, size, overrides Json, captionOverride Json, @@unique([contentRef, forDate]) } + migration.
- New /api/admin/studio/design route: GET (designs for a date), POST save (upsert), POST publish (ensure today's queue row exists with the design applied, then render+publish via the existing Phase 3 machinery).
- buildTodaysQueue applies per-post StudioDesign overrides (title/note/checklist/stat/person/deadline + caption overrides) on top of the generated plan.

STAGE 6 — Panel UI (src/components/admin/brand-studio-panel.tsx)
- Design controls: theme picker (4 swatches), layout picker, size selector (+ Story), "Set as automation default".
- Edit content section: per-format fields (title, note/subtitle, checklist items, stat value/label, person name/meta, deadline date) — side-panel style, per your choice.
- Caption becomes an editable textarea; AI polish writes into it; download includes a .txt alongside the PNG.
- Fixes: deduplicate the double toPng export; theme-aware QR colors.

STAGE 7 — QA + ship
- tsc clean, bun test suite green, live verification in the studio (all 4 themes × layouts render, download includes edits, saved design flows into the queue and renders identically headlessly), production build check, commit + push (CI runs the suite).

Deliberately out of scope this round: photo-background designs (needs an image-treatment pass), click-on-canvas editing (follow-up), multi-logo uploads.