import pg from 'pg';
import { readFileSync } from 'fs';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const sql = readFileSync('/tmp/schema-diff.sql', 'utf8');
try {
  await pool.query('BEGIN');
  await pool.query(sql);
  await pool.query('COMMIT');
  console.log('SCHEMA SYNC APPLIED OK');
} catch (e) {
  await pool.query('ROLLBACK').catch(() => {});
  console.error('FAILED:', e.message);
  process.exit(1);
}
// verify
const { rows } = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`);
console.log('Tables now:', rows.length, '| MonetizationOrder:', rows.some(r => r.table_name === 'MonetizationOrder'), '| VisaRejection:', rows.some(r => r.table_name === 'VisaRejection'));
const { rows: ss } = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='SuccessStory' AND column_name='contentI18n'`);
console.log('SuccessStory.contentI18n added:', ss.length === 1);
await pool.end();
