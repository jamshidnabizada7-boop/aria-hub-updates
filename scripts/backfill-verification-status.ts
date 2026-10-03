/**
 * Phase 17 — recompute Opportunity.verificationStatus for every row from its
 * live observations (LOCAL ONLY until the authorized rollout).
 *
 * Default is DRY-RUN; --apply writes. The worker/orchestrator keeps statuses
 * fresh going forward — this script seeds existing rows.
 *
 * Usage:
 *   bun --conditions=react-server scripts/backfill-verification-status.ts
 *   bun --conditions=react-server scripts/backfill-verification-status.ts --apply
 */
import { db } from '../src/lib/db';
import { recomputeVerificationStatus } from '../src/lib/verification';

const apply = process.argv.slice(2).includes('--apply');

const dbUrl = process.env.DATABASE_URL ?? '';
let host = '';
try {
  host = new URL(dbUrl).hostname;
} catch {
  console.error('REFUSING: DATABASE_URL is not parseable.');
  process.exit(1);
}
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && process.env.BACKFILL_ALLOW_REMOTE !== '1') {
  console.error(`REFUSING: DATABASE_URL points at "${host}" — set BACKFILL_ALLOW_REMOTE=1 to override (authorized production rollout).`);
  process.exit(1);
}

const opportunities = await db.opportunity.findMany({ select: { id: true, verificationStatus: true }, orderBy: { createdAt: 'asc' } });
console.log(`Verification status backfill — ${apply ? 'APPLY' : 'DRY-RUN'} on ${host}; ${opportunities.length} opportunities`);

const byStatus = new Map<string, number>();
let changed = 0;
for (const opp of opportunities) {
  if (!apply) {
    // dry-run reports what WOULD change: approximate by running the compute
    // without persisting (recompute writes — so dry-run counts unknowns only)
    changed += 1;
    continue;
  }
  const status = await recomputeVerificationStatus(db, opp.id);
  if (status) {
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
    if (status !== opp.verificationStatus) changed += 1;
  }
}

console.log(byStatus.size
  ? `\nStatus distribution: ${JSON.stringify(Object.fromEntries([...byStatus.entries()].sort()))}`
  : `\n${changed} rows would be recomputed. Re-run with --apply to write (local database only).`);
if (apply) console.log(`Rows whose status changed: ${changed}`);
process.exit(0);
