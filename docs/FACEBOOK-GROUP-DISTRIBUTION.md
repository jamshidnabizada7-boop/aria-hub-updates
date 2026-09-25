# Facebook Group Distribution

## Status

ARIA HUB now has a native Facebook Group Distribution layer inside **Admin → Automations**.

Facebook Page publishing remains unchanged. Facebook Group destinations use a
`manual_assist` transport because Meta removed the public Facebook Groups API
and the `publish_to_groups` permission. The implementation deliberately does
not use deprecated endpoints, CAPTCHA bypasses, hidden browser sessions, or
other mechanisms intended to evade platform controls.

## Architecture

```text
SocialPostQueue
   ├─ existing PublishChannel flow → Facebook Page / Telegram / Instagram / ...
   └─ optional Facebook Group Distribution
          ↓
      FacebookGroupCampaign
          ↓
      FacebookGroupDistributionJob (one destination per row)
          ↓
      FacebookGroupTransport
          ↓
      manual_assist (current)
```

The transport boundary is `src/lib/facebook-group-transport.ts`. A future
official Meta group-publishing integration can be implemented behind that
interface without replacing the content queue, matching rules, admin UI, or
history tables.

## Admin workflow

1. Add allowed Facebook Groups and classify them with tags, language, audience,
   region, eligibility and approval requirements.
2. Add transparent distribution rules such as:
   - Category: Scholarship
   - Include tags: Scholarships, Students
   - Language/region matching when required
3. In the Group Distribution section, enable **Groups** for a queued ARIA HUB
   post.
4. ARIA HUB creates an idempotent campaign and one job per matched group.
5. Every job displays why the destination matched.
6. Open the target group, copy the prepared caption, publish manually, then
   mark the job completed (or failed).
7. Use Pause All, Resume, Cancel Pending, or Retry Failed for emergency control.

## Duplicate protection

Two database constraints protect distribution destinations:

- `(campaignId, groupId)`
- `(sourceQueueId, groupId)`

This prevents retries or repeated matching from silently creating another job
for the same source post and destination group.

## Security

- No Facebook cookies or browser sessions are stored.
- Existing Page tokens remain in `PublishChannel.credentials`, protected by
  the existing AES-256-GCM credential layer.
- Group-management writes are restricted to `super_admin`, `admin`, and
  `content_manager` roles.
- Mutating group, rule, campaign, job, and emergency-control actions are
  recorded in `AuditLog`.
- The admin API never needs a Group access token for the current transport.

## Database rollout

This change is additive. Apply the migration through the repository's existing
migration workflow:

```bash
bun install --frozen-lockfile
bunx prisma validate
bunx prisma generate
DATABASE_URL="<production-url>" bun run db:deploy
```

Migration:

`prisma/migrations/20260924184500_facebook_group_distribution/migration.sql`

Do not use `--accept-data-loss`.

## Worker / deployment

No persistent Facebook browser worker is required for the current
`manual_assist` transport. The existing ARIA HUB automation tick only creates
and matches review jobs. It does not publish to Facebook Groups.

The normal application deployment remains sufficient. If Meta later exposes an
official supported Group publishing transport, it should be implemented as an
independently restartable worker/transport while retaining the current queue
and job records.

## Operational controls

Global state is stored in `AutomationState`:

- `facebookGroupsEnabled`
- `facebookGroupPaused`

Emergency operations are exposed through the authenticated admin API:

- Pause all distribution
- Resume distribution
- Cancel pending jobs
- Retry failed jobs
- Disable Facebook Group distribution

## Current limitation

"Completed" means an administrator confirmed that the manual Facebook Group
post was published. ARIA HUB cannot independently verify a Group post through
an official Meta Groups API at this time. Do not interpret a prepared or opened
job as a successful publication.
