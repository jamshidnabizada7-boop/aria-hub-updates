/**
 * Production row-level backup (STEP 2 of the controlled release).
 * Streams every public table to NDJSON (one JSON object per line) with
 * LIMIT/OFFSET chunking — simple and reliable at ARIA HUB's table sizes.
 * Writes a manifest with per-table row counts.
 *
 * Usage: bun scripts/release/backup-prod.mjs <output-dir>
 */
import { Client } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const outDir = process.argv[2];
if (!outDir) { console.error('usage: backup-prod.mjs <output-dir>'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

const src = fs.readFileSync('scripts/check-col-parity.mjs', 'utf8');
const url = src.match(/^const SUPA_URL = .(.+?).;$/m)[1];

const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const tables = (await c.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`)).rows.map((r) => r.table_name);

const CHUNK = 2000;
const manifest = { startedAt: new Date().toISOString(), tables: {} };
for (const table of tables) {
  const file = path.join(outDir, `${table}.ndjson`);
  const stream = fs.createWriteStream(file);
  let rows = 0;
  let offset = 0;
  const hash = crypto.createHash('sha256');
  for (;;) {
    const chunk = (await c.query(`SELECT * FROM "${table}" ORDER BY 1 OFFSET ${offset} LIMIT ${CHUNK}`)).rows;
    if (!chunk.length) break;
    for (const row of chunk) {
      const line = JSON.stringify(row);
      hash.update(line + '\n');
      stream.write(line + '\n');
      rows++;
    }
    offset += chunk.length;
    if (chunk.length < CHUNK) break;
  }
  await new Promise((r) => stream.end(r));
  manifest.tables[table] = { rows, sha256: hash.digest('hex'), file: path.basename(file) };
  console.log(`${table}: ${rows} rows`);
}

const mig = (await c.query(`SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at`)).rows;
manifest.prismaMigrations = mig.rows;
manifest.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nmanifest: ${Object.keys(manifest.tables).length} tables, ${Object.values(manifest.tables).reduce((a, t) => a + t.rows, 0)} total rows`);
console.log(`prisma migration rows recorded: ${mig.rows.length}`);
await c.end();
