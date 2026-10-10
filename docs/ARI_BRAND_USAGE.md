# ARI brand usage and candidate review

## Status

Feature branch: `codex/ari-mascot-companion`. Production deployment and social publishing require owner approval. The public companion is disabled unless `NEXT_PUBLIC_ARI_ENABLED=true` **at build time**. Poster presets are independent of this flag and default to `none`. No database schema, schedules, authentication, payments or publishing defaults are changed.

## Identity and asset provenance

The supplied `design/ari/ARI_Approved_Mascot_Reference.png` is the approved identity reference. Transparent raster masters were prepared using the built-in imagegen background-extraction editing tool, with the reference as the edit target. They are reference-derived edits, not the original artist's isolated masters or pixel-exact vector reconstructions. Prompts preserved the approved silhouette, hood, faceplate, eyes, colors, props and expression; removed board backgrounds, text, neighboring characters and floor shadows; requested genuine alpha and transparent padding.

The Classic master also supplies `happy` and `waving`: its existing open-eyed smile and raised hand already express those states. No unrelated design was substituted. The blink frame edits only Classic's eyes. Scholar's closed-eye reading treatment is included as `reading` but is not used by the website or default posters. For exact reproduction of the reference's uncapped reading pose, obtain the artist's isolated master before selecting that pose in campaigns.

Inventory and original pixel dimensions: `design/ari/inventory.json`. Masters: `design/ari/masters/*.png`. Optimized assets: `public/images/ari/{variant}-{64,128,256,512,1024}.webp`. Square profile asset: `public/images/ari/profile-avatar.png`. Visual proof: `design/ari/contact-sheet.png` (each asset on light and dark backgrounds). The official logo, wordmark and favicon are unchanged.

To regenerate derivatives, run `bun scripts/prepare-ari-assets.ts`. This reads the saved transparent masters, verifies alpha, makes padded responsive squares and regenerates the contact sheet. It does not create new art or contact a paid API. Original master dimensions are retained; do not label enlarged artwork as native 4K.

## Correct use

- Classic: welcome, navigation and general opportunity discovery. Minimal: small profile/icon contexts. Scholar: education and application preparation. Global: international discovery. Stellar and Nature: relevant occasional campaigns, not defaults.
- Preserve aspect ratio, transparent padding, glow, orbit and props. Allow at least 10% clear space around the visible silhouette. Use `object-contain`, never face-only crops.
- Website sizes: 56–80 CSS pixels; launcher is a 64-pixel control. All controls have a target of at least 44 pixels. Animation is a small float, brief blink and one greeting sway, disabled for reduced motion.
- Keep the official logo visible and distinct. ARI complements it.
- Guidance describes website navigation and preparation. It never claims eligibility, acceptance, scholarship amounts, application status or an AI chat capability.

## Wrong use / omissions

- Do not replace the logo or favicon, stretch the face, add an opaque rectangle, crop props, recolor the primary mascot or place it over text/QR/forms.
- Omit from authentication, admin, applicant portal, full-screen editors, poster rendering chrome, formal letters, CV previews/exports and timed interview sessions.
- Do not send personal fields/CV contents to ARI. It has no conversational backend, network chat endpoint, analytics or external tracker.
- Do not treat the board itself as a sprite sheet. Do not auto-publish the sample artwork or opt every scheduled post into ARI.

## Audited placement map

| Page family | Placement and behavior |
| --- | --- |
| Home | Modest dismissible welcome beside search; initially collapsed shared action dock |
| Opportunity listings | Search/filter tip; thinking artwork in empty results; shared dock |
| Opportunity detail | Scholar application checklist; actual listing deadline or explicit missing-date notice; existing contextual CV link; original apply controls unchanged |
| Opportunity Matcher | Optional localized tip per real step; thinking during loading, celebration after actual matching results; no floating overlay or change to matching scores |
| CV Builder | Scholar preparation/review tip outside document and data collection containers; no floating overlay |
| Letter Builder | Writing/review tip after the editor, excluded from print/export; no floating overlay |
| Interview Prep | Landing-page onboarding only; no practice-session overlay |
| Services / About / Templates | Subtle discovery entry; template editors excluded |
| Contact / Employers / Submit Opportunity / Track | Contextual inline/footer guidance; no floating overlay over inputs |
| Blog / Success Stories / Press | Quiet footer call to action; no reading overlay |
| Auth / admin / private portal / render routes | No public mascot guidance |

`src/lib/ari.ts` owns the page registry, EN/FA/PS copy and actual localized destinations. The live site's category slugs are `job` and `scholarship` (plural slugs return empty lists). Shared page shells supply footer tips, while custom pages place tips explicitly. The localized layout mounts one companion. The existing `FloatingSocial` renders inside its coordinated dock when enabled, and scroll-to-top is separated vertically. Visible modal dialogs, the cookie banner and a raised mobile keyboard hide the dock. Escape closes the panel and returns focus. Hide is remembered locally; the footer provides Show ARI. Navigation stays collapsed after route changes. No audio or automatic popup.

## Editor workflow and safe poster placement

In the existing **Brand Studio**, select a real content item, then choose **ARI mascot**: None / Classic / Scholar / Global / Celebrating. Set artwork size (140–210 pixels) and logical start/center/end placement. Saved overrides persist through existing Studio save/reload and renderer paths. Existing permissions and publish actions are preserved.

Artwork occupies a reserved band below the original poster. The original canvas, including headline, organization, dates, logo, CTA and QR, is uniformly fitted above this band. This deliberately reduces the original content scale (approximately 0.78–0.89 for square; less for taller formats). It avoids all overlap even with unusually long content and premium custom media. Editors should inspect the export for small secondary text; choose None where a dense layout needs maximum text size. Free positioning over content is intentionally unavailable.

Square, portrait and story retain exact 1080×1080, 1080×1350 and 1080×1920 output dimensions. The public full-size route supports `?slug=<published-slug>&size=story&ari=global`; omitted or invalid presets render the original poster. Private/draft records remain unavailable there. Studio PNG download, shared social templates, premium canvases and the gated automation renderer all use the same optional frame. Automation selects no mascot unless an editor's existing saved content contains one.

## Review artifacts and limitations

`design/ari/public-listing-snapshots.json` stores only publicly accessible database-backed card data and its source links at capture time. These copies seed a disposable localhost QA database. The generated jobs/scholarships/awareness samples and blank templates are **unpublished review exports**, not delivery queue entries. Existing untranslated source titles stay faithful to the feed; ARI's own interface and poster editor labels are fully EN/FA/PS.

The candidate browser suite writes desktop/mobile, light/dark and all-language screenshots, three social output formats, localized awareness posters, blank templates and a real Studio PNG download. It tests keyboard activation, Escape/focus return, hide/restore across reload, overlays, 320-pixel containment, reduced motion, print omission, saved design persistence and zero new publishing queue rows. It runs only against a guarded disposable localhost `_test` database and blocks browser requests to external domains.

A4 300-dpi output is not advertised: the current poster workflow supports social-format canvases, and a native 2480×3508 print renderer/layout requires separate print proofing. No rough transparency extraction or invented live-chat interface was shipped. Original layered artist masters would allow exact pose animation and higher-resolution print campaigns later.

See `docs/ARI_IMPLEMENTATION_REVIEW.md` for exact verification results and changed-file inventory before approval.
