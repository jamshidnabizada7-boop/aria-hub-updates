/**
 * Dedicated Oracle translation worker (audit §3/§17/§25).
 *
 * Runs INDEPENDENTLY of web / import / social workers so that:
 *  - imports continue when AI providers are down (queue just grows safely);
 *  - the site never depends on translation availability;
 *  - AI load is throttled in one place and can be paused without SSH-ing
 *    into any other service (systemd stop aria-hub-translation-worker).
 *
 * Guarantees (inherited from the engine + enforced here):
 *  - Persian completes and commits BEFORE any Pashto work (engine gate).
 *  - Public i18n fields change only in the atomic per-language commit.
 *  - DRY_RUN=1 produces chunk translations for review but never writes
 *    public fields or completion statuses (§25).
 *  - Publication is NEVER touched: no status/autoPublish changes here.
 *  - Rate-limited ticks back off instead of hammering providers.
 *
 * Budgets (env, conservative defaults):
 *  TRANSLATION_WORKER_CONCURRENCY   chunks in flight per tick (default 1)
 *  TRANSLATION_MAX_PER_HOUR         chunk commits/hour across restarts (default 60)
 *  TRANSLATION_MAX_PER_DAY          chunk commits/day across restarts (default 300)
 *  TRANSLATION_WORKER_DRY_RUN       "1" → review mode (no public writes)
 *  TRANSLATION_TICK_MS              loop interval (default 20000)
 */
import { db } from '../src/lib/db';
import { processBatch } from '../src/lib/ai/translate-engine';
import { processOpportunityFactsUnit } from '../src/lib/ai/translate-opportunity-facts';
import { acquireTickLock, releaseTickLock } from '../src/lib/automation/tick';
import { getState, patchState } from '../src/lib/social/publisher';

const TICK_MS = Number(process.env.TRANSLATION_TICK_MS || 20_000);
const CONCURRENCY = Math.max(1, Number(process.env.TRANSLATION_WORKER_CONCURRENCY || 1));
const MAX_PER_HOUR = Math.max(1, Number(process.env.TRANSLATION_MAX_PER_HOUR || 60));
const MAX_PER_DAY = Math.max(1, Number(process.env.TRANSLATION_MAX_PER_DAY || 300));
const DRY_RUN = process.env.TRANSLATION_WORKER_DRY_RUN === '1';
/** One-shot mode: exit after N processed chunks (staged-rollout driver). */
const MAX_UNITS_TOTAL = Number(process.env.TRANSLATION_WORKER_MAX_UNITS || 0) || Infinity;
// §27 controlled write tests are driven one-off via processOpportunityNow on
// an explicit id list (driver script), not through this continuous worker.
/** Storage guard; override for the actual database capacity when hosted on Oracle. */
const MAX_DATABASE_BYTES = Number(process.env.TRANSLATION_MAX_DATABASE_BYTES || 250 * 1024 * 1024);
const RATE_LIMIT_BACKOFF_MS = 2 * 60 * 1000;
/** One unit = one chunk translation. */
const UNITS_PER_TICK = CONCURRENCY;

const ts = () => new Date().toISOString().slice(11, 19);
let stopping = false;
let running = false;
let processedTotal = 0;
let tickCount = 0;

process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

interface BudgetState {
  translateHour?: string;
  translateUnitsHour?: number;
  translateDate?: string;
  translateUnitsDay?: number;
  translateBackoffUntil?: string;
  lastOpportunityTranslateAt?: string;
}

async function budgetOk(state: BudgetState): Promise<{ ok: boolean; reason?: string }> {
  const now = new Date();
  const hour = now.toISOString().slice(0, 13);
  const today = now.toISOString().slice(0, 10);
  const usedHour = state.translateHour === hour ? Math.max(0, state.translateUnitsHour ?? 0) : 0;
  if (usedHour >= MAX_PER_HOUR) return { ok: false, reason: `hourly_budget(${usedHour}/${MAX_PER_HOUR})` };
  const usedDay = state.translateDate === today ? Math.max(0, state.translateUnitsDay ?? 0) : 0;
  if (usedDay >= MAX_PER_DAY) return { ok: false, reason: `daily_budget(${usedDay}/${MAX_PER_DAY})` };
  if (state.translateBackoffUntil && new Date(state.translateBackoffUntil).getTime() > now.getTime()) {
    return { ok: false, reason: 'provider_backoff' };
  }
  const rows = await db.$queryRaw<Array<{ bytes: bigint }>>
    `SELECT pg_database_size(current_database())::bigint AS bytes`;
  const bytes = Number(rows[0]?.bytes ?? 0);
  if (bytes >= MAX_DATABASE_BYTES) return { ok: false, reason: `database_budget(${bytes})` };
  return { ok: true };
}

async function recordUnits(n: number, rateLimited: boolean): Promise<void> {
  const now = new Date();
  const hour = now.toISOString().slice(0, 13);
  const today = now.toISOString().slice(0, 10);
  const state = (await getState()) as BudgetState;
  const usedHour = (state.translateHour === hour ? Math.max(0, state.translateUnitsHour ?? 0) : 0) + n;
  const usedDay = (state.translateDate === today ? Math.max(0, state.translateUnitsDay ?? 0) : 0) + n;
  await patchState({
    translateHour: hour,
    translateUnitsHour: usedHour,
    translateDate: today,
    translateUnitsDay: usedDay,
    lastOpportunityTranslateAt: now.toISOString(),
    ...(rateLimited ? { translateBackoffUntil: new Date(now.getTime() + RATE_LIMIT_BACKOFF_MS).toISOString() } : {}),
  } as Partial<BudgetState>);
}

async function tick(): Promise<void> {
  const state = (await getState()) as BudgetState;
  const gate = await budgetOk(state);
  if (!gate.ok) {
    console.log(`${ts()} [translation-worker] skip: ${gate.reason}${DRY_RUN ? ' (DRY_RUN)' : ''}`);
    return;
  }
  if (!(await acquireTickLock())) {
    console.log(`${ts()} [translation-worker] skip: tick_locked_elsewhere`);
    return;
  }
  try {
    if (processedTotal >= MAX_UNITS_TOTAL) {
      console.log(`${ts()} [translation-worker] max-units reached (${processedTotal}) — exiting.`);
      stopping = true;
      return;
    }
    // Fair Pashto interleaving (§5): every 4th tick is a Pashto turn, so
    // fa-complete rows are not starved by the Persian backlog.
    tickCount += 1;
    const psTurn = tickCount % 4 === 0;
    // Reserve every fifth tick for supporting facts; a large body-translation
    // backlog must not starve key information indefinitely. Same unit budget.
    const fact = tickCount % 5 === 0
      ? await processOpportunityFactsUnit(undefined, { dryRun: DRY_RUN })
      : null;
    const r = fact && (!fact.skipped || fact.rateLimited)
      ? { processed: Number(fact.processed), committed: Number(fact.committed), rateLimited: fact.rateLimited, exhausted: false }
      : await processBatch(UNITS_PER_TICK, undefined, { dryRun: DRY_RUN, psTurn });
    processedTotal += r.processed;
    await recordUnits(r.processed, r.rateLimited);
    console.log(
      `${ts()} [translation-worker] ${DRY_RUN ? 'DRY ' : ''}processed=${r.processed} committed=${r.committed}` +
      `${r.rateLimited ? ' RATE_LIMITED→backoff 2m' : ''}${r.exhausted ? ' queue-drained' : ''}`,
    );
  } finally {
    await releaseTickLock().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  console.log(
    `${ts()} [translation-worker] starting — concurrency=${CONCURRENCY} ` +
    `max/h=${MAX_PER_HOUR} max/d=${MAX_PER_DAY} dryRun=${DRY_RUN ? 'YES' : 'no'}`,
  );
  // Graceful first tick, then loop.
  while (!stopping) {
    if (running) { await new Promise((r) => setTimeout(r, 500)); continue; }
    running = true;
    try {
      await tick();
    } catch (e) {
      console.error(`${ts()} [translation-worker] tick error:`, (e instanceof Error ? e.message : String(e)).slice(0, 200));
    } finally {
      running = false;
    }
    const waitUntil = Date.now() + TICK_MS;
    while (!stopping && Date.now() < waitUntil) await new Promise((r) => setTimeout(r, 500));
  }
  console.log(`${ts()} [translation-worker] graceful stop.`);
  await db.$disconnect().catch(() => undefined);
}

main().catch((e) => {
  console.error('[translation-worker] fatal:', e);
  process.exit(1);
});
