/**
 * Boots the embedded Postgres cluster (db/pgdata) on 127.0.0.1:5433.
 *
 * Postgres refuses to run under an elevated (admin) token, so when launched
 * from an elevated terminal use the Scheduler de-elevation trick:
 *   schtasks /Create /TN AriaPG /TR "\"<node>\" \"<repo>\scripts\pg-boot-local.cjs\"" /SC ONCE /ST 23:59 /F
 *   schtasks /Run   /TN AriaPG
 * From a normal terminal just:  node scripts/pg-boot-local.cjs
 *
 * The process stays alive holding the server (Ctrl+C stops it cleanly).
 */
const path = require('path');
const fs = require('fs');
const EmbeddedPostgres = require('embedded-postgres').default ?? require('embedded-postgres');

const DATA_DIR = path.resolve(__dirname, '..', 'db', 'pgdata');
const LOG = path.resolve(__dirname, 'pg-local.log');
// Mirror console output to scripts/pg-local.log — the process often runs
// headless (Scheduler task), where stdout is invisible.
const logLine = (...a) => {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch { /* noop */ }
};

async function main() {
  logLine('booting; data dir:', DATA_DIR);
  if (!fs.existsSync(DATA_DIR)) {
    logLine('ERROR: no cluster at', DATA_DIR);
    process.exit(1);
  }
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: 'postgres',
    password: 'postgres',
    port: 5433,
    persistent: true,
  });
  await pg.start();
  logLine('postgres up on 127.0.0.1:5433');
  process.on('SIGINT', async () => {
    try { await pg.stop(); } catch { /* noop */ }
    process.exit(0);
  });
  setInterval(() => {}, 1 << 30);
}

main().catch((e) => {
  logLine('FAILED:', e.message);
  process.exit(1);
});
