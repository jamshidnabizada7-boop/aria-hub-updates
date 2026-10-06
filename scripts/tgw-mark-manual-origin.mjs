/**
 * Manual-translation provenance backfill (2026-10-07).
 *
 * The hand-translation campaign applied Persian/Pashto by script
 * (scripts/tmp/myx-apply.mjs) before the translationOrigin column existed, so
 * those rows carry completed translations with NO provenance marker. The
 * ChatGPT gateway and the AI engine both refuse to touch MANUAL rows — this
 * script stamps the hand-applied rows so they are protected.
 *
 * Idempotent: rows that already carry any translationOrigin are left alone.
 * Dry-run by default; pass --write to apply.
 *
 * Usage: bun scripts/tgw-mark-manual-origin.mjs [--write] [--file <json>]
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

// Admin DB URL is NEVER hardcoded — set TGW_ADMIN_DB_URL to the Supabase
// session pooler URL (credentials live out-of-band, e.g. web.env or the
// operator's secret store).
const SUPA_URL = process.env.TGW_ADMIN_DB_URL;
if (!SUPA_URL) {
  console.error('set TGW_ADMIN_DB_URL=postgresql://<user>.<ref>:<pw>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres');
  process.exit(1);
}
const file = process.argv.includes('--file')
  ? process.argv[process.argv.indexOf('--file') + 1]
  : 'scripts/tmp/myx-translations.json';
const write = process.argv.includes('--write');

const items = JSON.parse(readFileSync(file, 'utf8'));
const ids = [...new Set(items.map((i) => i.id).filter(Boolean))];
console.log(`hand-applied rows listed in ${file}: ${ids.length}`);

const c = new pg.Client({ connectionString: SUPA_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const found = await c.query(
  `SELECT id, slug, "faStatus", "psStatus", "translationOrigin" FROM "Opportunity" WHERE id = ANY($1)`,
  [ids],
);
const targets = found.rows.filter((r) => !r.translationOrigin);
console.log(`found ${found.rows.length} rows; ${targets.length} without provenance (will be marked MANUAL/MANUAL)`);

if (write) {
  for (const r of targets) {
    await c.query(
      `UPDATE "Opportunity" SET "translationOrigin" = '{"fa":"MANUAL","ps":"MANUAL"}'::jsonb WHERE id = $1`,
      [r.id],
    );
    console.log(`marked ${r.id} ${r.slug.slice(0, 48)}`);
  }
  console.log(`done: ${targets.length} rows marked MANUAL`);
} else {
  for (const r of targets) console.log(`would mark ${r.id} ${r.slug.slice(0, 48)}`);
  console.log('dry-run — re-run with --write to apply');
}
await c.end();
