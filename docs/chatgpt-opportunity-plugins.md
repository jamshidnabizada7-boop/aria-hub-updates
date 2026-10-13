# ARIA HUB ChatGPT opportunity plugins

## Hosted services

Both services run on ARIA HUB's Oracle web deployment. No local executor,
Codex session, desktop computer or paid AI API is required for a ChatGPT user
to call these tools. ChatGPT supplies the model's translations and source
review; Oracle validates and stores the results. A running ChatGPT conversation
is still needed to perform the work; a plugin installation alone is not a
background translation/repair schedule.

| Plugin | Hosted MCP endpoint | Permissions |
| --- | --- | --- |
| ARIA HUB Translation Gateway | `https://www.myariahub.com/mcp/translation` | `aria.translation.read`, `aria.translation.write` |
| ARIA HUB Opportunity Repair | `https://www.myariahub.com/mcp/repair` | `aria.repair.read`, `aria.repair.write` |

Translation preserves the existing private App binding
`asdk_app_6ac792ce1c048191afcd5c15b08d9f06` and adds workflow instructions.
Repair is a private remote MCP plugin. Neither archive contains credentials.

## Connect in ChatGPT

Open the saved plugin link in ChatGPT and install/connect it in the account
that owns the plugin. When ARIA HUB requests authorization, sign in to the
[admin panel](https://www.myariahub.com/admin) in the same browser, return to
the authorization page and reload. Only `admin`/`super_admin` roles can approve
a connection. Review and authorize the relevant permissions. Passwords and
tokens must never be pasted into chat.

Start a ChatGPT conversation, select the plugin in the composer, and ask:

> Repair the next 5 opportunities with no usable apply link, weak match data,
> or missing category/country. Read original sources, preview and save only
> supported corrections, and report unresolved cases.

For translation, select Translation Gateway:

> Translate the next small batch completely into Persian Afghanistan and
> Pashto, including the public-fact translation lane. Preserve all paragraphs,
> application instructions, URLs, identifiers and numeric values.

If ChatGPT's existing Translation Gateway only shows four tools, refresh its
connected tool list or reconnect it. The updated endpoint exposes seven:
the original four body tools plus claim/commit/release public-fact tools.

## Repair guarantees and limits

- Bounded, expiring claims; concurrent record edits reject stale saves.
- Every changed field requires a quote from a source fetched for that claim.
- Application portals must be linked in real application instructions and
  successfully read; recruitment email evidence must include the address.
- Only actual category IDs and explicitly sourced facts can be saved.
- Fixed update whitelist; no publication changes, deletion or applicant data.
- Manual translations survive; changed English source fields mark translation
  queues pending and preserve manual values as stale rather than overwrite them.
- Match provenance is saved without pretending it has human approval.
- Audit logs retain before fields, patch, evidence and source hash.
- Inaccessible pages, CAPTCHA/PDF-only applications and unknown facts remain
  unresolved for owner review. The plugin does not invent a replacement URL.

## Translation coverage

The original body RPCs translate all twelve supported text fields atomically,
enforce Persian-before-Pashto and preserve manual translations. The new fact
lane covers remaining supported applicant-facing extracted facts, excluding
technical scraper IDs. Controlled vocabularies are already localized without
AI. Both JavaScript and SQL validators protect exact numeric tokens, including
single-digit experience/duration values. Do not report complete localization
using only body status; also inspect `publicFacts` pending counts.

## OAuth

Authorization requires an authenticated administrator and a signed consent
form. PKCE S256, exact registered callback URLs, separate resource audiences,
durable code replay protection, refresh-client binding, scope narrowing,
refresh rotation and token revocation are enforced. No automatic approval
parameter bypasses sign-in. Resource metadata is available beneath
`/.well-known/oauth-protected-resource/mcp/translation` and `/mcp/repair`.

## Packaging and verification

Run `scripts/package-chatgpt-plugins.ps1` to produce two independent ZIP
archives. Update the existing Translation Gateway with its exact current
release ID; do not replace its App binding or presentation. Create Repair once,
then update that plugin ID for subsequent releases. Account saves and Oracle
deployment are separate steps; verify both.

Tests use an isolated localhost `*_test` Postgres database. Relevant suites:
`mcp-repair`, `mcp-translation`, `translation-gateway-rpc`, `translation-worker`,
`translation-pipeline` and `public-image-url`. They exercise actual database
transactions, manual locks, atomic rollback, evidence/source guards, numeric
integrity, OAuth boundaries and transport discovery.
