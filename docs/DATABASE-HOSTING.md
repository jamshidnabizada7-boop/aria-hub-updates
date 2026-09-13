# ARIA HUB — Database Hosting Guide (PostgreSQL, any provider)

> Your database is **100% portable**. The schema is standard PostgreSQL (Prisma)
> and every row of data can be exported/imported with the two scripts below.
> There is **no vendor lock-in** to Neon — or to anyone.

---

## 1. The two commands that move everything

```bash
# 1) Export EVERYTHING from the current host (any postgres URL):
node scripts/db-export.mjs --url "postgresql://user:pass@OLD-HOST/db?sslmode=require"

# 2) Import into a brand-new host (creates schema + all rows, FK-safe):
node scripts/db-import.mjs --url "postgresql://user:pass@NEW-HOST/db?sslmode=require" --file download/canonical-export.json --fresh

# 3) Verify the new host is complete:
node scripts/verify-import.mjs "<NEW_HOST_URL>" download/canonical-export.json

# 4) Point the app at the new host and redeploy:
#    - Deployment env var:  DATABASE_URL = <new connection string>
#    - Local sandbox:       echo "<url>" > scripts/.dev-db-url  && bash scripts/dev-restart.sh
```

That's the whole migration. Proven in this repo: a full export (333 rows / 60 tables)
was imported into an empty database with **0 errors, 0 orphans**.

### What the scripts guarantee
| Script | What it does |
|---|---|
| `scripts/db-export.mjs` | Dumps every table (data + counts) into one portable JSON file |
| `scripts/db-import.mjs` | Creates the latest Prisma schema on the target (`prisma migrate diff`), inserts all rows in FK-dependency order, preserves IDs, idempotent (`ON CONFLICT DO NOTHING`), `--fresh` = truncate first |
| `scripts/verify-import.mjs` | Row counts vs export, orphan-FK scan across all constraints, trilingual completeness, menu tree |
| `scripts/sync-canonical.mjs` | Two-way sync between two live databases (was used to complete Neon ↔ sandbox) |

---

## 2. Where to host (PostgreSQL, cheapest-first)

> The site currently uses ~11 MB. Any free tier is enough for a long time.

| Provider | Free tier | Notes |
|---|---|---|
| **Supabase** ⭐ recommended | 500 MB DB, 2 projects | Full Postgres, dashboard, backups; connection pooler built in. Projects pause after ~7 days of **no API traffic** (your live site prevents this). |
| **Aiven Free** | 5 GB DB | Full Postgres, no functional limits; 30 days without scaling then needs a plan. |
| **Railway** | $5 one-time credit | Very easy UX; after credit ≈ $5/mo. |
| **Render Postgres** | Free expires after 30 days | OK for a 1-month test only. |
| **Fly.io Postgres** | ~$2–3/mo (no real free) | Cheap, but you manage more. |
| **DigitalOcean Managed PG** | $15/mo | Solid paid option when revenue starts. |
| **Amazon Lightsail RDS** | ~$15/mo | Same class as DO. |
| Vercel Postgres | — | ⚠ It IS Neon under the hood — same quota system. Avoid. |

**Recommendation:** Supabase free tier (supabase.com → New project → copy the
**Connection string → URI** from Project Settings → Database).

### Connection-string tips
- Prisma/migrations and one-off scripts: use the **direct** connection (Supabase: port `5432` host `db.<ref>.supabase.co`).
- Serverless app runtime (Vercel): prefer the **pooler** URL (Supabase: port `6543`, host `aws-0-<region>.pooler.supabase.com`) and add `?pgbouncer=true&connection_limit=10` if you use PgBouncer mode.
- Keep `sslmode=require` — all providers above require TLS.

---

## 3. What is database-driven (nothing important is hardcoded)

Everything you see on the site comes from the database — verified table-by-table:

- **Navigation menu** → `MenuItem` (trilingual labels, tree, order, visibility)
- **Homepage sections on/off + titles** → `Section` (17 keys, admin-toggleable)
- **Opportunities** → `Opportunity` + `OpportunityCategory` (trilingual)
- **Visa library** → `Visa`, `VisaCountry`, `VisaCategory`, `VisaDocument`, `VisaRejection`
- **Interview prep** → `InterviewCategory`, `InterviewQuestion`
- **News/blog** → `News`, `NewsCategory`
- **Success stories** → `SuccessStory`
- **Services** → `Service`, `ServiceCategory`
- **Rate card** → `PricingPackage` · **Checkout** → `PaymentMethod`
- **Social proof** → `Testimonial`, `Partner`, `Counter`, `ComparisonRow`, `WhyChooseUsFeature`
- **Company info** → `SiteSetting` (logo, name, tagline, address), `TeamMember`, `Branch`, `Department`
- **Footer** → `FooterLink`, `SocialLink` · **Languages** → `Language` (fa/ps/en)
- **Gallery** → `GalleryItem` · **FAQs** → `Faq` · **CTA banners** → `CtaBanner`

Current canonical dataset (present in BOTH the sandbox DB and the production Neon):

```
Opportunities 14 (14/14 trilingual fa+ps+en)   Menu items 25 (9 roots)
Visa countries 10 · documents 50 · categories 6 · rejections 5
Interview categories 6 · questions 24
News 13 · News categories 6 · Success stories 6
Services 9 / 8 categories · Pricing 3 · Payment methods 7
Sections 17 · FAQ 6 · Partners 8 · Team 4 · Gallery 6 · Footer links 15 · Social links 8
```

### Known hardcoded items (acceptable for now)
- `src/lib/monetization.ts` PRODUCT_CATALOG (advertise rate-card copy) — duplicate of
  PricingPackage seeds; can be moved to DB later.
- Small UI labels (i18n dictionary files) — these are *translations*, not content.

---

## 4. Re-scraping old jobs/scholarships (when you're ready)

Scraped historical listings (532 old rows) lived only in the old quota-blocked Neon.
They are **not required** — the scraper recreates them:

1. Admin → Import Sources (rows `Wazifaha Jobs`, `Scholarships.af` already seeded).
2. Run a scrape → rows land in `Opportunity` as drafts (`autoPublish=false`) → review → publish.
3. `ImportRun` records every run for auditing.

---

## 5. If you keep Neon instead

The old project hit the **data-transfer quota** (bandwidth), not storage. Options:
- Upgrade the Neon plan (usage resets on the billing cycle) → the 532 historical
  rows are still there; run `scripts/verify-migration.mjs` to pull them.
- Or leave Neon entirely with the two commands in §1 — zero lock-in either way.
