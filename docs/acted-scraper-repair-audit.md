# ACTED scraping and application forms — 15 October 2026

## Causes

- `officialHtml.parseDetail()` selected only the first matching `section.cpn-text`. ACTED uses seven sections. The stored Gaza description contained only the organization introduction (998 characters).
- The import resolver could call official same-host URLs direct applications, while Content Health, the public page and Repair Gateway independently rejected all same-host links. ACTED's real applicant form is embedded at `#form` on the vacancy page.
- Cloudflare-obfuscated recruitment emails were returned as `[email protected]`.
- ACTED's header `.infos` describes contract duration and start month, not an application deadline.
- Reimports could replace source-reviewed fields and translation JSON with fresh English-only pipeline output.

## Changes

The official HTML adapter joins every selected content section, retains public document URLs, decodes public protected emails, extracts the configured structured sections and requires ACTED's essential detail sections. A failed/incomplete detail fetch cannot persist a partial card. ACTED configuration captures duties, qualifications, conditions, eligibility, experience, salary and submission instructions; its start date is not treated as a deadline. Known country labels are accepted only through the country normalizer; various/regional locations remain unknown.

Embedded application forms require real applicant name/email fields, a CV/resume file field, a submit control and a stable existing form/container anchor. Search/newsletter forms, arbitrary fragments and POST action URLs are not application destinations. The repair reader exposes inspected anchors, requires reading the destination and rechecks its actual form before saving. Exact-URL provenance is stored; health/public rendering/admin saves recognize it consistently. A stale saved type or evidence for a different URL is insufficient.

Imports preserve fields previously saved through `opportunity.source_repair` and retain existing Persian/Pashto translations. Changed source text becomes pending for translation review. The existing permission scopes and OAuth connection are unchanged; this applies to the hosted ChatGPT Repair Gateway.

## Production result

Main code commit `555145c` is live at `/opt/aria-hub/releases/20261015-acted-repair`. The previous working admin and WhatsApp releases remain available. No schema, credentials, permissions, billing or schedules changed. The import worker was restarted to load the fixed adapter. Web/import/social services and the applicant channel timer were active after release; the existing WhatsApp webhook returned its expected unauthenticated 403.

`scripts/repair-acted-content.ts` is dry by default. Its reviewed production run expanded **19 existing records**, filled missing source-backed fields and verified all 19 embedded application destinations. The Gaza description expanded **998 → 4,711 characters**. Existing eligibility, experience and requirements repairs were retained exactly; the masked address inside the reviewed instructions was corrected to the official recruitment address. Existing fa/ps translation values and every publication status were compared with the backup and retained. Added English content is pending translation review.

Two source pages returned 404 and were preserved without invented replacements or automatic expiration:

- `cmutcepcl000plja63edck7j3`: Occupied Palestinian Territories — Consortium Project Development Manager, Ramallah.
- `cmutcet5v000tlja6nqyi33yv`: Chad — Chief of Party, Climate and Environment, N'Djamena.

Restricted backups (owner ariahub, directory 0700/files 0600):

- `/opt/aria-hub/private/acted-repair/before-form-1792041038799.json`
- `/opt/aria-hub/private/acted-repair/before-1792041197915.json`

## Verification

- **49 tests, 173 assertions** passed: real ACTED public HTML extraction, missing-detail rejection, false-form rejection, reimport preservation, URL resolver/health behavior and isolated Postgres Repair Gateway/translation/OAuth cases.
- TypeScript and the Oracle production build passed.
- A targeted production claim read the official vacancy and its embedded form, previewed and committed the exact same URL through the Repair Gateway functions. Its health changed to `application_form`/`hasRealApply=true`; publication remained published.
- Origin and public HTTP 200 HTML contained the actual `Open application form` links, recruitment email and full duties.
- Browser verification showed the restored form button and full content. Activating it opened ACTED's actual `#form` page, with name/email/CV/cover-letter controls. No application was entered or submitted.
- Browser proof: `../admin-audit-evidence/acted-vacancy-repaired-20261015.png`. The browser's older cached response required a fresh query URL to display the release; the normal public URL also returned the corrected HTML in the HTTP check.

The two removed source pages remain for source-owner/manual review. This repair does not claim all translated content is now complete or that ACTED will accept any particular applicant.
