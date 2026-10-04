# Apply-Link Quality Audit (PHASE 26)

**Status:** READ-ONLY AUDIT — no rows were modified.
**Date:** 2026-10-04.
**Method:** `scripts/release/audit-phase26-apply-link-quality.mjs` queries production Supabase (SELECT only). Because GROUP-level truth beats sampling, the applyUrlType distribution and flag counts below cover the **complete published population** of each mandated source (row detail capped at 250/source, which equals the full population for every source in scope). Raw output: `scripts/release/out/phase26-apply-link-quality.json`.
**Flags:** (a) `applyUrl` NULL on a published row, (b) generic mailbox emails (`info@` / `webinfo@` / `no-reply@` / variants), (c) `applyUrl` host == `sourceUrl` host (aggregator self-redirect risk), (d) `deadline` more than 7 days in the past while still published.

## Population note

Live DB counts have drifted since the release briefing: total published is **1,153** (briefing said 1,207), expired **309**. Of the 8 mandated sources, only 5 have published rows; `Employer` has **0 rows of any status** (employer flow unused so far), `ReliefWeb Jobs (OCHA)` has 15 rows all in `draft`, and `Acted Vacancies` has 18 rows all in `draft` (both `autoPublish=false`, correctly unpublished).

## Per-source applyUrlType distribution (published rows)

| Source | Published | application_email | application_form | direct_application | source_article_fallback | unknown (applyUrl NULL) |
|---|---|---|---|---|---|---|
| ACBAR | 182 | 126 | 24 | 15 | 0 | **17** |
| Wazifaha Jobs | 189 | 109 | 20 | 6 | 54 | 0 |
| Jobs.af | 76 | 2 | 0 | 1 | **73** | 0 |
| Scholarships Corner | 92 | 3 | 3 | 67 | 19 | 0 |
| Opportunities For Youth | 113 | 33 | 2 | 2 | **76** | 0 |
| Employer | 0 | — | — | — | — | — |
| ReliefWeb Jobs (OCHA) | 0 (15 drafts) | — | — | — | — | — |
| Acted Vacancies | 0 (18 drafts) | — | — | — | — | — |
| **Total (5 active sources)** | **652** | **273** | **49** | **91** | **222** | **17** |

## Flag summary

| Source | applyUrl NULL | Generic email | Same-host apply (aggregator risk) | Deadline >7d past |
|---|---|---|---|---|
| ACBAR | **17** | 2 | 0 | 0 |
| Wazifaha Jobs | 0 | 4 | **55** | 0 |
| Jobs.af | 0 | 0 | **73** | 0 |
| Scholarships Corner | 0 | 1 | 19 | 0 |
| Opportunities For Youth | 0 | 0 | **76** | 0 |
| **Total** | **17** | **7** | **223** | **0** |

**Headline findings**

1. **223 published rows (34% of the 652 in scope) have an apply destination on the same host as the source listing** — i.e. the "Apply" button lands the user back on the aggregator article (Wazifaha 55, Jobs.af 73, Opportunities For Youth 76, Scholarships Corner 19). For Jobs.af this is 96% of its rows (`applyUrlType='source_article_fallback'`). These are not dead links, but they are aggregator round-trips, not real apply destinations.
2. **ACBAR is the only source with published rows whose `applyUrl` is NULL** (17 rows, `applyUrlType='unknown'`) — users see no apply action at all on those pages. Several are fallback slugs (`opportunity-18` … `opportunity-28`), suggesting a bulk-imported ACBAR batch without contact extraction.
3. **Generic emails are rare** (7 rows in scope): `info@` ×6 (ACBAR 2, Wazifaha 4) and one `no-reply@email.zenginehq.com` (Scholarships Corner — actually an application-platform transactional sender; borderline flag). Context: across ALL published rows the most common mailto locals are `hr` (46), `jobs` (20), `recruitment` (14) — mailto culture is otherwise healthy.
4. **Zero published rows have a deadline more than 7 days in the past** — the expiry pipeline is doing its job on the in-scope sources.

## Flagged examples (20 of 247 flagged rows)

| # | Source | Slug | Reason |
|---|---|---|---|
| 1 | ACBAR | `security-guard-supervisor` | applyUrl NULL on published |
| 2 | ACBAR | `ai-teacher-2` | applyUrl NULL on published |
| 3 | ACBAR | `quality-control-quality-assurance-consultant` | applyUrl NULL on published |
| 4 | ACBAR | `chief-financial-officer-cfo` | applyUrl NULL on published |
| 5 | ACBAR | `opportunity-28` | applyUrl NULL on published (fallback-slug batch) |
| 6 | ACBAR | `opportunity-21` | applyUrl NULL on published (fallback-slug batch) |
| 7 | ACBAR | `job-opportunity-dairy-plant-operator-mido-dairy` | generic email (info@) |
| 8 | ACBAR | `civil-engineer-2` | generic email (info@) |
| 9 | Wazifaha Jobs | `procurement-assistant-re-announced` | applyUrl host == sourceUrl host (wazifaha.org) |
| 10 | Wazifaha Jobs | `finance-officer-5` | applyUrl host == sourceUrl host (wazifaha.org) |
| 11 | Wazifaha Jobs | `hr-manager` | applyUrl host == sourceUrl host (wazifaha.org) |
| 12 | Wazifaha Jobs | `veterinarian` | applyUrl host == sourceUrl host (wazifaha.org) |
| 13 | Wazifaha Jobs | `job-opportunity-dairy-plant-operator-mido-dairy-3` | generic email (info@) |
| 14 | Jobs.af | `financing-expert` | applyUrl host == sourceUrl host (jobs.af) |
| 15 | Jobs.af | `general-manager` | applyUrl host == sourceUrl host (jobs.af) |
| 16 | Opportunities For Youth | `gilman-mccain-scholarship-2026-apply-for-a-5-000-study-abroad-scholars` | applyUrl host == sourceUrl host (opportunitiesforyouth.org) |
| 17 | Opportunities For Youth | `cfj-fellowship-programme-2027-legal-fellowship-for-early-career-women` | applyUrl host == sourceUrl host (opportunitiesforyouth.org) |
| 18 | Scholarships Corner | `kut-special-scholarship-program-in-japan-fully-funded` | applyUrl host == sourceUrl host (scholarshipscorner.website) |
| 19 | Scholarships Corner | `nextgen-icann88-program-2027-in-portugal-fully-funded` | generic email (no-reply@email.zenginehq.com — application-platform sender) |
| 20 | Jobs.af | `senior-mern-full-stack-developer` | applyUrl host == sourceUrl host (jobs.af) |

(The remaining flagged rows — 236 more — follow the same patterns and are listed in the JSON output.)

## Recommendations

1. **Jobs.af / Opportunities For Youth detail-page enrichment:** 73/76 and 76/113 rows fall back to the source article. Both sites embed the real "How to apply" link in the listing body; the detail scrapers should extract it so `source_article_fallback` shrinks (mirrors what `Scholarships Corner` already achieves: only 19/92 fallback).
2. **Repair the 17 ACBAR NULL-apply rows:** re-run contact extraction (email/URL detection) on their descriptions; if none exists, fall back to the ACBAR listing URL via the Apply Destination Resolver rather than leaving `unknown` on a published page. Prevent re-occurrence by blocking publish when `applyUrlType='unknown'` for sources with `autoPublish=true`.
3. **Same-host fallback is a known, bounded risk** — consider an `applyConfidence` downgrade (already a column) for `source_article_fallback` rows so the UI can badge them as "via listing", and so the Phase 8 verification queue prioritizes them.
4. **Generic mailboxes (7 rows)** are acceptable as a last resort; the two ACBAR `info@` rows overlap with the NULL-apply repair batch and can be re-resolved together.
5. **No action needed on stale deadlines** — zero hits in scope; keep the existing expiry job.
