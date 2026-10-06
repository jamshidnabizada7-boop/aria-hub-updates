# Worker database roles — audit & separation analysis (closeout §2/§3, 2026-10-06)

## Current state

Both systemd workers connect through the Supabase session pooler as the same
Postgres role: **`aria_social_worker`** (the role part of the dotted pooler
username `aria_social_worker.<project-ref>`). This is intentional-at-the-time:
the role was provisioned during the Supabase social-worker setup and reused
when the import worker was added to the same host, because Supabase pooler
usernames must be unique per role and the import worker arrived later. The
name is therefore historical, not a design statement.

## Import-worker permission audit (least privilege, from the code graph)

Method: transitive import trace from `scripts/opportunity-import-worker.ts`
(40 files) → every Prisma client access (`db|prisma|tx|p.<model>.<op>`) and
raw SQL table reference, classified per operation. Verified live against
`information_schema.role_table_grants` on 2026-10-06.

| TABLE | SELECT | INSERT | UPDATE | DELETE | WHY REQUIRED (worker code path) |
|---|---|---|---|---|---|
| AuditLog | ✓ | ✓ | — | — | SELECT: `orchestrator.ts` jobsaf admin-edit detection (`db.auditLog.findFirst`); INSERT: import audit entries. **The missing SELECT broke Jobs.af in production (42501 → "failed 19"); fixed and codified in migration `20261006120000_worker_db_grants`.** |
| ImportRun | ✓ | ✓ | ✓ | — | run lifecycle: worker creates the run row and updates counts/status |
| ImportSource | ✓ | — | ✓ | — | scheduler reads due sources; updates `nextRunAt`/`backoffUntil`/`healthStatus`/`lastRunAt` |
| Opportunity | ✓ | ✓ | ✓ | — | canonical listing create/update; the worker never deletes (opportunity delete exists only in the admin lane `discovery-actions.ts`, not in the worker graph) |
| OpportunityCategory | ✓ | — | — | — | category resolution reads only (category creation happens in seed/admin paths) |
| OpportunitySourceObservation | ✓ | ✓ | ✓ | — | per-run source observations |
| Organization | ✓ | ✓ | ✓ | — | organization resolution creates/updates (org delete/merge is admin-lane `organization-actions.ts`) |
| OrganizationAlias | ✓ | ✓ | ✓ | — | alias writes during resolution (alias delete is admin-lane) |

Social-worker lane (same shared role): AutomationState, OpportunityLocation,
OrganizationMember, OrganizationSourceSuggestion, PipelineRun, PublishChannel,
RateLimitBucket, SocialDelivery, SocialPostQueue, StudioDesign,
TranslationChunk, User — all verified granted; the migration mirrors these
verbatim for reproducibility.

No superuser or ownership privileges are granted anywhere; the role cannot
create/drop tables or run migrations (those run as `postgres`).

## Role separation (`aria_import_worker`) — recommendation: DEFER

**Better long-term model:** two roles — `aria_import_worker` (import lane
tables only) and `aria_social_worker` (social lane only) — so a compromise of
one worker cannot touch the other lane's tables.

**Why deferred now:**

1. Supabase pooler usernames are per-role; adding a role means a new pooler
   credential (`aria_import_worker.<ref>`), a new `/etc/aria-hub` env file,
   and grants provisioning on production.
2. The grant sets overlap heavily today (both lanes write Opportunity,
   TranslationChunk, RateLimitBucket); splitting without a real blast-radius
   requirement adds a credential-rotation surface, not safety.
3. The codified migration mirrors the *current* shared state; splitting later
   becomes a pure `REVOKE`/`GRANT` exercise on top of it, with the guardrail
   test extended per role.

**Not a release blocker.** Revisit when either worker gets independent
threat-model requirements or when rotating credentials for another reason.

## Verification

- Migration: `prisma/migrations/20261006120000_worker_db_grants/migration.sql`
  (idempotent; skipped by design on databases without the role).
- Test: `tests/worker-grant-guardrail.test.ts` — asserts every required
  privilege via `has_table_privilege` whenever the role exists, including a
  dedicated AuditLog regression case.
- Fresh-DB: pre-create the role before `prisma migrate deploy` to exercise
  the full path (see `docs/FINAL-PRODUCTION-STATE.md` verification section).
