# ARIA HUB — Milestone 4 Applicant Notifications (ISOLATED CANDIDATE)

**Status:** implementation in `feature/applicant-intelligence-milestone-1`; no deployment, no production migrations, no worker activation and no Vercel build triggered.

## Delivered code

- New RLS-enabled tables: `ApplicantNotificationPreference`, `ApplicantNotification`, `ApplicantEmailDelivery`.
- Consent **OFF by default**. Verified-email account can opt into digest emails; everyone must explicitly enable in-app saved-search match alerts.
- User-scoped notification preference GET/PUT. Turning email off suppresses pending outbox records.
- User-scoped notifications GET/PATCH with paginated matching opportunities, unread count and mark-as-read.
- Dedicated EN/FA/PS portal at `/[lang]/portal/notifications`, mobile/desktop nav bell and dashboard link.
- Opportunity matcher scanner `scripts/applicant-match-alert-worker.ts`. Uses existing deterministic evidence ranker, excludes known eligibility conflicts, handles only strong matches for active saved searches and only published/unexpired opportunities. Never uses AI tokens.
- Unique match key `applicantProfileId + savedSearchId + opportunityId` stops normal duplicate creation even if scan overlaps.
- Email outbox worker `scripts/applicant-email-alert-worker.ts`: batching of max 6 per digest, daily/weekly intervals, row locks, retries/backoff, consent check, prepared HTML escaping and private preferences link, SMTP adapter.
- Repair to pre-existing alert and matcher-alert signup endpoints: **no more logging live confirmation URLs/tokens** when SMTP is unavailable. Return 503 instead of claiming email delivery.
- PWA manifest and generic no-PII service-worker display foundation. **Browser push is NOT subscribed, registered, authorized or delivered in this release.** WhatsApp/SMS also remain off.

## Flags (default: OFF)

Set these only in approved isolated staging:

- `APPLICANT_AUTH_ENABLED=true`
- `APPLICANT_MATCHER_V3_ENABLED=true`
- `APPLICANT_NOTIFICATIONS_ENABLED=true`
- `APPLICANT_MATCH_ALERT_WORKER_ENABLED=true` — scanner writes gated
- `APPLICANT_MATCH_ALERT_EMAIL_ENABLED=true` — email sends gated
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM — configured server-side only
- PUBLIC_SITE_URL — verified staging HTTPS hostname

`GET/PUT` preference APIs and portal require the applicant session. Browser may never call unrestricted SQL or see SMTP credentials.

## Safe staging commands

**No scheduler is installed or enabled.** Execute manually ONLY after a private staging DB and representative fixture profiles are provisioned:

```bash
bun --conditions=react-server scripts/applicant-match-alert-worker.ts              # read-only dry run
APPLICANT_MATCH_ALERT_WORKER_ENABLED=true bun --conditions=react-server scripts/applicant-match-alert-worker.ts --apply
bun --conditions=react-server scripts/applicant-email-alert-worker.ts              # read-only dry run
APPLICANT_MATCH_ALERT_EMAIL_ENABLED=true bun --conditions=react-server scripts/applicant-email-alert-worker.ts --send
```

All additional prerequisite app/notifications flags and SMTP must be configured for a real run. Do not run these commands against production until separately approved.

## Important operational limitations / acceptance gates

1. **No Vercel trigger**: only GitHub feature-branch commits and the repo's own GitHub Actions PR validation; do not connect Vercel or push to main.
2. No production migration or Oracle systemd service changes. Worker entrypoints remain manual.
3. Scanner currently covers at most **100 saved searches / 500 recently updated opportunities per tick** within a 14-day lookback. It logs capacity saturation; scalable keyset pagination and durable watermarks must be added before public high-volume activation.
4. No historical alert flood: scan compares opportunity `updatedAt` to saved-search `createdAt`.
5. `ApplicantNotification` unique pairing means updates to the SAME opportunity will not create repeated alerts. Meaningful update/version notifications are deferred pending a material-change model.
6. Mail system is **at-least-once** under SMTP crash ambiguity. Durable provider message ID / webhook dedup would be needed for stronger guarantees.
7. The email outbox must be tested on real staging SMTP for sends, suppression, retries, duplicate suppression and bounces. Do not claim verified email *delivery* until tested.
8. PWA push display worker is only scaffolding. Push VAPID credentials, subscription management, standards-compliant sender, device permissions, Android/iOS tests and unsubscribe controls are not implemented, and no browser registration occurs.
9. No admin bulk notification tool; admin operational dashboard is planned separately. Owner must approve delivery cost, alert cadence and provider controls.
10. Recheck source quality: imported opportunity facts may be incomplete. Ranker is evidence-based, cannot predict hiring eligibility, and all notification templates avoid sensitive personal attributes.
11. Strict full CI must pass before merging. The inherited high dependency advisories and shared-worker / translation test failures remain explicit merge blockers.

## Required QA

- Fresh PostgreSQL migration/diff 0; Prisma validate/generate; TypeScript 0; bun focused tests and Next standalone build.
- Verify all three locale pages and mobile nav, keyboard operation, empty/loading/error states.
- Cross-account requests denied; cross-account notification IDs cannot be marked read.
- Match source has only published/unexpired rows; role/province filters and nationality conflict gate apply.
- Repeated scanner ticks create only a single notification; concurrent scanner ticks cannot duplicate.
- Unverified email never enables email; user opt-out suppresses mail; no pending email is sent without SMTP.
- Test suppression while an email batch is waiting, worker crash after DB claim, and retry/backoff.
- User deletion cascades into preferences, events and deliveries.
- Stop/rollback without interfering with Oracle translation/import/social/MCP workers.

**Milestone 4 is NOT production-complete until human staging acceptance and external mail tests pass.**
