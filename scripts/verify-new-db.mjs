// Deep verification of NEW database: row counts, sample data, trilingual fields
import pg from 'pg';

const NEW_URL = process.env.DATABASE_URL;

const pool = new pg.Pool({ connectionString: NEW_URL, max: 3, connectionTimeoutMillis: 15000 });

const brief = (r, maxLen = 70) => {
  const out = {};
  for (const k of Object.keys(r)) {
    const v = r[k];
    if (v === null || v === undefined) out[k] = null;
    else if (typeof v === 'object') out[k] = '[obj]';
    else out[k] = String(v).replace(/\s+/g, ' ').slice(0, maxLen);
  }
  return out;
};

async function main() {
  // 1. Row counts for all tables
  const { rows: tables } = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`);

  console.log('=== NEW DB ROW COUNTS ===');
  for (const { table_name } of tables) {
    const safe = table_name.replace(/"/g, '""');
    try {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM "${safe}"`);
      const c = rows[0].c;
      const flag = c === 0 ? '  <-- EMPTY' : '';
      console.log(`${table_name.padEnd(30)} ${String(c).padStart(7)}${flag}`);
    } catch (e) {
      console.log(`${table_name.padEnd(30)} ERROR: ${e.message.slice(0, 60)}`);
    }
  }

  // 2. Key content tables sample checks
  const keyTables = ['Opportunity', 'Service', 'Visa', 'News', 'AdminUser', 'SiteSetting', 'ImportSource', 'PricingPackage', 'PaymentMethod'];
  console.log('\n=== SAMPLE ROWS (key tables) ===');
  for (const t of keyTables) {
    if (!tables.some(x => x.table_name === t)) { console.log(`\n-- ${t}: NOT FOUND`); continue; }
    const { rows: cols } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [t]);
    const idCol = cols.some(c => c.column_name === 'id') ? 'id' : cols[0].column_name;
    const { rows } = await pool.query(`SELECT * FROM "${t}" ORDER BY "${idCol}" LIMIT 2`);
    console.log(`\n-- ${t} (cols: ${cols.map(c => c.column_name).join(', ')})`);
    rows.forEach(r => console.log(JSON.stringify(brief(r))));
  }

  // 3. Trilingual completeness check on main content tables
  console.log('\n=== TRILINGUAL FIELD COMPLETENESS ===');
  for (const t of ['Opportunity', 'Service', 'Visa', 'News']) {
    if (!tables.some(x => x.table_name === t)) continue;
    const { rows: cols } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1`, [t]);
    const names = cols.map(c => c.column_name);
    const faCol = names.find(n => /fa$/i.test(n) || /farsi|persian/i.test(n));
    const psCol = names.find(n => /ps$|pashto/i.test(n));
    if (!faCol && !psCol) { console.log(`${t}: no trilingual columns found (cols: ${names.join(',')})`); continue; }
    const checks = [];
    if (faCol) checks.push(`COUNT("${faCol}") FILTER (WHERE "${faCol}" IS NOT NULL AND "${faCol}" <> '')::int AS fa_filled`);
    if (psCol) checks.push(`COUNT("${psCol}") FILTER (WHERE "${psCol}" IS NOT NULL AND "${psCol}" <> '')::int AS ps_filled`);
    checks.push('COUNT(*)::int AS total');
    const { rows } = await pool.query(`SELECT ${checks.join(', ')} FROM "${t}"`);
    const r = rows[0];
    console.log(`${t}: total=${r.total} | ${faCol ? `${faCol} filled=${r.fa_filled}` : ''} ${psCol ? `| ${psCol} filled=${r.ps_filled}` : ''}`);
  }

  await pool.end();
  console.log('\n=== DONE ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
