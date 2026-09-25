# Database migrations runbook

## Stage 1 integration order

The cumulative integration branch contains these migrations after the baseline:

1. `20260924184500_facebook_group_distribution` — additive group destination and job tables.
2. `20260925095000_social_delivery_tracking` — additive per-channel delivery table.
3. `20260925160000_manual_social_queue_rows` — additive flag that keeps Brand Studio Publish Now rows out of the automatic worker.
4. `20260925170000_schema_reconciliation` — adds the missing StudioVisual table and aligns Group timestamp defaults with Prisma.

Review the target database's migration history and the existing `StudioVisual`
table before deployment. The table may already exist on databases previously
updated with `db push`; reconcile that state before deploying the migration.
Stage 1 does not run production migrations; use `prisma migrate deploy` only at
the release gate.

The schema is now under version control (`prisma/migrations/`). The
`db push --accept-data-loss` workflow is retired — `db:push` remains for
throwaway sandboxes only and will refuse destructive changes.

## First setup on an existing database (e.g. Neon production)

The baseline migration describes the schema that already exists, so mark it
applied once — it will never be executed:

```bash
DATABASE_URL="<prod-url>" bunx prisma migrate resolve --applied 000000000000_init
```

Then verify:

```bash
DATABASE_URL="<prod-url>" bunx prisma migrate status   # → "Database schema is up to date!"
```

## Every future schema change

1. Edit `prisma/schema.prisma`.
2. Create the migration locally and REVIEW the generated SQL:
   ```bash
   bunx prisma migrate dev --create-only   # needs the local database running
   # inspect prisma/migrations/<timestamp>_<name>/migration.sql
   ```
   Watch for `DROP`, `ALTER COLUMN ... TYPE`, or data-mover statements —
   adjust the SQL before applying if it would destroy data you need.
3. Apply locally: `bunx prisma migrate dev`
4. Deploy to production: `DATABASE_URL="<prod-url>" bun run db:deploy`

## Adding new enum values / nullable columns

- New enum value: append it to the enum in `schema.prisma`; the generated
  `ALTER TYPE ... ADD VALUE` is safe.
- New nullable column: safe by definition.
- Renames/type changes: never `--accept-data-loss` your way through — write
  the expand/contract steps by hand in the migration SQL.
