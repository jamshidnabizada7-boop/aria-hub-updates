// Migration verification: compare old vs new Neon databases
import pg from 'pg';

const OLD_URL = process.env.DATABASE_URL;
const NEW_URL = process.env.DATABASE_URL;

async function getTables(pool) {
  const { rows } = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
    ORDER BY table_name
  `);
  return rows.map(r => r.table_name);
}

async function getColumns(pool, table) {
  const { rows } = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1
    ORDER BY ordinal_position
  `, [table]);
  return rows;
}

async function getRowCount(pool, table) {
  // quote identifier safely
  const safe = table.replace(/"/g, '""');
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM "${safe}"`);
  return rows[0].c;
}

async function getSequences(pool) {
  const { rows } = await pool.query(`
    SELECT sequencename, last_value FROM pg_sequences WHERE schemaname='public'
  `).catch(() => ({ rows: [] }));
  return rows;
}

async function main() {
  const oldPool = new pg.Pool({ connectionString: OLD_URL, max: 3, connectionTimeoutMillis: 20000 });
  const newPool = new pg.Pool({ connectionString: NEW_URL, max: 3, connectionTimeoutMillis: 20000 });

  console.log('=== CONNECTING ===');
  try {
    const [o, n] = await Promise.all([oldPool.query('SELECT version()'), newPool.query('SELECT version()')]);
    console.log('OLD OK:', o.rows[0].version.split(',')[0]);
    console.log('NEW OK:', n.rows[0].version.split(',')[0]);
  } catch (e) {
    console.error('CONNECT ERROR:', e.message);
    process.exit(1);
  }

  console.log('\n=== TABLES ===');
  const [oldTables, newTables] = await Promise.all([getTables(oldPool), getTables(newPool)]);
  console.log('OLD tables:', JSON.stringify(oldTables));
  console.log('NEW tables:', JSON.stringify(newTables));
  const missingInNew = oldTables.filter(t => !newTables.includes(t));
  const extraInNew = newTables.filter(t => !oldTables.includes(t));
  console.log('Missing in NEW:', JSON.stringify(missingInNew));
  console.log('Extra in NEW:', JSON.stringify(extraInNew));

  console.log('\n=== ROW COUNTS (old -> new) ===');
  const results = [];
  for (const t of oldTables) {
    const [oc, nc] = await Promise.all([
      getRowCount(oldPool, t),
      newTables.includes(t) ? getRowCount(newPool, t) : Promise.resolve(null)
    ]);
    const status = nc === null ? 'TABLE MISSING' : (oc === nc ? 'OK' : `MISMATCH (${nc - oc})`);
    results.push({ table: t, old: oc, new: nc, status });
    console.log(`${t.padEnd(40)} ${String(oc).padStart(8)} -> ${String(nc).padStart(8)}  ${status}`);
  }
  for (const t of extraInNew) {
    const nc = await getRowCount(newPool, t);
    console.log(`${t.padEnd(40)} ${'(none)'.padStart(8)} -> ${String(nc).padStart(8)}  EXTRA TABLE`);
  }

  console.log('\n=== SCHEMA DIFF (per shared table) ===');
  for (const t of oldTables.filter(t => newTables.includes(t))) {
    const [oc, nc] = await Promise.all([getColumns(oldPool, t), getColumns(newPool, t)]);
    const oMap = new Map(oc.map(c => [c.column_name, c]));
    const nMap = new Map(nc.map(c => [c.column_name, c]));
    const diffs = [];
    for (const [name, c] of oMap) {
      if (!nMap.has(name)) diffs.push(`${name}: missing in NEW`);
      else {
        const n = nMap.get(name);
        if (n.data_type !== c.data_type) diffs.push(`${name}: type ${c.data_type} -> ${n.data_type}`);
        if (n.is_nullable !== c.is_nullable) diffs.push(`${name}: nullable ${c.is_nullable} -> ${n.is_nullable}`);
      }
    }
    for (const [name] of nMap) if (!oMap.has(name)) diffs.push(`${name}: extra in NEW`);
    if (diffs.length) console.log(`${t}: ${diffs.join('; ')}`);
  }
  console.log('(no output above = all shared tables match)');

  console.log('\n=== SEQUENCES (new) ===');
  const newSeqs = await getSequences(newPool);
  for (const s of newSeqs) console.log(`${s.sequencename}: last_value=${s.last_value}`);

  console.log('\n=== SAMPLE SPOT-CHECKS ===');
  // Pick the largest content table and sample a row
  const mainTable = results.slice().sort((a, b) => (b.old || 0) - (a.old || 0))[0];
  if (mainTable && mainTable.table && newTables.includes(mainTable.table)) {
    const safe = mainTable.table.replace(/"/g, '""');
    const newCols = await getColumns(newPool, mainTable.table);
    const idCol = newCols.find(c => c.column_name === 'id') ? 'id' : newCols[0].column_name;
    const { rows: oSample } = await oldPool.query(`SELECT * FROM "${safe}" ORDER BY "${idCol}" DESC LIMIT 2`);
    const { rows: nSample } = await newPool.query(`SELECT * FROM "${safe}" ORDER BY "${idCol}" DESC LIMIT 2`);
    const brief = (r) => {
      const out = {};
      for (const k of Object.keys(r)) {
        const v = r[k];
        if (v === null || v === undefined) out[k] = null;
        else if (typeof v === 'object') out[k] = '[obj]';
        else out[k] = String(v).slice(0, 60);
      }
      return out;
    };
    console.log(`Table: ${mainTable.table} — newest OLD rows:`);
    oSample.forEach(r => console.log(JSON.stringify(brief(r))));
    console.log(`Table: ${mainTable.table} — newest NEW rows:`);
    nSample.forEach(r => console.log(JSON.stringify(brief(r))));
  }

  await oldPool.end();
  await newPool.end();
  console.log('\n=== DONE ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
