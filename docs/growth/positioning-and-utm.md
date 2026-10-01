# Day 1 — Positioning, tagline, UTM naming, master outreach CRM

## Master positioning line (locked)

> **ARIA HUB helps people from Afghanistan find jobs, scholarships and global opportunities — with clear multilingual summaries and direct official application routes.**

Use this exact line (or a very close version) everywhere: LinkedIn Page, directories, media kit (`/press`), partnership emails, founder bio, Product Hunt, event descriptions. Consistency beats new slogans.

## Tagline (≤60 chars, for directories/launch platforms)

> Jobs, scholarships and global opportunities for Afghanistan.

## Message hierarchy

| Layer | Message |
|---|---|
| What is it | Opportunity discovery platform: jobs, scholarships, internships, fellowships, trainings and selected global programs. |
| Why trust it | Clear summaries, current deadlines, review workflow, direct official application routes. |
| Why different | Dari (Persian), Pashto and English access; focus on applicants from Afghanistan; career/education tools. |
| What else | CV tools, employer submissions, interview/visa preparation, selected professional services. |
| Proof | Only dated, independently verifiable metrics and documented outcomes. |

## Audience one-liners

- **Students/applicants:** Never miss the deadline. Understand the opportunity quickly. Apply through the official route.
- **Job seekers:** Find fresh roles, filter them, understand requirements, apply directly.
- **Employers:** Reach relevant applicants through a reviewed, multilingual listing flow.
- **Education/youth partners:** Give your community a continuously updated opportunity resource without rebuilding one yourself.
- **Media:** A product and data source around access to jobs, scholarships and education for people from Afghanistan.
- **Founders/tech:** A multilingual opportunity platform combining aggregation, editorial review, discovery and career tools.

## UTM naming standard (locked)

Format: `?utm_source=<source>&utm_medium=<channel>&utm_campaign=<campaign>`

- `utm_source`: lowercase partner/channel id, `[a-z0-9-]` only. Examples: `gotglobal`, `girlscollege`, `apt`, `nic-islamabad`, `producthunt`, `newsletter`.
- `utm_medium`: one of `partner_feed` (JSON/RSS/widget feeds), `partner_post` (co-posts), `partner_webinar`, `email`, `social`, `ambassador`, `directory`, `press`.
- `utm_campaign`: `<purpose>_<year><quarter>` e.g. `partner_launch_2026q4`, `webinar_scholarships_2026q4`, `ph_launch_2026q4`.
- The partner JSON feed builds this automatically: `utm_source=<partner>&utm_medium=partner_feed&utm_campaign=aria_hub_partner_feed`.

Examples:
```
https://www.myariahub.com/en?utm_source=gotglobal&utm_medium=partner_post&utm_campaign=partner_launch_2026q4
https://www.myariahub.com/en/opportunities?utm_source=producthunt&utm_medium=social&utm_campaign=ph_launch_2026q4
```

Rule: every outbound partnership link gets a UTM. If a result can't be attributed, fix attribution before scaling.

## Master outreach CRM

File: `outreach-targets.csv` (all 50 targets from the roadmap §15, with priority, type, first ask, contact route, status and follow-up columns).

How to operate it:
1. Import into Google Sheets or keep in Excel/CSV.
2. Status values: `Not contacted` → `Sent` → `Follow-up 1` → `Follow-up 2` → `Replied` → `Active` → `Closed`.
3. Set `Next follow-up` = +4 business days after each send (max 2 follow-ups, then close politely).
4. Log the UTM link used per target in the `UTM link` column before sending.
5. Weekly review (Sunday): reply rate, activations, next wave.
