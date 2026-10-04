/**
 * ARIA HUB Opportunity Import Worker (Phase 8) — LOCAL ONLY for now.
 *
 * A persistent loop that removes opportunity discovery from Vercel's
 * serverless limits. Every WORKER_TICK_SECONDS (default 60) it:
 *   1. loads enabled sources whose nextRunAt is due and whose backoff expired
 *   2. picks ONE (concurrency 1 — ACBAR may drive Chromium): most overdue
 *      first, then priority, then health (see worker-scheduler.ts)
 *   3. claims it atomically (nextRunAt bumped) so overlapping workers/ticks
 *      can never double-run the same source
 *   4. runs the existing import pipeline (runImport — dedupe, canonical
 *      resolver, observations, apply resolver, translation; unchanged)
 *   5. applies ImportSource V2 health: success resets the ladder and sets
 *      nextRunAt = now + scheduleMinutes; failure climbs the backoff ladder
 *      (5/15/30/60/120min, degraded at 5, blocked at 8); "pending" (e.g.
 *      ReliefWeb awaiting appname approval) retries at the normal cadence
 *
 * It NEVER touches the social publishing worker and NEVER publishes —
 * publication stays governed by each source's autoPublish flag.
 *
 * Usage:
 *   bun --conditions=react-server scripts/opportunity-import-worker.ts           # persistent loop
 *   bun --conditions=react-server scripts/opportunity-import-worker.ts --once    # single tick (cron-able)
 *   ... --dry-run                     # print the selection, run nothing
 *   ... --interval=120                # tick every 120s (default 60)
 *   ... --only=Wazifaha               # restrict to sources matching a name substring
 *
 * SAFETY: refuses to run against a non-local database unless
 * WORKER_ALLOW_REMOTE=1 is explicitly set in the environment. Phase 8 is
 * local-only; production activation happens in the authorized rollout.
 */
import { db } from '../src/lib/db';
import { runImport } from '../src/lib/import/orchestrator';
import { pickNextSource, dueSummary } from '../src/lib/import/worker-scheduler';
import {
  computeNextRunAt, nextFailureState, nextSuccessState, isDue,
} from '../src/lib/import/source-health';
import type { WorkerCandidate } from '../src/lib/import/worker-scheduler';

const args = process.argv.slice(2);
const once = args.includes('--once');
const dryRun = args.includes('--dry-run');
const intervalArg = args.find((a) => a.startsWith('--interval='));
const tickMs = Math.max(10, Number(intervalArg?.split('=')[1] ?? 60)) * 1000;
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.split('=').slice(1).join('=') : null;

// ─── SAFETY: local-only until the production rollout is authorized ───────────
const dbUrl = process.env.DATABASE_URL ?? '';
let host = '';
try {
  host = new URL(dbUrl).hostname;
} catch {
  console.error('[import-worker] REFUSING: DATABASE_URL is not parseable.');
  process.exit(1);
}
const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(host);
if (!isLocal && process.env.WORKER_ALLOW_REMOTE !== '1') {
  console.error(`[import-worker] REFUSING: DATABASE_URL points at "${host}". The import worker is ` +
    'LOCAL-ONLY in this phase. Set WORKER_ALLOW_REMOTE=1 to override (production rollout only).');
  process.exit(1);
}

let stopping = false;
const stop = () => {
  if (stopping) {
    console.log('[import-worker] forced exit.');
    process.exit(0);
  }
  stopping = true;
  console.log('[import-worker] graceful stop requested — finishing the current run…');
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

const ts = () => new Date().toISOString().slice(11, 19);

async function loadDueCandidates(now: Date): Promise<WorkerCandidate[]> {
  const rows = await db.importSource.findMany({
    where: {
      enabled: true,
      // News sources go through the dedicated admin news pipeline — the
      // opportunity worker schedules job/scholarship sources only (matches
      // the old scheduler's filter in automation/scheduled-import.ts).
      type: { in: ['job', 'scholarship'] },
      healthStatus: { notIn: ['paused', 'pending_configuration'] },
      OR: [{ nextRunAt: { lte: now } }, { nextRunAt: null }],
    },
    select: {
      id: true, name: true, scraperKey: true, type: true, priority: true,
      healthStatus: true, enabled: true, nextRunAt: true, backoffUntil: true,
      lastRunAt: true, scheduleMinutes: true,
    },
  });
  return rows.filter((r: any) => (r.backoffUntil == null || r.backoffUntil.getTime() <= now.getTime()))
    .filter((r: any) => !only || r.name.toLowerCase().includes(only.toLowerCase()))
    .filter((r: any) => isDue(r, now));
}

/** Atomic claim: bump nextRunAt so no other worker/tick can pick this source. */
async function claimSource(id: string, now: Date): Promise<boolean> {
  const res = await db.importSource.updateMany({
    where: { id, OR: [{ nextRunAt: { lte: now } }, { nextRunAt: null }] },
    data: { nextRunAt: new Date(now.getTime() + 120_000) },
  });
  return (res.count ?? 0) === 1;
}

async function applyHealth(sourceId: string, status: string): Promise<void> {
  const source = await db.importSource.findUnique({
    where: { id: sourceId },
    select: { consecutiveFailures: true, backoffUntil: true, healthStatus: true, scheduleMinutes: true },
  });
  if (!source) return;
  const now = new Date();

  if (status === 'error') {
    const failure = nextFailureState(source, now);
    await db.importSource.update({
      where: { id: sourceId },
      data: { ...failure, nextRunAt: failure.backoffUntil },
    });
    console.log(`${ts()} [import-worker]   ↳ failure ${failure.consecutiveFailures}: backoff until ${failure.backoffUntil.toISOString()}, health=${failure.healthStatus}`);
    return;
  }

  if (status === 'pending' || status === 'stopped') {
    // external approval missing (e.g. ReliefWeb) — retry at the normal cadence
    await db.importSource.update({
      where: { id: sourceId },
      data: { nextRunAt: computeNextRunAt(source, now) },
    });
    return;
  }

  const success = nextSuccessState(source, now);
  await db.importSource.update({
    where: { id: sourceId },
    data: { ...success, nextRunAt: computeNextRunAt(source, now) },
  });
}

async function tick(): Promise<void> {
  const now = new Date();
  const candidates = await loadDueCandidates(now);
  const summary = dueSummary(candidates, now);
  if (!summary.dueCount) {
    console.log(`${ts()} [import-worker] nothing due (${candidates.length} candidates).`);
    return;
  }
  const picked = pickNextSource(candidates, now);
  if (!picked) return;

  if (dryRun) {
    const overdueMin = Math.max(0, Math.round((now.getTime() - (picked.nextRunAt?.getTime() ?? now.getTime())) / 60_000));
    console.log(`${ts()} [import-worker] DRY-RUN would run: "${picked.name}" (${picked.scraperKey}, priority ${picked.priority ?? 50}, overdue ${overdueMin}min)`);
    console.log(`${ts()} [import-worker]   due queue: ${summary.byPriority.map((s) => `${s.name}(${s.overdueMinutes}m,p${s.priority})`).join(', ')}`);
    return;
  }

  const claimed = await claimSource(picked.id, now);
  if (!claimed) {
    console.log(`${ts()} [import-worker] "${picked.name}" was claimed by another runner — skipping.`);
    return;
  }

  console.log(`${ts()} [import-worker] running "${picked.name}" (${picked.scraperKey})…`);
  try {
    const result = await runImport({ sourceId: picked.id, triggeredBy: 'oracle-import-worker' });
    await applyHealth(picked.id, result.status);
    console.log(`${ts()} [import-worker]   ↳ ${result.status}: found ${result.found}, imported ${result.imported}, updated ${result.updated}, duplicates ${result.duplicates}, failed ${result.failed} (${result.processingMs}ms)`);
  } catch (e) {
    await applyHealth(picked.id, 'error');
    console.error(`${ts()} [import-worker]   ↳ crashed:`, (e as Error).message);
  }
}

console.log(`[import-worker] starting on ${host} — tick ${tickMs / 1000}s${once ? ', single tick' : ', persistent'}${only ? `, filtered to "${only}"` : ''}${dryRun ? ', DRY-RUN' : ''}`);

do {
  await tick();
  if (once || stopping) break;
  await new Promise((r) => setTimeout(r, tickMs));
} while (!stopping);

console.log('[import-worker] exited cleanly.');
process.exit(0);
