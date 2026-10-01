# Day 2 — Public-claims audit (checked live: 1 October 2026)

Every public ARIA HUB claim, marked **VERIFIED / NEEDS EVIDENCE / REMOVE-QUALIFY**. Rule: before any media pitch, sponsor deck or partner proposal, a number is quotable only with a dated analytics export saved in `proof/`.

## Advertise page (`/en/advertise`, `/ps/advertise`)

| Claim (as displayed) | Status | Action |
|---|---|---|
| "2,492,000+ monthly page views" | **NEEDS EVIDENCE** | Self-reported. Save a dated analytics export (GA4 or equivalent) defining views vs sessions vs users and the 30-day period. Until then, do not use in media/pitch material. |
| "20K+ Telegram + WhatsApp readers" | **NEEDS EVIDENCE** | Platform self-reported reach. Save dated screenshots of channel subscriber/read stats. Never mix this with website analytics. |
| "< 24h average time to go live" | **NEEDS EVIDENCE** | Operational claim — define the metric (submission→publication) and export supporting data, or soften to "typically live within 24 hours". |
| "Afghanistan's largest trilingual opportunities audience" | **REMOVE/QUALIFY** | Superlative with no independent source. Qualify to "a leading trilingual opportunities platform for Afghanistan" unless third-party data supports "largest". |
| "Reach thousands of job seekers in Afghanistan daily" (employer CTA) | **NEEDS EVIDENCE** | Depends on definition (impressions? readers? subscribers?). Either document with a dated export or qualify. |

## Homepage (`/en`)

| Claim | Status | Action |
|---|---|---|
| "98% success rate" / "thousands of successful applications" (flagged by the roadmap research) | **RESOLVED** | No longer present in the live homepage HTML (checked 2026-10-01). Keep monitoring after future copy edits. |
| "New opportunities … updated daily" / "summarized, translated" | **VERIFIED** | Matches actual product behaviour (daily imports + translation pipeline). Safe. |
| Dynamic counts ("216 new opportunities", inventory totals) | **VERIFIED (UI only)** | Fine as live UI; date-stamp any count used externally. |

## Standing rules

1. Every public number gets a date, a definition and an evidence file in `proof/`.
2. Self-reported platform reach is never presented as independent fact.
3. Success-story section: obtain permission, document ARIA HUB's contribution, separate user-submitted stories from verified outcomes.
4. Re-run this audit before every major PR push and every quarter.

## Proof folder

See `proof/README.md` for the naming convention and what to save.
