/**
 * PHASE 3 — verify the application DB role can access every object the
 * ingestion platform requires. Read-only; runs against whatever DATABASE_URL
 * points at (local dev, ariahub_test, or production via the release env).
 *
 * On databases where the application role does not exist (local dev/test),
 * exits 0 with a notice — the grants are a production/Supabase concern.
 *
 * Usage: bun scripts/release/verify-db-grants.ts
 */
import { Client } from 'pg';

const APP_ROLE = 'aria_social_worker';
/** Per-table required privileges, matching what the ingestion platform
 * actually does with this role: full DML on the ingestion tables it owns,
 * INSERT/SELECT/UPDATE on core import tables, DELETE+recreate on locations. */
const REQUIRED: Array<[string, string[]]> = [
  ['Organization', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']],
  ['OrganizationAlias', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']],
  ['OpportunitySourceObservation', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']],
  ['OrganizationMember', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']],
  ['OrganizationSourceSuggestion', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']],
  ['Opportunity', ['SELECT', 'INSERT', 'UPDATE']],
  ['OpportunityLocation', ['SELECT', 'INSERT', 'UPDATE', 'DELETE']],
  ['ImportSource', ['SELECT', 'UPDATE']], // worker claims/updates; creation is admin/seed-only
  ['ImportRun', ['SELECT', 'INSERT', 'UPDATE']],
];

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

const role = (await c.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [APP_ROLE])).rows[0];
if (!role) {
  console.log(`role "${APP_ROLE}" not present on this database — grants skipped by design (local/dev). Nothing to verify.`);
  await c.end();
  process.exit(0);
}

const missing: string[] = [];
const granted: string[] = [];
for (const [table, needed] of REQUIRED) {
  const grants = (await c.query(
    `SELECT DISTINCT privilege_type FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND table_name = $1 AND grantee = $2`,
    [table, APP_ROLE],
  )).rows.map((r) => r.privilege_type);
  const lacks = needed.filter((p) => !grants.includes(p));
  if (!lacks.length) granted.push(table);
  else missing.push(`${table} (lacks: ${lacks.join(',')})`);
}

console.log(`role "${APP_ROLE}" grants: ${granted.length}/${REQUIRED.length} required tables verified`);
if (missing.length) {
  console.error('MISSING PRIVILEGES:');
  for (const m of missing) console.error('  ✗ ' + m);
  console.error('\nFix: apply prisma/migrations/20261004100000_ingestion_table_grants/migration.sql');
  await c.end();
  process.exit(1);
}
console.log('ALL GRANTS VERIFIED.');
await c.end();
