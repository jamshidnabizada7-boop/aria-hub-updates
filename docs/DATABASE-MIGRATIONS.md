# Database migrations runbook

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
