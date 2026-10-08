# ARIA HUB — Milestone 5 Applicant Career Copilot & Application Tracker

Status: **isolated feature candidate; NOT production-ready or deployed.**

This next milestone is scoped as career guidance and private application tracking, since the repository's written roadmap ends at Milestone 4. Do not infer that the unfinished Milestone 2 OCR / CV import is complete.

## Implemented
- Applicant-only `ApplicantApplication` with linked real Opportunity, user-chosen status, private notes, optional next-action date, applied timestamp, and unique per-user/opportunity constraint.
- Owner-only `GET/POST /api/applicant/applications`, `PATCH/DELETE /api/applicant/applications/[id]`, deny-by-default feature flag, fail-closed durable write limits, strict input validation, historical progress only changed at user's direction.
- Applicant Career Copilot at `/[lang]/portal/career`, English/Persian (Afghanistan)/Pashto, links to tracked opportunities and CV Builder.
- **Free guided mode** generates evidence-only cover letter, application email, interview practice, CV improvement suggestions or application checklist.
- **Optional cost-capped AI** via server-side Groq with a fixed trusted endpoint, bounded input/output, 15-second timeout, strict per-user daily quota, explicit per-request consent, and no email/phone/raw CV file sent. The model receives only manually approved headline/skills, a bounded published opportunity title/organization/requirements and user-authored notes. User must verify drafts.
- AI output is NOT automatically stored, emailed, applied, posted or sent. The endpoint writes only task/provider metadata to AuditLog after success.
- Profile and career feature default OFF. Applicants never get account/AI features enabled merely by a GitHub merge.

## Feature flags: OFF unless explicitly enabled in isolated staging
- `APPLICANT_AUTH_ENABLED=true`
- `APPLICANT_CAREER_V5_ENABLED=true` — enables tracker and guided assistant
- `APPLICANT_COPILOT_AI_ENABLED=true` — separate optional Groq inference permission
- `GROQ_API_KEY` — secure server-only secret, never provided in chat or client code
- `APPLICANT_COPILOT_MODEL` optional vetted provider model identifier (not user-controlled)

All `nextActionAt` dates are **informational** in this milestone; there is no scheduled reminder/notification job for tracker follow-ups.

## Data and safety
- User-scoped reads, updates and deletes. RLS enabled, direct Data API roles denied. Verify the actual Oracle server DB role and Supabase row-level policies in an isolated staging clone before deployment.
- The application tracker is a private organizational tool, **not an employer ATS**. It never submits applications, sends messages, stores passwords or changes the official status of an opportunity.
- `appliedAt` only changes from user input to Applied/Interview/Offer/Rejected; cannot be derived from opening a listing, matching or drafting.
- No raw CV files or extraction fields enter the AI request. AI prompts explicitly treat job descriptions and user notes as untrusted data, and are never logged verbatim.
- Server-side requests have per-user quotas; the API key never leaves the server; no client-side direct model invocation.
- Unconfigured AI responds clearly unavailable (or offers guided mode), not fake AI results.
- No third-party messaging/SMS/WhatsApp, no email sends and no automatic follow-up scheduling.

## Quality and release gates
1. Focused candidate CI: Prisma schema, clean database migrations + drift diff, TypeScript, `tests/applicant-career-m5.test.ts`, all previous applicant tests, standalone Next.js build.
2. Strict full repository CI including dependency security audit must pass. Previously documented Next/Sharp/transitive advisories remain blockers.
3. Inspect non-ASCII EN/FA/PS text in actual browser with RTL and mobile viewport, keyboard navigation, empty/error/busy states.
4. Verify cross-applicant account isolation via real signed-in requests; test attempts to pass another user's tracker ID.
5. Stage a test Groq key with consent and caps; sample outputs in all three languages, inspect hallucinations and privacy. Never enable AI on production without approval.
6. Rebase/review against latest `main` before future merge; do not lose recent concurrent changes.
7. Owner approves documented security, privacy and product behavior before merging/deploying.

## Explicit deployment restrictions
No `main` push/merge, Vercel invocation/build/deploy, production Oracle changes, systemd activation, or production database migrations.
GitHub Actions applicant candidate verification is distinct from Vercel deployment.
