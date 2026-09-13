// CANONICAL SYNC: make local sandbox DB and new Neon DB complete & identical
//  A) local -> Neon : visa library, interview prep, visits, audit log (Neon empty)
//  B) Neon -> local : full CMS seed (menu, sections, services, pricing, ...) (local empty)
//  C) reconcile    : menu tree re-parenting, News/Category slugs dedup
// Idempotent: safe to re-run (skips rows that already exist by PK).
import pg from 'pg';

const NEON = process.env.DATABASE_URL;
const LOCAL = 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';

const neon = new pg.Pool({ connectionString: NEON, max: 3 });
const local = new pg.Pool({ connectionString: LOCAL, max: 3 });

let grandTotal = 0;

async function jsonCols(pool, table) {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND data_type IN ('json','jsonb')`, [table]);
  return new Set(rows.map(r => r.column_name));
}

async function tableCols(pool, table) {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [table]);
  return rows.map(r => r.column_name);
}

// Insert rows from srcPool table -> dstPool table (same ids), skipping existing PKs
async function copyTable(srcPool, dstPool, table, { where = '', remap = {} } = {}) {
  const srcCols = await tableCols(srcPool, table);
  const dstCols = await tableCols(dstPool, table);
  const cols = srcCols.filter(c => dstCols.includes(c));
  if (cols.length === 0) { console.log(`  !! ${table}: no common columns, skipped`); return 0; }
  const jsons = await jsonCols(dstPool, table);
  const { rows } = await srcPool.query(`SELECT * FROM "${table}" ${where}`);
  if (rows.length === 0) { console.log(`  ·  ${table}: 0 rows`); return 0; }
  // existing PKs on destination
  let existing = new Set();
  try {
    const er = await dstPool.query(`SELECT id FROM "${table}"`);
    existing = new Set(er.rows.map(r => r.id));
  } catch { /* no id col? use full insert */ }
  let inserted = 0;
  for (const row of rows) {
    if (existing.has(row.id)) continue;
    const vals = cols.map((c) => {
      let v = remap[c] ? remap[c](row[c]) : row[c];
      if (jsons.has(c) && v !== null && typeof v === 'object') v = JSON.stringify(v);
      return v;
    });
    const ph = cols.map((_, i) => `$${i + 1}`).join(',');
    const collist = cols.map(c => `"${c}"`).join(',');
    try {
      await dstPool.query(`INSERT INTO "${table}" (${collist}) VALUES (${ph}) ON CONFLICT (id) DO NOTHING`, vals);
      inserted++;
    } catch (e) {
      console.log(`  !! ${table} row ${row.id}: ${e.message.split('\n')[0]}`);
    }
  }
  grandTotal += inserted;
  console.log(`  ✓  ${table}: +${inserted}/${rows.length}`);
  return inserted;
}

console.log('══ PHASE A: local → Neon (content only Neon is missing) ══');
// FK order: InterviewCategory → InterviewQuestion ; VisaCategory + VisaCountry → VisaDocument
await copyTable(local, neon, 'InterviewCategory');
await copyTable(local, neon, 'InterviewQuestion');
await copyTable(local, neon, 'VisaCategory');
await copyTable(local, neon, 'VisaCountry');
await copyTable(local, neon, 'VisaDocument');
await copyTable(local, neon, 'VisaRejection');
await copyTable(local, neon, 'Visit');
await copyTable(local, neon, 'AuditLog');

console.log('══ PHASE B: Neon → local (full CMS seed local is missing) ══');
const cmsTables = [
  'Language', 'SiteSetting', 'Section', 'Counter', 'CtaBanner', 'Department', 'Branch',
  'ProcessStep', 'ServiceCategory', 'Service', 'Visa', 'PricingPackage', 'PaymentMethod',
  'Testimonial', 'Partner', 'Faq', 'FooterLink', 'SocialLink', 'GalleryItem',
  'ComparisonRow', 'TeamMember',
];
for (const t of cmsTables) await copyTable(neon, local, t);

console.log('══ PHASE C1: reconcile menu tree (Neon canonical → local) ══');
{
  const { rows: nMenu } = await neon.query(`SELECT * FROM "MenuItem" ORDER BY "order" ASC`);
  const { rows: lMenu } = await local.query(`SELECT id, label, "parentId" FROM "MenuItem"`);
  const lRoots = lMenu.filter(m => !m.parentId);
  const nJsons = await jsonCols(local, 'MenuItem');
  const lCols = await tableCols(local, 'MenuItem');
  const nCols = await tableCols(neon, 'MenuItem');
  const cols = nCols.filter(c => lCols.includes(c));
  const insertMenu = async (row) => {
    const vals = cols.map((c) => (nJsons.has(c) && row[c] !== null && typeof row[c] === 'object' ? JSON.stringify(row[c]) : row[c]));
    const ph = cols.map((_, i) => `$${i + 1}`).join(',');
    await local.query(`INSERT INTO "MenuItem" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${ph}) ON CONFLICT (id) DO NOTHING`, vals);
  };
  // PASS 1: roots only (parentId null), dedupe by label against existing local roots
  let rootsAdded = 0;
  for (const row of nMenu.filter(m => !m.parentId)) {
    if (lRoots.some(r => r.label === row.label)) continue;
    await insertMenu(row); rootsAdded++;
  }
  // PASS 2: children — remap parentId when the Neon parent id is absent locally
  const { rows: lAll0 } = await local.query(`SELECT id, label, "parentId" FROM "MenuItem"`);
  const lIds = new Set(lAll0.map(m => m.id));
  const nById = new Map(nMenu.map(m => [m.id, m]));
  let kidsAdded = 0;
  for (const row of nMenu.filter(m => m.parentId)) {
    if (lIds.has(row.id)) continue;
    const clone = { ...row };
    if (!lIds.has(clone.parentId)) {
      const nParent = nById.get(clone.parentId);
      const localRoot = nParent
        ? lAll0.find(l => !l.parentId && l.label === nParent.label)
        : null;
      const toolsRoot = lAll0.find(l => !l.parentId && l.label === 'Tools');
      clone.parentId = (localRoot || toolsRoot)?.id ?? null;
    }
    await insertMenu(clone); kidsAdded++; lIds.add(clone.id);
  }
  console.log(`  ✓ Neon menu merged into local: roots +${rootsAdded}, children +${kidsAdded}`);
  // 2) re-parent: Neon children whose parent wasn't copied because a same-label root existed locally
  //    -> point them at the local root with that label. Also local legacy children (CV Builder,
  //       Opportunity Matcher) -> attach to local Tools root if not already.
  const { rows: lAll } = await local.query(`SELECT id, label, "parentId" FROM "MenuItem"`);
  const byId = new Map(lAll.map(m => [m.id, m]));
  let reparented = 0;
  for (const m of lAll) {
    if (m.parentId && !byId.has(m.parentId)) {
      // broken parent — find local root with the label of the neon parent
      const nParent = nMenu.find(n => n.id === m.parentId);
      let target = null;
      if (nParent) {
        target = lAll.find(l => !l.parentId && l.label === nParent.label);
      }
      const fallback = lAll.find(l => !l.parentId && l.label === 'Tools');
      const newParent = target || fallback || null;
      await local.query(`UPDATE "MenuItem" SET "parentId"=$1 WHERE id=$2`, [newParent ? newParent.id : null, m.id]);
      reparented++;
    }
  }
  console.log(`  ✓ re-parented orphans: ${reparented}`);
  // 3) if Tools root has no children but legacy tools children exist elsewhere/unattached, move them in
  const toolsRoot = lAll.find(l => !l.parentId && l.label === 'Tools');
  if (toolsRoot) {
    const toolsKids = lAll.filter(l => l.parentId === toolsRoot.id);
    if (toolsKids.length === 0) {
      for (const label of ['CV Builder', 'Opportunity Matcher']) {
        const cand = lAll.find(l => l.label === label && l.parentId !== toolsRoot.id && l.id !== toolsRoot.id);
        if (cand) {
          await local.query(`UPDATE "MenuItem" SET "parentId"=$1 WHERE id=$2`, [toolsRoot.id, cand.id]);
          console.log(`  ✓ moved "${label}" under Tools`);
        }
      }
    }
  }
}

console.log('══ PHASE C2: reconcile slug-keyed content (Neon extras → local) ══');
// category tables FIRST (News depends on NewsCategory ids)
for (const [table, key] of [['NewsCategory', 'slug'], ['OpportunityCategory', 'slug'], ['News', 'slug']]) {
  const { rows: src } = await neon.query(`SELECT * FROM "${table}"`);
  const { rows: dst } = await local.query(`SELECT ${key} FROM "${table}"`);
  const have = new Set(dst.map(r => r[key]));
  const jsons = await jsonCols(local, table);
  const lCols = await tableCols(local, table);
  const nCols = await tableCols(neon, table);
  const cols = nCols.filter(c => lCols.includes(c));
  // FK remap: category slug -> local id (tables were seeded independently on both sides)
  const remapCategory = async (row) => {
    if (!('categoryId' in row) || row.categoryId == null) return row;
    const lIds = new Set((await local.query(`SELECT id FROM "${table}"`)).rows.map(r => r.id));
    if (lIds.has(row.categoryId)) return row; // row already local
    const nCat = await neon.query(`SELECT slug FROM "NewsCategory" WHERE id=$1`, [row.categoryId]);
    if (!nCat.rows[0]) return { ...row, categoryId: null };
    const lCat = await local.query(`SELECT id FROM "NewsCategory" WHERE slug=$1`, [nCat.rows[0].slug]);
    return { ...row, categoryId: lCat.rows[0]?.id ?? null };
  };
  let added = 0;
  for (const row of src) {
    if (have.has(row[key])) continue;
    const fixed = table === 'News' ? await remapCategory(row) : row;
    const vals = cols.map((c) => (jsons.has(c) && fixed[c] !== null && typeof fixed[c] === 'object' ? JSON.stringify(fixed[c]) : fixed[c]));
    const ph = cols.map((_, i) => `$${i + 1}`).join(',');
    try {
      await local.query(`INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${ph}) ON CONFLICT (id) DO NOTHING`, vals);
      added++;
    } catch (e) { console.log(`  !! ${table} ${row[key]}: ${e.message.split('\n')[0]}`); }
  }
  console.log(`  ✓ ${table}: +${added} missing rows → local`);
}

console.log('══ FINAL COUNTS ══');
async function counts(pool) {
  const { rows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`);
  const out = {};
  for (const { table_name } of rows) {
    if (table_name === '_prisma_migrations') continue;
    const c = await pool.query(`SELECT COUNT(*)::int c FROM "${table_name}"`);
    out[table_name] = c.rows[0].c;
  }
  return out;
}
const [lc, nc] = await Promise.all([counts(local), counts(neon)]);
let mismatches = 0;
for (const t of [...new Set([...Object.keys(lc), ...Object.keys(nc)])].sort()) {
  const l = lc[t] ?? '—', n = nc[t] ?? '—';
  const flag = l !== n ? '  << DIFF' : '';
  if (l !== n) mismatches++;
  if (l !== 0 || n !== 0) console.log(`  ${t.padEnd(30)} local=${String(l).padStart(4)} neon=${String(n).padStart(4)}${flag}`);
}
console.log(`\nTotal rows copied this run: ${grandTotal} | count mismatches: ${mismatches}`);

await neon.end(); await local.end();
console.log('SYNC DONE');
