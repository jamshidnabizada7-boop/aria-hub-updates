/**
 * CLI import runner — executes the full scraper + AI pipeline outside the
 * dev server (no HTTP timeout, isolated memory) using the same orchestrator
 * the admin panel uses.
 *
 * Usage:
 *   bun run scripts/run-import.ts                       # auto-pick next source
 *   bun run scripts/run-import.ts --source=o4af         # one source (scraperKey or name)
 *   bun run scripts/run-import.ts --all                 # run every enabled source sequentially
 *   bun run scripts/run-import.ts --source=acbar --force
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL || '';
  if (envUrl.startsWith('postgres')) return envUrl;
  try {
    const raw = readFileSync(join(here, '..', '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (v.startsWith('postgres')) return v;
    }
  } catch { /* fallthrough */ }
  throw new Error('No PostgreSQL DATABASE_URL found');
}

// The orchestrator's `@/lib/db` reads process.env.DATABASE_URL — make sure it
// sees the Neon URL BEFORE any import of that module happens.
process.env.DATABASE_URL = resolveDatabaseUrl();
process.env.AI_PROVIDER = process.env.AI_PROVIDER || 'zai';
process.env.IMPORT_GLOBAL_TIMEOUT_MS = process.env.IMPORT_GLOBAL_TIMEOUT_MS || '600000';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : undefined;
};
const sourceArg = flag('source');
const runAll = args.includes('--all');
const force = args.includes('--force');

async function main(): Promise<void> {
  const { runImport } = await import('../src/lib/import/orchestrator');
  const { db } = await import('../src/lib/db');

  if (runAll) {
    const sources = await db.importSource.findMany({ where: { enabled: true }, orderBy: { name: 'asc' } });
    for (const s of sources) {
      console.log(`\n=== Import: ${s.name} (${s.scraperKey}) ===`);
      try {
        const summary = await runImport({ sourceId: s.id, triggeredBy: 'cli', force });
        console.log(JSON.stringify(summary));
      } catch (e) {
        console.error(`FAILED: ${(e as Error).message}`);
      }
    }
  } else if (sourceArg) {
    const s = await db.importSource.findFirst({
      where: { OR: [{ scraperKey: sourceArg }, { name: { contains: sourceArg, mode: 'insensitive' } }] },
    });
    if (!s) throw new Error(`Import source "${sourceArg}" not found`);
    console.log(`\n=== Import: ${s.name} (${s.scraperKey}) ===`);
    const summary = await runImport({ sourceId: s.id, triggeredBy: 'cli', force });
    console.log(JSON.stringify(summary, null, 2));
  } else {
    const summary = await runImport({ triggeredBy: 'cli', force });
    console.log(JSON.stringify(summary, null, 2));
  }
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(async () => {
    const { db } = await import('../src/lib/db');
    await db.$disconnect();
  });
