import pg from 'pg';
import fs from 'fs';

export function supaUrl() {
  const src = fs.readFileSync('scripts/check-col-parity.mjs', 'utf8');
  const m = src.match(/^const SUPA_URL = '(.+?)';$/m);
  if (!m) throw new Error('SUPA_URL not found');
  return m[1];
}

export async function withProd(fn) {
  const c = new pg.Client({ connectionString: supaUrl(), ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

export function j(x) { return JSON.stringify(x, null, 1); }
