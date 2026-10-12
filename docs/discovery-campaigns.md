# Opportunity discovery campaigns

Brand Studio includes province and category collections with three distinct visual families: Atlas, Ledger and Signal. English, Afghan Persian and Pashto are available in square, portrait and story formats. Downloads are lossless PNG masters at twice the canvas resolution. Automatic delivery uses square PNG for Facebook/LinkedIn and a dedicated 1080×1350 JPEG for Instagram, converted once from a lossless capture at quality 98 with 4:4:4 chroma. Platforms may subsequently recompress uploads.

## Inventory policy

Count canonical published listings, not vacancy positions or location records. Require a known open deadline, accepted verification state, healthy enabled source, usable public content, safe source/application guidance, no duplicate marker and no unresolved source match review. A source-backed listing can have `single_source` status; campaigns never upgrade that status or advertise an official verification badge. Imported `autoPublish` controls draft approval, not promotion of listings already approved for publication.

Date-only deadlines remain eligible through the Afghan calendar date; timed deadlines expire at their exact timestamp. Province campaigns require a canonical province match with confidence at least 0.75. NGO campaigns additionally require a verified active NGO organization. Remote and fresh-graduate campaigns require reviewed structured matching evidence. Missing evidence hides that category rather than inventing eligibility.

Five qualifying listings are required. Counts and destination listings share one query. Recount before rendering and before each platform delivery. If the count changes, falls below the minimum, or the snapshot is more than fifteen minutes old, invalidate artwork and rerender/cancel before sending. Each published image includes its check time and a notice that availability changes.

## Rotation and operation

One collection replaces an individual opportunity slot per Afghan day. Alternate province/category emphasis and visual families. Enforce a seven-day cooldown for the collection and identical category/inventory fingerprints, with an advisory lock preventing concurrent duplicate queues. Brand Studio can queue a selected collection for the next 19:00 AFT slot or disable daily rotation. Delivery retries preserve already successful channels.

The live rollout uses three daily slots (08:00, 13:00 and 19:00 AFT): two individual opportunities and one collection when eligible inventory exists. Existing channel credentials and enable/disable controls still apply. An expired Instagram token or missing LinkedIn organization permission must be reauthorized before those channels can deliver.

## Measurement

Captions and QR codes lead to the matching localized collection. Caption links include the campaign ID and platform UTM parameters. Instagram image captions do not provide a tappable external URL, so the QR/website address also remains visible; use the destination in a bio or Story link where supported.

After analytics consent, collect deduplicated landing visitors, listing clickers, new account registrations and email-verified registrations. Signed first-touch attribution expires after 30 days. Store keyed hashes instead of account IDs or personal information in campaign events. Server auth code records conversions; the browser cannot submit a registration event. Remove event records older than 180 days.

Native reach, impressions, engagement and link-click totals can be recorded from platform exports in Campaign performance. Missing values stay null/Not reported, and paid traffic can be identified separately. Native platform totals are not inferred from website visits. This release does not claim automatic provider insight retrieval or guaranteed organic reach.

## Verification

- `bun --conditions=react-server test tests/discovery-campaigns.test.ts tests/studio-rotation.test.ts tests/social-delivery-policy.test.ts` with an isolated localhost `_test` database and `REQUIRE_TEST_DATABASE=1`.
- `bun scripts/tests/discovery-poster-review.ts`: 81 exports, 513 layout/font/dimension/count checks; no external publication calls. Optional `DISCOVERY_REVIEW_FIXTURES` loads real inventory for private previews.
- `bun scripts/tests/studio-editorial-review.ts`: individual poster regression exports.
- CI deploys migrations to an isolated database, checks schema drift, runs tests and both export checks.
