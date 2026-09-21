/**
 * i18n-merge — build SQL that merges fa+ps translations into an i18n JSON column.
 *
 * Usage:
 *   node scripts/i18n-merge.cjs --field=descriptionI18n --json=translations.json --out=updates.sql
 *
 * translations.json format:
 * {
 *   "<Opportunity id>": { "fa": "...", "ps": "..." },
 *   ...
 * }
 */
const fs = require('fs');
const args = process.argv.slice(2);
const flag = (n) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : undefined; };

const field = flag('field');
const jsonFile = flag('json');
const outFile = flag('out') || '_updates.sql';
if (!field || !jsonFile) { console.error('usage: node scripts/i18n-merge.cjs --field=<titleI18n|aiSummaryI18n|descriptionI18n> --json=<file> [--out=sql]'); process.exit(1); }

const allowed = ['titleI18n', 'aiSummaryI18n', 'descriptionI18n'];
if (!allowed.includes(field)) { console.error('field must be one of ' + allowed.join(', ')); process.exit(1); }

const m = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
const q = (s) => s.replace(/'/g, "''");
let sql = '';
for (const [id, v] of Object.entries(m)) {
  if (!v || typeof v.fa !== 'string' || typeof v.ps !== 'string' || !v.fa.trim() || !v.ps.trim()) {
    console.error(`skip (missing fa/ps): ${id}`);
    continue;
  }
  sql += `UPDATE "Opportunity" SET "${field}" = COALESCE("${field}", '{}'::jsonb) || jsonb_build_object('fa', '${q(v.fa)}', 'ps', '${q(v.ps)}') WHERE id = '${q(id)}';\n`;
}
fs.writeFileSync(outFile, sql);
console.log(`${Object.keys(m).length} rows -> ${outFile} (field: ${field})`);
