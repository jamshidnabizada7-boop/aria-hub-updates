/**
 * Phase 2 — Organization backfill (LOCAL ONLY).
 *
 * Groups free-text Opportunity.organization strings into canonical
 * Organization rows and connects opportunities. DEFAULT IS DRY-RUN:
 * nothing is written unless --apply is passed. Ambiguous name pairs are
 * reported for admin review, never merged.
 *
 * Usage:
 *   bun --conditions=react-server scripts/backfill-organizations.ts            # dry-run report
 *   bun --conditions=react-server scripts/backfill-organizations.ts --apply    # write locally
 *   bun --conditions=react-server scripts/backfill-organizations.ts --limit 200
 *   bun --conditions=react-server scripts/backfill-organizations.ts --report-file scripts/tmp/org-backfill.json
 */
import { db } from '../src/lib/db';
import { runBackfill } from '../src/lib/organizations/backfill';

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
  console.error('Override DATABASE_URL to a local database if you really mean it.');
  process.exit(1);
}

console.log(`ARIA HUB organization backfill — ${apply ? 'APPLY' : 'DRY-RUN'} on ${host}${limit ? ` (limit ${limit})` : ''}`);
const result = await runBackfill(db, { apply, limit });

console.log(`\nScanned opportunities with an organization string: ${result.scanned}`);
console.log(`Distinct normalized groups: ${result.groups.length}`);

console.log('\n── Groups (normalized key → display variants) ──');
for (const g of result.groups.slice(0, 60)) {
  const variants = g.displayNames.map((d) => `${d.name}×${d.count}`).join(' | ');
  const aliases = g.aliasCandidates.length ? `  [alias candidates: ${g.aliasCandidates.join(', ')}]` : '';
  console.log(`  ${g.normalizedKey}  (${g.opportunityIds.length}) → ${variants}${aliases}`);
}
if (result.groups.length > 60) console.log(`  … and ${result.groups.length - 60} more groups`);

console.log(`\n── Ambiguous pairs (REPORT ONLY — never merged) ──`);
if (!result.ambiguousPairs.length) console.log('  none detected');
for (const p of result.ambiguousPairs) {
  console.log(`  "${p.a}"  ⟷  "${p.b}"   [${p.reason}] — review manually`);
}

if (apply) {
  console.log(`\n── Apply result ──`);
  console.log(`Organizations created: ${result.createdOrganizations}`);
  console.log(`Opportunities connected: ${result.connectedOpportunities}`);
  for (const c of result.skippedConflicts) console.log(`  SKIPPED ${c.normalizedKey}: ${c.reason}`);
} else {
  console.log(`\n── Dry-run summary ──`);
  console.log(`Would create organizations: ${result.toCreate.length}`);
  console.log(`Would connect to existing organizations: ${result.toConnect.length} groups`);
  console.log(`Opportunities that would be connected: ${result.toCreate.reduce((n, g) => n + g.opportunityCount, 0) + result.toConnect.reduce((n, g) => n + g.opportunityCount, 0)}`);
  console.log('\nRe-run with --apply to write (local database only).');
}

if (reportFile) {
  const { writeFileSync } = await import('node:fs');
  writeFileSync(reportFile, JSON.stringify(result, null, 2), 'utf8');
  console.log(`\nFull report written to ${reportFile}`);
}

process.exit(0);
