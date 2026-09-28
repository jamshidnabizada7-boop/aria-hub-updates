import { db } from '@/lib/db';
import { acquireTickLock, releaseTickLock } from '@/lib/automation/tick';
import { runImport } from '@/lib/import/orchestrator';
import { getState, patchState } from '@/lib/social/publisher';

const MAX_DATABASE_BYTES = 250 * 1024 * 1024;

type ImportState = Awaited<ReturnType<typeof getState>> & {
  lastOpportunityImportDate?: string;
};

export interface ScheduledImportResult {
  ran: boolean;
  reason?: string;
  source?: string;
  status?: string;
  imported?: number;
  updated?: number;
  found?: number;
  databaseBytes?: number;
}

/** One small source refresh per UTC day; news sources are left to their worker. */
export async function runScheduledOpportunityImport(): Promise<ScheduledImportResult> {
  if (!(await acquireTickLock())) return { ran: false, reason: 'tick_locked_elsewhere' };

  try {
    const today = new Date().toISOString().slice(0, 10);
    const state = (await getState()) as ImportState;
    if (state.lastOpportunityImportDate === today) return { ran: false, reason: 'daily_budget' };

    const rows = await db.$queryRaw<Array<{ bytes: bigint }>>
      `SELECT pg_database_size(current_database())::bigint AS bytes`;
    const databaseBytes = Number(rows[0]?.bytes ?? 0);
    if (databaseBytes >= MAX_DATABASE_BYTES) {
      return { ran: false, reason: 'database_budget', databaseBytes };
    }

    const source = await db.importSource.findFirst({
      where: { enabled: true, type: { in: ['job', 'scholarship'] } },
      orderBy: [{ lastRunAt: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }],
      select: { id: true, name: true },
    });
    if (!source) return { ran: false, reason: 'no_enabled_source' };

    // Reserve the day before scraping; a timeout must not cause another run.
    await patchState({
      lastOpportunityImportDate: today,
      lastOpportunityImportStartedAt: new Date().toISOString(),
    } as Parameters<typeof patchState>[0]);
    const summary = await runImport({
      sourceId: source.id,
      triggeredBy: 'scheduled:free-tier',
      bounded: true,
    });
    await patchState({
      lastOpportunityImportFinishedAt: new Date().toISOString(),
      lastOpportunityImportSource: source.name,
      lastOpportunityImportStatus: summary.status,
      lastOpportunityImportImported: summary.imported,
      lastOpportunityImportUpdated: summary.updated,
    } as Parameters<typeof patchState>[0]);
    return {
      ran: true,
      source: source.name,
      status: summary.status,
      imported: summary.imported,
      updated: summary.updated,
      found: summary.found,
      databaseBytes,
    };
  } finally {
    await releaseTickLock();
  }
}
