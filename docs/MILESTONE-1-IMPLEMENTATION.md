# ARIA HUB — Milestone 1 Implementation & Verification Gate

Status: **implemented in isolated feature branch; NOT TESTED/APPROVED FOR RELEASE**.

Branch: `feature/applicant-intelligence-milestone-1`

## Completed code

- Localized Get Started chooser (EN / Persian Afghanistan / Pashto) replaces navbar /contact action.
- Separate Log In / Dashboard navbar controls.
- Applicant email/password signup (12+ characters), sign-in, email verification, resend verification, forgotten/reset password, session logout, password change.
- Separate ApplicantProfile marker tied to shared User identity to avoid employers silently acquiring applicant access.
- Revocable database-backed applicant sessions (SHA-256 token at rest) and fail-closed feature flag.
- Basic localized applicant portal and editable name/headline/residence.
- Portal links into working Opportunities, CV Builder and Matcher; CV drafts remain device-local until Milestone 2 (explicitly disclosed).
- Employer Quick Post and authenticated employer dashboard accept **application phone** as an alternative to application email/URL, with E.164 validation and moderated publication; public details display localized Call Employer.
- Employer brute-force attempts checked BEFORE successful login, and existing signed sessions rejected after User updatedAt advances (password reset/change).
- New applicant profile migration and guarded server-role policy with no public Data API grants.
- Initial regression tests for phone application and applicant-cookie policy.

## Absolute release gates

Do not merge or deploy until all pass:

1. Rebase isolated branch onto newest main **after** the active MCP/translation agent finishes; inspect schema/migration overlaps.
2. Run `bun install --frozen-lockfile`, `bunx prisma validate`, `bunx prisma generate`, `bunx tsc --noEmit`.
3. Run all repo tests, especially `tests/applicant-milestone-1.test.ts`, employer auth, employer jobs, apply resolver and existing security tests.
4. Apply migrations ONLY to an isolated test DB, then test fresh DB migrations from zero and application role permissions/RLS.
5. Configure test SMTP and public staging URL; registration, verification, resend, login, wrong-password lockout, reset, logout, old session rejection.
6. Test applicant account and employer account using same email: shared identity requires an explicit account-linking flow, not silent role takeover. Currently such linking is NOT implemented; classify as follow-up before a unified identity launch.
7. Test isolated profile read/write ownership, CSRF/origin rejection, no-cache headers and disabled feature behavior.
8. Test Quick Post with application URL, email or international phone; approved phone CTA opens dialer. Phone numbers must be consented to for public display. Contact email remains required for editorial follow-up/tracking (it is NOT the application method).
9. Test desktop and mobile navigation, all locales, keyboard interaction, and candidate screenshots.
10. Verify Oracle workers, Translation Gateway, MCP, Vercel, Supabase production schema and production DNS untouched.

## Feature/config flags

- `APPLICANT_AUTH_ENABLED=true` on isolated **test** environment only; default disabled.
- `APPLICANT_ALLOWED_HOSTS` optional comma-separated HTTPS staging hostnames allowed for browser POST.
- `PUBLIC_SITE_URL` should point to staging environment when testing verification and reset links.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` needed to enable registration and recovery. No SMTP means signup MUST fail closed instead of claiming email was sent.

## Work still required before declaring the whole Milestone 1 complete

- No executable checkout in the current ChatGPT runtime; migrations, build, test suite and live browser flows NOT executed.
- Improve existing employer/applicant same-user role enrollment UX.
- Add account data export/deletion and applicant privacy preferences (currently NOT available).
- Check employer panel localization, organization-claim UX and any external SMTP delivery failures.
- Optionally simplify extra form fields further without weakening moderation.
- Review email template HTML/escaping and SMTP delivery outcomes.
- Verify hash-based session revocation against actual password change/reset timings.
- Prepare a read-only candidate hostname and capture UI evidence, then resolve all errors before merge.

## Owner gate

Production remains unchanged. No Vercel or Oracle deployment. Do not enable applicant routes in production until the owner accepts a test report and explicitly approves merge/deployment.
