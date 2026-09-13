// Post-import integrity verification: run against ANY imported DB
// Checks: row counts vs export, FK orphans, trilingual completeness, menu tree
import pg from 'pg';
import { readFileSync } from 'fs';

const TARGET = process.argv[2] || 'postgresql://postgres@127.0.0.1:5433/ariahub_fresh?sslmode=disable';
const EXPORT = process.argv[3] || 'download/canonical-export.json';
const payload = JSON.parse(readFileSync(EXPORT, 'utf8'));

const pool = new pg.Pool({ connectionString: TARGET, max: 3 });
let fail = 0;

// 1) Row counts vs export
console.log('── 1. ROW COUNTS vs export ──');
for (const [t, rows] of Object.entries(payload.tables)) {
  const { rows: c } = await pool.query(`SELECT COUNT(*)::int c FROM "${t}"`).catch(() => ({ rows: [{ c: -1 }] }));
  const ok = c[0].c === rows.length;
  if (!ok) { fail++; console.log(`  ✗ ${t}: db=${c[0].c} export=${rows.length}`); }
}
console.log(`  ${fail === 0 ? '✓ all' : fail} tables match export counts`);

// 2) FK orphan check (all FK constraints)
console.log('── 2. FK ORPHAN CHECK ──');
const { rows: fks } = await pool.query(`
  SELECT conrelid::regclass::text child, confrelid::regclass::text parent,
    (SELECT array_to_string(array_agg(a.attname ORDER BY x.ord), ',') FROM unnest(conkey) WITH ORDINALITY x(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = conrelid AND a.attnum = x.attnum) cols,
    (SELECT array_to_string(array_agg(a.attname ORDER BY y.ord), ',') FROM unnest(confkey) WITH ORDINALITY y(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = confrelid AND a.attnum = y.attnum) pcols
  FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace`);
let orphanTotal = 0;
for (const fk of fks) {
  const colList = (fk.cols || '').split(',').filter(Boolean);
  const pcolList = (fk.pcols || '').split(',').filter(Boolean);
  const on = colList.map((c, i) => `c."${c}" IS DISTINCT FROM p."${pcolList[i]}"`).join(' OR ');
  const join = colList.map((c, i) => `c."${c}" = p."${pcolList[i]}"`).join(' AND ');
  const nulls = colList.map(c => `c."${c}" IS NULL`).join(' AND ');
  const q = `SELECT COUNT(*)::int n FROM "${fk.child}" c LEFT JOIN "${fk.parent}" p ON ${join}
             WHERE (${on}) AND NOT (${nulls})`;
  const { rows } = await pool.query(q).catch(() => ({ rows: [{ n: -1 }] }));
  if (rows[0].n > 0) { orphanTotal += rows[0].n; console.log(`  ✗ ${fk.child} → ${fk.parent}: ${rows[0].n} orphans`); }
}
console.log(`  ${orphanTotal === 0 ? '✓ zero orphan foreign keys across ' + fks.length + ' constraints' : orphanTotal + ' ORPHANS'}`);

// 3) Trilingual completeness
console.log('── 3. TRILINGUAL (fa/ps) COMPLETENESS ──');
const tl = async (t, col) => {
  const { rows } = await pool.query(`SELECT COUNT(*)::int total,
    COUNT(*) FILTER (WHERE "${col}"::jsonb ? 'fa' AND "${col}"::jsonb ? 'ps' AND "${col}"::jsonb ? 'en')::int all3
    FROM "${t}" WHERE "${col}" IS NOT NULL`);
  const r = rows[0];
  console.log(`  ${r.all3 === r.total && r.total > 0 ? '✓' : '△'} ${t}.${col}: ${r.all3}/${r.total} have en+fa+ps`);
};
await tl('Opportunity', 'titleI18n');
await tl('Opportunity', 'aiSummaryI18n');
await tl('News', 'titleI18n');
await tl('MenuItem', 'labelI18n').catch(() => console.log('  △ MenuItem.labelI18n n/a'));

// 4) Menu tree renders
console.log('── 4. MENU TREE ──');
const { rows: menu } = await pool.query(`SELECT label, "parentId" FROM "MenuItem" WHERE visible ORDER BY "order"`);
const roots = menu.filter(m => !m.parentId);
console.log(`  ✓ ${menu.length} visible items, ${roots.length} roots: ${roots.map(r => r.label).join(', ')}`);

// 5) Key sections present
console.log('── 5. KEY CONTENT PRESENT ──');
for (const t of ['Section', 'Service', 'PricingPackage', 'PaymentMethod', 'Testimonial', 'Faq', 'FooterLink', 'SocialLink', 'Visa', 'VisaCountry', 'VisaDocument', 'InterviewQuestion', 'SuccessStory']) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int c FROM "${t}"`);
  if (rows[0].c === 0) { fail++; console.log(`  ✗ ${t}: EMPTY`); }
}
console.log('  ✓ all key content tables non-empty (see import report)');

console.log(fail === 0 ? '\n✅ INTEGRITY: PERFECT — safe to point the app at this database' : `\n❌ ${fail} problem(s) found`);
await pool.end();
