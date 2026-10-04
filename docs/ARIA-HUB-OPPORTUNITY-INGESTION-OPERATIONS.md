# ARIA HUB — Operations Documentation Suite

Completion mandate PHASES 31/32/34/37/39 — consolidated operational reference.

---

## 1. ADMIN AUDIT LOG COVERAGE (PHASE 31)

All sensitive mutations write `AuditLog` rows (`entity`, `entityId`, `action`,
`details` JSON with actor + before/after). Verified coverage:

| Action | AuditLog action | Where |
|---|---|---|
| Organization edit / verify / unverify | `organization.edit` / `.verify` / `.unverify` | organization-actions.ts |
| Organization merge (incl. aliases/sources/observations moved) | `organization.merge` | organization-actions.ts |
| Official source add / pause / resume | `organization.add-source` / `.pause-source` / `.resume-source` | organization-actions.ts |
| Source certification (PHASE 11) | `source.certification` | source-certification.ts |
| Discovery: keep-separate / publish / reject / merge / trust / pause | `discovery.*` | discovery-actions.ts |
| Employer claim / approve / reject | `membership.claim` / `.approve` / `.reject` | membership.ts |
| Employer job create / edit / close / reopen / extend / duplicate | `employer.job-*` | employers/jobs.ts |
| Opportunity submission approve / reject | admin submissions route (pre-existing) | submissions route |

Gaps: admin CRUD-table edits for non-opportunity models rely on the
pre-existing crud-route logging. No gap in the ingestion/employer surface.

## 2. SECURITY HARDENING SUMMARY (PHASE 32)

- **Auth:** employer sessions = HMAC-signed httpOnly cookies, 30-day expiry,
  fail-closed on disabled accounts; brute-force lockout via durable counters
  (10 failures / 15 min); admin sessions unchanged (separate secret).
- **Ownership:** every employer mutation passes `requireMembership` —
  cross-org access structurally impossible (test-proven).
- **SSRF:** `isSafePublicUrl` gates scraper baseUrl, org URLs, source adds.
- **Rate limiting:** durable Postgres fixed-window counters (shared across
  instances, fail-open) on auth/claims/jobs/submissions/PDF + in-memory
  burst guards.
- **XSS/sanitization:** scraped HTML renders only through
  `renderListingContent` → `sanitizeListingHtml` allowlist; JSON-LD escapes.
- **Secrets:** `.env` never traced into functions (exclusion + PHASE 4
  guardrail); `.env.production.local` redacted at rest; DB credentials only
  in server env files with 600 perms.
- **Residual:** admin role model sparsely enforced (pre-existing); CSRF
  relies on SameSite=Lax + JSON content-type (pre-existing).

## 3. PERFORMANCE NOTES (PHASE 34)

- Organization resolution: alias-unique lookup per listing (indexed); scoped
  `slugPrefix` option added to `runBackfill` for incremental re-runs.
- Discovery Inbox: single indexed query + candidate fetch, take:100.
- Employer dashboard: one indexed query bucketed in memory.
- Analytics: 3 indexed queries + in-memory aggregation, 30-day window.
- No N+1 introduced. Rate-limit cleanup piggybacks on first-hit-per-window.

## 4. ACCESSIBILITY & MOBILE (PHASE 33)

New UI reviewed: employer dashboard (labels, keyboard focus via native
inputs/selects, RTL dirs set at layout level), organizations admin (contrast
badges, text-based status), Discovery Inbox (reasons text, confirm pattern
prevents accidental merges), employer forms (labels + placeholders + counters).
Known gaps: Discovery Inbox confidence badge is color-only (add icon in a
future pass); RTL for mixed Persian/English employer forms inherits the
existing site-wide dir handling.

## 5. OFFICIAL SOURCE INVENTORY (PHASE 37)

| Source | Org | Type | Official? | Adapter | Priority | Schedule | Trust | autoPublish | Status |
|---|---|---|---|---|---|---|---|---|---|
| ReliefWeb Jobs (OCHA) | ReliefWeb (UN OCHA) | job | YES | rssOpportunity | 65 | 15 min | 80 | FALSE | PRODUCTION ENABLED (validated) |
| Acted Vacancies | Acted | job | YES | officialHtml | 90 | 30 min | 90 | FALSE | PRODUCTION ENABLED (validated) |
| UNHCR careers | UNHCR | job | YES | workday | 95 | 20 min | 90 | FALSE | READY TO ENABLE (CXS verified live) |
| IRC careers | IRC | job | YES | workday | 95 | 20 min | 90 | FALSE | READY TO ENABLE (CXS verified live, 343 jobs) |
| WFP careers | WFP | job | YES | workday | 95 | 20 min | 90 | FALSE | READY TO ENABLE (CXS verified live, 100 jobs) |
| IOM vacancies | IOM | job | YES | oracleHcm | 95 | 20 min | 90 | FALSE | READY TO ENABLE (REST verified live, 69 jobs) |
| UNDP jobs | UNDP | job | YES | — | 90 | 30 min | — | FALSE | NEEDS ADAPTER (jobs.undp.org/cj_view_jobs.cfm server-rendered HTML verified) |
| UNOPS careers | UNOPS | job | YES | rssOpportunity | 95 | 20 min | 90 | FALSE | READY TO ENABLE (RSS feed verified live) |
| DRC vacancies | DRC | job | YES | officialHtml | 90 | 30 min | 90 | FALSE | READY TO ENABLE (drc.ngo 63 server-rendered cards) |
| Türkiye Bursları | Türkiye Diyanet Foundation | scholarship | YES | officialHtml | 80 | 4h | 85 | FALSE | READY TO ENABLE (annual window) |
| Stipendium Hungaricum | Tempus Foundation | scholarship | YES | wpApi/rssNews | 80 | 4h | 85 | FALSE | READY TO ENABLE (wp-json + feed verified) |
| Erasmus+ | European Commission | scholarship | YES | rssNews | 70 | 4h | 85 | FALSE | READY TO ENABLE (Atom feed verified; needs Atom `<entry>` patch in news pipeline) |
| GOV.UK policy feeds | UK Government | news | YES | rssNews (Atom) | 25 | 6h | 85 | FALSE | NEEDS Atom entry patch in news pipeline |
| UK Parliament AF-watch | UK Parliament | news | YES | jsonApi | 25 | 6h | 85 | FALSE | READY TO ENABLE (JSON 200, 3,838 AF hits) |
| ACBAR / Wazifaha / Jobs.af / o4af / Scholarships.af / wpApi set | various | job/scholarship | aggregator | existing | 30–60 | 15 min–4h | 40 | mixed | AGGREGATOR BACKUP (unchanged) |

Groups: PRODUCTION ENABLED = 2 · READY TO ENABLE = 10 · NEEDS ADAPTER = 1
(UNDP HTML) · BLOCKED = UNICEF/NRC/WHO/CARE/DAAD/AKDN (evidence in
docs/OFFICIAL-SOURCE-RESEARCH.md) · AGGREGATOR BACKUP = 6 existing.

## 6. OPERATIONAL RUNBOOKS (PHASE 39 — pointers)

- **Ingestion operations:** start/stop worker, run one source, verify health →
  `docs/PRODUCTION-WORKERS.md` (cutover + unit locations) and
  `docs/PHASE-0-BASELINE-AUDIT.md` (pipeline reference).
- **Employer portal:** claim → approve → post → publish flow, ownership
  model → `docs/EMPLOYER-PORTAL-OPERATIONS.md` (below).
- **Source registry management:** certification lifecycle, auto-publish
  eligibility criteria, Discovery Inbox actions → this file §7.
- **Translation (manual-only):** queue buckets, stale detection, atomic
  commits → `docs/TRANSLATION-MANUAL-WORKFLOW.md` (below).
- **Security:** guards, limiters, grants → `docs/SECURITY-HARDENING.md` (below).

### docs/EMPLOYER-PORTAL-OPERATIONS.md

1. Employer registers at `/en/employers/login` (email + password ≥8).
2. Employer claims an organization by slug with an evidence email (PHASE 8
   lifecycle: UNCLAIMED → CLAIM REQUESTED).
3. Admin reviews in Organizations panel: compares evidence-email domain
   against Organization.officialDomains → Approve (member becomes active
   owner) or Reject (suspended).
4. Employer posts jobs at `/en/employers/dashboard` → Post Job: draft
   (status=pending review), professional fields mapped, Persian/Pashto enter
   the manual queue (faStatus/psStatus pending).
5. Admin publishes when gates pass (PHASE 22 evaluator).
6. Employer manages: edit / extend deadline / close / reopen / duplicate —
   all ownership-enforced.

### docs/SECURITY-HARDENING.md

Durable rate limiters (Postgres, fail-open) protect: employer auth 5/min,
claims 10/min, job create 20/min, job patch 30/min, submissions 3/min + PDF
10/min. URL guard blocks SSRF targets on all scraper/org URLs. Sessions:
HMAC-signed, httpOnly, SameSite=Lax, 30-day, fail-closed when disabled.
`.env` never enters function traces (exclusion + runtime-read ban + test).
Ownership: membership-checked on every mutation.

### docs/TRANSLATION-MANUAL-WORKFLOW.md

Policy: MANUAL-ONLY. Rows enter `faStatus=pending` on import; the AI
translation timer is DISABLED and `IMPORT_TRANSLATE_ON_IMPORT` defaults to
off. Queue buckets (PHASE 21): needs-Persian (fa ≠ complete), needs-Pashto
(fa complete, ps ≠ complete), stale (source hash changed after translation).
The chunked engine commits only at 100% per language (atomic; partial never
public). Hand-translation batches use the established fetch/apply scripts.

## 7. Trusted auto-publish framework (PHASE 23 — NOT enabled)

Eligibility (advisory snapshot via
`evaluateAutoPublishEligibility`, admin API `auto-publish-eligibility`):
trusted certification + healthy + 0 consecutive failures + ≥10 successful
runs + ≥90% success rate + 0 DEGRADED runs + ≥90% real-apply + ≥90% sane
deadlines. Admin must STILL explicitly flip `autoPublish` — computing the
snapshot changes nothing.
