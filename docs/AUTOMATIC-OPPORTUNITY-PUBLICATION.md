# Automatic opportunity publication

The opportunity importer and its Oracle worker reconcile imported drafts for
sources explicitly configured with `autoPublish=true`. Existing drafts are
checked even when a source is not due, its content is unchanged, or a previous
import failed after saving the row. Up to 500 drafts are checked per minute;
pagination prevents an exception backlog from starving later records.

## Publication checks

- An enabled opportunity source has authorized automatic publication and is healthy.
- The row has import provenance and a public source URL on that source's host.
- A real title and substantive description/structured job content exist.
- The deadline has not passed and the source has not explicitly closed the listing.
- There is no pending cross-source match review or duplicate marker.
- There is a safe application destination, or a safe source article plus usable application instructions. The public UI continues to distinguish instructions from an Apply button.

Missing translations do not block the original listing. The translation worker
handles Persian/Pashto separately; this policy does not claim translations or
verification badges that do not exist.

Saving an opportunity as draft through the admin panel records an explicit
`opportunity.manual-draft` hold in the same transaction. Imports cannot silently
republish it. Published, archived, and expired rows are not selected by the
reconciler. Compare-and-set on the opportunity's `updatedAt` prevents a stale
worker decision from undoing a concurrent administrator edit. Transitions and
source configuration changes are auditable.

## Operations

```sh
# Review only; no database changes.
bun --conditions=react-server scripts/opportunity-publication-worker.ts
# Publish eligible imports and retire expired imported drafts.
bun --conditions=react-server scripts/opportunity-publication-worker.ts --apply
```

The source's Auto publish switch is still an explicit opt-in. New sources start
in review. Reseeding official sources preserves existing publication choices.
News and community/employer submissions have their own workflows.

On Oracle, `aria-hub-import-worker` must run from `/opt/aria-hub/current`, so
source code and dependencies correspond to the deployed application release.
It loads the restricted Oracle worker database override. The worker logs checked,
published, expired, held, and concurrent-change counts each tick. It does not
send social posts, email, WhatsApp, or push itself. Existing publication-driven
distribution workers remain separate.

## Verification

`tests/opportunity-automatic-publication.test.ts` checks quality decisions,
non-Latin content, application route safety, manual/source opt-outs, expiry,
concurrent publication, idempotence, and cursor pagination against an isolated
test database. No live listing or external message is used as a test fixture.
