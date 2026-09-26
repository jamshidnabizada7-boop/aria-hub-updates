# Database migrations runbook

## Release order

Apply the baseline `000000000000_init` on an EMPTY database, followed by:

1. `20260924184500_facebook_group_distribution`: group destinations, campaigns, rules and jobs; unique campaign source key and queue/group job pair.
2. `20260925095000_social_delivery_tracking`: destination delivery state; unique queue/channel pair, indexed status/retry time, queue foreign key cascades on deletion, channel deletion is restricted.
3. `20260925160000_manual_social_queue_rows`: manual publishing flag, default false.
4. `20260925170000_schema_reconciliation`: StudioVisual table and removal of group updatedAt SQL defaults (Prisma supplies updatedAt).
5. `20260925200000_render_retry_tracking`: render attempt count default zero and nullable next retry time.

These migrations do not drop tables, columns or data. Existing queue rows receive backward-compatible defaults. The StudioVisual migration uses IF NOT EXISTS; this does not validate the shape of a pre-existing table.

## Existing production databases

Production migrations require a separate release authorization. This release gate uses only an isolated local database.

1. Back up the database and test restoration. Inventory `_prisma_migrations`, current schema, existing StudioVisual table and any prior `db push` changes.
2. Compare the existing schema to the baseline SQL. Only if the baseline objects are already present and compatible, and its history entry is absent, mark the baseline applied. Never blindly baseline an empty or incompatible database.
3. Reconcile any partially applied later migrations or incompatible existing StudioVisual columns/indexes on a staging clone first. Do not mark a migration applied solely to suppress an error.
4. Set DATABASE_URL to the application connection and DIRECT_URL to the intended direct migration connection. Prisma uses DIRECT_URL for migration operations; setting DATABASE_URL alone can target the wrong database.
5. Run the following only after the preceding review and release authorization:

```bash
# Both variables must refer to the SAME intended database.
export DATABASE_URL='<application-connection>'
export DIRECT_URL='<direct-migration-connection>'
bunx prisma migrate status
# CONDITIONAL: existing compatible baseline, with no baseline history entry:
bunx prisma migrate resolve --applied 000000000000_init
bun run db:deploy
bunx prisma migrate status
bunx prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```

A pending migration status before deployment is expected. Final drift must be empty. A populated baseline does not mean later migrations have already run.

## Future schema changes

Generate and review SQL locally with `bunx prisma migrate dev --create-only`, apply it to a disposable or staging database, and verify drift and data compatibility. Use expand/contract migrations for renames and type changes. `db:push` is for throwaway development databases only; never use `--accept-data-loss` as a production migration workflow.
