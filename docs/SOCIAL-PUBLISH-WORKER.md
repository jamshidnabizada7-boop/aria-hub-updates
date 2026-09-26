# ARIA HUB Social Publishing Worker

The persistent worker plans opportunity posts, renders media, publishes due destinations and records a heartbeat. It does not scrape or translate. Use one persistent Oracle worker as the primary scheduler; the authenticated web tick is an administrative backstop.

## Required environment

Create `/etc/aria-hub/social-worker.env` with mode 600, readable by the service:

```bash
DATABASE_URL='postgresql://...'
DIRECT_URL='postgresql://...'
NEXT_PUBLIC_SITE_URL='https://www.myariahub.com'
SOCIAL_RENDER_BASE_URL='https://www.myariahub.com'
CREDENTIALS_SECRET='<same encryption secret as web app>'
SOCIAL_RENDER_TOKEN='<same strong random token as web app>'
BLOB_READ_WRITE_TOKEN='<public Blob store token>'
SOCIAL_REQUIRE_DURABLE_MEDIA='1'
SOCIAL_WORKER_INTERVAL_MS='60000'
SOCIAL_WORKER_RENDER_LIMIT='5'
SOCIAL_WORKER_PUBLISH_LIMIT='5'
```

CREDENTIALS_SECRET must decrypt the existing PublishChannel records. If the web app historically used ADMIN_SESSION_SECRET as its encryption fallback, use that exact key or migrate ciphertext before changing keys. Production rejects missing/short encryption secrets. Platform tokens remain encrypted in the database. The production render page requires SOCIAL_RENDER_TOKEN, passed in a scoped HttpOnly cookie, never in its URL.

SOCIAL_RENDER_BASE_URL must be the canonical reachable origin, without a redirect to another host. A Vercel render origin still consumes Vercel page runtime and transfer. To remove this dependency, run the same production web revision on the VM with the render token, and point the worker at its trusted origin. For the package's standalone web start command, build with `STANDALONE=1`; ordinary Vercel builds do not produce that standalone server. Set `ARIA_DISABLE_SCHEDULER=1` on the web process when scheduling is managed separately.

## Oracle setup (only after release authorization)

Deploy the reviewed revision in `/opt/aria-hub`, install Bun at the service's configured executable path, then:

```bash
bun install --frozen-lockfile
bun run db:generate
# Install system Chromium plus its OS libraries; set CHROME_PATH if necessary.
# Confirm scripts/social-publish-worker.ts can resolve a compatible executable.
sudo cp deploy/aria-hub-social-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
# Enable only AFTER migration, credential, media and account smoke checks:
sudo systemctl enable --now aria-hub-social-worker
```

Run as the unprivileged ariahub user. The service provides 1800 MB memory maximum; Chromium needs additional host headroom beyond the web server and OS. Benchmark on the actual Oracle architecture, particularly ARM. Do not assume packaged Linux x64 Chromium works on ARM. The package script uses `bun --conditions=react-server` so server-only imports work outside Next.js.

Inspect `systemctl status aria-hub-social-worker` and `journalctl -u aria-hub-social-worker -f`. `bun run worker:social --once` processes one cycle for a controlled smoke check. SIGTERM interrupts idle waiting and finishes an active cycle before disconnecting. The service allows 900 seconds for shutdown.

## Delivery and recovery

- Social lock has an owner and a 20-minute stale lease. Render and publish rows have atomic claims; destination results must still own their claim.
- Each queue/channel pair has one SocialDelivery. Successful destinations are never resent, including an explicit forced retry.
- Transient rejected requests retry only the affected destination, at most three attempts. Authentication, permission and unsupported modes block for correction.
- A disconnect/5xx during a final publish operation, missing external ID, or stale publish claim means OUTCOME_UNKNOWN. It blocks automatic retries: verify the external destination before explicitly retrying. Distributed APIs cannot guarantee exactly-once effects without platform idempotency support.
- Opportunity images must be successfully rendered, uploaded to public Blob and verified before any platform call. Rendering retries are bounded independently (three attempts); failures never downgrade opportunity posts to text.
- Images use JPEG for cross-platform compatibility. Studio's browser export remains PNG.
- Manual Publish Now rows are reserved for administrators. Edits invalidate unattempted rendered media; attempted rows require reconciliation.
- Emergency Facebook Groups pause affects group assistance only. Groups use manual assistance, with no automated browser or deprecated Groups API transport.

## Scheduling and capacity

Default: 30 opportunities/day, five per batch, six Afghanistan-time windows, two-minute spacing and a 14-day repeat cooldown. Set target 40 AND eight distinct batch windows for 40/day. The target alone cannot create capacity beyond windows times batch size. Titles/captions in all languages reference the same selected opportunity. Published public opportunities only are selected; archived/expired/deleted opportunities are checked again before automatic send.

After downtime, actual post attempts still reserve two-minute spacing instead of sending all missed slots in one burst. A single attempt can publish to all enabled destinations. Authentication expiration disables the affected channel until corrected.

## Resource and cost limits

Healthy idle cycles update a fixed heartbeat/lock row, with roughly three writes per minute (about 4,320/day) plus reads; they do not add a PipelineRun every idle minute. Database maintenance must handle row churn. Busy cycles and repeated infrastructure errors create history; there is no automatic PipelineRun retention in this tree. Establish a retention procedure and monitor growth.

Media bytes live in Blob, not PostgreSQL or Oracle storage. Blob upload, public verification, rendering origin and destination downloads consume storage/transfer. At 30/day, 900 rendered objects/month accumulate before retries. Local smoke samples encoded at JPEG quality 92 were approximately 68–143 KB each (about 61–129 MB/month at 30/day, before platform downloads and retries); real content varies. Blob objects currently have no automatic retention deletion; define retention and review referenced images before deleting old objects. Existing local-file cleanup does not delete Blob objects. Queue/delivery history also needs an explicit retention policy; at six destinations, 30/day adds up to 180 delivery rows/day.

No free-tier capacity or zero-cost claim is made. Check actual provider plan limits, media sizes and VM memory before enabling production automation.

## Platform prerequisites

Use current official account permissions and perform one controlled image-post smoke test per destination before enabling it. LinkedIn uses REST Images and Posts with version 202609 and organization posting permission/role. Facebook uses Page credentials; Instagram requires the supported professional account connection. WhatsApp individual free-form image messaging requires recipient eligibility and an open customer-service window; templates outside that window are not implemented here. WhatsApp Channels fail unsupported. WhatsApp Groups remain disabled unless WHATSAPP_GROUPS_API_ENABLED=1 after verifying the official endpoint and account entitlement; that flag alone is not proof of compatibility. X has no image transport and therefore cannot publish required-image opportunities.

Deploy all six migrations (including baseline only where applicable) before starting the worker. Keep production automation disabled until the separate release authorization and operational checks are complete.
