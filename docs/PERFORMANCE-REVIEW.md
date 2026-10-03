# Performance Review (Phase 24)

Official Opportunity Ingestion & Employer Platform — audit of the hot paths
against the master plan's checklist. Verified against the local database
(ariahub @ 127.0.0.1:5433) and the code as of commit `327c7b0`.

---

## 1. Indexes — every plan-required index exists (test-enforced)

The plan's "likely indexes" list was added incrementally in Phases 1, 3 and 6.
`tests/index-coverage.test.ts` now asserts all of them physically exist:

| Plan entry | Backing index | Status |
|---|---|---|
| Organization.slug | `Organization_slug_key` (unique) | ✓ |
| Opportunity.organizationId | `Opportunity_organizationId_idx` | ✓ |
| Observation.opportunityId | `…_opportunityId_idx` | ✓ |
| Observation.organizationId | `…_organizationId_idx` | ✓ |
| Observation.sourceUrl | `…_sourceUrl_idx` | ✓ |
| Observation.vacancyNumber | `…_vacancyNumber_idx` | ✓ |
| ImportSource.nextRunAt | `ImportSource_nextRunAt_idx` | ✓ |
| ImportSource.priority | `ImportSource_priority_idx` | ✓ |
| ImportSource.healthStatus | `ImportSource_healthStatus_idx` | ✓ |

Plus the load-bearing indexes the plan didn't name: the observation compound
unique `(opportunityId, sourceName, sourceUrl)` (dedupe of re-sightings),
`Opportunity.sourceUrl` unique (dedupe tier 1), `contentHash`, `status`,
`deadline`, `faStatus`/`psStatus` (translation queue), and
`TranslationChunk (status, updatedAt)` (queue pickup). All verified present.

## 2. Hot-path query audit (per NEW listing through the import pipeline)

| Stage | Queries | Indexed? |
|---|---|---|
| Same-source dedupe (`findExisting`) | 2–3 (sourceUrl unique → contentHash → same-source fuzzy `take:200`) | ✓ unique / partial scan ≤200 |
| Organization resolution | 1–2 (alias unique lookup; miss → org create + alias create) | ✓ unique |
| Cross-source canonical resolution | 1 alias lookup + 1 candidate query (`take:200`) + in-memory scoring — **no per-candidate queries** | ✓ |
| Observation write (`ensureSourceObservation`) | findFirst + count + create/update (3) | ✓ |
| Verification recompute | 2 (observations + org) | ✓ |
| Suggestion recording (only when org unresolved) | 2–3 | ✓ unique |

≈ 12–16 point queries per new listing — all single-row, all indexed. At the
current scale (hundreds of listings per run) this is comfortably fast; the
Phase 8 worker processed a full WordPress source (80 listings) in ~50s
locally, dominated by network fetches, not queries.

**Known, accepted scan:** the cross-source fallback query filters
`title CONTAINS first-3-words` when the organization is not canonicalized.
`LIKE '%…%'` cannot use a btree index; it is bounded by `take: 200`. At
thousands of rows this is fine; if the table grows past ~100k, promote the
organization-resolution rate (Phase 2 backfill) so the indexed
`organizationId` path dominates.

**No N+1:** candidate scoring is in-memory; organization resolution is per
listing (inherently independent), not per row-of-a-query. The dashboard
`listOrgJobs` is one indexed query bucketed in memory.

## 3. Observation growth

One row per (opportunity, source, URL) pair — bounded by real-world
source×vacancy pairs, not per fetch: re-sightings UPDATE `lastSeenAt` on the
same row (compound unique). Expected steady-state: thousands of rows, small.
`done` translation chunks are retained **by design** — `syncPlan` compares
`chunkHash` to detect source changes; deleting them would force full
re-translation. Chunk size ≈ source+translation text per 900 chars.

## 4. Worker memory / Chromium / images

- Import worker service: `MemoryMax=2500M` (Chromium headroom for ACBAR's
  browser tier).
- Base-scraper fetch cache is capped at 300 entries (fixed in the Phase 0
  baseline; was unbounded).
- Chromium is only engaged by ACBAR's fallback tiers (clearance cookie /
  full render) and only in non-scheduled runs; concurrency is 1.
- Images: sequential per-listing download → sharp → Blob; a missing Blob
  token degrades to remote-URL storage instead of failing the run.

## 5. Translation queue growth

Chunked rows are staged per language; the engine's 48-units/day cron budget
plus the tick's batches drain the queue; rate-limited providers stop the
batch early with 30-min backoff. The queue cannot starve imports: imports
enqueue (pending flags) and never wait.

## 6. Residual risks (documented, not acted on)

- Title-contains fallback scan (see §2) — revisit at 100k+ opportunities.
- `scoreCandidate` is O(candidates) in memory with `take: 200` — bounded.
- In-memory rate limiters reset per serverless cold start (bursts only).
