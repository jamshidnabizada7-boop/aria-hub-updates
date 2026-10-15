# Employer interface refresh — 15 October 2026

## Delivered

- Branded employer sign-in and registration with a single mode switch, a distinct jobseeker link, a form-first mobile layout, language controls, appearance toggle and explicit support-assisted recovery.
- Responsive workspace shell with section selector on phones, organization roles, real vacancy counts, next steps and recent activity.
- Searchable vacancy list, status filters including closing within seven days, readable actions and corrected location display.
- Labeled vacancy form with optional details, visible in-person instructions and a review step. Unsaved form state survives section changes within the current organization and resets after successful submission.
- Separate create-organization and join-organization paths; organization loading/error/retry states and localized industry labels.
- Application inbox searches all matching persisted records within the authorized organization, filters stages, paginates and shows only explicitly shared contact/CV data. Stage changes remain visible to applicants.
- English, Persian and Pashto controls; RTL, light/dark appearance, keyboard focus and phone input sizing.
- Request version guards prevent old organization responses from replacing the current organization’s workspace.

## Verification

- 27 core integration/domain tests: 129 assertions, all passing.
- 14 account/privacy tests: 42 assertions, all passing.
- TypeScript noEmit passed; targeted ESLint found no errors (existing full-document logout navigation warning retained).
- Browser: synthetic local employer sign-in, review and submission of an in-person vacancy, draft visible in moderation, inbox stage filter/no-match state, mobile section switching, English/Persian/Pashto navigation, dark mode. Width checks at 390 and 820 show no page overflow.
- No real applications, contact messages or team grants were submitted during interface checks.
- Production build and post-release checks are recorded with the release when deployed.

## Scope

This release improves employer access, onboarding and the hiring workspace. Public jobseeker tools, public browsing, private CV access controls and existing publisher schedules keep their established behavior.

## Production release

- Runtime commit: `3236818` (main), built successfully on Oracle with Next 16.3.8 and TypeScript.
- Active release: `/opt/aria-hub/releases/20261015-hiring-ui-253b521`; the release marker contains the final runtime commit above.
- Preflight: database healthy; localized employer pages en/fa/ps HTTP 200; unauthorized application inbox and WhatsApp webhook HTTP 403.
- After switch: public health reports `ok: true`, database up. Web, import worker, social worker and applicant channel timer all active.
- Live browser confirmed the new sign-in form and no page overflow. No UI/browser errors; existing optional Vercel analytics scripts are unavailable on the Oracle host.
- Existing PDF browser-path tracing warning remains in the successful build.
- Temporary synthetic preview users, vacancies, applications and organization were removed from the isolated local test database; the local preview and database were stopped.
- Browser viewport overrides were reset. Live proof saved locally as `employer-ui-redesign-live-20261015.png`; phone and Persian RTL proof retained in the audit evidence directory.
