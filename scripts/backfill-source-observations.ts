/**
 * Phase 3 — Source observation backfill (LOCAL ONLY).
 *
 * Creates OpportunitySourceObservation rows for every existing opportunity,
 * derived from the legacy sourceName/sourceUrl columns. DEFAULT IS DRY-RUN;
 * nothing is written unless --apply is passed. Legacy fields are read,
 * never modified.
 *
 * Usage:
 *   bun --conditions=react-server scripts/backfill-source-observations.ts
 *   bun --conditions=react-server scripts/backfill-source-observations.ts --apply
 *   bun --conditions=react-server scripts/backfill-source-observations.ts --limit 50
 */
import { db } from '../src/lib/db';
import { backfillSourceObservations } from '../src/lib/import/source-observations';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) || undefined : undefined;
const reportIdx = args.indexOf('--report-file');
const reportFile = reportIdx >= 0 ? args[reportIdx + 1] : undefined;

// ─── SAFETY: refuse to run against any non-local database ────────────────────
const dbUrl = process.env.DATABASE_URL ?? '';
let host = '';
try {
  host = new URL(dbUrl).hostname;
} catch {
  console.error('REFUSING TO RUN: DATABASE_URL is not a parseable connection string.');
  process.exit(1);
}
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && process.env.BACKFILL_ALLOW_REMOTE !== '1') {
  console.error(`REFUSING TO RUN: DATABASE_URL points at "${host}" — set BACKFILL_ALLOW_REMOTE=1 to override (authorized production rollout).`);
  process.exit(1);
}

console.log(`ARIA HUB source-observation backfill — ${apply ? 'APPLY' : 'DRY-RUN'} on ${host}${limit ? ` (limit ${limit})` : ''}`);
const result = await backfillSourceObservations(db, { apply, limit });

console.log(`\nOpportunities scanned: ${result.scanned}`);
console.log('Roles that would be assigned:');
for (const [role, n] of Object.entries(result.byRole).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${role}: ${n}`);
}

if (apply) {
  console.log(`\nObservations created: ${result.created}`);
  console.log(`Observations updated (re-sighted): ${result.updated}`);
} else {
  console.log(`\nDry-run: would create ${result.wouldCreate}, would update ${result.wouldUpdate}`);
  console.log('Re-run with --apply to write (local database only).');
}

if (reportFile) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(reportFile, JSON.stringify(result, null, 2), 'utf8');
  console.log(`\nFull report written to ${reportFile}`);
}

process.exit(0);
