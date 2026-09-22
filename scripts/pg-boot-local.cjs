/**
 * Boots the local Windows Postgres cluster (.localpg) on 127.0.0.1:5433.
 *
 * Runs pg_ctl directly (not the embedded-postgres JS wrapper, which swallows
 * the child's error output). pg_ctl starts postgres as a detached process, so
 * this script can exit as soon as the server accepts connections.
 *
 * Usage (from a normal, non-elevated terminal):
 *   node scripts/pg-boot-local.cjs
 * From an elevated terminal, launch it through the user session instead
 * (postgres refuses admin tokens) — e.g. the _start-pg.vbs helper.
 */
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
// The Windows-native local cluster. NOTE: db/pgdata is the old Linux-born
// copy — its stored locale can never open on Windows; .localpg is the real one.
const DATA_DIR = path.join(ROOT, '.localpg');
const PG_CTL = path.join(ROOT, 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'bin', 'pg_ctl.exe');
const LOG = path.resolve(__dirname, 'pg-local.log');

const logLine = (...a) => {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}`;
  console.log(line);
  try { fs.appendFileSync(LOG, line + '\n'); } catch { /* noop */ }
};

function listening() {
  try {
    return /127\.0\.0\.1:5433\s/.test(execSync('netstat -ano | findstr ":5433" | findstr LISTENING').toString());
  } catch {
    return false;
  }
}

async function main() {
  logLine('booting; data dir:', DATA_DIR);
  if (!fs.existsSync(DATA_DIR)) {
    logLine('ERROR: no cluster at', DATA_DIR);
    process.exit(1);
  }
  if (listening()) {
    logLine('already listening on 5433 — nothing to do');
    process.exit(0);
  }
  const child = spawn(PG_CTL, ['-D', DATA_DIR, '-l', path.join(DATA_DIR, 'pg-run.log'), 'start'], {
    stdio: 'ignore',
  });
  child.on('exit', (code) => {
    if (code !== 0) {
      logLine(`FAILED: pg_ctl exited ${code} — see .localpg/pg-run.log`);
      process.exit(code || 1);
    }
  });
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (listening()) {
      logLine('postgres up on 127.0.0.1:5433');
      process.exit(0);
    }
  }
  logLine('FAILED: server did not start within 20s — see .localpg/pg-run.log');
  process.exit(1);
}

main().catch((e) => {
  logLine('FAILED:', e && e.message ? e.message : String(e));
  process.exit(1);
});
