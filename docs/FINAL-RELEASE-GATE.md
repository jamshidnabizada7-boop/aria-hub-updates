# Final release gate — 26 September 2026

## Decision and scope

PASS for the locally reviewed release candidate, subject to the production prerequisites below. This is not authorization to push main, deploy, migrate production or enable automation. No production database was accessed and no live social post was sent during this gate.

Branch: `release/aria-hub-platform-integration`.

- Starting integration commit: `2875a1323fd6009d00318a75407650acb060b691`.
- Main: `18158a96270346521a4bb69e47b5ef17dc798da0`, reconfirmed using GitHub's commits API on 26 September after Git transport reset its connection.
- Final candidate: the local commit containing this report; obtain the exact immutable SHA with `git rev-parse HEAD`. The release response records that SHA.
- Review the complete changes with `git diff 18158a96270346521a4bb69e47b5ef17dc798da0 HEAD`. The accompanying FINAL-RELEASE-DIFF.txt lists every changed path.

## Incorporated and excluded work

| PR | Head reviewed | Disposition |
| --- | --- | --- |
| #1 | d26b8bb08a6c1061d2c8e93ff9c38f675de4eb9f | Facebook Groups; ancestor |
| #17 | 73c84cf44047dab0a71bbe1a09f69552c00a5ed1 | Premium Studio; ancestor |
| #18 | 6b2861f1049eecb380080d2270f1018481c594cc | Lifecycle/count functionality incorporated; this later head is not an ancestor. Admin count/UI files match; policy/orchestrator deliberately corrected to the requested lifecycle rules. |
| #19 | c52ef05de1a0a53fc36fb9fbecea4400f5a090c9 | Opportunity planner; ancestor |
| #20 | 8168a5bbae5d08fb6628de3956d0a20a221d1b94 | Delivery/media; ancestor |
| #21 | b49a4ea5f6695e1c7d607551ea9ad1d30657e2fc | Meta; ancestor |
| #22 | dfbea88958e5ffbde57510ac6de6ea727d2a31b9 | LinkedIn; ancestor |
| #23 | 4bcdd2820600fa7c2c493f525630beb1ceebe497 | WhatsApp modes; ancestor |
| #25 | ac2f1513aaefbfe51a5ef6bc61a784b238d9f2eb | Independent social worker; ancestor |

The stack follows #18 → #19 → #20 → #21 → #22 → #23 → #25; #1 and #17 were merged separately. The later #18 head was reconciled by content rather than redundantly merging divergent lifecycle changes. Excluded: #24 (closed duplicate lifecycle), #16 (overlapping draft Studio), and unrelated video drafts #2–#15. No additional open PR was created.

## Findings fixed during the independent gate

1. Standalone Bun worker failed on `server-only` imports. The script now supplies the react-server condition, validates production configuration, has a one-cycle smoke mode, and disconnects on shutdown.
2. Stale publishing claims and network uncertainty could trigger duplicate sends. Manual and worker publication now share atomic queue/destination claims. Unknown final outcomes block for external reconciliation; successful destinations cannot be forced to repost. Due selection skips exhausted/blocked destinations so they cannot starve other posts.
3. Missed schedules could burst after downtime. Actual automatic attempts reserve a database-backed two-minute interval. Public eligibility is rechecked before sending.
4. Media failures were not retried, and Blob rendering unnecessarily wrote to an ephemeral/read-only public directory. Rendering now uses bounded independent retries, an in-memory JPEG screenshot, public Blob verification and guarded completion. Opportunity posts never fall back to text-only. Added render retry migration.
5. Studio used different content identities from the worker and retained stale rendered media. Shared advisory locking normalizes queue identities, prevents concurrent duplicate ensure-row requests, preserves attempted deliveries and invalidates unattempted images after edits. Persisted media/title overrides and Afghanistan dates are consistent.
6. Automatic localized plans could refer to different opportunities. One candidate selection now supplies all caption languages. Priority and repeat exclusion happen before limiting candidates. Concurrent builders produce 40 unique posts only with eight five-post windows.
7. Imports could overwrite a concurrent admin lifecycle change. Existing-record updates omit status, preserving all four moderation states. New records follow autoPublish exactly; date-based public filtering separately hides past deadlines.
8. Image fetch DNS rebinding, render-token URL exposure, weak cron comparison, error-token echoes and missing production encryption-key failures were closed. Social mutation endpoints require super_admin, admin or content_manager, consistent with group publishing permissions.
9. Group auto matching ignored explicit manual selection, and job actions bypassed emergency pause. Both now respect the configured group mode/pause without changing Page automation.
10. The public E2E test selected the Saved opportunities navigation link. It now selects a record from the public API and verifies its actual detail title and document language/direction.
11. Dependency audit found critical Next.js/image-processing issues and other transitive advisories. Updated Next.js/eslint-config-next to 16.3.6, Sharp to 0.35.4, Prisma/client to 6.19.3, and compatible affected transitive packages. Narrow overrides patch pinned deepmerge-ts 8.0.0, js-yaml 4.3.2 and prismjs 1.30.0. Prisma operations, build and browser checks passed with these overrides. CI now checks high/critical dependency advisories.

Maintainer sources: [Next.js image advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [Sharp advisory](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c), [deepmerge advisory](https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx). No major Next.js migration was needed; the project was already on version 16.

## Verification evidence

Final application/dependency tree, isolated PostgreSQL 18 on 127.0.0.1:5544, database `aria_release_test`:

| Check | Result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed; no lockfile changes |
| `bunx prisma validate` | Passed |
| `bun run db:generate` | Passed, Prisma 6.19.3 |
| Six migrations on initially empty local database | Applied successfully; subsequent deploy has no pending migrations |
| `prisma migrate diff --from-url ... --to-schema-datamodel prisma/schema.prisma --exit-code` | No difference |
| `bunx tsc --noEmit` | Passed |
| `bun test ./tests/` with REQUIRE_TEST_DATABASE=1, TEST_BASE_URL and E2E=1 | 117 passed, 0 failed, 0 skipped; 763 assertions |
| `bun run build` | Passed, Next.js 16.3.6; 50 static pages generated |
| `bun audit --json` | `{}`; no known advisories returned |
| `bun run worker:social --once` | Passed; zero errors, idle heartbeat, clean exit |
| `scripts/release-browser-check.ts` against production build | Five role-denial endpoints; authenticated save/reload/ensure-row; private-media rejection; render authentication; two legacy and twelve premium canvases; real 1080×1080 PNG download |

The browser render matrix includes en/fa/ps and square/portrait/story dimensions, decoded built-in media, QR readiness and a literal `100%` title to catch double-decoding. No browser page exceptions occurred. Pipeline platform behavior is tested with mocked HTTP, including per-destination success preservation, unknown outcomes, permission failures, no image-to-text downgrade and official API request shapes.

Repository historical phase3/phase4 self-test scripts contain superseded assumptions and are not release gates; the maintained publish-safety suite exercises the current claims, retries, pacing, planner, Studio identity and idle worker behavior. A benign build warning notes the unrelated parent checkout's lockfile; Next.js 16.3.6 ignores it because it is outside this Git repository.

## Migrations and data compatibility

Reviewed baseline plus five additive migrations:

- `000000000000_init`
- `20260924184500_facebook_group_distribution`
- `20260925095000_social_delivery_tracking`
- `20260925160000_manual_social_queue_rows`
- `20260925170000_schema_reconciliation`
- `20260925200000_render_retry_tracking`

No DROP TABLE, DROP COLUMN, TRUNCATE or data-delete statements. Unique queue/channel, queue/group, campaign source and queue content/time constraints support deduplication. Delivery queue deletion cascades; channel deletion is restricted. Group timestamp defaults align with Prisma. Existing rows receive safe false/zero defaults. StudioVisual IF NOT EXISTS requires comparison with any table previously created using db push. The production baseline must only be marked applied after proving it matches the existing schema; both DATABASE_URL and DIRECT_URL must target the intended database. See DATABASE-MIGRATIONS.md.

## Security status

The user explicitly confirmed the historical production database credential was rotated and the old value revoked. This is an owner attestation, not a login attempt with the revoked value. History was not rewritten. A current tracked-text scan for credentialed database URLs, private keys and common platform-token prefixes found only four reviewed template/example lines (Compose environment interpolation and OLD-HOST/NEW-HOST placeholders), with no live credential identified. This pattern scan and dependency audit are evidence, not a guarantee against every vulnerability.

Admin/cron authentication, constant-time secret matching, scoped render cookie, public-media URL/DNS validation, bounded media reads, encryption enforcement, redacted platform errors and fixed/bound SQL were reviewed. No arbitrary SQL input or unofficial social browser/QR/session transport was introduced.

## Platform verification limits

- Meta uses centralized v26.0, supported by Meta's [official SDK changelog](https://github.com/facebook/facebook-ios-sdk/blob/main/CHANGELOG.md). Required-image Facebook/Instagram behavior was checked in code and mocks. Meta reference pages were rate-limited during review, so account-level publishing compatibility is not claimed.
- LinkedIn uses REST Images/Posts, version 202609 and validated organization/person URNs. See [official versioning](https://learn.microsoft.com/en-us/linkedin/marketing/versioning?view=li-lms-2026-09) and [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-09). No ugcPosts/assets publishing path remains. Organization posting requires approved permissions and a suitable organization role.
- WhatsApp individual image requests use the official messages shape ([Meta collection](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)). Recipient eligibility and messaging-window rules still apply; template messaging is not implemented. Channel mode fails unsupported. Groups remain disabled by default because the endpoint/account entitlement could not be independently verified; do not set WHATSAPP_GROUPS_API_ENABLED until that verification is complete.
- Facebook Groups provide manual assistance only; no deprecated Groups publishing API or social browser automation.
- X has no implemented image transport and blocks required-image opportunities. Telegram image failures do not downgrade required-image posts.
- No live external publish, real Blob upload, account token validation, Linux/ARM Oracle run, or production migration was performed.

## Production prerequisites and operating costs

1. Separate authorization for deployment/main push. Back up and reconcile the production baseline/StudioVisual state on a staging clone, then apply reviewed migrations in order.
2. Provision shared encryption and render secrets, canonical trusted HTTPS render origin, public Blob access, Oracle service user and compatible Chromium/OS libraries. Rehearse service shutdown/restart on the actual host; the Windows one-cycle smoke is not proof of Oracle/systemd behavior.
3. Smoke-test one image post per intended destination with authorized account permissions; keep unverified/unsupported destinations disabled. Verify the public Blob URL from outside the worker.
4. Configure daily target plus enough batch windows; 30 requires six, 40 requires eight at five per batch. Reconcile any pre-existing blocked/unknown deliveries before manually retrying them.
5. Monitor worker heartbeat and memory. The 1800 MB service ceiling requires host headroom and an architecture-compatible Chromium installation.
6. Set retention for queue/delivery/run history and Blob objects. Healthy idle ticks create no PipelineRun rows but perform about three fixed-row writes/minute. Repeated infrastructure errors do add run history. There is no automatic Blob or PipelineRun retention deletion in this tree. Media smoke samples were roughly 68–143 KB JPEG: about 61–129 MB/month at 30/day before retries/transfer. Six destinations add up to 180 delivery rows/day. An Oracle worker using a Vercel render origin still consumes Vercel runtime/transfer, and Blob storage/transfer is an ongoing dependency. Provider free-tier sufficiency has not been demonstrated.

See SOCIAL-PUBLISH-WORKER.md for the configuration and recovery procedure. Production automation remains disabled by this release process until the user's next authorization.
