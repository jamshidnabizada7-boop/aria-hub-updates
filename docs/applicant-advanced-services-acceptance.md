# ARIA HUB — Advanced Applicant Services (Candidate Acceptance)

This is feature-branch development only. Not a deployed or production-ready service.
Do not enable before owner approval, audited dependencies, staged provider testing,
and physical-device validation.

## Priority 5 — security audit

Bun audit fix regenerated the candidate bun.lock with Next.js 16.3.8,
sharp 0.35.5, and source-map-js 1.2.2. Strict CI still reports
braces 3.0.3 (GHSA-vfj7-8cjw-p6xm), without a published fixed version as
of October 8, 2026, through ESLint -> fast-glob -> micromatch.
The strict audit release gate remains enabled and must remain RED until
an upstream fix is published and a fresh frozen audit succeeds.

## Priority 6 — consent and messaging

Applicant preferences include explicit browser push and WhatsApp consents,
both false by default. The account routes protect subscriptions by authenticated
session, cross-origin validation, per-user ownership and encryption. The
WhatsApp verification route requires applicant-requested OTP via an approved
Meta template and a verified recipient before alert consent can be enabled.
Stored endpoints/contact numbers are AES-256-GCM ciphertext; OTPs are HMAC
hashes. Opt-out suppresses outstanding queued delivery.

Existing email digest and in-app inbox remain in place. Applicant match
scanner now queues consented push and WhatsApp notifications. Dedicated
channel worker defaults to read-only dry-run; actual --send requires all
explicit delivery/provider flags and safe provider contracts.

Browser push requires a *separately installed and authenticated* VAPID/web-push
gateway. WhatsApp needs active Meta WhatsApp Cloud API credentials plus
approved match/verification templates and supported language mappings.
No real messages, push, or emails were delivered in candidate tests.
All flags remain false in isolated CI.

## Priority 7 — employer and admin

Employer organization membership continues to guard all jobs. Employer
posting offers website HTTPS, email, E.164 telephone, WhatsApp click-to-contact
and in-person instructions, with new method validation. WhatsApp click-to-contact
is not an automated applicant-messaging capability.

Employer vacancy aggregates show counts scoped to the current organization;
they are NOT impression/click/submission analytics. Admin applicant operations
display only aggregated CV/OCR processing statuses, saved search, email
delivery, employer and matching-quality signals; no applicant personal data
or raw CV contents returned.

Full fraud queues, moderation and applicant privacy export/deletion still
require separate completion and acceptance.

## Priority 8 — Chromium checks and staging

GitHub candidate workflow starts a local standalone Next app against disposable
Postgres and tests English, Afghanistan Persian and Pashto portal flows in
headless Chromium at 1280x900 desktop and 390x844 mobile-sized viewports.
Checks include routes, headings, RTL direction, horizontal overflow and
page errors. Browser snapshots contain only synthetic applicant data.

This is not physical Android Chrome, iOS Safari, touchscreen or screen-reader
acceptance; it is not a remote owner-review staging deployment. Before
production: run genuine two-device cloud sync, user-data purge, provider
send/opt-out/retry, photo OCR, load tests, physical phones, privacy review,
key-rotation rehearsal, strict green CI, and obtain owner staging approval.

Never deploy to Vercel or Oracle, merge main, change production DBs or
activate workers as part of candidate testing.

## Precise status language

5: Partially remediated; upstream braces advisory blocks strict release.
6: Candidate implementation; external delivery/approved template tests blocked.
7: Partial enhancements implemented; full master scope still unfinished.
8: Isolated browser automation added; physical devices and staging not signed off.
