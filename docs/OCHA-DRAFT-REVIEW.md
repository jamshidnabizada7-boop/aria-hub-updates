# ReliefWeb Jobs (OCHA) Draft Review (PHASE 10)

**Status:** REVIEW ONLY — no draft was published, edited, or deleted; no source config changed.
**Scope:** all 15 rows in `Opportunity` where `sourceName = 'ReliefWeb Jobs (OCHA)'` and `status = 'draft'`, as of 2026-10-04.
**Evidence:** production Supabase, read-only via `scripts/release/audit-phase10-ocha-drafts.mjs` (raw output: `scripts/release/out/phase10-ocha-drafts.json`).

## Summary

| Classification | Count |
|---|---|
| VALID (apply destination present; minor repairs) | 7 |
| NEEDS_REPAIR (no apply destination — `applyUrlType='unknown'`, `applyUrlEvidence='no-destination'`) | 8 |
| DUPLICATE | 0 |
| REJECT | 0 |

**Systematic gaps affecting all 15 drafts** (adapter-level, not per-item):
1. **`deadline` is NULL on 15/15** — every description contains "Closing date <date>" (e.g. "Closing date 9 Oct 2026"), but `src/lib/import/scrapers/rss-opportunity.ts` matches only `DEADLINE_RE = /deadline[^:\n]{0,30}[:\-]\s*…/i`, i.e. the literal word "deadline". ReliefWeb's phrasing never matches, so the date parser never fires.
2. **`organization` / `organizationId` are NULL on 15/15** and `country` is NULL on 15/15 — although the values are present in the text (see extraction findings below).
3. **`verificationStatus = 'verified_official'` on 15/15** — over-generous: the source role is `official_feed`, but 8 drafts have no apply destination at all and none carries a parsed deadline. Recommend downgrading drafts with `no-destination` to `needs_review` (or gating `verified_official` on a resolved apply destination).
4. **Geographic scope:** 0 of 15 postings are Afghanistan-related (Tanzania, UK, Belgium, Sudan, Iraq ×2, Chad, US ×2, Venezuela ×2, Myanmar, France, Central African Republic). The RSS `listUrl` is currently the global ReliefWeb job feed. If ARIA Hub should carry only Afghanistan-relevant jobs, add a country filter to the ImportSource config (ReliefWeb supports country-scoped feeds/queries) before any publishing decision.

## Can the ReliefWeb RSS organization tags feed organization resolution? (recommendation only)

**Finding:** the `class="tag country"` / `class="tag organization"` divs do **not** survive into the stored description — the adapter runs `stripHtml(body)` (`rss-opportunity.ts` line 55) before persisting, so the DB text contains no HTML tags at all (0 occurrences of "tag" in the sampled 7,399-char description). However, the same facts survive losslessly as **plain-text patterns**, verified extractable on **15/15 drafts** with a simple regex:

| Pattern in stored description | Extracted value | Match rate |
|---|---|---|
| Header: `Organization\n<name>` | ICS, Global Interagency Security Forum, Avocats Sans Frontières, International NGO Safety Organisation, International Labour Organization ×2, Humanity & Inclusion, International Rescue Committee ×2, Danish Refugee Council, CESVI, Agency for Technical Cooperation and Development ×2, Action contre la Faim France, Concordis International | 15/15 |
| Header: `Closing date\n<date>` | parseable dates (9 Oct 2026 … 31 Dec 2026) | 15/15 |
| Footer "Job details" block: `Country\n<country>`, `Source\n<name>` | matches header org exactly on 15/15; country present 15/15 | 15/15 |

**Recommendation:** YES — organization resolution can be fed from this source, but via **text-pattern extraction in the adapter**, not via tag-class selectors (those are gone by persistence time). Concretely, extend `RssOpportunityScraper` to capture, before stripping (or from the stripped text, since both patterns are plain-text): organization (header "Organization\n<name>", cross-checked against footer "Source\n<name>"), country (footer "Job details → Country"), and a deadline pattern for "Closing date". The extracted org name should flow into the existing org-resolution path (`normalizeOrgName` + `OrganizationAlias`) — e.g. "International Rescue Committee" already has an Organization row and would link, while unknown names would follow the source-suggestion flow rather than being auto-created blind. No changes have been made.

## Per-item table

| # | Slug | Title | Org (from text) | Country | Closing (in text) | `deadline` (DB) | Apply destination (DB) | Class |
|---|---|---|---|---|---|---|---|---|
| 1 | `meal-officer` | MEAL Officer | ICS | Tanzania | 9 Oct 2026 | NULL | `mailto:recruitmenttz@icsafrica.org` (application_email, employer-email-extracted) | VALID |
| 2 | `communications-officer` | Communications Officer | Global Interagency Security Forum | UK | 21 Oct 2026 | NULL | `mailto:recruitment@gisf.ngo` (application_email) | VALID |
| 3 | `directeur-trice-general-e` | Directeur.trice Général.e | Avocats Sans Frontières | Belgium | 31 Oct 2026 | NULL | `mailto:presidence@asf.be` (application_email) | VALID |
| 4 | `regional-analyst-sudan` | Regional Analyst - Sudan | International NGO Safety Organisation | Sudan | 18 Oct 2026 | NULL | none (`no-destination`) | NEEDS_REPAIR |
| 5 | `external-assurance-engagement-…-egf-ma` | External Assurance Engagement on the Empowerment Guarantee Fund (EGF) … | International Labour Organization | Iraq | 1 Nov 2026 | NULL | none (`no-destination`) | NEEDS_REPAIR |
| 6 | `rfq-332-2026-kin-roas-…` | RFQ/332/2026/KIN/ROAS – National Consultancy … Tracer Study – Iraq | International Labour Organization | Iraq | 11 Oct 2026 | NULL | `mailto:kinoo@ilo.org` (application_email) | VALID |
| 7 | `chef-de-projet-atlas-logistique-adre-tchad` | Chef de projet Atlas Logistique – Adré / Tchad | Humanity & Inclusion | Chad | 11 Oct 2026 | NULL | none (`no-destination`) | NEEDS_REPAIR |
| 8 | `p-c-compliance-sr-specialist` | P&C Compliance Sr Specialist | International Rescue Committee | USA | 31 Dec 2026 | NULL | none (`no-destination`) | NEEDS_REPAIR |
| 9 | `training-officer-cultural-orientation` | Training Officer, Cultural Orientation | International Rescue Committee | USA | 31 Dec 2026 | NULL | none (`no-destination`) | NEEDS_REPAIR |
| 10 | `consortium-grants-officer-caracas-national-staff` | Consortium Grants Officer - Caracas (National Staff) | Danish Refugee Council | Venezuela | 13 Oct 2026 | NULL | none (`no-destination`) | NEEDS_REPAIR |
| 11 | `operations-manager-myanmar` | Operations Manager - Myanmar | CESVI | Myanmar | 15 Oct 2026 | NULL | none (`no-destination`) | NEEDS_REPAIR |
| 12 | `oficial-de-desarrollo-de-proyectos-junior-caracas-venezuela` | OFICIAL DE DESARROLLO DE PROYECTOS JUNIOR CARACAS | Agency for Technical Cooperation and Development (ACTED) | Venezuela | 16 Oct 2026 | NULL | `https://forms.gle/Gj78nQ8Dm9cPk9Yj7` (application_form) | VALID |
| 13 | `asistente-de-logistica-caracas-venezuela` | ASISTENTE DE LOGISTICA_CARACAS VENEZUELA | Agency for Technical Cooperation and Development (ACTED) | Venezuela | 16 Oct 2026 | NULL | `https://forms.gle/bNC3dLEeDqN3jAe86` (application_form) | VALID |
| 14 | `charge-e-de-projet-appui-aux-partenaires` | CHARGE-E DE PROJET APPUI AUX PARTENAIRES | Action contre la Faim France | France | 1 Nov 2026 | NULL | none (`no-destination`) | NEEDS_REPAIR |
| 15 | `finance-hr-logistics-manager-for-central-african-republic-based-in-ban` | Finance, HR & Logistics Manager … Bangui | Concordis International | Central African Republic | 18 Oct 2026 | NULL | `mailto:hr@concordis.international` (application_email) | VALID |

All rows share: `jobType='job'`, `importedAt`/status per pipeline, `extractedData = {"adapter":"rssOpportunity"}`, `sourceUrl == originalUrl` (`https://reliefweb.int/job/<id>/…`), `organizationId` NULL, `verificationStatus='verified_official'`.

## Per-item notes

- **#1–3, #6, #15 (mailto drafts):** apply destinations are employer emails extracted from the body — legitimate. #6 is an ILO procurement RFQ, not a job — fine to keep as an opportunity type "job" is debatable; consider `jobType` review for RFQ/consultancy notices.
- **#12–13 (ACTED):** apply destinations are generic `forms.gle` Google Forms; the org name in the body confirms ACTED ("Agência… ACTED en Caracas"). Note that a separate "Acted Vacancies" official source (officialHtml) already exists in ImportSource — these RSS items overlap with that entity and org resolution should map them to the same Organization.
- **#4–5, #7–11, #14 (no-destination):** the stripped text contains no apply email/link (ReliefWeb hides apply behind its own apply flow / attachments for these). Repair path: detail-page enrichment (`parseDetail` exists but did not surface a destination) or fall back to the ReliefWeb listing URL as `source_article_fallback` — that decision belongs to the Apply Destination Resolver, not this audit.
- **#8–9 (IRC):** organization text matches the existing `International Rescue Committee` Organization row from PHASE 9 — a ready-made org-resolution win once the adapter feeds organization names through.
- **Duplicate check:** no other Opportunity row shares any draft's `sourceUrl`, `originalUrl`, normalized title, or `contentHash` — the parallel `ReliefWeb Jobs` (API) source has not imported overlapping items so far.

## Recommended next steps (not executed)
1. Extend the RSS adapter: capture organization, country, and "Closing date" (add `CLOSING_RE = /closing date[:\s\n]+([^\n]{3,60})/i` alongside `DEADLINE_RE`); persist them into `extractedData` and the typed columns.
2. Feed extracted organization names through org resolution (`normalizeOrgName` / `OrganizationAlias`); route unknowns to `OrganizationSourceSuggestion`.
3. Re-gate `verificationStatus` for drafts with `applyUrlEvidence='no-destination'`.
4. Decide the geographic scope question and, if Afghanistan-only, switch `listUrl` to a ReliefWeb Afghanistan-scoped feed in ImportSource config.
