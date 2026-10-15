# Jobs.af, Wazifaha and Opportunity Desk repairs — 15 October 2026

## Production outcome

Code `3a7c2f1` is deployed at `/opt/aria-hub/releases/20261015-source-destinations-refined` and pushed to main. Web, import worker, social worker and applicant channel timer are active.

| Source | Existing records repaired | Application destinations recovered |
| --- | ---: | ---: |
| Jobs.af | 33 | 30 |
| Wazifaha Jobs | 26 | 26 |
| Opportunity Desk | 20 | 1 |
| Total | 79 | 57 |

The Opportunity Desk pass also added source-quoted Afghan/worldwide eligibility and verified three host countries. These facts support matching; worldwide eligibility remains subject to the full programme requirements.

## Root causes and changes

- **Jobs.af:** older records retained homepage/source fallbacks despite the later public detail API. Application forms and employer vacancy links were also lost when HTML anchors were stripped, especially links labeled “Job details.” Read the public JSON submission fields and scoped submission HTML, retain actual hrefs and preserve existing usable destinations. The maintenance pass refreshed older existing records that do not appear on the latest homepage.
- **Wazifaha:** `/jobs/apply/...` redirect wrappers took priority over the actual employer destination. Its “Submission Email” field can contain an email, portal URL, or “Link above.” Read the dedicated field and application instructions, preferring a precise employer vacancy/form over a generic jobs directory. Ignore unrelated footer forms and preserve existing usable destinations.
- **Opportunity Desk:** plain-text section extraction mixed application material into eligibility and missed funding under “Scholarship.” Preserve HTML heading boundaries, stop at unknown headings, and extract funding and instructions separately. Record positive Afghan/worldwide eligibility with the exact source quote. Exclusions elsewhere in eligibility prevent an unsupported worldwide classification. Host country is independent of applicant nationality.

## Safeguards and verification

- Source-only dry plans were reviewed before writes, with exact `updatedAt` guards and private backups. No fabricated destinations or eligibility were added.
- Existing Persian/Pashto text was retained. Added or corrected English fields were marked for translation review. Reviewed source repairs were protected.
- The repair patches excluded publication status, deadlines, titles, slugs and descriptions. One newly imported Wazifaha draft was subsequently published by the existing automatic publication worker; its separate `opportunity.automatic-publication` audit event confirms that was not a backfill status change.
- 30 targeted tests passed, with 115 assertions. Production build and TypeScript gate passed. Database health and webhook authentication checks passed after deployment.
- Public UI verified the GSRO Program Manager Apply button points to the source-provided Zapier application, and the Afghan women's scholarship shows Switzerland with its Google application form.

## Remaining source limitations

Snapshot after repair, including expired published/draft rows:

| Source | Unusable application destinations | With current/unknown deadline | Weak data flags |
| --- | ---: | ---: | ---: |
| Jobs.af | 25 | 18 | 0 |
| Wazifaha Jobs | 36 | 1 | 0 |
| Opportunity Desk | 37 | 32 | 153 |

Imports continued during the audit, so source populations changed. Recovered counts above come from the repair audit, not subtraction of moving dashboard totals.

Remaining Jobs.af cases include applications through Jobs.af itself, removed public API entries, or no verified external destination. The current Wazifaha Generalist Field Officer source returns 404; most other Wazifaha flags are past-deadline pages whose submission fields are now hidden. These were not relabeled as usable. Opportunity Desk records without explicit Afghan/worldwide eligibility were preserved. Missing physical host countries remain unknown for global awards or insufficient source evidence; the 153 health flags do not imply 153 opportunities open to Afghans.

## Examples and primary evidence

- [Repaired Wazifaha job on ARIA HUB](https://www.myariahub.com/en/opportunities/program-manager-internal-external-announcement-2)
- [Repaired Afghan scholarship on ARIA HUB](https://www.myariahub.com/en/opportunities/maria-rosario-lazzati-niada-scholarship-for-afghan-women-2027-2028)
- [Geneva Graduate Institute scholarship and Swiss address](https://www.graduateinstitute.ch/afghan-scholarships)
- [CEES residential fellowship in Switzerland](https://www.cees.uzh.ch/de/CEES-Fellowship-Program.html)
- [EUI Jean Monnet fellowship and Italian address](https://www.eui.eu/apply?id=jean-monnet-fellowships)

Private Oracle evidence directory: `/opt/aria-hub/private/source-destination-repair/` (mode 0700). Backups: `before-1792043704501.json` (77 records) and `before-1792043979458.json` (2 records). Do not replay an applied plan.

UI proofs in the local parent workspace:

- `admin-audit-evidence/wazifaha-application-repaired-20261015.png`
- `admin-audit-evidence/opportunitydesk-afghan-scholarship-repaired-20261015.png`
