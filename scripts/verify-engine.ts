/**
 * Engine end-to-end verification: run a few translation units against the
 * real DB + real LLM chain and print exactly what happened (plans, chunks,
 * commits, statuses). Safe: only touches rows through the engine's own
 * atomic commit path.
 *
 *   bun run scripts/verify-engine.ts [units]
 */
import { createDb } from './db-client';

process.env.DATABASE_URL ||= '';

const UNITS = Number(process.argv[2] || '3');

// The engine imports '@/lib/db' — point it at the same URL the scripts use.
process.env.DATABASE_URL = process.env.DATABASE_URL || '';
const { createDb: _c } = await import('./db-client');
void _c;

// Load .env manually into process.env so '@/lib/db' sees it.
import { readFileSync } from 'node:fs';
for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) {
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}
// The production Postgres URL (same one the other backfill scripts use).
const supaLine = readFileSync(new URL('./check-col-parity.mjs', import.meta.url), 'utf8').match(/const SUPA_URL = '(.+)';/);
if (supaLine) process.env.DATABASE_URL = supaLine[1];

const { processBatch } = await import('../src/lib/ai/translate-engine');
const db = createDb();

const before = await db.opportunity.count({ where: { status: 'published' } });
const faBefore = await db.opportunity.count({ where: { status: 'published', faStatus: 'complete' } });
console.log(`published rows: ${before}, fa-complete before: ${faBefore}`);

const r = await processBatch(UNITS);
console.log('processBatch result:', r);

const after = await db.opportunity.count({ where: { status: 'published', faStatus: 'complete' } });
const chunks = await db.translationChunk.count();
const done = await db.translationChunk.count({ where: { status: 'done' } });
console.log(`fa-complete after: ${after} (+${after - faBefore}), chunks staged: ${chunks}, done: ${done}`);

// Show one committed row's fa description head as proof.
const sample = await db.opportunity.findFirst({
  where: { status: 'published', faStatus: 'complete' },
  orderBy: { updatedAt: 'desc' },
  select: { title: true, titleI18n: true, descriptionI18n: true, translationProgress: true },
});
if (sample) {
  const ti = sample.titleI18n as Record<string, string> | null;
  const di = sample.descriptionI18n as Record<string, string> | null;
  console.log('\nsample committed row:', sample.title.slice(0, 60));
  console.log('  title.fa:', (ti?.fa || '').slice(0, 80));
  console.log('  description.fa length:', (di?.fa || '').length, 'vs en length:', (di?.en || '').length);
  console.log('  progress:', JSON.stringify(sample.translationProgress));
}
await db.$disconnect();
