# ChatGPT Translation Gateway

**Status: READY — automation NOT enabled.** The four operations below are live
on production and fully tested; nothing calls them automatically yet. Enabling
the ChatGPT scheduled task is an owner action (checklist at the bottom).

## Purpose

Let a ChatGPT scheduled task translate 30–50 pending opportunities per hour
(English source → Persian/Afghanistan → Pashto) without ever exposing the
database, the service-role key, or any arbitrary SQL surface to ChatGPT.

```
ChatGPT (scheduled task, bearer credential)
  → HTTPS www.myariahub.com/api/translation-gateway/*   (this repo, auth + rate limit + logs)
    → Postgres RPCs as role aria_translation_worker      (zero table privileges)
      → SECURITY DEFINER functions                       (the only writers)
        → Opportunity translation fields
```

## Security model

- **Dedicated DB role `aria_translation_worker`** — created by migration
  `20261007120000_translation_gateway`. LOGIN but passwordless out of the box;
  the password is set once, out-of-band, and stored only in the gateway's env
  (`ARIA_TRANSLATION_DATABASE_URL` on the Oracle VM). The role holds **zero
  table privileges** — no SELECT, no INSERT, no UPDATE, no DELETE, no DDL, no
  superuser. Its entire capability is EXECUTE on the four RPC functions.
- **SECURITY DEFINER RPCs** — `claim_translation_batch`,
  `commit_translation_batch`, `fail_translation_batch`,
  `translation_queue_status`. EXECUTE revoked from PUBLIC, granted only to the
  worker role. They run with `SET search_path = ''` and never touch
  publication state (`status`, `featured`, `verificationStatus`, autoPublish).
- **RLS untouched** — row level security stays enabled exactly as configured.
- **Gateway auth** — `Authorization: Bearer <token>` checked against
  `TRANSLATION_GATEWAY_TOKENS` (`name:token` pairs, comma-separated, timing-safe
  compare). Revoke = remove the pair from web.env + restart. Rotate = add a new
  pair, delete the old one.
- **Rate limit** — 30 requests / 10 min per token (in-memory), 8 MB body cap,
  60 s cache on the status endpoint.
- **Logging** — one JSON line per request to journald (`aria-hub-web`):
  timestamp, action, token NAME (never the token), claim id, counts, duration,
  outcome. Every RPC also writes an `AuditLog` row
  (`translation_claim|commit|fail`) with counts only — no content, no secrets.
- **Never returned to ChatGPT**: DB credentials, unrelated tables, users,
  admin data. Claim responses contain only the translatable public source
  fields of the claimed rows plus `id` / `sourceHash` / `needFa` / `needPs`.

## The four operations (POST, JSON)

| Endpoint | Body | Returns |
| --- | --- | --- |
| `/api/translation-gateway/claimTranslationBatch` | `{limit?, charBudget?, includeExpired?}` (limit 1–50, default 30) | `{ok, claimId, claimedAt, expiresAt, count, chars, items:[{id, sourceHash, needFa, needPs, fields:{title, description, summary, …}}]}` |
| `/api/translation-gateway/commitTranslationBatch` | `{claimId, translations:{items:[{id, sourceHash, fa:{…}, ps:{…}}]}}` | `{ok, claimId, committed, faCompleted, psCompleted}` |
| `/api/translation-gateway/failTranslationBatch` | `{claimId, errors?}` | `{ok, claimId, released}` |
| `/api/translation-gateway/translationQueueStatus` | `{}` | `{ok, queue:{pending, pendingFa, pendingPs, stale, processing, claimedExpired, manual, manualStale}}` |

Behavior guarantees (all enforced **in the database**, not the app layer):

- **Claim** uses `FOR UPDATE SKIP LOCKED` — two concurrent claimers can never
  receive the same row. Priority: publication-ready → closing soon → promoted
  → official source → recent active → older backlog. A total source-character
  budget (default 250 000) stops 50 huge records from monopolizing a batch.
  Claims stamp `translationClaimedBy/At/Id` and expire after **90 minutes** —
  expired claims are safely reclaimable, so a crashed ChatGPT run cannot
  strand rows (or call `failTranslationBatch` to release immediately).
- **Commit** is all-or-nothing in one transaction. Per item it re-checks:
  claim membership, claim expiry, **sourceHash unchanged** (a live hash of the
  chunked source fields — identical algorithm to the in-app engine, verified
  byte-for-byte over the whole production corpus), manual provenance
  (`translationOrigin` MANUAL/MANUAL_STALE → rejected), the complete field set
  per language (missing or unknown fields → rejected), URL / email / critical
  number preservation (digit-normalized, so ۵۰ == 50), and sanity ratios.
  **Persian must be complete (in this commit or already) before Pashto is
  accepted.** A language is only ever marked complete when its entire field
  set validated.
- **Fail** releases every row of the claim immediately → retryable.
- **Manual protection** — rows with `translationOrigin: MANUAL` are never
  claimed and never overwritten; if the source changes under a manual
  translation, the claim's stale sweep flips it to `MANUAL_STALE` (human
  review) instead of re-translating.
- **Publication** — completion never publishes anything; all existing
  verification / moderation / autoPublish gates are untouched.

OpenAPI spec for the ChatGPT connector: `docs/translation-gateway.openapi.yaml`.

## Chunk/hash parity contract

The SQL helpers `aria_tgw_chunk_text` / `aria_tgw_source_plan` are byte-exact
twins of `src/lib/ai/translate-chunks.ts` `chunkText` (codepoint semantics,
classic ASCII trim set) and the engine's `planFields`/`sourceHashOf`. If either
side changes without the other, every committed source hash is invalidated.
Re-verify after ANY change to either implementation:

```
bun scripts/tgw-hash-parity.mjs          # TS vs SQL over the live corpus; must print 0 mismatches
```

## Deployment / operations (Oracle VM)

- Gateway code ships inside the Next.js release (`oracle-deploy.sh <sha>`).
- Env (in `/etc/aria-hub/web.env`, root:ariahub 640):
  - `ARIA_TRANSLATION_DATABASE_URL` — session-pooler URL for
    `aria_translation_worker.<project-ref>` (never exposed to ChatGPT).
  - `TRANSLATION_GATEWAY_TOKENS` — `chatgpt-hourly:<64-hex>` (+ future names).
- Rotate/revoke: edit web.env → `sudo systemctl restart aria-hub-web`.
- Logs: `journalctl -u aria-hub-web -o cat | grep '"gw":"translation"'`.
- Kill switch: remove the token pair (or `sudo systemctl stop aria-hub-web`
  is NOT required — the RPCs are inert without a valid credential).
- DB-level kill switch: `REVOKE EXECUTE ON FUNCTION
  public.claim_translation_batch(int,int,boolean,text) FROM
  aria_translation_worker;` (and the other three).

## Enabling automation (owner action — NOT done)

1. Confirm the queue report (`translationQueueStatus`) looks sane.
2. Create the ChatGPT scheduled task with the connector + bearer credential
   (credential value lives in web.env / the owner's password manager — never
   in chat or git). Suggested cadence: hourly.
3. Task instructions (paste verbatim):

   > You are the ARIA HUB translation worker. Call
   > POST /api/translation-gateway/translationQueueStatus first. Then call
   > claimTranslationBatch (default limit). For every item: translate EACH
   > provided field into Persian (Afghanistan) and Pashto — translate the
   > meaning completely, never summarize or invent, mirror line/bullet
   > structure, keep every URL, email address, number/amount, date and
   > organization name exactly (Persian or Pashto digits are fine). Pashto
   > only when Persian is also provided or already complete. Then
   > commitTranslationBatch with the same sourceHash you received. If an item
   > cannot be translated, commit the ones that can and report the rest via
   > failTranslationBatch. Never retry more than twice; report errors and stop.

4. After the first run: check `journalctl` lines + `translationQueueStatus`
   deltas + spot-check one committed record on the site (FA/PS pages).

## Rollout record (2026-10-07)

- Migration `20261007120000_translation_gateway` (role, grants, RPCs) applied
  to production; role password set out-of-band.
- Test evidence: `tests/translation-gateway-rpc.test.ts` — 17 tests covering
  concurrent claim disjointness, manual/expired handling, claim expiry,
  sourceHash guard, Persian-first gating, manual overwrite protection,
  URL/email/number preservation, atomicity, fail→retry, 30/50 batch bounds,
  and the worker-role privilege boundary. Full suite: 498 tests, 0 failures
  (twice consecutively). Hash parity: 1204/1204 production rows identical.
