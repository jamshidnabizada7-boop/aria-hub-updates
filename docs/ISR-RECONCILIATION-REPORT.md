# ISR / VERCEL USAGE RECONCILIATION REPORT

Mandatory pre-release reconciliation — completed 2026-10-03, LOCAL ONLY.
**Nothing pushed, nothing deployed.** Awaiting Ahmad Jamshid's explicit
PUSH / DEPLOY authorization.

---

## §1. The five ISR-fix commits — all PRESERVED (KEEP)

| Commit | Message | Files | Cache behavior changed | Emergency ISR fix? | Verdict |
|---|---|---|---|---|---|
| `b3b6d18` | Keep ISR usage fix in upcoming importer release | next.config.ts, layout.tsx, opportunities/[slug]/page.tsx, admin/crud/route.ts, json-ld.tsx, get-site.ts | **Detail pages: `revalidate=600 + force-static` → `revalidate=0` + CDN `s-maxage=3600, swr=3600`** — eliminates durable ISR writes per slug. Site-data TTL 300→1800; layout settings 600→1800; admin CRUD switched from nuclear `revalidatePath('/', 'layout')` to targeted home+detail revalidation; json-ld uses stable lastModified instead of today's date | **YES — the core fix** | **KEEP** |
| `c467d0c` | Keep homepage ISR interval in upcoming release | [lang]/page.tsx | home `revalidate` 300→1800 (superseded by d344570's final state; intermediate step) | yes | **KEEP** (harmless intermediate; final state is d344570's) |
| `d344570` | Keep homepage CDN cache in upcoming release | next.config.ts, [lang]/page.tsx | **Home: `revalidate=1800` → `revalidate=0` + CDN `s-maxage=1800, swr=1800`** — home can no longer force ISR writes; renders on CDN miss | **YES** | **KEEP** |
| `456dfc7` | Preserve Oracle import timeout override | orchestrator.ts | Not cache: adds `IMPORT_BOUNDED_TIMEOUT_MS` (35s–300s clamp) so Oracle can use a larger bounded-import budget | operational (Oracle worker support) | **KEEP** |
| `7041013` | Keep static-file proxy bypass in upcoming release | src/proxy.ts | Proxy matcher excludes ALL dotted (static-file) paths instead of a hand-list — static files (llms.txt, images, …) no longer invoke the proxy function | yes (function-invocation + ISR adjacency) | **KEEP** |

**Default position upheld:** all five are preserved on the ingestion branch
(they are ancestors of HEAD). The plan's own work never touched these files'
cache semantics.

## §2. Live production cache behavior (verified by repeated requests)

| Route | Observed |
|---|---|
| `/en`, `/fa`, `/ps` (home) | 1st: `X-Vercel-Cache: MISS` → repeat: **`HIT`, Age climbing** — CDN-cached (s-maxage=1800) |
| `/en/opportunities` (feed) | same MISS→HIT pattern (s-maxage=60 per the pre-existing header) |
| Opportunity detail (real slug) | MISS → **HIT, Age 1, 2** — detail CDN cache (s-maxage=3600) live |
| `/llms.txt` | `X-Vercel-Cache: PRERENDER`, `Cache-Control: public, max-age=86400, swr=604800` |
| Static image | not extractable via simple grep (next/image URLs); llms.txt demonstrates static-file serving |

Browser-facing `Cache-Control` stays `private, no-cache` on HTML — CDN-only
caching, exactly as the fix designed. **The ISR optimizations ARE live in
production.**

## §3. Production vs GitHub — ⚠️ production is AHEAD of origin/main

- `origin/main` = `f4c3534` — **contains NONE of the five ISR fixes**
  (`merge-base --is-ancestor` = NO for all five).
- Live production demonstrably runs the fixes (§2).
- Conclusion: **production is deployed from a revision ahead of origin/main,
  and the only GitHub home of those fixes is the ingestion branch** (they are
  ancestors of `feature/official-opportunity-ingestion-v1` HEAD).
- **Releasing the ingestion branch preserves every production fix.**
  Releasing `origin/main` alone would REGRESS production to high-ISR
  behavior. No production-only fix exists outside the branch.

## §4. Intended cache policy (verified in code)

- Detail pages: `revalidate=0` + CDN `s-maxage=3600, swr=3600` — new
  opportunity detail URLs are discoverable immediately (first request
  renders fresh; no 24h invisibility window).
- Home: CDN 1800s; feed: CDN 60s — new listings appear in the directory
  within ≤ ~60s + SWR window; home within ≤ 30 min (owner's documented
  tradeoff: "the directory has a separate one-minute CDN cache").
- Long-TTLs for site data (1800s) and mostly-static pages (1800–3600s).
- Sitemap 24h; llms.txt 24h; partner feed 30 min.

## §5. Performance tests — reconciled, suite fully green

- `tests/performance-boost.test.ts` updated to assert the NEW intended
  behavior: get-site `revalidate: 1800`; home `revalidate = 0` + next.config
  `s-maxage=1800`; proxy matcher generalized (`.*\\..*`) — with comments
  citing the reconciling commits.
- Also fixed for full-suite reliability: renamed two STALE BACKUP test files
  under the owner's untracked `release-backups/…` folder to `.bak` (bun was
  discovering and running the pre-fix copies), and gave the two whole-table
  backfill db tests 120s timeouts (the shared test DB has grown past bun's
  5s default).
- **Final suite: 407 pass / 9 skip / 0 FAIL — zero unexpected failures.**
  (9 skips = documented environment gates: 8 security-closure HTTP probes +
  1 `E2E=1` browser smoke.)

## §6. Worst-case ISR-write model (post-release)

| Surface | Mechanism | Writes |
|---|---|---|
| Opportunity details (3 langs × N slugs) | CDN cache, `revalidate=0` | **0 durable ISR writes** (render on miss) |
| Home (3 langs) | CDN cache, `revalidate=0` | **0** |
| Feed/listing pages | CDN 60s | **0 ISR** (CDN revalidation only) |
| Static-ish pages (about/services/etc., 3 langs, TTL 1800–3600) | ISR | ~20 pages × 3 langs ÷ 1800–3600s ≈ **≤ 0.06 writes/s** worst case ≈ ≤5k/day ceiling, realistically far lower (regenerate-on-request) |
| Site-data bundle | unstable_cache 1800s + targeted revalidateTag/path on admin edits | shared data cache, not per-page ISR |
| Blog/news + success stories (300s ISR, small N) | bounded by article count | small |
| Sitemap / llms.txt | 86400s | 1/day |

Dominant residual: the bounded static-page ISR set — orders of magnitude
below the old per-slug detail-page regime that generated the 75% warning.

## §7. Cache invalidation after import

- The import path itself performs **no page invalidation** (verified: no
  revalidatePath/revalidateTag in `src/lib/import/`, `src/lib/ai/`, or the
  import API routes) — freshness is carried by the CDN TTLs above.
- Admin CRUD (manual edits) uses **targeted** invalidation: per-language
  home + the affected detail path only; non-opportunity models still use
  layout-wide revalidation (unchanged behavior, low frequency).
- Gap + recommendation (post-release task, not blocking): when the import
  worker creates/updates an opportunity, optionally call the same targeted
  trio (`revalidatePath` home×3 + detail×3) so CDN-cached detail pages
  update immediately after meaningful changes (deadline extensions)
  instead of at the 3600s CDN boundary. One small, safe addition to the
  orchestrator's update path — defer to the owner's call.

## §8. Oracle vs Vercel responsibilities — already aligned

- **Oracle (persistent):** source crawling, scheduled imports (worker,
  §9), browser-based scrapers (ACBAR tiers), source-health monitoring,
  translation timer (§10), social worker.
- **Vercel:** public site, application APIs, cached page delivery, short
  interactive requests. The ingestion design deliberately keeps Vercel's
  role to at most the pre-existing 15-min tick backstop — no crawling is
  moved back to Vercel.

## §9. Old import timer vs new worker — ONE authoritative scheduler

- **Old:** `scripts/opportunity-schedule-worker.ts import`
  (`worker:opportunities` → `runScheduledOpportunityImport`) — one bounded
  source per invocation, driven by the Oracle box's cron. This is the
  scheduler currently authoritative in production.
- **New:** `scripts/opportunity-import-worker.ts`
  (`aria-hub-import-worker.service`) — 60s loop, overdue/priority/health
  selection, atomic claim, V2 backoff/health.
- **They share the same safety primitives** (ImportRun bookkeeping,
  in-flight guard, and now the atomic `nextRunAt` claim), so accidental
  overlap would not double-import — but per the mandate they must not run
  simultaneously.
- **Cutover plan (NOT executed):**
  1. Deploy the branch (§ §7 of the release doc).
  2. Stop the old import invocations on Oracle
     (`systemctl disable --now aria-hub-opportunity-import.timer` / remove
     the cron line that calls `opportunity-schedule-worker.ts import`).
  3. Install + start `aria-hub-import-worker.service`
     (`WORKER_ALLOW_REMOTE=1` in the env file).
  4. Verify: `ImportRun` rows show `triggeredBy='oracle-import-worker'`;
     health fields transition; no old-mode runs appear.
  5. Monitor several days (alerts strip + analytics) before expanding
     sources.

## §10. Translation timer — status and owner decision

- The Oracle box also runs `opportunity-schedule-worker.ts translate` →
  `runScheduledOpportunityTranslation` → **`processBatch` on the AI provider
  chain (groq/cerebras/gemini)** — i.e., the existing translation timer DOES
  invoke external AI, capped at 48 units/day with provider backoff.
- **No behavior changed in this reconciliation.** Consequence to be aware
  of: with the Phase 18 flags, newly imported (and approved-employer)
  opportunities now enter `faStatus=pending` and WILL be auto-translated by
  that existing timer. If the owner prefers the manual-translation policy
  to apply to importer output as well, the action is to stop/disable the
  `translate` timer at cutover (rows stay `pending` until the approved
  workflow handles them — exactly the state the plan permits).
- **This is an owner decision; both paths are safe and reversible.**

## §11. Release protection — observed

Everything in this reconciliation was done locally (test edits + this
report). No pushes, no preview deployments, no production deploys. Target
remains: ONE clean push + ONE controlled production deployment on explicit
authorization.

## Final answers (per the mandate)

- **Current Vercel ISR usage:** not directly accessible from this machine
  (no Vercel API token configured); proxy evidence: the usage warning fired
  at ~75% of ISR Writes, and the production behavior now matches the
  zero-detail-write architecture, so the dominant write source is gone.
- **Billing-cycle/reset date:** not accessible without a Vercel API token;
  the dashboard shows it.
- **Current production cache behavior:** CDN-cached home (1800s), feed
  (60s), details (3600s), render-on-miss; verified live with repeated
  requests (MISS→HIT, Age climbing).
- **Expected after release:** identical (the branch contains the same
  fixes) plus the ingestion features.
- **All ISR fixes preserved?** YES — all five are ancestors of the release
  branch; none exist outside it.
- **Performance test status:** 407/407 green, 0 unexpected failures.
- **High-risk ISR routes:** none remaining; bounded static-page ISR only.
- **Old Oracle scheduler:** still authoritative in production — cutover
  plan ready, not executed.
- **New worker cutover:** prepared, gated on deployment authorization.
- **Translation timer:** ACTIVE and AI-backed (48 units/day) — owner
  decision required on whether importer output may be auto-translated or
  must wait for the manual workflow.
- **Remaining Vercel quota risk:** LOW for ISR Writes (dominant source
  eliminated); function invocations drop further once the old import cron
  is retired at cutover.
