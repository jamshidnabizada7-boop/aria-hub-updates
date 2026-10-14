# Applicant services and social delivery — verified 14 October 2026

Production runs on Oracle. These changes were deployed from `main` without purchasing a new provider. WhatsApp inbound verification includes an additive database migration.

## Verified repairs

- **Private CVs:** Oracle free disk space had fallen below the 2 GB storage reserve. Only disposable build caches from inactive releases were removed. The reserve, virus scanning, encrypted files and account ownership checks remain enabled. Production HTTP checks passed upload, byte-identical owner download, another account's denial, local extraction and explicit owner review before saving qualifications.
- **Career Copilot:** the AI switch was off and the previous model had been retired. The existing configured provider now uses an available model. Persian generation passed with fictional test context, account quota and consent. No real CV was sent for verification.
- **Application Tracker:** creating an entry, updating its status and denying another account passed production HTTP checks.
- **Email:** both worker services load the existing SMTP configuration. A category digest and an applicant matching digest were accepted by SMTP. An immediate second run sent nothing. Acceptance does not prove inbox receipt.
- **Organizations:** the invalid generic model panel was replaced by the canonical organization manager. It displays 305 existing organizations, real name/country/website fields, identity editing, claims and official sources. Verification remains an administrator's review decision.
- **Messages:** Contact Messages offers read/reply controls, an email reply draft and persisted read/replied/archived status. Preparing a draft or changing status does not send an email.
- **Applicant operations:** readable counters, service readiness, failed extraction retry, employer review, subscriber management and inbox actions are available. Applicant documents remain private to their owners.

## Email schedules and subscriber management

`aria-hub-applicant-email.timer` checks matching alerts every 15 minutes. `aria-hub-opportunity-email.timer` checks category digests hourly. Each recipient's consent and daily/weekly frequency decide whether a message is due; checks do not imply email every 15 minutes or every hour. No new eligible matches means no send. A durable delivery ledger suppresses duplicate sends and preserves uncertain outcomes for review.

Alert Subscribers manages opportunity category, language, status and frequency, with the last digest date. Email Subscribers is a separate newsletter list; those contacts were not automatically opted into job alerts. Applicant operations shows provider acceptance and matching delivery counters.

## Social publishing

- **Instagram:** `@aria___hub` now publishes through Oracle alongside the configured Facebook Page campaign workflow. Actual delivery: https://www.instagram.com/p/DecjowEkkTM/. The approved credential is encrypted on Oracle. Meta reports no fixed Page-token expiry, but can revoke access and still enforces data-access renewal. No credential is guaranteed to work forever.
- **WhatsApp Channel:** a native Channel update was verified Sent at 00:25 Asia/Karachi on 14 October. Channel publishing uses the desktop browser, not the Cloud API sender. The lossless 2160-pixel master was uploaded; WhatsApp refused its HD option, so transmission is not described as HD.
- **LinkedIn company:** native company publication was verified: https://www.linkedin.com/feed/update/urn:li:share:7515856201406980096. Company API authorization remains a provider requirement; the personal LinkedIn destination already runs on Oracle.
- **WhatsApp private alerts:** the real +93 700 876 806 sender is active under Ahmad Jamshid's portfolio (`697964186714313`), messaging account `371350886051089`, phone ID `391497570703612`, with mobile-app coexistence. With explicit approval, Ahmad and AutomationBot have full access, MY ARIA HUB is Live, and the signed Oracle webhook subscribes to `messages` only. The user's genuine incoming verification succeeded, Oracle sent one free connection response, and the user confirmed receiving it on 14 October. The system-user credential reports no fixed expiry but remains revocable. Paid templates remain blocked; the rejected authentication template is unnecessary for inbound verification.
- **Owned WhatsApp group:** accepts reviewed remote work only. No eligible package was available for this run.
- **Facebook groups:** the admin section prepares matches, captions and a manual posting handoff. It does not automatically publish to groups from Oracle. A destination marked active is not proof of membership or permission to promote links.
- **Facebook profiles:** Mosa's saved native login worked. A Public campaign with a real Ahmad tag was published and verified at https://www.facebook.com/photo/?fbid=122166521012650448. Default account privacy was not changed. Browser delivery must use the explicitly authorized Mosa identity; do not duplicate the Page's Oracle post or substitute an unrelated profile.

Desktop sharing remains scheduled at 08:35, 13:35 and 19:35 Asia/Karachi, requiring the computer and Codex to stay running. Its prompt now records Instagram's Oracle delivery. Each destination requires fresh eligibility checks, a durable reservation, one send, native proof and completion. Failed or unknown sends must never be blindly replayed.

## Verification and rollback

Relevant automated checks: 53 tests, including real local SMTP/digest duplicate suppression, private CV HTTP flows, extraction review, organization validation and WhatsApp Test Number readiness. TypeScript checking passed. Synthetic production verification records and files were removed afterward.

Current web release: `/opt/aria-hub/releases/20261014-whatsapp-free-6f2e84c`, with the standalone installer update from `de07c57`. It contains the updated browser-share helper, which rejects stale deadline artwork and generates its caption from current data. Previous release links and restricted configuration backups remain available on Oracle. Credentials and private applicant files are never stored in this document or Git.

## Strict zero-spend WhatsApp path

The user reaffirmed zero spend on 14 October. Default-deny gates block all template sends and scheduled social sends. No billing method, paid provider, account migration or deletion is authorized. Do not switch those gates because a token/identity check passes.

The free transport uses a customer-initiated service window, with a five-minute safety margin below Meta's 24 hours. A signed inbound webhook can verify a short-lived, high-entropy challenge sent by the exact applicant-declared number. Number ownership and consent are separate from a public Channel subscription. Only hashed lookups and encrypted numbers are stored; unrelated chats, message bodies and contact names are discarded. STOP revokes consent. Old, wrong-account, wrong-phone and future webhook events cannot extend the free window. A user must initiate another message to reopen it; email/push/public Channel remain alternatives outside that window.

Endpoint: `https://www.myariahub.com/api/webhooks/whatsapp`. It checks Meta's raw-body HMAC signature. The existing app secret is privately installed, the app is Live, and the real messaging account subscribes to this app. These exact persistent changes were approved and completed. Only the `messages` field is subscribed; unrelated chat bodies, names, history and contact synchronization are not stored. A real signed inbound and a recipient-confirmed free response passed end to end.

`scripts/install-whatsapp-free-connection.ts` validates the actual sender and approved match template before preparing configuration. It is read-only unless `--apply`, backs up the encrypted prior channel record, keeps social/paid sends disabled, creates a restricted environment file and never prints credentials. It refuses to overwrite an existing environment file on a repeated run. Load that file last in the relevant services. It intentionally omits the app secret and leaves activation flags false.

The channel worker stores the provider acceptance ID. Stale WhatsApp claims and lost/ambiguous send responses become `review`, never automatic replays. An API acceptance is not a delivery receipt. Expired free windows defer without consuming failure attempts; expired opportunities and withdrawn consent suppress the pending send. Never clear unresolved reservations automatically.

Verification: 12 targeted tests passed in an isolated local Postgres database, covering forgery rejection, ownership, consent, expiry, encrypted storage, template cost gates and unknown outcomes; TypeScript passed. Production activation and the real recipient test subsequently passed.

Oracle build and preflight passed. The additive migration was applied to local Oracle Postgres after a restricted schema backup. `/etc/aria-hub/whatsapp-free.env` contains the privately copied existing credential and correct sender. Inbound, verification and free delivery flags are now enabled; strict zero spend remains true and billable sends false. Web and applicant-channel services load this file last. The obsolete self/test recipient was cleared, the encrypted prior record was backed up, and the generic social WhatsApp switch remains disabled. Web health passed; unauthenticated applicant requests remain denied. The matching timer checks every five minutes and the channel outbox timer every minute. Only actual matching, published, non-expired opportunities with active consent and a current free window can send; an empty match list does not generate a test or invented opportunity.

The user approved switching MY ARIA HUB to Live, subscribing incoming business-message events to Oracle, and privately storing its existing app secret for signature verification. This scope is complete. Password/security-code entry remains a user handoff. Paid sends and billing remain unapproved.

### Real free response proof

At 05:51:50 UTC on 14 October, Meta accepted the requested connection response. The user then explicitly confirmed receipt in this chat. The unique `AutomationState` claim `whatsapp-free-connection-test-20261014-cmv7oq94m000pljeeeeqyfspn` is `recipient_confirmed`; never replay it. Its provider message ID remains in the restricted database ledger. Portal proof: `work/social-connection-evidence/whatsapp-private-verified-20261014.png` in the parent workspace. This proves the private text transport, not Channel/group publishing or a future matching alert.

### Existing WhatsApp group limitation

Meta's Groups API documentation (updated 16 June 2026, checked 14 October) requires an Official Business Account, caps each API group at eight participants and explicitly excludes WhatsApp Business app phone numbers. The existing sender uses Business app coexistence and the owned group has 27 members; this API cannot attach that existing group. Do not create a substitute group, migrate/delete the mobile account or invite people as a workaround. Source: https://developers.facebook.com/documentation/business-messaging/whatsapp/groups . The public Channel and existing group remain desktop destinations.
