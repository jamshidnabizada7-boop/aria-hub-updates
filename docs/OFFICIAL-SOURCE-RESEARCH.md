# OFFICIAL-SOURCE-RESEARCH.md — Phases 16 / 18 / 19 / 37 (seed-ready configs)

**Probed live:** 2026-10-04 (UTC morning) with `curl` (full browser UA + header fingerprint), plus one
WebFetch cross-check where curl's TLS path failed. Every status code below was observed today; nothing
is assumed from memory. **Read-only session: no DB writes, no seeds executed.**

Adapter keys referenced = the repo registry at `src/lib/import/registry.ts`
(`officialHtml`, `rssOpportunity`, `jsonApi`, `wpApi`, `rssNews`, `greenhouse`, `lever`, `reliefweb`,
plus **pending**: `workday`, `oracleHcm`, `successfactors` — being built by the parallel adapter task).
Config shapes follow `official-html.ts`, `rss-opportunity.ts`, `json-api.ts`, `news-import.ts`,
and `scripts/seed-new-sources.mjs`. Roles/trust follow `src/lib/import/source-observations.ts`
(`SOURCE_ROLES`, `ROLE_TRUST`: official_api/feed=95, official_careers/government=90).
An explicit `sourceRole` on the row overrides the scraperKey default (see `SCRAPER_KEY_ROLES`).

Statuses used: **VERIFIED_LIVE** (endpoint returns usable data today) · **VERIFIED_STATIC_HTML**
(page server-rendered, no feed/API) · **NEEDS_ADAPTER** (endpoint live, adapter missing or gap) ·
**BLOCKED** (WAF/403/JS-shell for plain HTTP) · **VERIFIED_LOW_VALUE** (works but empty/stale).

Schedule tiers: P0 = 5–15 min · P1 = 15–30 min · P1-scholarship = 30–60 min · secondary = 2–4 h ·
long-tail = 12–24 h.

---

## 0. Summary counts

| Group | Count |
|---|---|
| Probed orgs / endpoints | 24 orgs / 30 endpoints |
| A. PRODUCTION-READY-NOW (existing adapters) | **6** |
| B. VERIFIED live endpoint, NEEDS-NEW-ADAPTER | **14** |
| C. VERIFIED_STATIC_HTML long-tail (optional seed) | 3 |
| D. BLOCKED / not usable via plain HTTP | 7 (incl. 1 stale-feed + 1 partially-verified) |

Top 5 ready-now by value: **1) UNDP, 2) UNOPS, 3) DRC (drc.ngo), 4) Stipendium Hungaricum,
5) Türkiye Bursları** (rationale in §A preamble).

---

## A. PRODUCTION-READY-NOW — works TODAY with an existing adapter

These six can be inserted as `ImportSource` rows without any code. Suggested priorities: official
sources 70 (sits above discovery 20–50, below employer 100).

### A1. UNDP — VERIFIED_LIVE (officialHtml) ⭐ top pick

- **Official careers URL:** https://jobs.undp.org/ (list app: `https://jobs.undp.org/cj_view_jobs.cfm`)
- **Platform:** custom ColdFusion listing app; apply links point at Oracle HCM CXS
  (`estm.fa.em2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions/job/<id>`)
- **Evidence:** `GET https://jobs.undp.org/cj_view_jobs.cfm` → **200**, `text/html`, 211,303 bytes.
  Server-rendered rows: `<a class="vacanciesTableLink vacanciesTable__row region_… country_…">`
  with cells labelled Job Title / Post level / Apply by / Agency / Location. (Note: `www.undp.org/careers`
  → **403 Akamai** — only the jobs host is open, and that is all we need.)
- **AF relevance:** global feed (rows carry `country_XX` classes incl. `country_AFG`); AI/filter
  pipeline handles downstream relevance. ~40 postings per listing page.
- **Schedule:** P1, 30 min.

```json
{
  "name": "UNDP Jobs",
  "type": "job",
  "scraperKey": "officialHtml",
  "baseUrl": "https://jobs.undp.org",
  "sourceRole": "official_careers",
  "priority": 70,
  "trustScore": 90,
  "scheduleMinutes": 30,
  "defaultCategory": "jobs",
  "config": {
    "listUrl": "https://jobs.undp.org/cj_view_jobs.cfm",
    "detailFetch": false,
    "selectors": {
      "card": "a.vacanciesTableLink",
      "title": "div.vacanciesTable__cell span",
      "url": "a.vacanciesTableLink",
      "organization": "div.vacanciesTable__cell:nth-of-type(4) span",
      "location": "div.vacanciesTable__cell:nth-of-type(5) span",
      "deadline": "div.vacanciesTable__cell:nth-of-type(3) span"
    }
  },
  "autoPublish": false
}
```

Notes: `title` selector takes the first cell's span (Job Title). Deadline format on page is
`Oct-5-26` — `parseDate` may miss it; the AI enrichment pass is the fallback. `detailFetch: false`
because detail pages live on Oracle CXS (JS).

### A2. UNOPS — VERIFIED_LIVE (rssOpportunity) ⭐ top pick

- **Official careers URL:** https://jobs.unops.org/ → https://careers.unops.org/careersmarketplace
- **Platform:** JobTarget-style "careersmarketplace" (`/SearchJobs`, `/JobDetail/<slug>/<id>`)
- **Evidence:** `GET https://careers.unops.org/careersmarketplace/SearchJobs/feed/` → **200**,
  `text/xml;charset=UTF-8`, RSS 2.0, 20 items with `<link>` to `/careersmarketplace/JobDetail/…`;
  `?jobRecordsPerPage=50` accepted on the HTML list (10 × `board`-style cards). `GET /SearchJobs`
  → **200** HTML 110 KB (server-rendered fallback).
- **AF relevance:** global feed (UNOPS has repeated Afghanistan project postings).
- **Schedule:** P1, 30 min.

```json
{
  "name": "UNOPS Careers",
  "type": "job",
  "scraperKey": "rssOpportunity",
  "baseUrl": "https://careers.unops.org",
  "sourceRole": "official_feed",
  "priority": 70,
  "trustScore": 95,
  "scheduleMinutes": 30,
  "defaultCategory": "jobs",
  "config": {
    "listUrl": "https://careers.unops.org/careersmarketplace/SearchJobs/feed/",
    "detailFetch": false
  },
  "autoPublish": false
}
```

### A3. Danish Refugee Council (DRC) — VERIFIED_STATIC_HTML (officialHtml) ⭐

- **Official careers URL:** https://drc.ngo/en/jobs/ (⚠️ legacy https://drc.dk/ → **522** origin down;
  the earlier session's "unreachable" verdict applies to drc.dk only — drc.ngo is the live host)
- **Platform:** custom server-rendered list (`article.jobList__item` with `data-category` /
  `data-region`), detail at `/jobs/job?id=<n>`
- **Evidence:** `GET https://drc.ngo/en/jobs/` → **200**, 86,505 bytes; 63 cards, each with
  `.jobList__item__title`, `.jobList__item__published`, `.jobList__item__deadline` (e.g. "31 Dec 2026"),
  `.jobList__item__country`, link `a.casper` → `/jobs/job?id=175050`.
- **AF relevance:** global list incl. Afghanistan country office postings (rows carry country text).
- **Schedule:** P1, 30 min.

```json
{
  "name": "Danish Refugee Council",
  "type": "job",
  "scraperKey": "officialHtml",
  "baseUrl": "https://drc.ngo",
  "sourceRole": "official_careers",
  "priority": 70,
  "trustScore": 90,
  "scheduleMinutes": 30,
  "defaultCategory": "jobs",
  "config": {
    "listUrl": "https://drc.ngo/en/jobs/",
    "detailFetch": true,
    "selectors": {
      "card": "article.jobList__item",
      "title": ".jobList__item__title",
      "url": "a.casper",
      "location": ".jobList__item__country",
      "deadline": ".jobList__item__deadline"
    }
  },
  "autoPublish": false
}
```

### A4. Türkiye Bursları — VERIFIED_STATIC_HTML (officialHtml)

- **Official URL:** https://www.turkiyeburslari.gov.tr/ (announcements are homepage cards;
  there is NO `/announcements` list page — `GET /announcements` → **404** via `/Error?statusCode=404`;
  `GET /rss` → **404**; `GET /sitemap.xml` → **404**)
- **Platform:** custom ASP.NET (TBBS; assets on tbbsweb.azureedge.net)
- **Evidence:** `GET https://www.turkiyeburslari.gov.tr/` → **200**, 88,552 bytes; announcement cards
  `div.post-item` → `h2 a` (title) + `p.mb-0 a` (summary) + `href="/announcements/<slug>-<id>"`.
  Verified live cards include the 2026 application window and the YTB–IsDB joint scholarship.
- **AF relevance:** Türkiye Scholarships is one of the largest AF-student destinations; annual window
  (typically Jan–Feb) plus rolling joint-programme announcements.
- **Schedule:** P1-scholarship, 60 min.

```json
{
  "name": "Turkiye Burslari",
  "type": "scholarship",
  "scraperKey": "officialHtml",
  "baseUrl": "https://www.turkiyeburslari.gov.tr",
  "sourceRole": "official_careers",
  "priority": 70,
  "trustScore": 90,
  "scheduleMinutes": 60,
  "defaultCategory": "scholarships",
  "config": {
    "listUrl": "https://www.turkiyeburslari.gov.tr/",
    "detailFetch": true,
    "selectors": {
      "card": "div.post-item",
      "title": "h2 a",
      "url": "h2 a",
      "description": "p.mb-0 a"
    }
  },
  "autoPublish": false
}
```

### A5. Stipendium Hungaricum — VERIFIED_LIVE (wpApi)

- **Official URL:** https://stipendiumhungaricum.hu/
- **Platform:** WordPress (confirmed `wp-json`)
- **Evidence:** `GET /wp-json/wp/v2/posts?per_page=3` → **200**, `application/json`, 17,548 bytes
  (real posts, latest modified 2026-09-07); `GET /feed/` → **200**, `application/rss+xml`, 14,736 bytes.
- **AF relevance:** SH is a major AF scholarship corridor (Hungarian govt programme; AF is a partner
  country). Posts carry application-window announcements with deadlines in body.
- **Schedule:** P1-scholarship, 60 min.

```json
{
  "name": "Stipendium Hungaricum",
  "type": "scholarship",
  "scraperKey": "wpApi",
  "baseUrl": "https://stipendiumhungaricum.hu",
  "sourceRole": "official_feed",
  "priority": 70,
  "trustScore": 95,
  "scheduleMinutes": 60,
  "defaultCategory": "scholarships",
  "config": {
    "apiBase": "https://stipendiumhungaricum.hu/wp-json/wp/v2/posts",
    "perPage": 20,
    "maxPages": 2,
    "defaultDeadlineDays": 90,
    "autoDetectType": true
  },
  "autoPublish": false
}
```

### A6. Erasmus+ (European Commission) — VERIFIED_LIVE (rssNews, review queue)

- **Official URL:** https://erasmus-plus.ec.europa.eu/
- **Platform:** Drupal (EC "Europa" DrupalWxt) with a first-class RSS
- **Evidence:** `GET https://erasmus-plus.ec.europa.eu/rss.xml` → **200**, `application/rss+xml`,
  178,612 bytes, RSS 2.0 (`item` elements → works with the current `rssNews` pipeline as-is).
  `GET /sitemap.xml` → **404**; `GET /api/opportunities?size=3` → **404** (no public listing API).
- **Content caveat (honest):** the feed is programme *news* (verified titles: "Ukraine: EU agrees fifth
  package…", "European Student Card Initiative at EAIE 2026…"), **not** a per-scholarship deadline
  feed. Keep `relevanceFilter: true` and treat as review-queue material; per-deadline EM data would
  need the (JS) opportunities catalogue.
- **Schedule:** secondary, 240 min.

```json
{
  "name": "Erasmus+ News",
  "type": "news",
  "scraperKey": "rssNews",
  "baseUrl": "https://erasmus-plus.ec.europa.eu",
  "sourceRole": "official_feed",
  "priority": 70,
  "trustScore": 95,
  "scheduleMinutes": 240,
  "defaultCategory": null,
  "config": {
    "rssUrl": "https://erasmus-plus.ec.europa.eu/rss.xml",
    "maxItems": 30,
    "categoryName": "Scholarship News",
    "relevanceFilter": true
  },
  "autoPublish": false
}
```

---

## B. VERIFIED LIVE endpoint — NEEDS-NEW-ADAPTER (or small patch)

Endpoint returns real data today; blocked only by a missing adapter. The `workday` / `oracleHcm` /
`successfactors` rows are drop-in seeds the moment the parallel adapter lands.

### B1. WFP — VERIFIED_LIVE CXS JSON (workday, pending)

- **Official careers URL:** https://www.wfp.org/careers → `https://wd3.myworkdaysite.com/recruiting/wfp/job_openings`
- **Platform:** Workday (tenant `wfp` on wd3)
- **Evidence:** `POST https://wd3.myworkdaysite.com/wday/cxs/wfp/job_openings/jobs`
  body `{"appliedFacets":{},"limit":5,"offset":0,"searchText":""}` → **200**, `application/json`,
  19,992 bytes: `{"total":100,"jobPostings":[{"title":…,"externalPath":"/job/…_JR121484",
  "locationsText":"10 Locations","postedOn":"Posted 24 Days Ago","bulletFields":["JR121484"]}, …]}`
  (earlier session's "SuccessFactors-family" label is **wrong** — it is Workday, same as IRC below.)
- **AF relevance:** global; WFP Afghanistan posts appear in the same board.
- **Schedule (when live):** P1, 30 min.

```json
{
  "name": "WFP Careers",
  "type": "job",
  "scraperKey": "workday",
  "baseUrl": "https://wd3.myworkdaysite.com/recruiting/wfp/job_openings",
  "sourceRole": "official_api",
  "priority": 70,
  "trustScore": 95,
  "scheduleMinutes": 30,
  "defaultCategory": "jobs",
  "config": {
    "tenant": "wfp",
    "site": "job_openings",
    "cxsUrl": "https://wd3.myworkdaysite.com/wday/cxs/wfp/job_openings/jobs",
    "limit": 20
  },
  "autoPublish": false
}
```

### B2. IRC (International Rescue Committee) — VERIFIED_LIVE CXS JSON (workday, pending)

- **Official careers URL:** https://careers.rescue.org/ → `https://theirc.wd1.myworkdayjobs.com/en-US/External_Careers`
- **Platform:** Workday (tenant `theirc` on wd1, site `External_Careers` — note: site name is
  `External_Careers`, NOT `IRC_Jobs`; wrong names return Workday's invalid-URL redirect)
- **Evidence:** `POST https://theirc.wd1.myworkdayjobs.com/wday/cxs/theirc/External_Careers/jobs`
  body `{"appliedFacets":{},"limit":5,"offset":0,"searchText":""}` → **200**, `application/json`,
  14,690 bytes: `{"total":343,"jobPostings":[…]}` with deadline dates visible in `bulletFields`
  (e.g. `"JR00005349","2026-10-12"`).
- **AF relevance:** IRC Afghanistan is one of its largest country programs; global board covers it.
- **Schedule (when live):** P1, 30 min.

```json
{
  "name": "International Rescue Committee",
  "type": "job",
  "scraperKey": "workday",
  "baseUrl": "https://theirc.wd1.myworkdayjobs.com/en-US/External_Careers",
  "sourceRole": "official_api",
  "priority": 70,
  "trustScore": 95,
  "scheduleMinutes": 30,
  "defaultCategory": "jobs",
  "config": {
    "tenant": "theirc",
    "site": "External_Careers",
    "cxsUrl": "https://theirc.wd1.myworkdayjobs.com/wday/cxs/theirc/External_Careers/jobs",
    "limit": 20
  },
  "autoPublish": false
}
```

### B3. IOM (UN Migration) — NEEDS_ADAPTER (oracleHcm, pending)

- **Official careers URL:** https://www.iom.int/careers (main site → **403 Akamai**, edge
  `errors.edgesuite.net`) → portal `https://fa-evlj-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs`
- **Platform:** Oracle Fusion HCM (CXS)
- **Evidence:** host reachable; `POST …/hcmUI/CandidateExperience/en/sites/CX_1/requisitions`
  `{"limit":5,"offset":0,"searchText":""}` → **500** (endpoint exists; wrong site-number/params —
  site id must be confirmed from the JS shell; 200-level CXS listing is the oracleHcm adapter's job).
- **AF relevance:** IOM Afghanistan posts a steady stream of national positions (global board).
- **Schedule (when live):** P1, 30 min.

```json
{
  "name": "IOM Careers",
  "type": "job",
  "scraperKey": "oracleHcm",
  "baseUrl": "https://fa-evlj-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs",
  "sourceRole": "official_api",
  "priority": 70,
  "trustScore": 95,
  "scheduleMinutes": 30,
  "defaultCategory": "jobs",
  "config": {
    "host": "fa-evlj-saasfaprod1.fa.ocs.oraclecloud.com",
    "site": "CX_1",
    "requisitionsPath": "/hcmUI/CandidateExperience/en/sites/CX_1/requisitions"
  },
  "autoPublish": false
}
```

### B4. UNHCR — NEEDS_ADAPTER (successfactors, pending)

- **Official careers URL:** https://www.unhcr.org/careers (**403 Cloudflare challenge** for plain
  HTTP — 182 KB interstitial) → portal `https://career5.successfactors.eu/career?company=C0000168410P`
- **Platform:** SAP SuccessFactors (company code `C0000168410P`; listing data loads via XHR —
  `GET /career?company=C0000168410P&career_ns=job_listing` → **200** 3,479-byte JS shell)
- **AF relevance:** UNHCR Afghanistan is a top employer for AF nationals; portal is global.
- **Schedule (when live):** P1, 30 min.

```json
{
  "name": "UNHCR Careers",
  "type": "job",
  "scraperKey": "successfactors",
  "baseUrl": "https://career5.successfactors.eu/career?company=C0000168410P",
  "sourceRole": "official_api",
  "priority": 70,
  "trustScore": 95,
  "scheduleMinutes": 30,
  "defaultCategory": "jobs",
  "config": {
    "company": "C0000168410P",
    "host": "career5.successfactors.eu"
  },
  "autoPublish": false
}
```

### B5. WHO — NEEDS_ADAPTER (taleo — no adapter exists yet)

- **Official careers URL:** https://careers.who.int (portal brand: "Stellis", Oracle Taleo-based)
- **Evidence:** `GET https://careers.who.int/careersection/ex/jobsearch.ftl` → **200**, 49,317 bytes
  (Taleo faceted-search shell, `careersection/2026PRD…` asset base — listing needs JS/REST).
  `GET /careersection/ex/jobsearch.rss` → **404**; root serves a SAML redirect (`/smartorg/…`).
- **AF relevance:** WHO Afghanistan (EMRO/AFG office) posts regularly on the global board.
- **Schedule (when live):** secondary, 60 min.

```json
{
  "name": "WHO Careers",
  "type": "job",
  "scraperKey": "taleo",
  "baseUrl": "https://careers.who.int/careersection/ex/jobsearch.ftl",
  "sourceRole": "official_api",
  "priority": 70,
  "trustScore": 95,
  "scheduleMinutes": 60,
  "defaultCategory": "jobs",
  "config": { "host": "careers.who.int", "careerSection": "ex" },
  "autoPublish": false
}
```

### B6. CARE (CARE USA board) — NEEDS_ADAPTER (taleo)

- **Official careers URL:** https://www.care.org/careers/ (200, WordPress, 386,988 bytes) →
  `https://phg.tbe.taleo.net/phg02/ats/careers/v2/jobSearch?act=redirectCwsV2&cws=61&org=CAREUSA`
- **Platform:** Oracle Taleo v2
- **Evidence:** `GET …/v2/jobSearch?cws=61&org=CAREUSA` → **200**, 127,779 bytes (Taleo v2 shell;
  results require JS). CARE confederation members post separately; CARE Afghanistan typically posts
  via member sites — value is partial (US + some international roles).
- **Schedule (when live):** secondary, 60 min.

```json
{
  "name": "CARE Careers",
  "type": "job",
  "scraperKey": "taleo",
  "baseUrl": "https://phg.tbe.taleo.net/phg02/ats/careers/v2/jobSearch?cws=61&org=CAREUSA",
  "sourceRole": "official_api",
  "priority": 60,
  "trustScore": 90,
  "scheduleMinutes": 60,
  "defaultCategory": "jobs",
  "config": { "org": "CAREUSA", "cws": "61", "taleoV2": true },
  "autoPublish": false
}
```

### B7. GKS / Study in Korea — NEEDS_ADAPTER-MINOR (server HTML, JS item links)

- **Official URL:** https://www.studyinkorea.go.kr/ (200, 129,761 bytes); scholarship notice board
  `GET /ko/notice/scholarshipsList.do?boardSort=3` → **200**, 56,056 bytes (10 `board-text-item` rows
  server-rendered, titles + dates visible).
- **Why not officialHtml today:** each row is `<a href="javascript:void(0)" onclick="noticeRead('4528','BBSMSTR_000000000461')">`
  — no real hrefs, so `officialHtml` (which requires an http(s) URL) cannot extract items. A ~20-line
  adapter (build `/ko/community/noticeView.do?nttNo=<id>&boardSort=3`-style URLs, pattern to confirm
  once) unlocks it.
- **AF relevance:** GKS is a large AF-applicant scholarship; the board carries the annual GKS-G/K
  application notices with deadlines.
- **Schedule (when live):** long-tail, 720 min.

```json
{
  "name": "GKS Study in Korea",
  "type": "scholarship",
  "scraperKey": "koreaNoticeBoard",
  "baseUrl": "https://www.studyinkorea.go.kr",
  "sourceRole": "official_government",
  "priority": 50,
  "trustScore": 90,
  "scheduleMinutes": 720,
  "defaultCategory": "scholarships",
  "config": {
    "listUrl": "https://www.studyinkorea.go.kr/ko/notice/scholarshipsList.do?boardSort=3",
    "itemSelector": "a.board-text-item",
    "onclickPattern": "noticeRead\\('(?<nttNo>\\d+)',\\s*'(?<board>BBSMSTR_\\d+)'\\)"
  },
  "autoPublish": false
}
```

### B8. GOV.UK news/policy feeds — VERIFIED_LIVE Atom, NEEDS small rssNews patch (5 feeds)

All five return **200**, `application/atom+xml`, **Atom `<entry>` elements**. Verified today:

| Feed | URL | Bytes | Note |
|---|---|---|---|
| GOV.UK activity | https://www.gov.uk/government/feed | 14,424 | all announcements |
| UK Visas & Immigration | https://www.gov.uk/government/organisations/uk-visas-and-immigration.atom | 12,093 | **visa policy core** |
| Home Office | https://www.gov.uk/government/organisations/home-office.atom | 13,491 | immigration policy |
| FCDO | https://www.gov.uk/government/organisations/foreign-commonwealth-development-office.atom | 11,825 | AF aid/visa statements |
| Afghanistan travel advice | https://www.gov.uk/foreign-travel-advice/afghanistan.atom | 1,195 | **AF-specific** advice updates |

**Adapter gap (honest):** `parseRss` in `src/lib/import/news-import.ts` selects `$('item')` only —
Atom `<entry>` items are dropped. One-line-class fix: `$('item, entry')` + map
`published|updated` → pubDate (the parser already tolerates `atom:link[href]`). Until that patch,
these rows will import zero items. `GET /government/topics/visas-and-immigration.atom` → **404**
(topic feeds don't exist in that shape); `/government/organisations/home-office/news.atom` → **406**.

**AF relevance:** the AF travel-advice and UKVI feeds are direct visa-watch inputs for Afghans
(UK resettlement/visa changes flow through these). **Schedule:** UKVI P0 15 min; Home Office /
FCDO / central 30 min; AF travel advice 60 min. All review-queue (autoPublish false).

```json
[
  {
    "name": "GOV.UK Visas and Immigration",
    "type": "news",
    "scraperKey": "rssNews",
    "baseUrl": "https://www.gov.uk",
    "sourceRole": "official_government",
    "priority": 80,
    "trustScore": 90,
    "scheduleMinutes": 15,
    "defaultCategory": null,
    "config": {
      "rssUrl": "https://www.gov.uk/government/organisations/uk-visas-and-immigration.atom",
      "maxItems": 30,
      "categoryName": "Visa & Policy Watch",
      "relevanceFilter": true
    },
    "autoPublish": false
  },
  {
    "name": "GOV.UK Home Office",
    "type": "news",
    "scraperKey": "rssNews",
    "baseUrl": "https://www.gov.uk",
    "sourceRole": "official_government",
    "priority": 80,
    "trustScore": 90,
    "scheduleMinutes": 30,
    "defaultCategory": null,
    "config": {
      "rssUrl": "https://www.gov.uk/government/organisations/home-office.atom",
      "maxItems": 30,
      "categoryName": "Visa & Policy Watch",
      "relevanceFilter": true
    },
    "autoPublish": false
  },
  {
    "name": "GOV.UK FCDO",
    "type": "news",
    "scraperKey": "rssNews",
    "baseUrl": "https://www.gov.uk",
    "sourceRole": "official_government",
    "priority": 80,
    "trustScore": 90,
    "scheduleMinutes": 30,
    "defaultCategory": null,
    "config": {
      "rssUrl": "https://www.gov.uk/government/organisations/foreign-commonwealth-development-office.atom",
      "maxItems": 30,
      "categoryName": "Visa & Policy Watch",
      "relevanceFilter": true
    },
    "autoPublish": false
  },
  {
    "name": "GOV.UK Afghanistan Travel Advice",
    "type": "news",
    "scraperKey": "rssNews",
    "baseUrl": "https://www.gov.uk",
    "sourceRole": "official_government",
    "priority": 70,
    "trustScore": 90,
    "scheduleMinutes": 60,
    "defaultCategory": null,
    "config": {
      "rssUrl": "https://www.gov.uk/foreign-travel-advice/afghanistan.atom",
      "maxItems": 10,
      "categoryName": "Visa & Policy Watch",
      "relevanceFilter": false
    },
    "autoPublish": false
  }
]
```

(The fifth feed — `https://www.gov.uk/government/feed` — is optional; it duplicates the three
org feeds at lower signal. Seed only if volume is wanted.)

### B9. UK Parliament — written questions & statements — VERIFIED_LIVE JSON (needs news-JSON bridge)

- **APIs (verified live today, no auth):**
  - `GET https://questions-statements-api.parliament.uk/api/writtenquestions/questions?Take=3&searchTerm=Afghanistan`
    → **200** JSON, `totalResults: 3838` (sample: Lords Q HL3614 on Afghanistan)
  - `GET https://questions-statements-api.parliament.uk/api/writtenstatements/statements?Take=3&searchTerm=Afghanistan`
    → **200** JSON, `totalResults: 247` (sample: FCDO ministerial statement titled "Afghanistan")
- **Platform discovery evidence:** `/swagger/v1/swagger.json` → **200** ("Written Questions Service
  API", paths `/api/writtenquestions/questions`, `/api/writtenstatements/statements`). The old host
  `writtenquestions-api.parliament.uk` now 301s to `questions-statements-api.parliament.uk` and the
  legacy `/index/questions.json` path → **404**.
- **Adapter gap (honest):** these are JSON, and `jsonApi` feeds the **Opportunity** pipeline — there
  is currently no JSON→News path (`rssNews` is RSS/Atom only). Needs either a tiny
  `jsonNews` scraper or a `rssNews` sibling. Until then, do NOT seed (or seed disabled).
- **AF relevance:** filter `searchTerm=Afghanistan` gives a ready-made visa/policy watch stream.
- **Schedule (when bridged):** secondary, 240 min.

```json
{
  "name": "UK Parliament Afghanistan Questions",
  "type": "news",
  "scraperKey": "jsonNews",
  "baseUrl": "https://questions-statements-api.parliament.uk",
  "sourceRole": "official_government",
  "priority": 70,
  "trustScore": 90,
  "scheduleMinutes": 240,
  "defaultCategory": null,
  "config": {
    "listUrl": "https://questions-statements-api.parliament.uk/api/writtenstatements/statements",
    "query": { "Take": 20, "searchTerm": "Afghanistan" },
    "itemsPath": "results",
    "fields": { "title": "value.title", "publishedDate": "value.dateMade", "description": "value.text" },
    "categoryName": "Visa & Policy Watch"
  },
  "autoPublish": false
}
```

---

## C. VERIFIED_STATIC_HTML — low-value long-tail (optional seeds, no feed exists)

### C1. IsDB Scholarships — 200, no feed

`GET https://www.isdb.org/scholarships` → **200**, 41,990 bytes (Drupal; same CMS as Türkiye
Bursları's partner page). `GET /rss.xml` → **404**. Content = fixed programme pages (incl. IsDB–LDMC
and Muslim Communities scholarships; note Türkiye Bursları's homepage already surfaces the
YTB–IsDB joint scholarship via A4). Programme pages change ~annually → long-tail 1440.
Selectors not yet mapped (page is mostly prose sections); seed only after selector mapping.

### C2. World Bank Scholarships — 200, no feed

`GET https://www.worldbank.org/en/programs/scholarships` → **200**, 54,330 bytes (Adobe AEM/helix).
Two flagship programmes (JJ/WBGSP etc.), annual windows; no RSS/JSON. Long-tail 1440; low urgency
because windows are published far ahead and aggregators already catch them.

### C3. MEXT / Study in Japan — 200, no feed

`GET https://www.studyinjapan.go.jp/en/` → **200**; scholarships hub redirects to
`/en/planning/scholarships/` → **200** (16,861 bytes). `GET /en/rss/` → **404**. MEXT deadlines are
per-embassy (Kabul embassy announcements are the real signal, which is outside this scope).
Long-tail 1440, informational.

---

## D. BLOCKED / not usable via plain HTTP today (evidence recorded honestly)

| Source | Official URL | Observed today | Why blocked / next step |
|---|---|---|---|
| **UNICEF** | https://jobs.unicef.org/ | First request **200** (126,366 B); repeat requests → **HTTP 202** `x-amzn-waf-action: challenge` + `token.awswaf.com` JS challenge shell (AWS WAF). `/feed` → 202-challenge; `/rss` → 200 but HTML listing shell; `/sitemap.xml` → 200, 186 B pointing at `careers.pageuppeople.com` (legacy PageUp marker) | Needs the repo's `renderHtml` browser transport (same pattern as acbar/jobsaf in `browser-fetch.ts`) to clear the WAF once per run; then officialHtml selectors on `/en-us/listing/` |
| **NRC** | https://www.nrc.no/careers → `https://candidate.webcruiter.com/en-gb/Home/companyadverts?link_source_ID=0&companylock=23109900` | nrc.no → **200** (124 KB) but vacancy link targets WebCruiter; candidate host → **200** 58 KB **Knockout JS shell** (`data-bind="source:adverts"`, zero rendered adverts); `www.webcruiter.com` variants → **404**; stale `companylock` variants → **404** | WebCruiter data comes from XHR; needs browser transport or a WebCruiter-API adapter. (Earlier session's "WebCruiter" verdict confirmed, URL corrected.) |
| **UNHCR main site** | https://www.unhcr.org/* | **403 Cloudflare** (182 KB challenge, `captcha`/`challenge` markers) on every path incl. `/rss.xml`, `/media/rss.xml` | Portal itself verified in B4; main-site news feeds stay blocked for plain HTTP |
| **DAAD** | https://www.daad.de/, https://www2.daad.de/… | **403 Forbidden** "administrative rules" on both hosts (curl). WebFetch cross-check reached the scholarship database (`www2.daad.de/…/21148-scholarship-database/`) but it renders only the search UI, "150 Scholarship options" — listings are JS-loaded | BLOCKED for plain HTTP; listings JS-only → browser transport or stay covered by aggregators |
| **AKDN** | https://the.akdn.org/en/get-involved/careers | `the.akdn.org` DNS fails from this network; `www.akdn.org` 301 → **200** Next.js page (392 KB) whose payload contains **no vacancy data** ("Page Temporarily Unavailable" title in `__NEXT_DATA__`); no jobs API link found; `careers.aku.edu` DNS fail | AKDN jobs appear to be served by a separate (unavailable) subsystem; revisit later or cover via aggregators |
| **Save the Children (SCI)** | https://www.savethechildren.net/careers/apply | careers + apply → **200** (Drupal); form class `sci-oracle-jobs-search-form` names the ATS (Oracle). BUT the historic portal `jobs.savethechildren.net` → **NXDOMAIN**, `jobs.savethechildren.org.uk` → 200 = UK-only board | PARTIALLY VERIFIED: platform identified (Oracle), public global board hostname not resolvable — needs one follow-up to locate SCI's current Oracle recruiting host before a seed can be written |
| **Chevening** | https://www.chevening.org/feed/ | WebFetch: **200** RSS 2.0 — but the feed is a **stale WordPress placeholder** (single "Hello world!" item, 28 Jan 2019); curl TLS to `www.chevening.org` (Akamai edgekey) times out from this network | VERIFIED_LOW_VALUE: feed alive but unused by the site. Annual Chevening window better covered via news/aggregators; skip seeding |

**ACTED** — skipped per mandate (already live as an official source).

---

## 4. Adapter work queue (ranked)

1. **rssNews Atom patch** (`$('item, entry')` + `published/updated` mapping) — unlocks all 5 GOV.UK
   feeds immediately; smallest effort, high policy value.
2. **workday adapter (in flight)** — WFP + IRC both verified today with exact CXS payloads; two
   P1 official sources on day one.
3. **officialHtml seeds A1–A4** — zero code; UNDP/UNOPS/DRC/Türkiye Bursları can be seeded today.
4. **successfactors adapter (in flight)** — UNHCR portal verified (company `C0000168410P`).
5. **oracleHcm adapter (in flight)** — IOM host verified; CXS site-number confirmation needed
   (POST `/requisitions` on CX_1 → 500; enumerate sites from the JS shell).
6. **taleo adapter (new)** — WHO + CARE (both 200 shells verified).
7. **jsonNews bridge** — UK Parliament written questions/statements (verified JSON, AF-filterable).
8. **browser-fetch extension** — UNICEF (AWS WAF) and NRC (WebCruiter XHR); reuse the acbar/jobsaf
   `renderHtml` path.

## 5. Honesty notes / failures

- UNICEF WAF: first probe succeeded (200, 126 KB) — the WAF is rate/JS-based, not absolute; but
  reliability demands the browser path. The 202 challenge body (full text captured) is proof.
- The earlier session's "WFP = SuccessFactors-family" is corrected: WFP is **Workday** (CXS verified).
- UNOPS was not in the earlier session's list at all — its RSS feed is the single best
  zero-code official find of this session.
- Chevening's "working RSS" would be misleading without the stale-feed caveat — recorded as such.
- GKS/MEXT/IsDB/WB have no feeds; static-HTML evidence provided instead of pretending otherwise.

---

# PHASE 15 — ATS GAP ANALYSIS (completion mandate)

| ATS / platform | Public endpoint verified? | Value for ARIA HUB | Recommendation |
|---|---|---|---|
| SmartRecruiters | Partial — public API exists (api.smartrecruiters.com/v1/companies/{id}/postings) but ALL humanitarian org IDs probed returned empty shells (`totalFound: 0`) | Low today — no verified humanitarian tenants | Deferred. Re-probe when a target org is confirmed on SmartRecruiters; adapter is ~1h of work (JSON list + detail, same shape as greenhouse.ts) |
| Workable | Blocked — public API requires a bearer token; no anonymous postings endpoint | — | Blocked-with-evidence. Revisit only if a priority org appears on Workable and exposes an embedded JSON payload in their career page HTML |
| Taleo | Blocked — career pages are heavy JS bootstraps (Oracle-owned, pre-dates HCM Cloud); no stable public JSON found. WHO/CARE career front-ends are Taleo-style but their vacancies resolve to separate systems | — | Blocked-with-evidence. Revisit via the specific org's own sitemaps if a priority org lands on Taleo |
| iCIMS | Not probed in depth — no priority org identified on iCIMS | — | Deferred until a verified target org appears |
| Workday | **IMPLEMENTED (PHASE 12)** — CXS POST verified live for UNHCR (wd3/External), IRC (wd1/External_Careers, 343 jobs), Compassion (wd5/CompassionCareers); WFP confirmed Workday too (CXS verified) | HIGH — UNHCR, IRC, WFP are priority orgs | Done; seed WFP/UNHCR/IRC configs when ready (autoPublish=false) |
| Oracle HCM Cloud | **IMPLEMENTED (PHASE 13)** — REST finder verified live for IOM (ekum.fa.em2.oraclecloud.com/CX_2019, 69 jobs) | HIGH — IOM is a priority org | Done; seed IOM config when ready |
| SAP SuccessFactors | **IMPLEMENTED (PHASE 14)** — standard data=json search pattern; UNHCR portal verified 200 (company C0000168410P per research); WFP corrected to Workday | MEDIUM-HIGH — UNHCR is a priority org | Done; seed UNHCR config when ready (live re-validation of the JSON endpoint required at enablement — the direct probe from this network timed out) |
