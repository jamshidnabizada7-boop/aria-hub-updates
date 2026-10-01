# Day 11 — "ARIA HUB Opportunity Feed for Partners" — specification

Status: **spec complete + MVP shipped in this working tree** (deploy on push).

## Goal

Partners (education orgs, youth communities, campus groups) display live ARIA
HUB opportunities on their own properties for free. Every impression carries
measurable UTM attribution back to the partner. This is Engine 2 (partner
distribution) + Engine 7 (product-led sharing) from the roadmap.

## Surfaces

| Surface | For whom | Status |
|---|---|---|
| RSS 2.0 — `/rss.xml` | Anyone; 50 newest opportunities | **Already live in production** |
| JSON — `/api/partners/feed` | Developers | **Shipped (this tree)** |
| No-code embed — `https://www.myariahub.com/embed/opportunities-widget.js` | Non-technical partners (one `<script>` tag) | **Shipped (this tree)** |
| Co-branded landing page — `myariahub.com/partner/[name]` | Trackable partner channel | Roadmap Week 5 (v2) — not in this pass |
| Weekly email/WhatsApp export | Partners without a website | Manual for now — send 3–5 vetted links weekly from the feed |

## JSON endpoint contract

`GET https://www.myariahub.com/api/partners/feed`

| Param | Values | Default |
|---|---|---|
| `limit` | 1–50 | 10 |
| `category` | category slug | all |
| `country` | canonical country | all |
| `province` | canonical province (e.g. `Kabul`) | all |
| `deadlineDays` | 7 / 30 / 90 | — |
| `partner` | partner id `[a-zA-Z0-9_-]`, becomes `utm_source` | `partner_feed` |
| `lang` | `en` / `fa` / `ps` | `en` |

Response: `{ feed, generatedAt, attribution: {text, url}, items: [{title, url, organization, category, location, deadline, summary}] }`.

- Only **active** opportunities are included (published and not past deadline) — the same policy as the site listings.
- Caching: `s-maxage=1800, stale-while-revalidate=3600` (30-minute freshness, edge-cached, protects against excessive requests).
- CORS: `Access-Control-Allow-Origin: *` so partner sites can also fetch it client-side.

## Attribution rule

Every item URL is decorated with:
`utm_source=<partner>&utm_medium=partner_feed&utm_campaign=aria_hub_partner_feed`

The response includes an "Powered by ARIA HUB" attribution link (also rendered by
the widget). Partners keep the attribution line — that is the deal for the free feed.

## No-code embed (widget)

```html
<div id="aria-hub-opportunities"></div>
<script src="https://www.myariahub.com/embed/opportunities-widget.js"
        data-aria-partner="gotglobal"
        data-aria-limit="8"
        data-aria-deadline-days="30"></script>
```

Optional data attributes: `data-aria-category`, `data-aria-country`,
`data-aria-province`, `data-aria-container`. The widget is dependency-free
vanilla JS, escapes all content, and degrades silently if the feed is
unreachable. The partner help page is the "Free partner opportunity feed"
section of `/en/partners`.

## Weekly export (partners without a website)

Every Friday: pull 3–5 vetted opportunities (deadline within 14 days, relevant
to the partner), format as a forwardable message with the partner's UTM link,
send via email/WhatsApp. Log in `outreach-targets.csv`.

## Rollout

1. **Now (Day 11):** spec + MVP live after deploy; documented on `/partners`.
2. **Week 5:** offer the feed to Wave A/B partners as the concrete "lowest-effort option"; first partner embedded = exit condition.
3. **Later (v2):** per-partner co-branded landing pages, category pre-sets, simple usage stats per partner.
