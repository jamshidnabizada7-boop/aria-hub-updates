// Full table-by-table comparison: local sandbox DB vs new Neon
// Answers: "is everything complete? what's missing where?"
import pg from 'pg';

const NEON = process.env.DATABASE_URL;
const LOCAL = 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';

const local = new pg.Pool({ connectionString: LOCAL, max: 2 });
const neon = new pg.Pool({ connectionString: NEON, max: 2 });

async function tables(pool) {
  const { rows } = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name`);
  return rows.map(r => r.table_name).filter(t => t !== '_prisma_migrations');
}

async function counts(pool, tbls) {
  const out = {};
  for (const t of tbls) {
    try {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM "${t}"`);
      out[t] = rows[0].c;
    } catch { out[t] = 'ERR'; }
  }
  return out;
}

async function cols(pool) {
  const { rows } = await pool.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema='public' ORDER BY table_name, ordinal_position`);
  const map = {};
  for (const r of rows) (map[r.table_name] ||= []).push(r.column_name);
  return map;
}

const [lt, nt] = await Promise.all([tables(local), tables(neon)]);
const [lc, nc] = await Promise.all([counts(local, lt), counts(neon, nt)]);
const [lcols, ncols] = await Promise.all([cols(local), cols(neon)]);

const all = [...new Set([...lt, ...nt])].sort();
let diffCount = 0;
console.log('TABLE'.padEnd(34), 'LOCAL', String('NEON').padStart(6), '  VERDICT');
console.log('-'.repeat(78));
for (const t of all) {
  const l = lt.includes(t) ? lc[t] : '—';
  const n = nt.includes(t) ? nc[t] : 'MISSING';
  const lc2 = lt.includes(t) ? (lcols[t] || []).length : 0;
  const nc2 = nt.includes(t) ? (ncols[t] || []).length : 0;
  let verdict = 'ok';
  if (!nt.includes(t)) { verdict = '!! TABLE MISSING IN NEON'; diffCount++; }
  else if (n === 'ERR') { verdict = '!! NEON QUERY ERROR'; diffCount++; }
  else if (nc2 < lc2) { verdict = `!! NEON MISSING ${lc2 - nc2} COLUMN(S)`; diffCount++; }
  else if (n < l) { verdict = `>> NEON behind by ${l - n} rows`; diffCount++; }
  else if (n > l) { verdict = `   NEON ahead by ${n - l} rows (neon-only data)`; }
  console.log(t.padEnd(34), String(l).padStart(5), String(n).padStart(6), ' ', verdict);
}
console.log('-'.repeat(78));
console.log(`Tables: local=${lt.length} neon=${nt.length} | diffs=${diffCount}`);

// spot check: menu items on each side
for (const [name, pool] of [['LOCAL', local], ['NEON', neon]]) {
  try {
    const { rows } = await pool.query(`SELECT label, url, "parentId" FROM "MenuItem" WHERE visible=true ORDER BY "order" ASC`);
    const roots = rows.filter(r => !r.parentId).map(r => r.label);
    console.log(`\n${name} MenuItem roots (${rows.length} total):`, roots.join(', '));
  } catch (e) { console.log(`\n${name} MenuItem: ERROR ${e.message}`); }
}

await local.end(); await neon.end();
