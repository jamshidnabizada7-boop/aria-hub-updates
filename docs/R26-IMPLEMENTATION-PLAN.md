# R26 Implementation Plan — Language-Switch 404 Fix, Unified Brand Studio, Auto-Publish & Auto-Import Automation

> Created BEFORE any implementation, per owner request. Implementation follows this plan phase by phase.
> Date: 2026-09-12 · Project: ARIA HUB (`/home/z/my-project`)

## Owner requests (verbatim intent)

1. **Language switch 404 bug** — "when switching to another language the link remains the previous lang and new they conflict and cause 404 error, if manually delete one of them then it renders" (evidence: URL `/fa/ena`).
2. **Brand Studio content picker** — choose WHICH opportunity/content feeds a template, with a search placeholder and filters (like the old Social Kit).
3. **Merge Brand Studio + Social Kit** — "i dont know how to use them separately i think they should be one".
4. **Auto-publish to social media** — ready posts publish automatically to ALL platforms at the time of day with best engagement for Afghanistan.
5. **Auto-import automation** — scrape all enabled sources on a schedule automatically, and process translations in small queued batches over time (rate-limit aware: "weather it takes 1 hour 1 day 2 day").

---

## Phase 0 — Environment sanity (pre-flight)

- Postgres up on 5433 (`scripts/pg-boot.mjs`), `.env` + dev server healthy, prisma client present.
- Free memory check (sandbox OOM history) — avoid parallel heavy compiles during work.

## Phase 1 — Language-switch conflict/404 (root cause + hardening)

**Diagnosed root cause (reproduced in browser):**
- `handleSwitchLang` calls zustand `setLang()` **and** `router.push()` in the same handler. In the Next 16 concurrent router, the store re-render races the transition → **the push is silently dropped** (URL stays `/en`, UI text switches). Subsequent switches then build URLs from the stale pathname and compound prefixes → `/fa/ena`-style URLs → middleware prefixes cookie lang again → `[lang]` layout `notFound()` → 404. Manually deleting one segment heals it (matches owner report exactly).

**Fix:**
1. `src/lib/lang-route.ts` — add `sanitizeLangPath(path)`: recursively strip repeated/lang-ish leading prefixes (`/fa/en`, `/en/fa`, `/fa/ena`) so a corrupted path heals to a clean one before navigation.
2. `src/components/site/navbar.tsx` — `handleSwitchLang`: validate `nextCode ∈ LANGS`, build target via `sanitizeLangPath(withLangPrefix(...))`, then **hard-navigate** `window.location.assign(target)` (no store set — reload resyncs via LangSync; server HTML always matches URL; eliminates the router race class entirely).
3. `src/middleware.ts` — healing redirect: `/{validLang}/{lang-ish tail}` (e.g. `/fa/ena`, `/en/fa`) → 307 to the intended lang root. Existing corrupted links/bookmarks self-heal.
4. **Verify** with agent-browser: en→fa→ps→en switching, URL + rendered language always in sync; direct open of `/fa/ena` lands on `/en`.

## Phase 2 — Merge Social Kit into Brand Studio + searchable picker

- Remove `socialKit` nav entry (admin-app.tsx); Brand Studio becomes the ONLY poster tool. Delete `SocialKitPanel` usage (keep its data API `/api/admin/social-kit-opps`).
- Brand Studio → Template Lab content picker upgrade:
  - Add **search input** (placeholder "Search opportunities…") + **filter chips** (All / Jobs / Scholarships) + deadline sort.
  - Typing ≥2 chars queries `/api/admin/social-kit-opps?q=` (server search across ALL published opportunities, not just today's pools); results merge into the picker labeled "Search results".
  - Client-side filtering for non-opportunity pools (tips/quotes/promos/news/stories).
  - Update i18n keys (`admin.studio.*`) for en/fa/ps.
- Keep `/[lang]/social-poster` public route (used by auto-publish renderer + legacy links).
- **Verify** in admin: search "Chevening" → select → spotlight preview renders → PNG export works.

## Phase 3 — Auto-publish to social media (best-time for Afghanistan)

**Data model (prisma, additive):**
- `PublishChannel` — platform (`telegram|facebook|instagram|x`), label, enabled, credentials Json? (tokens/page ids), lastStatus, lastError, lastPublishedAt.
- `SocialPostQueue` — scheduledFor DateTime, templateType, contentJson (content refs), captionJson {en,fa,ps}, imageStatus (`none|ready|failed`), imagePaths Json?, status (`pending|rendering|ready|publishing|published|partial|failed|cancelled`), results Json? (per-channel), attempts Int, error String?.
- `PipelineRun` — kind (`import|translate|publish|tick`), status, stats Json?, message, startedAt, finishedAt.

**Schedule:** default slots **08:00, 12:30, 20:00 AFT (UTC+4:30)** — Afghanistan peak engagement windows; editable in admin. One post per slot, caption = fa + ps + en combined (order configurable).

**Engine (`src/lib/social/publisher.ts` + `/api/admin/pipeline/tick`):**
- Queue builder: at first tick of each day, run the R24 deterministic planner → create 3 `SocialPostQueue` rows for the day's slots.
- Render: playwright-core (added dep) + agent-browser chromium binary → screenshot `/[lang]/social-poster?slug=…`/studio template at 1080×1080 → PNG under `public/generated-posts/`. Any failure → graceful text-only post.
- Adapters (`src/lib/social/channels/*`): Telegram Bot API (sendPhoto), Facebook Page Graph API (photo/text), X v2 (text), Instagram Graph (container flow, only when image ready). All fail-soft per channel; results recorded per row.
- Manual controls: "Publish now", "Cancel", per-row status/error display.
- **Verify:** queue builds; test publish to a configured Telegram chat; failure path records clear errors without crashing.

## Phase 4 — Scheduled auto-import + rate-limit-aware translation queue

**Scheduler:** in-process interval (5 min) via `src/instrumentation.ts` singleton (survives in dev via watchdog restarts; stateless steps are idempotent). Also `/api/admin/pipeline/tick` callable externally (platform 15-min cron as backstop).

**Import step:** for each enabled `ImportSource` where `lastRunAt` older than `scheduleMinutes` → `runImport(source)` (existing orchestrator), max 2 sources per tick; results logged to `PipelineRun` + ImportRun (existing).

**Translation step (rate-limit aware):**
- Each tick processes at most **K groups** (default 3, admin-configurable) of rows missing fa/ps — **opportunities first** (newest first), then news, then other tables. Reuses the proven translate logic (shared core with `scripts/translate-fill-all.mjs`).
- On 429: set a backoff timestamp; skip translation for 30 min; resume automatically. Steady pace ≈ 12 groups/hour → full backlog drains "1 hour…1 day…2 days" as owner accepted, never bursting quota.
- Pending-count surfaced in admin.
- **Verify:** tick endpoint runs a batch, writes translations, backoff state visible; imported drafts eventually translated.

## Phase 5 — Verification, handover

- `bun run lint` (no new errors), dev.log clean.
- agent-browser E2E: language switch matrix; Brand Studio search+preview+PNG; Automation panel states.
- Update `worklog.md`, refresh canonical export if schema changed, keep 15-min webDevReview cron (update its brief with R26 state), Chinese summary.

## Risks / guardrails

- No new env vars required for dev; publish channels inert until owner pastes tokens.
- Additive-only schema changes (`db push` safe).
- All AI usage stays behind hard fallbacks (captions: deterministic template; translations: batched + backoff).
- Sandbox OOM: pipeline steps are sequential, small, and skip when memory is critically low.
