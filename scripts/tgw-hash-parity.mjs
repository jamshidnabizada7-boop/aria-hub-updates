/**
 * Hash/integrity PARITY verification: the SQL twin (aria_tgw_source_plan,
 * aria_tgw_chunk_text) must produce byte-identical source hashes to the TS
 * engine implementation (chunkText + sourceOf + sourceHashOf) for every real
 * row, or the in-app engine and the gateway would invalidate each other's
 * commits. Fetches the translatable source fields of every published row from
 * production, computes the hash with each implementation, and diffs.
 *
 * Usage: bun scripts/tgw-hash-parity.mjs [--db <conn-string>]
 *   TS side  → computed in-process (imports src/lib/ai/translate-chunks.ts)
 *   SQL side → local Postgres with the migration chain applied
 *              (PARITY_DB_URL, default the docker test DB)
 *   Row data → SUPA_URL-style prod URL (PARITY_SOURCE_URL) or --source
 */
import { createHash } from 'node:crypto';
import pg from 'pg';
import { chunkText, isSymbolic, trimClassic, FIELD_ORDER } from '../src/lib/ai/translate-chunks.ts';

const SQL_URL = process.env.PARITY_DB_URL || 'postgresql://postgres:test@127.0.0.1:5434/ariagw_test';
// The source DB URL is NEVER hardcoded — point PARITY_SOURCE_URL at the
// Supabase session pooler (credentials live out-of-band, e.g. web.env or the
// operator's secret store).
const SOURCE_URL = process.env.PARITY_SOURCE_URL;
if (!SOURCE_URL) {
  console.error('set PARITY_SOURCE_URL=postgresql://<user>.<ref>:<pw>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres');
  process.exit(1);
}

// ── TS twin of translate-engine.ts planFields/sourceHashOf/sourceOf ──────────
const COLUMN_OF = { summary: 'aiSummary' };

function sourceOf(row, field) {
  const column = COLUMN_OF[field] ?? field;
  const i18n = row[`${column}I18n`];
  if (i18n && typeof i18n === 'object' && !Array.isArray(i18n)) {
    const en = i18n.en;
    if (typeof en === 'string' && trimClassic(en)) return en;
  }
  return typeof row[column] === 'string' ? row[column] : '';
}

function sha256(s) { return createHash('sha256').update(s).digest('hex'); }

function tsHash(row) {
  const pairs = [];
  for (const field of FIELD_ORDER) {
    const text = trimClassic(sourceOf(row, field) || '');
    if (!text || isSymbolic(text)) continue;
    for (const c of chunkText(text)) pairs.push(`${field}:${sha256(c)}`);
  }
  return sha256(pairs.join('|'));
}

// ── fetch rows + compare ─────────────────────────────────────────────────────
const src = new pg.Client({ connectionString: SOURCE_URL, ssl: { rejectUnauthorized: false } });
const sqlDb = new pg.Client({ connectionString: SQL_URL });
await src.connect();
await sqlDb.connect();

const COLS = 'title, description, "aiSummary", eligibility, benefits, responsibilities, requirements, guidelines, "jobType", salary, "educationReq", experience, "titleI18n", "descriptionI18n", "aiSummaryI18n", "eligibilityI18n", "benefitsI18n", "responsibilitiesI18n", "requirementsI18n", "guidelinesI18n", "jobTypeI18n", "salaryI18n", "educationReqI18n", "experienceI18n"';

const PAGE = 250;
let total = 0, mismatches = 0, fieldMismatches = 0;
const samples = [];
for (let offset = 0; ; offset += PAGE) {
  let rows;
  try {
    rows = (await src.query(`SELECT id, ${COLS} FROM "Opportunity" WHERE status='published' ORDER BY id LIMIT $1 OFFSET $2`, [PAGE, offset])).rows;
  } catch {
    rows = (await src.query(`SELECT id, ${COLS} FROM "Opportunity" WHERE status='published' ORDER BY id LIMIT $1 OFFSET $2`, [PAGE, offset])).rows;
  }
  if (!rows.length) break;
  for (const row of rows) {
    total++;
    const ts = tsHash(row);
    const plan = (await sqlDb.query('SELECT public.aria_tgw_source_plan($1::jsonb) AS p', [JSON.stringify(row)])).rows[0].p;
    if (plan.hash !== ts) {
      mismatches++;
      if (samples.length < 5) samples.push({ id: row.id, ts: ts.slice(0, 12), sql: plan.hash.slice(0, 12) });
      continue;
    }
    // field-set comparison too (planned fields must agree exactly; jsonb
    // objects sort keys, so compare as sorted sets)
    const tsFields = FIELD_ORDER.filter((f) => { const t = trimClassic(sourceOf(row, f) || ''); return t && !isSymbolic(t) && chunkText(t).length > 0; }).sort();
    const sqlFields = Object.keys(plan.fields).sort();
    if (JSON.stringify(tsFields) !== JSON.stringify(sqlFields)) fieldMismatches++;
  }
  process.stdout.write(`\r${total} rows, ${mismatches} hash mismatches, ${fieldMismatches} field-set mismatches`);
}
console.log(`\nDONE: ${total} rows compared; hash mismatches=${mismatches}; field-set mismatches=${fieldMismatches}`);
if (samples.length) console.log('mismatch samples:', JSON.stringify(samples, null, 1));

// Synthetic edge cases (astral, HTML, long, whitespace) — direct TS vs SQL.
const EDGE = [
  'emoji 🎉🎉 and Arabic numerals ۱۲۳ with HTML <b>bold</b> tags ' + 'text paragraph here\n\nmore content\n'.repeat(80),
  'NBSP\u00a0inside\u00a0text with $10,500 award and 2024 deadline, email x@y.org',
  'line1\nline2\nline3 ' + 'x'.repeat(2000),
  '$500/month', // symbolic → excluded
];
for (const [i, t] of EDGE.entries()) {
  const row = { title: `edge ${i}`, description: t };
  for (const f of FIELD_ORDER) if (f !== 'title' && f !== 'description') row[f] = '';
  const ts = tsHash(row);
  const plan = (await sqlDb.query('SELECT public.aria_tgw_source_plan($1::jsonb) AS p', [JSON.stringify(row)])).rows[0].p;
  console.log(`edge ${i}: ${plan.hash === ts ? 'MATCH' : `MISMATCH ts=${ts.slice(0, 10)} sql=${plan.hash.slice(0, 10)}`}`);
}

await src.end();
await sqlDb.end();
