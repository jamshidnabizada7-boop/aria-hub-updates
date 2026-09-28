import { db } from '@/lib/db';
import { acquireTickLock, releaseTickLock } from '@/lib/automation/tick';
import { getState, patchState } from '@/lib/social/publisher';

// Supabase Free becomes read-only at 500 MB. Pause well before that point so
// opportunity translations cannot consume the database's remaining headroom.
const MAX_DATABASE_BYTES = 250 * 1024 * 1024;
const MAX_UNITS_PER_UTC_DAY = 48;
const MIN_INTERVAL_MS = 25 * 60 * 1000;
const RATE_LIMIT_BACKOFF_MS = 30 * 60 * 1000;

type ScheduleState = Awaited<ReturnType<typeof getState>> & {
  lastOpportunityTranslateAt?: string;
  opportunityTranslateDate?: string;
  opportunityTranslateUnits?: number;
};

export interface ScheduledTranslationResult {
  ran: boolean;
  reason?: string;
  processed?: number;
  committed?: number;
  rateLimited?: boolean;
  exhausted?: boolean;
  databaseBytes?: number;
}

/** One bounded chunk, called by the Supabase half-hour cron. */
export async function runScheduledOpportunityTranslation(): Promise<ScheduledTranslationResult> {
  if (!(await acquireTickLock())) return { ran: false, reason: 'tick_locked_elsewhere' };

  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const state = (await getState()) as ScheduleState;
    if (state.translateBackoffUntil && new Date(state.translateBackoffUntil).getTime() > now.getTime()) {
      return { ran: false, reason: 'provider_backoff' };
    }
    if (state.lastOpportunityTranslateAt &&
      now.getTime() - new Date(state.lastOpportunityTranslateAt).getTime() < MIN_INTERVAL_MS) {
      return { ran: false, reason: 'interval_guard' };
    }

    const usedToday = state.opportunityTranslateDate === today
      ? Math.max(0, state.opportunityTranslateUnits ?? 0) : 0;
    if (usedToday >= MAX_UNITS_PER_UTC_DAY) {
      return { ran: false, reason: 'daily_budget' };
    }

    const rows = await db.$queryRaw<Array<{ bytes: bigint }>>
      `SELECT pg_database_size(current_database())::bigint AS bytes`;
    const databaseBytes = Number(rows[0]?.bytes ?? 0);
    if (databaseBytes >= MAX_DATABASE_BYTES) {
      return { ran: false, reason: 'database_budget', databaseBytes };
    }

    // Reserve the unit before the network call. A Vercel timeout must not
    // cause an immediate duplicate or bypass the daily allowance.
    await patchState({
      lastOpportunityTranslateAt: now.toISOString(),
      opportunityTranslateDate: today,
      opportunityTranslateUnits: usedToday + 1,
    } as Parameters<typeof patchState>[0]);

    const { processBatch } = await import('@/lib/ai/translate-engine');
    // Leave time inside Vercel Hobby's 60-second function limit to record
    // the chunk attempt and release the database lock after provider failure.
    const batch = await processBatch(1, Date.now() + 42_000);
    if (batch.rateLimited) {
      await patchState({
        translateBackoffUntil: new Date(Date.now() + RATE_LIMIT_BACKOFF_MS).toISOString(),
      });
    } else if (state.translateBackoffUntil) {
      await patchState({ translateBackoffUntil: null });
    }
    await patchState({
      lastOpportunityTranslateFinishedAt: new Date().toISOString(),
      lastOpportunityTranslateProcessed: batch.processed,
      lastOpportunityTranslateCommitted: batch.committed,
      lastOpportunityTranslateRateLimited: batch.rateLimited,
    } as Parameters<typeof patchState>[0]);
    return {
      ran: true,
      processed: batch.processed,
      committed: batch.committed,
      rateLimited: batch.rateLimited,
      exhausted: batch.exhausted,
      databaseBytes,
    };
  } finally {
    await releaseTickLock();
  }
}
