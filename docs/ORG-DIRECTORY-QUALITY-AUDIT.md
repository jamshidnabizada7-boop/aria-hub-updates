# Organization Directory Quality Audit (PHASE 27)

**Status:** READ-ONLY AUDIT — no rows were modified; no data inferred or fabricated. Everything below is measured directly from production.
**Date:** 2026-10-04.
**Method:** `scripts/release/audit-phase27-org-directory-quality.mjs` (SELECT only). Raw output: `scripts/release/out/phase27-org-directory-quality.json`.

## Headline counts (305 Organizations)

| Metric | Value | Share |
|---|---|---|
| Total organizations | **305** | — |
| Missing `website` | **305** | **100%** |
| Missing `careersUrl` | **304** | 99.7% |
| Missing `officialDomains` | **303** | 99.3% |
| Fallback slugs (`slug LIKE 'opportunity-%'`) | **8** | 2.6% |
| `verified = true` | **2** | 0.7% |
| `verified = false` | 303 | 99.3% |
| `active = false` | 0 | 0% |
| Orgs with ≥1 linked opportunity (published or expired) | 303 | 99.3% |
| Orgs with zero linked opportunities | **2** | 0.7% |

**Cross-org duplicate domains: 0.** No `officialDomains` entry is claimed by more than one organization — unsurprising given only 2 rows carry any domains at all. No duplicate `website` hosts either (no row has a website).

### The only verified / populated rows
Both carry `verificationMethod = 'manual_review_phase9'` (the two official sources added with PHASE 9's source work) — and both still lack a website:

| Name | Slug | Verified | website | careersUrl | officialDomains |
|---|---|---|---|---|---|
| Acted | `acted` | true (`manual_review_phase9`) | NULL | — | — |
| ReliefWeb (UN OCHA) | `reliefweb-un-ocha` | true (`manual_review_phase9`) | NULL | — | — |

### Fallback-slug rows (8) — all non-Latin (Dari/Pashto) names
`slugify` produces nothing for Arabic-script names, so these fell back to `opportunity-N`. They are real entities with linked opportunities, not junk rows:

| Name (verbatim) | Slug | Pub | Exp |
|---|---|---|---|
| اتاق تجارت و سرمایه گذاری بلخ (Balkh Chamber of Commerce) | `opportunity-4` | 1 | 0 |
| افغان تیلی کام (Afghan Telcom) | `opportunity-2` | 0 | 2 |
| الفلاح پوهنتون (Al-Falah University) | `opportunity-5` | 1 | 0 |
| انستیتیوت بانکداری و مالی افغانستان (Afghanistan Banking & Finance Institute) | `opportunity-6` | 1 | 0 |
| ریاست عمومی انسجام امور شاروالی‌ها (Municipalities Affairs Directorate) | `opportunity-7` | 0 | 1 |
| شرکت آسیاهرت گروپ (Asia Heart Group) | `opportunity-3` | 2 | 0 |
| شفاخانه معالجوی بیست بستر حضرت خاتم النبیین (ص) نیمروز (Nimroz 20-bed Hospital) | `opportunity-8` | 1 | 0 |
| له خصوصی سکتورونو څخه د څارنی عمومی ریاست (Private Sector Oversight Directorate) | `opportunity-9` | 1 | 0 |

### The 2 orgs with zero linked opportunities
The two verified rows above (Acted, ReliefWeb (UN OCHA)) — they exist to own their ImportSource rows (`Acted Vacancies` 18 drafts, `ReliefWeb Jobs (OCHA)` 15 drafts), which is by design until those feeds start publishing.

## Top-20 organizations by active published opportunities (with completeness gaps)

Every one of the top-20 has the identical gap profile: **website, careersUrl, officialDomains, verified — all missing.** (This is expected: the directory was created by the backfill from free-text `Opportunity.organization` values, which carries no domain evidence.)

| # | Organization (verbatim name) | Published | Expired | Gaps |
|---|---|---|---|---|
| 1 | Ghazanfar Bank | 19 | 0 | website, careersUrl, officialDomains, verified |
| 2 | INTERSOS | 13 | 11 | website, careersUrl, officialDomains, verified |
| 3 | Agricultural Development Fund | 13 | 0 | website, careersUrl, officialDomains, verified |
| 4 | HPL | 12 | 0 | website, careersUrl, officialDomains, verified |
| 5 | Ummat International Hospital - UIH | 10 | 2 | website, careersUrl, officialDomains, verified |
| 6 | Da Afghanistan Bank | 10 | 0 | website, careersUrl, officialDomains, verified |
| 7 | Environmental Protection Trainings and Development Organization (EPTDO) | 7 | 0 | website, careersUrl, officialDomains, verified |
| 8 | Equal Rights Trust Organization (ERTO) موسسه باور به حقوق مساوی | 7 | 0 | website, careersUrl, officialDomains, verified |
| 9 | Organization for Community Coordination and Development (OCCD) | 7 | 0 | website, careersUrl, officialDomains, verified |
| 10 | HealthNet TPO | 6 | 5 | website, careersUrl, officialDomains, verified |
| 11 | Relief International (RI) | 6 | 4 | website, careersUrl, officialDomains, verified |
| 12 | Action Against Hunger | 6 | 3 | website, careersUrl, officialDomains, verified |
| 13 | (CHA), Coordination of Humanitarian Assistance موسسه همکاری | 6 | 0 | website, careersUrl, officialDomains, verified |
| 14 | ALSO | 6 | 0 | website, careersUrl, officialDomains, verified |
| 15 | UNOPS | 6 | 0 | website, careersUrl, officialDomains, verified |
| 16 | Westgate Consultancy | 6 | 0 | website, careersUrl, officialDomains, verified |
| 17 | ریاست عمومی شرکت های امارتی | 6 | 0 | website, careersUrl, officialDomains, verified |
| 18 | ARCS | 5 | 3 | website, careersUrl, officialDomains, verified |
| 19 | ATOMA | 5 | 0 | website, careersUrl, officialDomains, verified |
| 20 | ZOODPAY | 5 | 0 | website, careersUrl, officialDomains, verified |

Note: row 18 (`ARCS`) is the source-side of the PHASE 9 MERGE decision into `Afghan Red Crescent Society (ARCS)` — its 8 opportunities will consolidate under one org when that merge is executed (see `docs/ORG-AMBIGUITY-RESOLUTIONS.md`).

## Observations (facts, no changes made)

1. **The directory is link-bare.** 100% missing `website` means org resolution currently cannot use domain evidence anywhere except apply-host inference at import time, and the two PHASE 9 MERGE decisions that were supported by official-domain corroboration (`daad.de`, `maastrichtuniversity.nl`) relied on apply-hosts, not stored domains.
2. **The 8 fallback slugs are a slugify script-coverage issue**, not duplicate junk — the Arabic-script names cannot be transliterated by the current slug generator. URLs like `/organizations/opportunity-4` are functional but meaningless; a transliteration map (or pinyin-style romanization of the 8 names by an admin) fixes all 8.
3. **No duplicate-domain conflicts exist** to block the PHASE 9 merges — the directory is currently too sparse for domain collisions.
4. **303 orgs carry the backfill's opportunity links; only 2 are verified.** Verification backlog: 303 rows, of which the top-20 above (145 published / 29 expired linked opportunities ≈ 15% of all published rows) is the highest-leverage starting set — these are exactly the orgs an admin should enrich first (website + officialDomains + verified).
