# Applicant services and social delivery — verified 14 October 2026

Production runs on Oracle. These changes were deployed from `main` without a database migration or purchasing a new provider.

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
- **WhatsApp private alerts:** the original saved sender was a Meta Test Number. The real +93 700 876 806 sender already exists under Ahmad Jamshid's portfolio (`697964186714313`), messaging account `371350886051089`, phone ID `391497570703612`, with mobile-app coexistence. Ahmad and AutomationBot were assigned full access with explicit approval. The system-user credential reports no fixed expiry. Marketing template `aria_opportunity_alert_v1` is approved in `en_US`; verification-template creation still fails at Meta with an account/app permission error, including through the owner UI after assignment. The app is in Development mode and the real WABA has no subscribed app/webhook. These are activation blockers, not proof of working delivery.
- **Owned WhatsApp group:** accepts reviewed remote work only. No eligible package was available for this run.
- **Facebook groups:** the admin section prepares matches, captions and a manual posting handoff. It does not automatically publish to groups from Oracle. A destination marked active is not proof of membership or permission to promote links.
- **Facebook profiles:** Mosa's saved native login worked. A Public campaign with a real Ahmad tag was published and verified at https://www.facebook.com/photo/?fbid=122166521012650448. Default account privacy was not changed. Browser delivery must use the explicitly authorized Mosa identity; do not duplicate the Page's Oracle post or substitute an unrelated profile.

Desktop sharing remains scheduled at 08:35, 13:35 and 19:35 Asia/Karachi, requiring the computer and Codex to stay running. Its prompt now records Instagram's Oracle delivery. Each destination requires fresh eligibility checks, a durable reservation, one send, native proof and completion. Failed or unknown sends must never be blindly replayed.

## Verification and rollback

Relevant automated checks: 53 tests, including real local SMTP/digest duplicate suppression, private CV HTTP flows, extraction review, organization validation and WhatsApp Test Number readiness. TypeScript checking passed. Synthetic production verification records and files were removed afterward.

Current web release: `/opt/aria-hub/releases/20261013-applicant-services-0e55b75`. The current release also contains the updated standalone browser-share helper from `0675a39`, which rejects stale deadline artwork and generates its caption from current data. Previous release links and restricted configuration backups remain available on Oracle. Credentials and private applicant files are never stored in this document or Git.

## Strict zero-spend WhatsApp path

The user reaffirmed zero spend on 14 October. Default-deny gates block all template sends and scheduled social sends. No billing method, paid provider, account migration or deletion is authorized. Do not switch those gates because a token/identity check passes.

The free transport uses a customer-initiated service window, with a five-minute safety margin below Meta's 24 hours. A signed inbound webhook can verify a short-lived, high-entropy challenge sent by the exact applicant-declared number. Number ownership and consent are separate from a public Channel subscription. Only hashed lookups and encrypted numbers are stored; unrelated chats, message bodies and contact names are discarded. STOP revokes consent. Old, wrong-account, wrong-phone and future webhook events cannot extend the free window. A user must initiate another message to reopen it; email/push/public Channel remain alternatives outside that window.

Endpoint: `https://www.myariahub.com/api/webhooks/whatsapp`. It rejects requests until configured, then checks Meta's raw-body HMAC signature. The existing app secret must be installed privately before enabling inbound processing. The app must be Live and subscribed to the real messaging account. Those persistent access changes require action-time approval through Computer Use; preparing code or an inactive environment file is not activation. Do not claim verification/delivery before a real signed inbound and a real free response have been observed.

`scripts/install-whatsapp-free-connection.ts` validates the actual sender and approved match template before preparing configuration. It is read-only unless `--apply`, backs up the encrypted prior channel record, keeps social/paid sends disabled, creates a restricted environment file and never prints credentials. It refuses to overwrite an existing environment file on a repeated run. Load that file last in the relevant services. It intentionally omits the app secret and leaves activation flags false.

The channel worker stores the provider acceptance ID. Stale WhatsApp claims and lost/ambiguous send responses become `review`, never automatic replays. An API acceptance is not a delivery receipt. Expired free windows defer without consuming failure attempts; expired opportunities and withdrawn consent suppress the pending send. Never clear unresolved reservations automatically.

Verification: 12 targeted tests passed in an isolated local Postgres database, covering forgery rejection, ownership, consent, expiry, encrypted storage, template cost gates and unknown outcomes; TypeScript passed. Production activation remains separately gated.
