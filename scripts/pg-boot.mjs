/**
 * Boot the embedded Postgres on port 5433 (database "ariahub").
 * Usage: node scripts/pg-boot.mjs [--init-only]
 * Idempotent: if the data dir exists it just starts; if the DB exists it skips creation.
 */
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';

const DATA_DIR = '/home/z/my-project/db/pgdata';

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: 'postgres',
    password: 'postgres',
    port: 5433,
    persistent: true,
  });

  if (!fs.existsSync(DATA_DIR)) {
    console.log('[pg-boot] initialising data dir…');
    await pg.initialise();
  }
  console.log('[pg-boot] starting postgres…');
  await pg.start();
  // give the socket a moment
  await new Promise((r) => setTimeout(r, 1500));

  const { Client } = await import('pg');
  const c = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5433/postgres' });
  await c.connect();
  const exists = await c.query(`SELECT 1 FROM pg_database WHERE datname='ariahub'`);
  if (exists.rowCount === 0) {
    await c.query(`CREATE DATABASE ariahub`);
    console.log('[pg-boot] database ariahub created');
  } else {
    console.log('[pg-boot] database ariahub exists');
  }
  await c.end();
  console.log('[pg-boot] READY: postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable');

  // keep process alive holding the server
  if (!process.argv.includes('--daemon')) {
    process.on('SIGINT', async () => { try { await pg.stop(); } catch {} process.exit(0); });
    setInterval(() => {}, 1 << 30);
  } else {
    await pg.stop();
  }
}

main().catch((e) => { console.error('[pg-boot] FAILED:', e && e.stack ? e.stack : String(e)); process.exit(1); });
