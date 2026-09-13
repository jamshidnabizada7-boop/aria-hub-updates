# ARIA HUB — Growth & Monetization Plan (2025–2026)

**Owner:** Jamshid Nabizada · **Site:** https://www.myariahub.com · **AdSense:** pub-5960471686203476
**Scope:** Research-backed growth + monetization strategy specific to Afghanistan and the Afghan diaspora. Updated: research round R6-growth.

---

## 0. Executive Summary (read this first)

1. **Your market is mobile, messaging-first, and young.** 13.2M Afghans online (30.5%), median age 17.3, and the real daily habit is WhatsApp/Telegram/Facebook — not email. Your growth engine must be **Telegram + WhatsApp Channels + Facebook**, with the website as the archive and SEO asset.
2. **Email alerts are nearly worthless inside Afghanistan** (low adoption, data costs) but remain the #1 channel for the **diaspora** — your highest-value audience for AdSense revenue.
3. **AdSense revenue from in-country traffic will be tiny** (Afghanistan CPM ≈ $0.12; realistic RPM $0.10–0.50). Treat AdSense as Phase-1 housekeeping money and pursue **diaspora traffic + direct employer postings** as the real revenue.
4. **Your competitive edge is freshness + deadlines + trilingual access.** No competitor has a trilingual deadlines hub with ICS downloads and AI summaries. Double down there; it is both a retention and an SEO moat.
5. **Deploy gap alert:** the live site still serves the pre-i18n build (`/opportunities` works, `/en/opportunities` 404s; `/deadlines` 404s; sitemap has only 1 URL). Everything below assumes the current build ships — **shipping it is Week-1 action #1.**

---

## 1. Market Reality Check

### 1.1 Afghan digital landscape (key numbers)

| Metric | Value | Source |
|---|---|---|
| Population (Jan 2025) | 43.3M, median age **17.3** | DataReportal Digital 2025: Afghanistan |
| Internet users | **13.2M (30.5%)**, +6.3% YoY | DataReportal 2025 |
| Offline population | 30.0M (69.5%) | DataReportal 2025 |
| Social media identities | **4.05M (9.4%)**; only ~15% female | DataReportal 2025 |
| Mobile connections | 22.3M (51.6% of pop); **80.9% 3G/4G/5G** | GSMA via DataReportal |
| Median mobile speed | 8.13 Mbps (fixed: 3.58 Mbps) | Ookla via DataReportal |
| Device reality | Mobile-first; many users on low-RAM Android, 2G/3G fallback in rural areas | general knowledge |
| Data cost anchor | 100GB home data ≈ 3,500 AFN (~$50)/mo after Sept-2025 shocks; cheaper mobile bundles dominate | BBC, Sep 2025 |
| Job-seeking age (18–34) | ≈ 12.8M people | derived: 29.5% of pop |

**Operational implications:**
- **Mobile-first is not optional** — already true in the build (390px checks), keep every feature <100KB JS on listing pages; images lazy; no autoplay.
- **Data is expensive → text-first channels win.** Telegram/WhatsApp text digests are nearly free for users; heavy YouTube content is not. Lightweight **video (Shorts/TikTok) works only via WiFi users** — still worth it, since WiFi-café and urban users are exactly active job-seekers.
- **Sept 2025 nationwide blackout risk is real** (Taliban cut fiber/mobile data; northern provinces offline for weeks). Design for **resilience**: messaging channels are your outage-proof distribution (SMS-like), and a status page/backup channel keeps trust. Never depend on a single channel.
- **Female audience is structurally under-served online (~15% of social users)** — a genuine gap: trilingual, low-bandwidth, mobile-only resources for women job-seekers (girls' education restrictions make scholarship/online-learning info especially valuable). Ethical mission **and** differentiator; keep photos/text respectful of local context.

### 1.2 Where Afghans actually look for jobs/scholarships today

| Channel | Who uses it | What they see |
|---|---|---|
| WhatsApp groups (family/university/NGO) | Nearly everyone with a smartphone | Forwarded job PNGs, screenshots, "send to 5 groups" chains |
| Telegram channels (e.g., Scholarship for Afghanistan, MOLSA announcement channels) | Youth, students, urban | Daily text announcements, PDF forms, MOLSA "82 posts in Kabul" style posts |
| Facebook page/groups | 4M+ users, broadest reach | NGO vacancy graphics, scholarship flyers |
| ACBAR.org | NGO/UN sector, English-literate | ~300 NGO jobs, English-only, no deadlines calendar |
| Wazifaha.org | General job-seekers | ~159 jobs, English, no freshness guarantees |
| Scholarships.af | Scholarship hunters | Scholarships + some jobs, English, cluttered UX |
| O4AF.com | Scholarship/fellowship hunters | Intl + Afghan opportunities, English |
| Jobs.af | Private-sector seekers | Modern site, client-rendered, no deadlines shown |
| Government portals (MOLSA, Ministry of Justice) | Gov job seekers | Official bost (post) announcements, Dari/Pashto |

### 1.3 Competitor analysis

| Competitor | Strengths | Weaknesses | ARIA HUB's edge |
|---|---|---|---|
| **ACBAR.org** | Trusted NGO/UN brand; deep employer network; high volume (~286 of your records originate there) | English-only; dated UX; no deadline tools; no alerts; no mobile polish | Trilingual; AI summaries; countdown + ICS deadlines; alerts; modern mobile UX |
| **Wazifaha.org** | Clean listing UX; local companies | Small inventory (~159); English-only; no deadline hub; weak SEO freshness | Bigger aggregated inventory (611+); freshness badges; deadlines hub |
| **Scholarships.af** | Scholarship niche leader; also posts jobs | Ad-cluttered; slow; no translations; scrapes same sources | Trilingual scholarship hub + AI "am I eligible?" summaries; better UX |
| **O4AF.com** | International fellowships/conferences; bilingual-ish content | International focus dilutes local jobs; less Afghan-specific filtering | Afghanistan-first filtering (location, deadline, source facets) |
| **Jobs.af** | Modern interface; private-sector jobs | Client-rendered (bad for SEO/crawlers); no deadlines; no alerts | SSR + structured data → Google Jobs visibility; deadline urgency |
| **Facebook job groups** | Massive reach; zero friction | Zero structure; scams; no search/archive; dead posts circulate for months | Verified, archived, searchable, expiring properly — "trust layer" |
| **Telegram job channels** | Direct-to-phone distribution | No web archive; no search; fake scholarships circulate | Channel + full web archive + ICS + apply-link verification |

**Positioning statement to use everywhere:**
> ARIA HUB = "همه فرصت‌ها در یک جا / ټول فرصتونه په یوه ځای کې" — every Afghan opportunity (jobs, scholarships, internships, fellowships), in your language, with the deadline never missed.

---

## 2. Traffic Acquisition Plan (ranked by ROI)

| # | Channel | Effort | Speed of results | 12-mo potential | Why ranked here |
|---|---|---|---|---|---|
| 1 | **Telegram Channel** | Low | Days | 20–50k subs | Afghanistan's de-facto news wire; free push to phones; blackout-resistant |
| 2 | **WhatsApp Channel** | Low | Weeks | 10–30k followers | Largest messenger base; Channels = broadcast without group chaos |
| 3 | **SEO + Google for Jobs** | Medium | 2–6 months | 100k+ visits/mo | Compounding; structured data already in place; competitors weak at SEO |
| 4 | **Facebook Page + Groups** | Medium | Weeks | 5–15k followers | Biggest platform; where NGOs already post |
| 5 | **Email alerts (diaspora)** | Low (built) | Weeks | 5–20k subs | Highest-RPM audience; SMTP is the only blocker |
| 6 | **University/NGO partnerships** | Medium | 1–3 months | Recurring supply + trust | Borrowed audiences; official credibility |
| 7 | **TikTok/YouTube Shorts** | High | 1–3 months | 10–50k views/clip | Viral ceiling; but production-heavy; do 2×/week not more |
| 8 | **Referral mechanics** | Low | Slow | Multiplier | Amplifies 1–4; "forward this digest" is already Afghan culture |

### 2.1 Telegram Channel (top priority)

**Setup:** `t.me/ariahub` (+ a `@ariahub_bot` later for category subscriptions: jobs / scholarships / by-province).
**Daily format (fixed template, ~8am Kabul time):**
```
📢 فرصت‌های امروز — ۱۴ اکتوبر (Today's opportunities)
🎓 بورسیه: Chevening Scholarship 2026 — مهلت: Nov 5 ⏰
💼 وظیفه: Admin Officer @ NGO, Kabul — Salary: 45,000 AFN
💼 وظیفه: Teacher Trainer, Herat — deadline 7 days
⏳ REMINDER: 3 deadlines close in 48h → myariahub.com/deadlines
🔗 Full list: myariahub.com/opportunities
```
Rules: 1–2 messages/day max; every post links back to the site (this is how Telegram becomes site traffic); always include the trilingual title; never post expired items (your freshness badge is the brand).

**Growth tactics:** cross-promo swaps with existing Afghan scholarship/job channels (5–10 exist with 10k–100k subs); drop the channel link in WhatsApp university groups (owner's own networks first); add the channel link to site header, footer, and every alert email; "Top 10 channel" Telegram directory submissions; after every approved community submission, ask the submitter to share to their group.

**First 3 actions this month:**
1. Create channel, post daily digest for 14 consecutive days (consistency beats promotion).
2. Contact 5 existing Afghan job/scholarship channels for cross-promotion ("we'll feature your channel Friday, you feature us Monday").
3. Add "Join Telegram" + "WhatsApp" buttons to site header and to the ApplyCard on every detail page.

### 2.2 WhatsApp Channel

WhatsApp Channels (broadcast) work exactly like Telegram channels; Afghans' most-used app. Same digest, slightly shorter, with link preview image.

**First 3 actions:** create the Channel and pin intro post; put the wa.me/channel link in the site footer and Telegram bio; test digest open behavior for 2 weeks (Channel views visible to admin) and adjust posting time (try 8am and 4pm Kabul).

### 2.3 SEO + Google for Jobs (the compounding asset)

Your stack is SSR with JSON-LD on detail pages — good. Requirements for the Google Jobs experience: `JobPosting` schema with `title`, `datePosted`, `validThrough` (future-dated only), `hiringOrganization` (with logo), `jobLocation` (or remote location requirements), full `description`, and pages that are crawlable, public, and never behind interaction. Scholarship pages should use `Scholarship` → mark up as `EducationalOccupationalProgram`/`ItemPage` + FAQ where sensible.

**Trilingual keyword strategy** (build landing pages per keyword cluster, not per listing):

| Cluster | English | فارسی (Dari) | پښتو (Pashto) |
|---|---|---|---|
| Jobs hub | jobs in Afghanistan, NGO jobs Kabul, UN jobs Afghanistan | وظایف خالی در کابل، استخدام افغانستان، بست خالی | د کار مواقع، په کابل کې دندې، وظایف |
| Scholarships | scholarships for Afghan students 2026, fully funded scholarships for Afghans | بورسیه تحصیلی برای افغان‌ها، بورسیه ماستری، بورسیه کامپلیت | د لوړو زده کړو بورسونه، بشپړ بورسیه |
| Internships | internships for Afghans, UN internships Afghanistan | کارآموزی در افغانستان، انترنشیپ | د کاریال فرصتونه |
| Deadlines | scholarship deadlines November 2026 Afghanistan | مهلت بورسیه‌ها، ددلاین بورسیه | د بورسیې نېټې |
| Gov jobs | MOLSA vacancies, government jobs Afghanistan | بست‌های خالی وزارت‌ها | د وزارتونو بستونه |
| How-to (content SEO) | how to write a CV for NGO jobs, UN interview questions | چگونه رزومه بنویسیم، آمادگی مصاحبه | رازومې څنګه ولیکو، د مرکې چمتوالی |

**First 3 actions this month:**
1. **Ship the new build + full sitemap** (live sitemap currently has 1 URL!) and submit it in Google Search Console; verify the www/non-www canonical (sitemap says `myariahub.com`, site serves `www.` — pick one and 301).
2. Add hreflang enforcement check + a weekly cron that regenerates the sitemap with all opportunities/category pages (en/fa/ps alternates already built).
3. Fix "expired" hygiene for Google: 317 expired records must either 410/redirect or keep validThrough past — never serve expired `JobPosting` as active; add `noindex` to truly stale pages so crawl budget goes to fresh listings.

### 2.4 Facebook

Page + join 10–15 existing Afghan job/scholarship groups (e.g., "Jobs in Afghanistan", university alumni groups, girls'-education groups). Don't spam groups — post the **daily "3 opportunities" graphic** (branded template, 1 job + 1 scholarship + 1 deadline reminder) and answer comments with links. Boost $2–5/week only if a post proves organic traction (Afghan ad CPMs are cheap, but budget is tight — organic first).

**First 3 actions:** create/renamed business Page (replace personal links in footer — already flagged in worklog); design 1 reusable Canva template (trilingual); schedule 15 posts (3/week) from your existing inventory.

### 2.5 Email alerts (built; needs SMTP) — primarily for the diaspora

The AlertSubscriber pipeline exists (double opt-in token ready, daily/weekly frequency, category filter). Finish it, then aim it at **English-language, diaspora + international-NGO audiences** (high AdSense value): UN/NGO staff abroad, Afghan-American/Canadian/EU student associations, SIV/refugee resettlement orgs.

**First 3 actions:** configure SMTP (Resend/Brezip free tier) + send the first weekly digest to existing subscribers; add the alert signup card into the digest posts ("subscribe: 1 click, no login"); outreach to 5 diaspora orgs (AACO, Afghan Future Fund, Rahela Trust, university Afghan Student Associations) for newsletter swaps.

### 2.6 Partnerships (universities, NGOs, training centers)

Offer a free "Powered by ARIA HUB" widget/link for their site; give career-office staff a curated weekly list; in exchange get: backlink (SEO), their student WhatsApp/Telegram groups (distribution), and future paid scholarship-promotion customers (Phase 2).

**First 3 actions:** list 20 targets (Kabul Univ, AUAF, Kardan, Gawharshad, Rana, Bost Univ, AGAHS, NGO career pages, Roya/1TV/TOLOnews youth segments); send a 1-paragraph trilingual partnership email; publish a "Partners" section on the site to make the program look real from day one.

### 2.7 TikTok / YouTube Shorts (2 clips/week, not more)

Formats that work for Afghan youth: (a) "3 scholarships closing this week — save this video"; (b) screen-record walkthrough "how to fill the Chevening form in 60 seconds"; (c) success-story interview with someone who got a job/scholarship. 30–45s, Dari or Pashto voiceover + Dari/Pashto burned-in captions (most viewers watch muted), vertical, <15MB.

**First 3 actions:** create the accounts + 3 starter clips using your CV-builder and deadlines-hub pages as content; end every clip with "لینک در بایو / لینک په بایو کې"; cross-post clip links inside Telegram digest on Fridays.

### 2.8 Referral mechanics (low-tech first)

Afghan sharing culture is group-forwarding — ride it. Every digest ends with: "این پیام را به ۳ گروه خود بفرستید / دا پیغام خپلو ۳ ګروپونو ته ولېږئ." Add a `?ref=telegram|facebook` param to links so growth attribution is visible in analytics. Later (Phase 2): "invite 3 friends → unlock 1 free CV review" once the CV-review service exists.

---

## 3. Daily-Habit Features (what makes users return)

| Rank | Feature | Effort | Impact | Notes |
|---|---|---|---|---|
| 1 | **Deadline countdown hub + daily "closing soon" digest** | Already ~built (deadlines hub, ICS, ≤7/30/90-day filters) | ⭐⭐⭐⭐⭐ | The single strongest return trigger: deadlines create urgency. Promote the ≤7-day view as "CLOSING THIS WEEK" page; Telegram digest mirrors it. |
| 2 | **Daily job digest (Telegram/WhatsApp/email), consistent time & format** | Low (SMTP + a 20-line digest generator from existing DB queries) | ⭐⭐⭐⭐⭐ | Habits form on fixed schedule; "ariahub 8am" becomes a checking ritual. |
| 3 | **Saved searches + instant alerts ("notify me when an NGO job in Kabul appears")** | Medium (matcher exists; wire saved-filter → AlertSubscriber) | ⭐⭐⭐⭐ | Turns one-time visitors into subscribed users; huge retention multiplier. |
| 4 | **"Job of the Day" + "Scholarship of the Week" spotlight** | Low (curate manually, mark with badge + hero slot) | ⭐⭐⭐ | Gives the homepage a reason to change daily; one shareable item per day. |
| 5 | **Streaks/gamification (light)** — "checked 7 days in a row" badge + deadline-streak | Medium | ⭐⭐⭐ | Skip heavyDuolingo-style systems; a small streak counter on saved-deadlines is enough. |
| 6 | Interview-prep content series (built) → weekly episode | Low | ⭐⭐⭐ | Each episode = SEO page + digest item + Short clip. |
| 7 | Community success stories ("Ahmed from Herat → DAAD") | Medium | ⭐⭐⭐⭐ | Most trusted growth content in Afghan context; collects via submit form. |
| 8 | Scholarship deadline calendar (ICS already live) → public "year at a glance" page | Low | ⭐⭐⭐ | Massive share asset for school counselors & university groups. |

**Build order recommendation:** ship #1+2 (mostly built — just deploy), then #3, then #4, then #7; revisit #5 only after DAU is measurable.

---

## 4. Monetization Roadmap (phased, Afghanistan-realistic)

### Phase 1 — Now (0–6 months): AdSense + light affiliate

**AdSense placement plan (policy-safe, viewability-first):**

| Page | Placement | Format | Rules |
|---|---|---|---|
| Home | After hero stats; between latest-opportunities grid sections | Responsive display 336×280 / fluid | Never above the fold on mobile before content |
| Opportunities listing | 1 ad after 4th card; 1 after pagination (above alert card) | In-feed native | Max 2 per page; label gap; no "click here" language |
| **Detail pages (main RPM page)** | 1 after AI summary block; 1 end-of-content before ApplyCard | In-article native | **Never inside/adjacent to the Apply button** — accidental clicks here = invalid-traffic risk |
| Deadlines hub | 1 after list | Display | Countdown + ad must be clearly separated |
| Blog/how-to pages | Standard in-article + 1 sidebar | Auto ads OFF (manual only) | Auto ads caused layout policy complaints historically |

**Viewability rules:** lazy-load below-fold ads; keep CLS 0 with reserved containers (`min-height`); disable on 2G-slow connections via `navigator.connection` if easy; never place ads under sticky bars or near the print button.

**Policy compliance specific to your context:**
- **Invalid clicks from low-income contexts — treat this as existential.** A burst of accidental or sympathetic clicks ("click to support") from Afghan users can disable the account. Mitigations: no messages encouraging clicks anywhere (a "support us by clicking ads" post = ban), ads physically separated from action buttons, monitor CTR: **healthy listing-site CTR ≈ 0.5–1.5%; if you see >3% days, audit placement.** Suspensions run ~30 days; repeated = permanent.
- **"Ads under false pretenses":** never style ads like listing cards (no same-card borders/shadows), no "Sponsored" jobs mixed into organic feed without explicit label.
- **Language check:** AdSense's supported-language list includes Persian/Farsi but **Pashto support is not guaranteed — verify in the Policy Center.** If unsupported, run ads on EN/FA pages and keep PS pages ad-light.
- Content-originality framing (see §5): scraped listings + AI summaries + translations = transformative aggregation, but keep your summary as the dominant above-the-fold content, link to source, and never republish full third-party text verbatim.

**Affiliate opportunities (Afghan-relevant):**
- **CV-writing / LinkedIn services** (diaspora freelancers on Fiverr/Upwork) — negotiate 20–30% referral.
- **Online learning platforms** with affiliate programs: Coursera, Udemy (English-learning + tech skills are the #1 self-paid category for Afghan youth).
- **English-test prep** (Magoosh, E2 Language) — IELTS/TOEFL/Duolingo-test prep converts extremely well for scholarship applicants.
- Remittance-adjacent later (hawala/digital wallet referrals) — **careful**: financial-regulation sensitivity; Phase 3 topic.

### Phase 2 — At >50k monthly visits: direct employer revenue

| Product | Price (benchmark-reasoned) | Notes |
|---|---|---|
| Standard job posting (30 days) | **$25 (≈1,800 AFN)** local companies; **$50** international NGOs | ACBAR publishes no public rate card (jobs appear free-for-members; its revenue is membership/events), so you're competing on price + distribution. Indeed sponsored ≈ $5/click; small regional boards typically $25–100/post. |
| Featured/pinned listing (7 days top-of-feed + Telegram spotlight) | +$25 | Your Telegram digest *is* the premium inventory. |
| Scholarship/uni promotion package | $100–300/mo | targeting universities, IELTS centers, online academies |
| WhatsApp/Telegram sponsored slot (1/day max) | $30/slot | Hard cap 1/day to protect trust — this is your currency |
| Community submission promotion (approve + pin) | $15 | UGC channel already built |
| **CV review by ARIA HUB** | $10–15/review (~700–1,000 AFN) | Use CV-builder + human 15-min review; diaspora pays $25 |
| Bundle: "Hiring pack" 3 posts + 2 Telegram features | $99 | Anchor for NGO procurement officers |

Collections reality: international NGOs/UN contractors can pay by bank/wise/PayPal-Alternatives (Payoneer); local companies pay cash/hawala — **price in AFN for locals, USD for internationals.** This is also why the **diaspora audience (5.8M Afghan migrants worldwide) is strategically your most valuable**: they pay online, click high-CPM ads, and buy CV services.

### Phase 3 — 12+ months: B2B & services

1. **Recruitment services** — screening + shortlisting for NGOs ($200–500/hire); you have the audience, they have the budget.
2. **Data reports** — "Afghan salary benchmarks", "top hiring sectors quarterly" sold to NGOs/UN (they currently have nothing).
3. **HR SaaS-lite** — applicant tracking for Afghan SMEs (even a simple inbox+pipeline), $15–30/mo.
4. **Institutional partnerships** — listings contracts with UN agencies/INGOs (they pay for reach guarantees: "your vacancy in our 50k-subscriber Telegram by 9am daily"), USAID-funded implementer job boards, World Bank/IOM youth-employment programs.
5. **Premium subscriber tier** ($2–3/mo via AfPay/eMoney/hesabPay wallets): instant alerts, CV templates, match scores, early deadline reminders. Low price for local purchasing power; diaspora pays $5.

### 4.1 Revenue projections (assumptions stated)

**Assumptions:** blended AdSense RPM: in-country $0.15–0.50, diaspora $2–6 (educational niche helps); session ~2 pages; employer postings scale with traffic & outbound sales effort; Telegram reaches 10k (mo 6) → 40k (mo 12). Exchange ≈ 70 AFN/USD.

| Month | Visits (pes / exp / opt) | AdSense (pes / exp / opt) | Postings+featured (pes / exp / opt) | Other (CV reviews, sponsored slots, affiliates) | **Total monthly (pes / exp / opt)** |
|---|---|---|---|---|---|
| **3** | 8k / 20k / 35k | $2 / $8 / $25 | $0 / $50 (2 posts) / $150 | $0 / $0 / $30 | **$2 / $58 / $205** |
| **6** | 25k / 60k / 90k | $6 / $45 / $180 | $50 / $250 (6–8 posts) / $500 | $20 / $80 / $250 | **$76 / $375 / $930** |
| **12** | 60k / 150k / 300k | $25 / $180 / $700 | $150 / $900 (15–20 posts) / $2,200 | $50 / $400 (CV reviews+slots+affiliates) / $1,200 | **$225 / $1,480 / $4,100** |

Reality check: pessimistic column assumes in-country-only traffic at Afghan CPMs — real but tiny. The gap between pessimistic and expected is almost entirely **diaspora traffic share + outbound employer sales**; those two levers are where the owner's time goes. AdSense alone will not exceed a few hundred $/mo at 150k visits unless diaspora share rises above ~30%.

---

## 5. AdSense Approval Checklist (pub-5960471686203476)

**Already done ✅**
- [x] `ads.txt` live with `google.com, pub-5960471686203476, DIRECT, f08c47fec0942fa0`
- [x] Privacy policy page live (`/privacy-policy` → 200)
- [x] About + Contact pages live (→ 200)
- [x] Original value-add: AI summaries, trilingual translations, deadline curation, category facets — transformative, not mirrored pages
- [x] Mobile UX, RTL support, fast SSR, clean navigation
- [x] `robots.txt` + sitemap URL declared

**Still needed / verify before (re)applying**
1. [ ] **Deploy current build** — live site is behind the sandbox (no `/en/fa/ps` routes, no deadlines hub); review the deployed version, not the local one.
2. [ ] **Full sitemap** (currently 1 URL!) + Search Console property verified + sitemap submitted (`https://www.myariahub.com/sitemap.xml`); fix www canonical.
3. [ ] Terms of Use page (job boards get scraped-content complaints; ToU is a cheap trust signal).
4. [ ] Cookie consent banner (EU/UK visitors = your diaspora traffic; required for personalized ads; you already have a banner — verify it blocks ads pre-consent in EU).
5. [ ] 10–15 "indexable thought" pages beyond listings: CV guide, interview questions, "how to get NGO jobs in Afghanistan", scholarship-essay guide (this is the classic fix for "low value content" rejections on aggregators).
6. [ ] Confirm no ads on: expired-empty pages, search-results-with-no-results, submit form, admin pages (`Disallow: /api/` already set).
7. [ ] About page: real names/faces/photo, owner identity, Kabul address area — E-E-A-T for YMYL-adjacent content.
8. [ ] Contact: working form + email you answer within 48h (Google sometimes emails before approving).

**Typical rejection reasons → mitigations**

| Rejection | Why it hits aggregators | Mitigation |
|---|---|---|
| "Low value content" | Listings duplicated from sources | Lead with AI summary; make description structured/edited; unique filters/deadline data; add the 10–15 guide pages |
| "Copied content" | Verbatim scraping | Rewrite via pipeline (already doing), cite + link source, no full-text republication |
| "Site down / unavailable" | Reviewer hit a cold Vercel/Neon page | Uptime monitor (UptimeRobot free), error pages with content |
| "Navigation issues" | Broken links (`/services` was 500 previously) | Crawl site with Screaming Frog free tier before applying |
| "Unsupported language" | Pashto not on AdSense's list | Verify Policy Center; if unsupported, keep PS ad-free |
| "Policy violation: ads placement" | Later stage | Manual placements only; no auto-ads near Apply |

---

## 6. 90-Day Execution Plan

| Weeks | Owner actions | Monetization milestones | KPIs (measurable) |
|---|---|---|---|
| **1–2** | Deploy new build (i18n routes + deadlines hub); fix sitemap + Search Console + www canonical; create Telegram & WhatsApp Channels; post daily digest ×14; replace personal social links with business accounts; add channel buttons to site | AdSense: apply (or reapply) once new build is live + 10 guide pages drafted | Deploy done; sitemap >200 URLs; Telegram ≥150 subs; digest streak 14/14; GSC impressions baseline |
| **3–4** | SMTP live → first email digest; publish 5 SEO guide pages (CV/interview/how-to); design daily-post template; first Facebook graphic posts ×3/week; outreach to 5 channels for cross-promo; fix expired-listing hygiene (317 → noindex/410) | AdSense approved + first placements (listing + detail, manual only); affiliate links on 2 guide pages (CV prep) | Email subs ≥100; Telegram ≥400; FB ≥300; GSC clicks >0 on 20 queries; AdSense live with CTR 0.5–1.5% |
| **5–8** | Saved-search alerts wired to subscribers; "Job of the Day" badge live; launch partnerships: 10 universities/NGOs (widget + backlink); 2 Shorts/week; community success story #1 published; jobs.af headless scraper decision | First **paid** posting ($25 local company — ask 10 employers personally); CV-review service page + 5 beta reviews ($10) | Visits ≥15k/mo; Telegram ≥1.5k; email ≥500; alerts ≥200; revenue ≥$60/mo; partner backlinks ≥5 |
| **9–12** | Double down on best channel (data decides); publish trilingual landing pages for top 6 keyword clusters; scholarship year-calendar share page; start scholarship-promo outreach (2 IELTS centers, 1 online academy); monthly data snapshot "Afghan hiring trends" | Employer pitch deck + rate card live; 4–8 postings/mo; first $100 scholarship-promo or sponsored slot; premium-tier waitlist form | Visits ≥30k/mo; Telegram ≥3k; revenue ≥$150/mo; returning visitors ≥25%; ≥3 paying employers |

**North-star KPI:** daily active digest readers (Telegram+WhatsApp opens) — it predicts everything else.
**Weekly 30-min ritual:** check GSC queries → publish 1 page answering the top real query → post 1 success metric publicly (builds trust).

---

## 7. Risks & Resilience

| Risk | Likelihood | Mitigation |
|---|---|---|
| Internet blackouts/restrictions (Sept 2025 precedent) | Medium-High | Messaging-first distribution; low-bandwidth site; status communication via SMS-adjacent channels |
| AdSense invalid-traffic ban | Medium | Placement discipline, CTR monitoring, no click-appeals, never mix ads into cards |
| Scraper blocking (Scholarships.af precedent) | Medium | Diversify sources (community submissions, RSS, jobs.af headless), respect crawl delays |
| Payment rails for Phase 2 (no PayPal in AF) | High | Payoneer/Wise for internationals; AfPay/hesabPay/local bank for AFN; price lists in both currencies |
| Single-person dependency | High | Automate digests, document the daily 30-min routine, recruit 1 volunteer moderator from university partnerships |

---

## 8. Appendix A — Weekly Content Calendar (sustain with ~5 hrs/week)

| Day | Telegram/WhatsApp Channel | Facebook | Site/SEO | Short video (2×/wk) |
|---|---|---|---|---|
| Sat | Daily digest (8am) | — | — | — |
| Sun | Daily digest | 3-opportunities graphic | 1 guide page (draft) | Clip A publish |
| Mon | Daily digest + closing-48h reminder | Answer group comments | — | — |
| Tue | Daily digest | — | Publish guide page | — |
| Wed | Daily digest | Job-of-the-Week post | — | Clip B publish |
| Thu | Daily digest + ICS calendar tip | — | GSC query check → keyword note | — |
| Fri | **Weekly roundup** (top 10 + success story) | Roundup + group shares | Sitemap/crawl check | — |

Batch it: write all 7 digests in 1 hour Sunday night (the digest generator script makes this copy-paste), schedule via Telegram's native scheduler.

## 9. Appendix B — Free/Low-Cost Tool Stack for a Solo Owner in Afghanistan

| Job | Tool | Cost |
|---|---|---|
| Analytics | Vercel Analytics (already installed) + Google Analytics 4 | Free |
| Search Console + sitemap | GSC (verify property, submit sitemap) | Free |
| Email sending | Resend / Brevo free tier (3k–10k emails/mo) | Free |
| Scheduling posts | Telegram native scheduler; Meta Business Suite | Free |
| Graphics | Canva free (1 trilingual template reused) | Free |
| Uptime | UptimeRobot (protects AdSense "site down" risk) | Free |
| Push notifications (later) | Webpushr / OneSignal free tier (45–90% open rates) | Free |
| Payments | Payoneer/Wise (intl) · AfPay/hesabPay/bank (AFN) | Per-tx fees |
| backlink/partner CRM | A Google Sheet (20 target orgs, status column) | Free |

**One rule:** never let tool setup displace the daily digest — the digest is the business.

---

## 10. Sources Consulted (research round R6)

- DataReportal — *Digital 2025: Afghanistan* (internet 13.2M/30.5%; social 4.05M; mobile 22.3M/51.6%; median age 17.3; speeds; demographics)
- BBC / DW / Forbes / UN Women (Sept–Oct 2025) — Afghan internet blackout, 100GB ≈ 3,500 AFN, women's access impact
- WorldPopulationReview CPM table — Afghanistan AdSense CPM ≈ $0.12; tsz/thesrzone YouTube CPM lists (AF $0.42 vs US $11.95)
- Google — JobPosting structured-data docs; AdSense program policies & eligibility; invalid-traffic suspension threads (30-day pattern)
- MoEngage/Sleeknote push stats — web push open 45–90% vs email 15–30%; CTR ~12%
- Migration Data Portal — 5.8M Afghan migrants/diaspora; AACO/Afghan Future Fund/Rahela Trust (diaspora org landscape)
- Live-site probes (myariahub.com): ads.txt ✅, sitemap = 1 URL ⚠️, `/en/*` routes 404 (deploy gap), about/contact/privacy 200, `/deadlines` 404
- ACBAR/Wazifaha/O4AF/Scholarships.af/Jobs.af direct observation; no public ACBAR rate card found (pricing set by market benchmarks instead)
