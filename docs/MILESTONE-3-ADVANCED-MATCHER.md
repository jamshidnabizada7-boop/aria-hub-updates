# ARIA HUB Milestone 3 — Advanced Opportunity Matching (candidate)

**Status:** implemented feature slice in an isolated GitHub feature branch; not merged or deployed.

## Current changes

- Curated language-neutral taxonomy of 30 roles; multilingual English/Persian (Afghanistan)/Pashto names and explicit synonyms.
- Existing four-step public Quick Match preserved and backwards compatible.
- Deterministic role filter: explicitly selected job roles must match advertised title or jobType. An unrelated job is excluded rather than boosted by a shared category.
- Afghan province preferences use canonical 34-province `OpportunityLocation` records, not organization names or unsourced location guesses. Unknown provinces are disclosed as unknown.
- Additional career skills and work arrangement contribute evidence without pretending unknown eligibility, salary, work authorization or experience is verified.
- Advanced Matcher at `/[lang]/portal/matcher`, with five progressive sections (goals/roles, education, experience/skills, eligibility/location, review/results).
- Advanced Matcher requests `explainWithAi:false` so the normal deterministic ranker works without exhausting free-LLM quotas. Original Quick Match AI explanations unchanged.
- Private user-owned saved searches: list/create/update/activate/deactivate/delete, max 10 per applicant, rate-limited and guarded by Origin + session and owner checks.
- Separate `verifiedCareerFacts` user-reviewed profile data to power matching without trusting as-yet-unfinished CV extraction/OCR.
- RLS-enabled saved-search table; never grants browser `anon` or `authenticated` roles access.
- Saved search creation explicitly DOES NOT enable notification delivery; consent and queue belong to Milestone 4.

## Security / gates

- `APPLICANT_AUTH_ENABLED=true` and `APPLICANT_MATCHER_V3_ENABLED=true` required in authorized staging only. Default M3 disabled.
- No production DB schema migrations or Vercel/Oracle deploy.
- Existing free-LLM translation, importing, social, MCP and gateway services unchanged.
- No attached CV bytes are sent to Matcher. Applicant may manually approve career facts; M2 OCR and document extraction remain unfinished.
- No automatic outreach or notification on saved searches.
- Existing nationality/education/experience conflicts remain authoritative even when role is a strong match.
- Staging acceptance must verify full EN/FA/PS, responsiveness, authenticated RLS isolation, private data, employer/auth edge cases and realistic false-match corpus.

## Required before merge or release

1. CI and tests green; applicant candidate run must include `tests/applicant-matcher-m3.test.ts` and `tests/opportunity-matcher.test.ts`.
2. Strict full-repo audit: four inherited high severity dependencies (Next.js/Sharp/braces/source-map-js) must be resolved without waiver.
3. Full-suite shared-worker group/translation gateway/AI failover errors must be investigated with isolated DB fixtures.
4. Milestone 2 CV parsing/structured extraction and user correction/review must actually work before claiming uploaded PDF/DOCX/photo-to-matcher automatic flow.
5. Real staging browser tests and owner's acceptance before merge/deploy.
6. Review RLS for the exact production Next.js DB login role in a staging Supabase clone: Postgres table ownership/BYPASSRLS vs policy changes. Do not grant all-user table access to untrusted roles.
7. Confirm saved-search retention/deletion and rate limiting under concurrent writes.
8. Add personalized alert consent/delivery only in Milestone 4.
