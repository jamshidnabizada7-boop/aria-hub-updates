# Proof folder — evidence for every public claim

Nothing goes into a media pitch, sponsor deck or partner proposal unless the
evidence file is saved here first.

## Naming convention

```
YYYY-MM-DD_<metric>_<source>.<ext>
2026-10-05_monthly-pageviews_ga4-export.pdf
2026-10-05_telegram-subscribers_channel-screenshot.png
2026-10-05_whatsapp-readers_channel-screenshot.png
2026-10-12_apply-click-rate_analytics-export.csv
```

## What to save for each audited claim

| Claim (claims-audit.md) | Evidence to capture | Where to get it |
|---|---|---|
| Monthly page views | 30-day export, stating views/sessions/users + period | GA4 / Vercel Analytics |
| Telegram + WhatsApp readers | Channel statistics screenshots with visible date | Telegram channel stats, WhatsApp Business |
| "< 24h to go live" | Sample of submission→publication timestamps | Admin DB (opportunity createdAt vs publishedAt) |
| "Reach thousands daily" | Definition + supporting export | Analytics / channel stats |
| Partner results | Per-partner UTM sessions screenshot | GA4 / analytics, filtered by utm_source |
| Webinar attendance | Registration count + attendance count | Newsletter list + meeting platform report |
| Ambassador outcomes | Monthly activity logs + referral sessions | CRM (`outreach-targets.csv`) + analytics |

## Rules

1. Save the export **before** quoting the number anywhere.
2. Record the exact definition on the export (handwritten note or cover text is fine).
3. Exports older than 90 days need re-pulling before reuse.
