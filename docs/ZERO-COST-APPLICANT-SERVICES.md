# Applicant services on the existing Oracle host

This release adds an encrypted, private Oracle filesystem adapter and direct
standards-compliant web push. Supabase storage remains supported for deployments
that already use it; this host uses Oracle to avoid extra provider costs.

## Private files and OCR

Server-only environment: `CLOUD_CV_STORAGE_ENABLED=true`,
`CV_PRIVATE_STORAGE_PROVIDER=oracle`, `CV_PRIVATE_DIRECTORY` (outside web roots),
`CV_PRIVATE_STORAGE_KEY` (32 random bytes encoded as hex),
`CV_PRIVATE_STORAGE_MAX_BYTES=1073741824`, `CV_CLAMAV_ENABLED=true`,
`CV_CLAMAV_MODE=daemon`, `CV_OCR_ENABLED=true`.

Each file is AES-256-GCM encrypted, with its owner/object path as authenticated
context. Directories have mode 0700, objects 0600, and writes are durable and
exclusive. Application routes authorize ownership before download/delete.
Uploads require valid signatures, bounded sizes, a clean ClamAV scan and a
database reservation. A serialized 1 GiB quota and 2 GiB disk reserve protect
the host from exhausting disk. Maximum 8 MiB per file and ten files per user.

Install current ClamAV signatures, Poppler, unzip and Tesseract eng/fas/pus.
Run `scripts/applicant-cv-extraction-worker.ts --apply` as a bounded background
service. Extraction does not automatically write qualifications: the applicant
must review and approve the suggestions. OCR processes at most three scanned
PDF pages; PDFs over twelve pages are rejected by the processor.

Back up the encrypted objects, database and encryption keys. Restore all three
together. The deployment operator must verify actual storage, antivirus,
extraction, ownership isolation and deletion before enabling live upload.

The existing host is configured with a 256 MiB aggregate live CV allowance
to leave room for two encrypted recovery snapshots and the disk reserve.
This is a bounded service on the existing VM, not unlimited free storage.
The isolated Oracle acceptance script is
`scripts/tests/oracle-private-services.ts`; it uses genuine fictional documents
and refuses any database not named with the `_test` suffix. It verifies the
real ClamAV scanner, encrypted storage, extraction, owner isolation, explicit
review, replay rejection and file deletion without sending external messages.

## Database

The Supabase free egress allowance was exceeded. The deployment moves the
application's public schema to PostgreSQL 17 on the existing Oracle VM,
bound only to loopback. The cutover requires pausing application writers,
dumping and restoring the final public schema, and comparing all table counts
and content digests before activation. Existing limited worker roles and
translation function grants are preserved. The source database remains intact.
Once the destination accepts writes, rolling back to the source requires
copying those new writes back first.

## Push

Use `APPLICANT_PUSH_TRANSPORT=direct`, `APPLICANT_PUSH_DELIVERY_ENABLED=true`,
`APPLICANT_PUSH_SUBSCRIPTIONS_ENABLED=true`, `APPLICANT_CHANNEL_WORKER_ENABLED=true`,
`APPLICANT_VAPID_PUBLIC_KEY`, `APPLICANT_VAPID_PRIVATE_KEY` and
`APPLICANT_CHANNEL_ENCRYPTION_KEY`. Generate VAPID once and keep it stable.

The `web-push` dependency encrypts payloads for the device and signs VAPID.
Only explicitly allowed FCM/Mozilla/Apple hosts are accepted. The outbox retries
transient failures, suppresses revoked consent and disables expired endpoints.
Delivery is at least once; a stable topic collapses outstanding duplicates.
Messages expire after one hour. No notification is enabled automatically.

The device-owner test button sends a real test only on explicit request, after
authentication, saved consent and a rate limit. Provider acceptance does not
guarantee display; device permissions/settings control that. iOS/iPadOS require
Home Screen installation for web push. Physical-device acceptance is separate
from the CI cryptographic and browser checks.

## WhatsApp

The existing Meta connection is a **Test Number**, not a production business
sender. Automated templates must remain disabled until the owner supplies a
real sender, approved verification/match templates and accepts any provider
charges. Zero-cost users can receive in-app and device push alerts instead.
Do not use unofficial WhatsApp session automation or a test sender for public
production accounts. Public WhatsApp share/contact links are separate features.

## Navigation

Desktop navigation starts at 1024 pixels. Opportunities, Tools and Services are
grouped; secondary pages live under More. The logo is the home link. Duplicate
CV/letter/matcher destinations are removed, while opportunity categories get
distinct filter URLs. The mobile sheet has a separate close-button space and
the same normalized navigation.
