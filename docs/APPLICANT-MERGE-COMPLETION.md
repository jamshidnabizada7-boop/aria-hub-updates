# Applicant platform: source merge completion

The owner authorized completion and merge on October 9, 2026. This supersedes
the historical development-only no-merge wording in the candidate documents.
It does not activate production databases, providers or Oracle services.

## Repairs included

- Integrates main at `7806d653beb49c47ca705f3b14c09ce7c6656a41`.
- Removes the vulnerable braces/micromatch dependency path. A small local
  fast-glob compatibility adapter uses pinned tinyglobby and preserves the
  actual Next ESLint directory-glob contract on Windows and Linux. The strict
  dependency audit remains enabled. No advisory waiver is used.
- Both applicant and employer password updates revoke database sessions and
  outstanding recovery tokens. Reset consumption is atomic under concurrency.
  Login uses a credential snapshot; signed employer cookies also bind that
  snapshot. Disabled accounts cannot issue sessions or reset tokens.
- Account-based authentication throttling survives changing client IPs.
  Cloudflare IP headers are used only when explicitly trusted by configuration.
- Explicit existing-identity applicant enrollment requires password proof and
  grants no organization permissions. Registration and recovery fail honestly
  when email delivery is unavailable.
- User-owned personal-data export excludes credentials and storage keys;
  encrypted CV drafts are decrypted only for their owner. Original CV files
  are downloadable through the existing private library.
- Reauthenticated account deletion disables access immediately, fences CV
  processing, revokes sessions and queues durable remote-object cleanup.
  Failed storage cleanup retains document references and retries. Full user
  deletion happens only after private objects are removed. Organization
  vacancies survive; the user's memberships and private profile cascade away.
- Matching scans rotate least-recently-scanned searches, persist ordered page
  boundaries, and use a dedicated PostgreSQL advisory lock across workers.
  Meaningful content hashes permit changed-listing alerts while ignoring
  translation/import bookkeeping. Archived notification records preserve
  deduplication history.
- Dashboard uses real completion/CV/search/application/unread counts. Profile,
  settings, export, logout-all and archive actions are localized. Public
  navigation follows authentication availability; guest workflows remain usable.
- PWA manifest includes actual 192px and 512px ARIA HUB icons.
- CI adds real database regressions and checks 11 routes in EN/FA/PS at
  375, 390, 768 and 1440 pixels. These tests use synthetic private data.

## Configuration and operations

All existing external-service enablement switches remain opt-in. New settings:

- `APPLICANT_ACCOUNT_DELETION_ENABLED=true` only when the private cleanup worker
  is scheduled, monitored, and has the required private-storage credentials.
- `APPLICANT_TRUST_CLOUDFLARE_HEADERS=true` only behind an ingress that blocks
  direct origin traffic and overwrites client-supplied forwarding headers.
- Run `bun run worker:applicant-privacy --apply` periodically for cleanup.
  Without `--apply`, the command exits without changing data or calling storage.

Deletion has a 20-minute initial grace period for in-flight uploads. A storage
failure leaves the account inaccessible and its cleanup job pending; retries
back off up to one day. Never remove pending job/document rows manually.
Original CVs are retained until their owner deletes them or requests account
deletion. Backups and provider retention must be documented separately in the
deployment's privacy policy. No private data is made public to receive matches.

Before enabling new features, deploy additive migrations to a disposable
staging clone and verify the exact server database role. Run all migrations
with the existing Prisma migration workflow, never production `db push`.
Retain encryption keys securely; synced drafts cannot be recovered without
their key. Keep existing import, translation, MCP and social workers independent.

## External acceptance still required

Source merge is separate from operational launch. Actual private Supabase
storage and role policies, ARM64 OCR/scanner throughput, external SMTP receipt
and bounce handling, physical Android/iPhone push, Meta-approved WhatsApp
templates/cost ceilings, real-user OCR corpus, encryption-key rotation,
performance tests and a remote owner-review hostname require staged acceptance.
Paid providers are not enabled by this change.

The larger 41-phase plan still includes additional admin workflows, deeper
structured profile fields and semantic matching. These are not represented
as accepted merely because this integrated source candidate builds and passes
its source/isolated integration checks. The merge closes the concrete source
and security blockers reported in the preceding review.

## Rollback

Revert the applicant merge commit to restore previous source. Keep additive
tables intact; do not drop private data as a rollback. Disable applicant flags
and external lanes first. Finish already accepted cleanup jobs with a compatible
privacy worker; restoring access to a deletion-requested account is not rollback.
Do not delete ciphertext or encryption keys during application rollback.
