# Employer interface refresh — 15 October 2026

## Delivered

- Branded employer sign-in and registration with a single mode switch, a distinct jobseeker link, language controls, appearance toggle and explicit support-assisted recovery.
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
