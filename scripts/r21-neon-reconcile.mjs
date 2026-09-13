/**
 * R21 Neon reconcile (run once):
 *  1) Mirror local's canonical 25-item menu tree onto Neon exactly
 *     (my earlier db-import top-up duplicated 3 items / 1 root on Neon).
 *  2) Insert local Opportunity rows missing on Neon (the 46 scraped drafts),
 *     remapping categoryId via slug (category ids differ between hosts).
 * Idempotent. Local DB = canonical source of truth.
 */
import pg from 'pg';

const NEON = process.env.DATABASE_URL;
const LOCAL = 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';
const neon = new pg.Pool({ connectionString: NEON, max: 3 });
const local = new pg.Pool({ connectionString: LOCAL, max: 3 });

// ── 1) MENU: make Neon identical to local ──────────────────────────────────
const { rows: lMenu } = await local.query('SELECT * FROM "MenuItem" ORDER BY "order" ASC');
const lIds = lMenu.map(m => m.id);
console.log(`local menu items: ${lIds.length}`);
const del = await neon.query('DELETE FROM "MenuItem" WHERE id <> ALL($1::text[]) RETURNING id, label', [lIds]);
console.log(`neon: removed non-canonical menu items:`, del.rows.map(r => r.label).join(', ') || '(none)');
let updated = 0;
const nCols = (await neon.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='MenuItem'`)).rows;
const lCols = (await local.query(`SELECT column_name FROM information_schema.columns WHERE table_name='MenuItem'`)).rows.map(r => r.column_name);
const jsonCols = new Set(nCols.filter(c => c.data_type === 'jsonb').map(c => c.column_name));
for (const m of lMenu) {
  const cols = nCols.map(c => c.column_name).filter(c => lCols.includes(c) && c !== 'id');
  const sets = cols.map((c, i) => `"${c}" = $${i + 2}`).join(', ');
  const vals = [m.id, ...cols.map(c => (jsonCols.has(c) && m[c] !== null && typeof m[c] === 'object') ? JSON.stringify(m[c]) : m[c])];
  await neon.query(`UPDATE "MenuItem" SET ${sets} WHERE id = $1`, vals);
  updated++;
}
console.log(`neon: menu rows updated: ${updated}`);

// ── 2) OPPORTUNITY drafts: local → Neon with category slug remap ──────────
const { rows: lCats } = await local.query('SELECT id, slug FROM "OpportunityCategory"');
const { rows: nCats } = await neon.query('SELECT id, slug FROM "OpportunityCategory"');
const slugOfLocal = new Map(lCats.map(c => [c.id, c.slug]));
const neonIdBySlug = new Map(nCats.map(c => [c.slug, c.id]));
const { rows: opps } = await local.query('SELECT * FROM "Opportunity"');
const { rows: nOppIds } = await neon.query('SELECT id FROM "Opportunity"');
const have = new Set(nOppIds.map(r => r.id));
const nOppCols = (await neon.query(`SELECT column_name FROM information_schema.columns WHERE table_name='Opportunity'`)).rows.map(r => r.column_name);
const lOppCols = (await local.query(`SELECT column_name FROM information_schema.columns WHERE table_name='Opportunity'`)).rows.map(r => r.column_name);
const cols = nOppCols.filter(c => lOppCols.includes(c));
const oppJsonCols = new Set((await neon.query(`SELECT column_name FROM information_schema.columns WHERE table_name='Opportunity' AND data_type='jsonb'`)).rows.map(r => r.column_name));
let added = 0, skipped = 0, failed = 0;
for (const o of opps) {
  if (have.has(o.id)) { skipped++; continue; }
  const catSlug = o.categoryId ? slugOfLocal.get(o.categoryId) : null;
  const vals = cols.map(c => {
    if (c === 'categoryId') return (catSlug && neonIdBySlug.get(catSlug)) || null;
    let v = o[c];
    if (oppJsonCols.has(c) && v !== null && typeof v === 'object') v = JSON.stringify(v);
    return v;
  });
  const ph = cols.map((_, i) => `$${i + 1}`).join(',');
  try {
    await neon.query(`INSERT INTO "Opportunity" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${ph}) ON CONFLICT (id) DO NOTHING`, vals);
    added++;
  } catch (e) { failed++; console.log(`  ! ${o.slug}: ${e.message.split('\n')[0].slice(0, 100)}`); }
}
console.log(`neon opportunities: +${added} drafts inserted, ${skipped} already existed, ${failed} failed`);

// ── verify ─────────────────────────────────────────────────────────────────
const nMenuCount = await neon.query('SELECT count(*)::int c FROM "MenuItem"');
const nOppCount = await neon.query('SELECT count(*)::int c FROM "Opportunity"');
const nNewsCount = await neon.query('SELECT count(*)::int c FROM "News"');
const orphans = await neon.query(`SELECT count(*)::int c FROM "Opportunity" o LEFT JOIN "OpportunityCategory" c ON c.id = o."categoryId" WHERE o."categoryId" IS NOT NULL AND c.id IS NULL`);
console.log(`VERIFY neon: menu=${nMenuCount.rows[0].c} (want 25) opportunity=${nOppCount.rows[0].c} (want 60) news=${nNewsCount.rows[0].c} (want 33) catOrphans=${orphans.rows[0].c} (want 0)`);

await neon.end(); await local.end();
console.log('RECONCILE DONE');
