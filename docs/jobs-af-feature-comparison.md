# Jobs.af comparison and ARIA HUB workspace improvements

Reviewed 15 October 2026. Evidence: the user's five authenticated screenshots, [Jobs.af public website](https://www.jobs.af/), [employer feature page](https://www.jobs.af/employer), [public company directory](https://www.jobs.af/public/company), and ARIA HUB source and runtime checks. Advertised employer features are distinguished from private workflows we could not independently operate. No Jobs.af account was created or changed.

## Comparison

| Capability visible or advertised on Jobs.af | ARIA HUB before | Delivered change / existing equivalent |
|---|---|---|
| Jobseeker and employer account entry | Both session types existed, employer entry difficult to discover | Account dropdown on desktop/mobile, explicit jobseeker/employer lanes, localized employer sign-in, locale-preserving redirects, working POST logout |
| Organization name, industry, logo onboarding | Employer account stopped at organization claim by slug | Register a new organization, choose industry, upload a raster logo normalized to 256×256, ownership review and pending status; duplicate existing names direct the user to claiming |
| Employer workspace and vacancy management | Backend operations existed; profile and team were placeholder text | Branded workspace, localized navigation, organization switcher, vacancy editor/preview, close/reopen/duplicate, draft moderation and translation re-review |
| Public company profiles | Searchable directory and active roles already existed | Square logo cards, industry, follow/unfollow, Following directory filter, public-profile follow control, recent roles from followed companies on applicant dashboard |
| Candidate applications and employer stages | Private applicant tracker only, no employer inbox | Separate consented application model; employer opts in per vacancy; selected CV only; own-organization recruiter inbox with pagination; submitted/reviewing/shortlisted/interview/offered/hired/rejected; applicant status history and withdrawal |
| Team roles / permissions (advertised) | Active membership guards existed; dashboard text only | Owner can review colleague requests, assign recruiter/viewer or suspend; no self-elevation or owner reassignment; viewers cannot access applicant contact details or CVs |
| Applicant profile, completion, resume | Profile editor, verified CV extraction/review, CV builder, completion meter already present | Reused these existing features; no duplicate profile store or mandatory sensitive demographic collection |
| Recommended jobs | Matcher available separately; dashboard showed only delivered match alerts | Evidence-based recommendations from latest active saved search, eligible active corpus, explicit unknown eligibility; no paid AI request or acceptance guarantees |
| Search, saved jobs, closing soon | Existing localized search/filter/feed and bookmarks | Dashboard quick links to latest/closing/remote/scholarships; company Following discovery |
| Resume / application tracking | CV library, cloud drafts, builder, private application tracker and career assistant already present | Retained private tracker alongside explicitly submitted applications, never silently exposes tracked external applications to employers |
| Tenders, freelance projects, offers and Jobs.ai (advertised) | No complete procurement marketplace, freelancer contracting/payment workflow or binding offer system | These are separate product capabilities, not represented as working features by adding empty tabs. New recruitment stages track an offer status, not a legally binding offer/acceptance service. Requires a separately scoped procurement/project source and workflow. |

## ARIA HUB advantages strengthened

- Persian Afghanistan, Pashto and English entry flows; RTL layouts for new organization and application screens.
- A broader jobs/scholarships/fellowships opportunity journey, verified source repair and application destination handling.
- Explainable matching without a paid provider call; clear evidence and unknowns rather than invented eligibility.
- Applicant control: nothing from the private CV library is shared unless selected for a specific application. Employers never see private tracker notes, other files or follower identities.
- Withdrawal immediately removes employer access and clears shared contact/message fields. Already downloaded files cannot be recalled; the consent UI states this.
- Account deletion immediately withdraws submissions; final deletion cascades through submissions/follows. Data export includes the applicant's own shared application history and followed organizations, without credential/object-storage keys.

## Architecture and operating workflow

1. Employer signs in with existing ARIA HUB credentials or creates an employer account. Applicant email verification remains a requirement for actual applications.
2. New organization is inactive and unverified; a pending owner request appears in Admin → Organizations. The admin reviews the evidence and approves/rejects it. Approval activates only registrations marked as pending; it does not fabricate a verified badge.
3. Approved owners edit logo/about/industry/careers details. Official name/website changes require ARIA HUB review. Recruiters manage jobs/applications; viewers only see vacancies.
4. Employer chooses **Receive applications on ARIA HUB** on a new vacancy. Vacancies remain drafts until moderation. External listings continue using their real external application method.
5. Applicant selects their CV, writes a message and explicitly consents to the named employer. Duplicate applications reject; expired/closed/draft/imported listings cannot receive native applications.
6. The employer reviews the application, optionally downloads that selected CV and updates a stage. Applicant checks **Submitted applications** and can withdraw access.

## Verification

- Isolated localhost PostgreSQL migration and route/service tests cover private pending registrations, administrative activation, cross-account edits, CSRF, role permissions, idempotent following, consent, CV ownership, duplicates, closed vacancies, CV download scoping, stage visibility, withdrawal and export.
- Existing employer vacancy, organization administration and password security tests retained; fixtures updated to include the now-required request origin.
- Browser verification uses synthetic accounts and listings only in the isolated local database. No real applicant CV was sent and no real candidate was selected/rejected during testing.
- Production release and live UI results are recorded after deployment below.

### Deployed result

- Code release `e6988d1`, on `main`, deployed to `/opt/aria-hub/releases/20261015-employer-workspace-final` on 15 October 2026. Additive migration `20261015130000_employer_discovery` applied successfully. Previous releases retained for application rollback.
- **39 targeted tests passed, 163 assertions**: 25 workspace/navigation/vacancy/organization tests, 6 password security tests, and 8 shared-identity/privacy/deletion tests. Both optimized production builds completed with TypeScript validation. One existing PDF browser-path tracing warning remains unrelated to this change.
- Browser flow verified in the isolated local environment: existing employer login → workspace; existing applicant login → dashboard → native vacancy → explicit consent → submitted confirmation → employer inbox containing that exact synthetic application. Private selected-CV retrieval and withdrawal tested against the real database/storage routes.
- Live browser checks confirmed the employer login, account lanes, organization search/follow controls and authenticated applicant dashboard. The dashboard scholarship shortcut uses the verified production category slug `scholarship`; employer vacancies default to the verified `job` category. Safe application-return routes reject external URLs, traversal and locale changes.
- Production English, Persian and Pashto employer entry pages responded successfully; RTL markup verified. Unauthenticated new application/organization APIs returned 401/403. Health reported database up; web, import worker, social worker and applicant-channel timer were active after deployment. No paid service, credentials, publishing permissions or scheduler configuration changed.
- Temporary local preview accounts/listings were removed and the local test database stopped. Production tests did not create fake companies, vacancies or applications.

Proof images are saved under `C:/Users/Computer House/Documents/Codex/2026-10-09/i-h/work/admin-audit-evidence/`: `employer-login-live-20261015.png`, `employer-workspace-local-20261015.png`, `native-application-success-local-20261015.png`, and `employer-inbox-local-20261015.png`. Local images explicitly show synthetic preview data.
