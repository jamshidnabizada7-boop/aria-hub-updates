import { db } from '@/lib/db';
import { acquireTickLock, releaseTickLock } from '@/lib/automation/tick';
import { runImport } from '@/lib/import/orchestrator';
import { patchState } from '@/lib/social/publisher';
import { selectScheduledOpportunitySource } from './import-selection';

const MAX_DATABASE_BYTES = 250 * 1024 * 1024;

export interface ScheduledImportResult {
  ran: boolean;
  reason?: string;
  source?: string;
  status?: string;
  imported?: number;
  updated?: number;
  found?: number;
  remainingNew?: number;
  databaseBytes?: number;
}

/** One bounded opportunity-source refresh per cron call; news is excluded. */
export async function runScheduledOpportunityImport(): Promise<ScheduledImportResult> {
  if (!(await acquireTickLock())) return { ran: false, reason: 'tick_locked_elsewhere' };

  try {
    const rows = await db.$queryRaw<Array<{ bytes: bigint }>>
      `SELECT pg_database_size(current_database())::bigint AS bytes`;
    const databaseBytes = Number(rows[0]?.bytes ?? 0);
    if (databaseBytes >= MAX_DATABASE_BYTES) {
      return { ran: false, reason: 'database_budget', databaseBytes };
    }

    const sources = await db.importSource.findMany({
      where: { enabled: true, type: { in: ['job', 'scholarship'] } },
      select: { id: true, name: true, scraperKey: true, lastRunAt: true, lastRunStatus: true, lastRunStats: true },
    });
    const source = selectScheduledOpportunitySource(sources, new Date());
    if (!source) return { ran: false, reason: 'no_source_due', databaseBytes };

    const today = new Date().toISOString().slice(0, 10);
    // The cross-process lock prevents overlap; lastRunAt and remainingNew
    // control the next selection after this source finishes.
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
      lastOpportunityImportRemainingNew: summary.remainingNew,
    } as Parameters<typeof patchState>[0]);
    return {
      ran: true,
      source: source.name,
      status: summary.status,
      imported: summary.imported,
      updated: summary.updated,
      found: summary.found,
      remainingNew: summary.remainingNew,
      databaseBytes,
    };
  } finally {
    await releaseTickLock();
  }
}
