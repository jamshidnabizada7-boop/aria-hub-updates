# ARIA HUB — Milestone 2: CV Library Candidate (not released)

## Status: IMPLEMENTATION STARTED — NOT READY FOR LIVE USERS

Built on `feature/applicant-intelligence-milestone-1` after M1's isolated schema/type/build checks passed.
M1 **full repository security audit and shared-worker/translation tests are NOT green**;
neither milestone is authorized for production.

### New candidate functionality
- `/[lang]/portal/cvs` — localized applicant-only document library.
- `GET /api/applicant/cvs` — returns metadata for current applicant only.
- `POST /api/applicant/cvs` — bound multipart upload (8 MiB maximum; content sniffing; duplicate SHA suppression; rate and per-user document limits), clamscan first, private storage after.
- `GET /api/applicant/cvs/[id]` — applicant-owned file download, no public URLs, no-cache/no-sniff.
- `DELETE /api/applicant/cvs/[id]` — deletes from private bucket then deletes metadata record.
- `ApplicantDocument` metadata + RLS-enabled PostgreSQL migration, no grant to `anon`, `authenticated`, social or translation worker roles.
- PDF, DOCX ZIP package, JPEG, PNG, WebP signature checks and bounded image/ZIP metadata.
- New applicant-focused GitHub candidate CI. Strict original CI is never waived.

### Flags / private environment configuration
- `APPLICANT_AUTH_ENABLED=true` in **staging only** after auth QA.
- `CLOUD_CV_STORAGE_ENABLED=true` in **staging only** after bucket/scanner QA.
- `CV_CLAMAV_ENABLED=true`: requires a working `clamscan` binary on the staging app host. Fail closed if absent.
- `SUPABASE_URL`: trusted HTTPS Supabase Storage project URL, server-only.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only secret; never expose to JS or logs.
- `CV_PRIVATE_BUCKET` e.g. `aria-applicant-cvs` configured **private** and with bucket-level size/type limits.
- `APPLICANT_ALLOWED_HOSTS`: optional staging HTTP Origin guard.
- `PUBLIC_SITE_URL` and SMTP for email verification. No paid AI/WhatsApp needed.

**Absolute restrictions:** no production schema migration, no bucket provisioning in production, no real applicant documents, and no edits to the translation worker/MCP/translation RPCs.

### Remaining before completion
1. Run candidate CI (Prisma fresh DB, typecheck, unit tests and standalone build) and resolve all errors.
2. Perform isolated staging integration tests for private bucket reads/writes, missing service key, forced public-bucket rejection, ClamAV clean/infected/unavailable, cross-account CV ownership, deletion and retries.
3. Implement and benchmark the separate bounded extraction/OCR queue (English/Persian/Pashto), PDF page limits, full decompression and file quarantine checks. Uploaded documents currently do **not** generate applicant qualifications.
4. Review screen: extracted fields with source/confidence, manual correction, merge without overwriting verified data, and explicit consent.
5. Integrate stored profile facts with CV Builder and Opportunity Matcher; extend privacy export/deletion and retention policies.
6. Add audited retry/orphan cleanup for a storage-write success followed by DB write failure and DB delete failure.
7. Explicit owner approval before a candidate or production deployment.

### Security limitations
The current server-only service key bypasses Supabase Storage RLS, so each API route checks applicant identity and DB ownership before storage access. Files are never made public or returned with public signed URLs. An unconfigured scanner blocks uploads; this is intentional.

There is **no OCR or document AI turned on**. This candidate is an encrypted-in-transit, private-upload/library foundation, not an automatic CV analysis or matching release.
