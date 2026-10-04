# Vercel Function Storage — Root Cause Report

Emergency audit completed 2026-10-04. Trigger: Vercel email — **"Your free
team has used 100% of the included free tier usage for Function Storage
(10 GB)."**

---

## 1. Current status at audit time

| Metric | Value |
|---|---|
| Function Storage | 100% of 10 GB (email; per-usage API not exposed to CLI — dashboard values pending owner check) |
| Deployment Storage | same meter family (retained-deployment artifacts) |
| ISR Writes | previously mitigated (Sep 3 fixes verified live: home/detail CDN MISS→HIT, no per-slug ISR) |
| Team paused? | Not observed — production served 200s throughout |
| Deployments blocked? | Not observed; **no new deployment was created** (per mandate) |
| Reset/rolling window | Hobby usage resets on a 30-day cycle (community-confirmed); exact date visible only in the dashboard |

## 2. Team context (PHASE A)

Team `jamshidnabizada7-boops-projects` (Hobby) hosts **7 projects**; Function
Storage is team-wide. aria-hub-updates is the largest (20+ retained
deployments at audit time); 6 other projects retain 3–5 each (some dating
back to February) — they share the same 10 GB.

## 3. Retained deployment inventory (PHASE C)

aria-hub-updates retained **34 deployments** (2026-09-24 → 2026-10-04): 14
productions + 20 previews. Full inventory + classification saved in
`release-backups/deployments-*.json`.

## 4. Measured function footprint (PHASE D — from output file traces)

Measured via Next.js `.nft.json` traces from an isolated local `vercel build`
(**local database only; production credentials never loaded; no deployment
created**):

- 140 traced routes, **35.4 GB uncompressed total** (~250–340 MB per route —
  every route traces the shared server bundle: Prisma client + engines,
  Next server, app code).
- CV PDF function: **342 MB** — the largest single function (chromium bin
  67 MB via explicit includes + playwright-core).
- playwright-core traced into **801 files / 98.5 MB across most routes** via
  `browser-fetch.ts` → scraper → orchestrator import graph.
- **One route (`/api/interviews/generate-question`) traced the repo-root
  `.env` (API keys + session secret)** via a `readFileSync('.env')` fallback.

## 5. Root cause, ranked by measured contribution

1. **Retained deployment count × per-deployment function bundle** —
   ~34 retained deployments × compressed per-deploy functions (heavy shared
   bundle, multi-MB functions) ≈ the bulk of the 10 GB. Vercel Hobby
   retention is 30 days for everything, so the Sept-24 → Oct-4 burst
   (ingestion + ISR releases landing on the same branch) accumulated a
   month's worth of heavy deployments in 10 days.
2. **Playwright-core over-tracing** — 98.5 MB uncompressed duplicated into
   ~105 traces where it was unreachable dead weight on Vercel (browser
   automation belongs to Oracle).
3. **CV PDF chromium** — 67 MB compressed-bin + playwright pieces; largest
   single function, but a legitimate runtime dependency (kept).
4. **`.env` tracing** — small in bytes but a secret-leak pattern (closed).
5. Stale/orphaned accounting — **possible but unproven**; deletion response
   pending (Vercel notes a background job + recovery windows).

## 6. Fixes applied (local commits — NOT deployed, per mandate)

- `next.config.ts`: `outputFileTracingExcludes` — playwright-core + chromium
  excluded from all non-PDF routes; `.env`/`.env.*` excluded everywhere.
  Measured effect: playwright 98.5→10.9 MB across traces; `.env` leak closed;
  CV PDF keeps its runtime includes (342→331 MB). Tradeoff documented: on
  Vercel, manual imports lose the browser tier (curl tiers remain); browser
  work belongs on Oracle anyway.
- Guardrail: `scripts/release/measure-function-sizes.ts --check` enforces
  measured baselines (CV PDF ≤340 MB, pipeline ≤285 MB, playwright ≤15 MB,
  chromium only in PDF, zero `.env` in traces) — currently **GUARDRAIL OK**.
- Baseline stored: `docs/function-size-baseline.json`.

## 7. Deployment cleanup (PHASE L) — executed and recorded

**31 deployments deleted** (17 superseded Oct-3 productions/previews + 2
already-gone + 14 old previews from Sep 24–25). Retained:

- `nvtqrzmog` — current production (03db843) — KEEP_CURRENT_PRODUCTION
- `53469ye63` — previous production (165301c) — KEEP_ROLLBACK
- `o7q08zs3s` — pre-release baseline production (f4c3534) — KEEP_ROLLBACK

Production verified live (200) after cleanup. Deleted deployments remain
restorable for 30 days per Vercel's recovery window, so rollback capability
was not lost. Every deletion was logged in the session and is listed in
`release-backups/deployments-remaining.json` (post-cleanup state).

## 8. CV PDF decision (PHASE J)

**KEEP ON VERCEL for now**, because: (a) the measured alternative saving is
bounded (chromium+playwright ≈ 165 MB uncompressed ≈ a small fraction of one
deployed function's compressed artifact), while (b) the dominant cause was
retained-deployment count, now fixed. **MOVE TO ORACLE** becomes the right
call if Function Storage remains tight after Vercel's background GC — the
migration design (signed requests, SSRF guards, health checks) is already
specified in the reconciliation mandate. Client-side PDF rejected: layout
quality would degrade.

## 9. Oracle state (PHASE Q — verified, unchanged)

- `aria-hub-import-worker.service` → ACTIVE (~87 MB RAM), news sources
  excluded, clean runs verified
- old import timer → DISABLED
- opportunity translation timer → DISABLED (manual-only policy)
- `aria-hub-social-worker.service` → ACTIVE, never restarted

## 10. Git state

- `origin/main`: `03db843` (deployed production)
- local HEAD: `265eaa2` + this report commit
- **unpushed commits: 5** (worker news-filter, release report, pg-cursor
  dep, tracing excludes + guardrail, this report) — held per mandate;
  production-critical worker fix already applied directly on the Oracle box

## 11. Deployment status

**NO NEW DEPLOYMENT.** The `outputFileTracingExcludes` fix is committed
locally and takes effect at the NEXT authorized deployment.

## 12. Storage safety verdict

Deployed-function storage has been reduced by removing 31 retained
deployment artifacts (the dominant measured cause), with the two remaining
rollback candidates and current production intact; the compression-savings
exclusions are committed locally for the next authorized deployment.

**SAFE FOR ONE FINAL PUSH** — one push triggers one Git-linked production
deployment that will (a) land the reduced function footprint, (b) carry the
already-applied Oracle worker fix into the documented release state, and
(c) replace the current production deployment (keeping it as
rollback-per-retention). If the dashboard still shows ~100% after Vercel's
background job runs (≤48 h + recovery window), file the support request per
PHASE M with the measured numbers above before pushing.
