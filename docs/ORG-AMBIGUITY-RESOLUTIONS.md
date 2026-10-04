# Organization Ambiguity Resolutions (PHASE 9)

**Status:** DECISION RECORD ONLY — no merge or alias INSERT has been executed.
**Input:** `release-backups/prod-org-backfill-dry-run.json` → `ambiguousPairs` (14 pairs), produced by the org-backfill dry run over 732 scraped opportunities / 303 backfill-created groups.
**Evidence:** production Supabase, queried read-only via `scripts/release/audit-phase9-org-ambiguities.mjs` (raw output: `scripts/release/out/phase9-org-ambiguities.json`). Every involved Organization is a backfill-created row: `verified=false`, no `website`, no `careersUrl`, no `officialDomains`. Evidence therefore comes from (a) the display name itself, (b) linked opportunity titles, and (c) `applyUrl` hosts.
**Admin action:** `mergeOrganizations(db, targetId, sourceId, adminEmail)` (src/lib/import/organization-actions.ts) folds the source into the target — opportunities, aliases, sources and observations are re-pointed, the source's display name survives as an alias of the target, then the source row is deleted. Alias INSERTs are listed only where they are NOT already covered by that automatic behaviour.

**Summary: 9 pairs → MERGE (consolidating 11 orgs into 6), 5 pairs → KEEP_SEPARATE.**

---

## MERGE decisions

### 1. `arcs` ⟷ `afghan red crescent society` (acronym-match) — MERGE
| Side | Org | Opps (pub/exp) |
|---|---|---|
| A | ARCS (`cmut7xanr0010ubbc6wdrfylk`) | 5 / 3 |
| B | Afghan Red Crescent Society (ARCS) (`cmut7z4z100coubbcuxgsjx6f`) | 1 / 0 |

**Evidence:** A is the exact acronym of B; B's own display name carries the parenthetical "(ARCS)". Opportunity titles on both sides are ARCS programme jobs (e.g. "Job Announcement: 9 Vacancies at the Afghan Red Crescent Society" under B; Wazifaha-sourced clinical/TOR posts under A).
**Decision:** MERGE — target **B** (fuller canonical display name), source **A** (8 opportunities move).
**Action:** `mergeOrganizations(db, 'cmut7z4z100coubbcuxgsjx6f', 'cmut7xanr0010ubbc6wdrfylk', '<admin>')` — source name "ARCS" is preserved as an alias automatically.

### 2. `irc` ⟷ `international rescue committee` (acronym-match) — MERGE
| Side | Org | Opps (pub/exp) |
|---|---|---|
| A | IRC (International Rescue Committee) (`cmut7xprh003lubbcxq2od072`) | 3 / 1 |
| B | International Rescue Committee (`cmut7zqy100glubbc422wgtei`) | 0 / 1 |

**Evidence:** A's display name literally spells out the expansion "(International Rescue Committee)". IRC is the unambiguous acronym of that entity.
**Decision:** MERGE — target **B** (clean canonical name), source **A** (4 opportunities move).
**Action:** `mergeOrganizations(db, 'cmut7zqy100glubbc422wgtei', 'cmut7xprh003lubbcxq2od072', '<admin>')`.

### 3. `daad the german academic exchange services` ⟷ `daad` (token-containment) — MERGE
| Side | Org | Opps (pub/exp) | Apply-host evidence |
|---|---|---|---|
| A | DAAD- the German Academic Exchange Services (`cmut7ydri007uubbcpk96xt4o`) | 2 / 0 | `www2.daad.de` ×2 |
| B | DAAD (`cmut7zh2x00euubbcsg8sqyku`) | 1 / 0 | `afterschoolafrica.com` (aggregator) |

**Evidence:** "DAAD" is the exact acronym/brand of the German Academic Exchange Service, spelled out in A's display name, and A's apply links resolve to the official `daad.de` domain — the only pair in the batch with official-domain corroboration on the entity itself.
**Decision:** MERGE — target **A** (carries the domain evidence), source **B** (1 opportunity moves).
**Action:** `mergeOrganizations(db, 'cmut7ydri007uubbcpk96xt4o', 'cmut7zh2x00euubbcsg8sqyku', '<admin>')`. Optional follow-up (not executed): rename target display to "DAAD (German Academic Exchange Service)" and set `website = https://www.daad.de`, `officialDomains = ["daad.de"]`.

### 4. `maastricht` ⟷ `maastricht university` (token-containment) — MERGE
| Side | Org | Opps (pub/exp) |
|---|---|---|
| A | Maastricht (`cmut7yjss008xubbcox807oyl`) | 2 / 0 |
| B | Maastricht University (`cmut7zvke00hfubbcx3txpnj1`) | 1 / 0 |

**Evidence:** A is a truncated display-name artifact; both of A's opportunities are titled "… Maastricht University …" ("UM Social Justice Scholarship – Maastricht University, 2027", "Maastricht University NL-High Potential Scholarship … 2027"). No other Maastricht institution appears in the data.
**Decision:** MERGE — target **B**, source **A** (2 opportunities move).
**Action:** `mergeOrganizations(db, 'cmut7zvke00hfubbcx3txpnj1', 'cmut7yjss008xubbcox807oyl', '<admin>')`.

### 5. `maastricht` ⟷ `maastricht university mu` and ### 6. `maastricht university` ⟷ `maastricht university mu` (token-containment ×2) — MERGE (one consolidation)
| Org | Opps (pub/exp) | Apply-host evidence |
|---|---|---|
| Maastricht (`cmut7yjss008xubbcox807oyl`) | 2 / 0 | — |
| Maastricht University (`cmut7zvke00hfubbcx3txpnj1`) | 1 / 0 | — |
| Maastricht University MU (`cmut7zw2t00hiubbc6mcdmlxj`) | 1 / 0 | `corsa-forms.mumc.maastrichtuniversity.nl` |

**Evidence:** The "MU" suffix in the third org is the acronym of Maastricht University (matches "Maastricht University (MU)" style listing titles), and its only opportunity applies through a `maastrichtuniversity.nl` subdomain — domain corroboration. All three keys are the same university.
**Decision:** MERGE the trio into a single org — target **Maastricht University** (`cmut7zvke00hfubbcx3txpnj1`).
**Actions (two calls, order irrelevant):**
- `mergeOrganizations(db, 'cmut7zvke00hfubbcx3txpnj1', 'cmut7yjss008xubbcox807oyl', '<admin>')`
- `mergeOrganizations(db, 'cmut7zvke00hfubbcx3txpnj1', 'cmut7zw2t00hiubbc6mcdmlxj', '<admin>')`

Net result: 3 orgs → 1 (4 opportunities consolidated); names "Maastricht" and "Maastricht University MU" survive as aliases automatically.

### 7. `brown` ⟷ `brown university` (token-containment) — MERGE
| Side | Org | Opps (pub/exp) |
|---|---|---|
| A | Brown (`cmut7zeag00ecubbcnqtbah6o`) | 1 / 0 |
| B | Brown University (`cmut7zerb00efubbc09bjl1wd`) | 1 / 0 |

**Evidence:** A is a title artifact; its only opportunity is "Brown University Scholarships 2027 for International Students | USA". No competing "Brown" entity exists in the data.
**Decision:** MERGE — target **B**, source **A**.
**Action:** `mergeOrganizations(db, 'cmut7zerb00efubbc09bjl1wd', 'cmut7zeag00ecubbcnqtbah6o', '<admin>')`.

### 8. `fully funded monash` ⟷ `monash` (token-containment) — MERGE
| Side | Org | Opps (pub/exp) |
|---|---|---|
| A | Fully Funded Monash (`cmut7zkqc00fiubbcfitvqpzi`) | 1 / 0 |
| B | Monash (`cmut800c500i9ubbc9lb42z3y`) | 1 / 0 |

**Evidence:** Both names are scraper-title artifacts ("Fully Funded Monash …" from a scholarship-listing headline). Both linked opportunities are Monash University scholarships ("Multiple Fully Funded Monash University Indonesia Masters Scholarships 2026", "Monash University Sir John Monash Scholarships for Excellence").
**Decision:** MERGE — target **B** ("Monash", closer to the real name), source **A**.
**Action:** `mergeOrganizations(db, 'cmut800c500i9ubbc9lb42z3y', 'cmut7zkqc00fiubbcfitvqpzi', '<admin>')`. Optional follow-up: rename target to "Monash University", set `website = https://www.monash.edu`, `officialDomains = ["monash.edu"]`.

### 9. `university of dundee` ⟷ `university of dundee vice chancellor` (token-containment) — MERGE
| Side | Org | Opps (pub/exp) |
|---|---|---|
| A | University of Dundee (`cmut80o6y00mfubbchlcs9da4`) | 1 / 0 |
| B | University of Dundee Vice Chancellor (`cmut80onb00miubbczmwfj0as`) | 1 / 0 |

**Evidence:** B's name is an artifact of the listing title "The University of Dundee **Vice Chancellor's Africa Scholarship** 2027" — "Vice Chancellor's" qualifies the scholarship, not a separate institution. Same entity as A.
**Decision:** MERGE — target **A**, source **B**.
**Action:** `mergeOrganizations(db, 'cmut80o6y00mfubbchlcs9da4', 'cmut80onb00miubbczmwfj0as', '<admin>')`.

---

## KEEP_SEPARATE decisions

### 10. `afghan murad high school` ⟷ `afghan murad high school ansar` — KEEP_SEPARATE
A (`cmut7xwy2004uubbc0d5333kh`, 3 pub) vs B (`cmut7y8oq006xubbcgwcjtjcc`, 2 pub, display "Afghan Murad High School / Ansar").
**Evidence:** B's postings are teaching vacancies ("Chemistry, Biology, Geology, Dari, Math, Physics, Oxford is a must"), A's are admin roles. "/ Ansar" most likely denotes a branch or campus (Ansar), but the data cannot prove the two slugs are one legal entity — no domains, no websites, both unverified.
**Decision:** KEEP_SEPARATE (default when unsure). Revisit only if admin confirms Ansar is the same campus; then an `OrganizationAlias` (normalized `afghan murad high school ansar`) on A would be the fix, not a merge.

### 11. `ctg` ⟷ `ctg afghanistan` — KEEP_SEPARATE
A "CTG" (`cmut7xyrz0056ubbcwdk48tyn`, 2 pub / 1 exp) vs B "CTG Afghanistan" (`cmut7xz890059ubbcar1bhizh`, 3 pub).
**Evidence:** Contextually CTG Afghanistan is the country operation of CTG (global recruitment firm), and all apply links on both sides route through `wazifaha.org` (aggregator). No website, no official domains, no acronym evidence — the containment is a country-qualifier, which the mandate treats as insufficient for an automatic merge.
**Decision:** KEEP_SEPARATE. **Candidate for a future merge** once an admin verifies CTG's website (`ctgglobal.com`) on one row; the titles on both sides ("Para-veterinarian", "Senior Programme Associate (Gender Inclusion and AAP)") are the same recruitment pipeline.

### 12. `western isp and ict solutions` ⟷ `western` — KEEP_SEPARATE
A "Western ISP & ICT Solutions" (`cmut7y6r1006lubbcnwsmje37`, 3 pub — Afghan ISP) vs B "Western" (`cmut80xzx00o6ubbc17egtgw1`, 1 pub).
**Evidence:** B's single opportunity is "Western University Scholarships 2027 | Canada" — a Canadian university, a different entity entirely. The containment is coincidental.
**Decision:** KEEP_SEPARATE — definitively different entities. (B should eventually be renamed "Western University (Canada)" by an admin.)

### 13. `swinburne university of technology` ⟷ `university of technology` — KEEP_SEPARATE
A (`cmut80f1100kuubbc2l2r5yiz`, 1 pub) vs B "University of Technology" (`cmut80vnb00nrubbcix2getx7`, 1 pub).
**Evidence:** B's opportunity is "Apply for the Helmut Veith Stipend at **Vienna University of Technology** 2027" — TU Wien, not Swinburne (Australia). "University of Technology" is a generic name shared by many institutions.
**Decision:** KEEP_SEPARATE — different entities. (B should be renamed "Vienna University of Technology (TU Wien)".)

### 14. `united nations` ⟷ `united nations institute for training and research` — KEEP_SEPARATE
A "United Nations" (`cmut80mra00m6ubbc7idx7m7f`, 1 exp) vs B "United Nations Institute for Training and Research(UNITAR)" (`cmut80n7h00m9ubbciy3pt14c`, 1 exp).
**Evidence:** A's opportunity is a "**United Nations University (UNU)**" internship — a distinct UN institution from UNITAR. "United Nations" alone is a generic umbrella name, not UNITAR.
**Decision:** KEEP_SEPARATE — different entities. (Follow-up for admins: A's linked item actually belongs to United Nations University; consider a dedicated UNU org row and re-pointing, rather than merging into either side.)

---

## Method notes
- Pair keys were resolved to Organization rows via `OrganizationAlias.normalized` (exact match; every key resolved — no misses).
- Opp counts = `Opportunity.organizationId` linkage, grouped by status, as of audit date 2026-10-04. `freeTextUsage` (unlinked free-text `Opportunity.organization` matching each name) was 0 for all 22 involved orgs, so merges move only FK links, not display fallbacks.
- No `OrganizationAlias` INSERTs are required beyond what `mergeOrganizations` performs automatically (source name → alias); the dry run's `aliasCandidates` were empty for all affected groups.
