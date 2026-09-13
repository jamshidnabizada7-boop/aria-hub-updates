#!/usr/bin/env node
/**
 * Sync trilingual i18n columns (Opportunity + News) from local DB → Neon.
 * Only updates rows where the local version HAS fa/ps content (never overwrites
 * Neon translations with empty). Run AFTER the translation fill loop.
 */
import pg from 'pg';
const { Client } = pg;

const a = new Client({ connectionString: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' });
const b = new Client({ connectionString: process.argv[2] || process.env.DATABASE_URL });
await a.connect();
await b.connect();

const hasFaPs = (j) => {
  if (!j) return false;
  let o = j;
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch { return false; } }
  return !!(o.fa && String(o.fa).trim()) && !!(o.ps && String(o.ps).trim());
};

async function syncTable(table, cols, key = 'id') {
  const local = (await a.query(`SELECT "${key}", ${cols.map((c) => `"${c}"`).join(',')} FROM "${table}"`)).rows;
  let updated = 0;
  for (const r of local) {
    const sets = [];
    const vals = [];
    let i = 1;
    for (const c of cols) {
      const v = r[c];
      if (v === null || v === undefined) continue;
      // only push when it contains BOTH fa and ps (i18n json) — for plain
      // text columns (aiSummary etc.) always sync when non-empty
      if (c.endsWith('I18n') && !hasFaPs(v)) continue;
      if (!c.endsWith('I18n') && !String(v).trim()) continue;
      sets.push(`"${c}" = $${i}`);
      vals.push(typeof v === 'object' ? JSON.stringify(v) : v);
      i++;
    }
    if (!sets.length) continue;
    const res = await b.query(
      `UPDATE "${table}" SET ${sets.join(', ')}, "updatedAt" = NOW() WHERE "${key}" = $${i} AND ("updatedAt" IS NULL OR "updatedAt" < NOW() - INTERVAL '0 seconds')`,
      [...vals, r[key]],
    );
    updated += res.rowCount;
  }
  console.log(`${table}: ${updated} rows updated in Neon`);
}

await syncTable('Opportunity', [
  'titleI18n', 'aiSummaryI18n', 'descriptionI18n', 'eligibilityI18n', 'benefitsI18n',
  'responsibilitiesI18n', 'requirementsI18n', 'guidelinesI18n', 'jobTypeI18n',
  'salaryI18n', 'educationReqI18n', 'experienceI18n',
  'seoTitleI18n', 'seoDescriptionI18n', 'ogTitleI18n', 'ogDescriptionI18n', 'seoKeywordsI18n',
]);
await syncTable('News', ['titleI18n', 'excerptI18n', 'contentI18n']);

await a.end();
await b.end();
console.log('i18n sync done');
