import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';

/**
 * GET /api/admin/import/stats
 *   Aggregate import statistics for the dashboard cards.
 */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Cleanup stale running imports (older than 10 mins)
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000);
  await db.importRun.updateMany({
    where: { status: 'running', startedAt: { lt: staleThreshold } },
    data: { status: 'error' }
  }).catch(() => {});

  const [
    totalImported,
    totalFailed,
    totalPending,
    lastRun,
    sources,
    recentRuns,
  ] = await Promise.all([
    db.opportunity.count({ where: { importStatus: { in: ['imported', 'updated'] } } }),
    db.opportunity.count({ where: { importStatus: 'failed' } }),
    db.opportunity.count({ where: { translationStatus: 'pending' } }),
    db.importRun.findFirst({ orderBy: { startedAt: 'desc' }, include: { source: { select: { name: true } } } }),
    db.importSource.findMany({ select: { id: true, name: true, type: true, scraperKey: true, baseUrl: true, enabled: true, autoPublish: true, lastRunAt: true, lastRunStatus: true, lastRunStats: true } }),
    db.importRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: { id: true, status: true, found: true, imported: true, updated: true, skipped: true, failed: true, startedAt: true, processingMs: true, source: { select: { name: true } } },
    }),
  ]);

  // Success rate over the last 100 runs
  const last100 = await db.importRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: 100,
    select: { status: true },
  });
  const okCount = last100.filter((r) => r.status === 'ok').length;
  const successRate = last100.length ? Math.round((okCount / last100.length) * 100) : 100;

  return NextResponse.json({
    totalImported,
    totalFailed,
    totalPending,
    lastSyncAt: lastRun?.startedAt || null,
    lastRun,
    successRate,
    sources,
    recentRuns,
  });
}
