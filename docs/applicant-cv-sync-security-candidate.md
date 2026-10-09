# ARIA HUB Applicant CV — Candidate M2/M3 Security and Sync Acceptance

Scope: feature/applicant-intelligence-milestone-1 and draft PR #43.
No production deployment, no Vercel, no Oracle changes, no production database migration.

## Implemented and isolated validation

1. Document upload: file signature, 8 MiB ceiling, image pixel and archive
   bounds, malware scanner fail-closed, private storage. A PostgreSQL parent
   row lock now reserves uploads before cloud transfer and serializes quota
   and same-user SHA-256 checks. 'storing' reservations are not eligible for OCR.
   Failed cloud cleanup remains visible as a reservation, which owners can
   remove once it is stale.
2. Download verifies bytes against stored SHA-256 before responding. Downloads
   are owner-scoped and fail closed for deleting/incomplete files.
3. Delete claims 'deleting' while holding parent/document locks, which
   serialize against review and fence existing worker completion. Private
   storage is removed before DB metadata; on failure the row stays eligible
   for a retry. Unrelated users cannot delete another user's file.
4. Review requires matching source SHA-256, unreviewed document state, owner,
   explicit accepted field list, and atomic profile/document update. No raw
   proposals flow automatically to CV Builder or Matcher.
5. Cloud drafts: separate owner-scoped ApplicantCVDraft model storing AES-256-GCM
   ciphertext with owner/draft-associated authenticated data. Opt-in UI,
   independent local drafts, explicit restore to other devices, revision
   compare-and-swap and remote delete; no automatic uploads unless requested.
   No browser/Supabase anon grants. Per-account maximum 12, per-draft
   plaintext maximum 160 KiB.
6. Matcher: explicit load of user-reviewed education/skills/work facts;
   occupation suggestions from reviewed work history require a user click.
   Never copy nationality, residence or other eligibility attributes out of
   OCR. End-to-end fixture tests call the actual Matcher API with published
   opportunities in an isolated PostgreSQL database.

## Feature gating and required staging configuration

- APPLICANT_AUTH_ENABLED=true (only after separate auth review)
- CLOUD_CV_STORAGE_ENABLED=true, CV_OCR_ENABLED=true for private uploads/review
- APPLICANT_MATCHER_V3_ENABLED=true for account career facts
- APPLICANT_CV_SYNC_ENABLED=true for cloud draft sync (separate opt-in)
- CV_DRAFT_ENCRYPTION_KEY: exactly 32 random bytes hex-encoded (64 hex chars).
  Treat as highly sensitive; back it up securely. Losing it makes synced drafts
  unreadable. Key rotation and recovery need an operator procedure.
- Supply only private service-to-service credentials; never make applicant
  buckets public or expose the DB/table to browser roles.

## Not yet acceptance-proven / release blockers

- Supabase private-object upload/delete/download against a disposable staging
  bucket, including post-delete 404, storage-provider outages and orphan sweeps.
- Session-auth HTTP integration and a two-browser/two-device cloud-sync test
  with actual authenticated applicant accounts and cancellation/conflict UX.
- Physical-phone, EN/FA/PS/RTL accessibility and mobile-browser acceptance.
- Operational encryption-key backup/rotation, data retention, account deletion
  cleanup, scanner performance and private storage costs.
- Strict repository CI dependency advisories remain independent blockers.

All feature flags remain OFF in candidate CI. No external emails, worker
--apply, providers, Vercel or production resources may run as part of tests.
