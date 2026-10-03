/**
 * Source health & alerting (Phase 19).
 *
 * Alerts are DERIVED (no new tables) from the V2 registry fields + run
 * history, so they can never drift from reality:
 *
 *   consecutive-failures  ≥3 failures on an enabled source — CRITICAL for
 *                         high-priority sources (P0/P1, priority ≥ 60),
 *                         warning otherwise
 *   zero-result-anomaly   a historically productive source ran but found 0
 *                         listings (the orchestrator's DEGRADED marker) —
 *                         the first place a silent selector break shows up
 *   stale-success         no successful run for max(3× schedule, 24h)
 *
 * Silent scraper failures are now difficult to miss: the admin panel shows
 * these at the top of the import dashboard.
 */

export interface SourceAlert {
  sourceId: string;
  sourceName: string;
  scraperKey: string;
  priority: number;
  severity: 'critical' | 'warning';
  type: 'consecutive-failures' | 'zero-result-anomaly' | 'stale-success';
  message: string;
  lastRunAt: Date | null;
}

type AlertDb = {
  importSource: { findMany: (a: any) => Promise<any[]> };
};

export async function listSourceAlerts(db: AlertDb, now: Date = new Date()): Promise<SourceAlert[]> {
  const sources = await db.importSource.findMany({
    where: { enabled: true },
    select: {
      id: true, name: true, scraperKey: true, priority: true,
      consecutiveFailures: true, backoffUntil: true, healthStatus: true,
      lastRunAt: true, lastRunStatus: true, lastRunStats: true,
      lastSuccessAt: true, scheduleMinutes: true,
    },
  });

  const alerts: SourceAlert[] = [];
  for (const s of sources as any[]) {
    // 1. consecutive failures on an enabled source
    if ((s.consecutiveFailures ?? 0) >= 3) {
      const critical = (s.priority ?? 50) >= 60;
      alerts.push({
        sourceId: s.id, sourceName: s.name, scraperKey: s.scraperKey,
        priority: s.priority ?? 50, severity: critical ? 'critical' : 'warning',
        type: 'consecutive-failures',
        message: `${s.consecutiveFailures} consecutive failures — health ${s.healthStatus ?? 'unknown'}${s.backoffUntil ? `, backoff until ${s.backoffUntil.toISOString().slice(0, 16).replace('T', ' ')}` : ''}`,
        lastRunAt: s.lastRunAt ?? null,
      });
      continue; // one alert per source: the most severe wins
    }

    // 2. zero-result anomaly on a historically productive source
    if (s.lastRunStatus === 'error' && typeof s.lastRunStats === 'string' && s.lastRunStats.includes('DEGRADED')) {
      alerts.push({
        sourceId: s.id, sourceName: s.name, scraperKey: s.scraperKey,
        priority: s.priority ?? 50, severity: 'warning',
        type: 'zero-result-anomaly',
        message: 'Historically productive source returned 0 listings — selector or layout may have broken',
        lastRunAt: s.lastRunAt ?? null,
      });
      continue;
    }

    // 3. stale success: nothing worked for max(3× schedule, 24h)
    if (s.lastSuccessAt) {
      const staleAfterMs = Math.max(3 * (s.scheduleMinutes ?? 60), 24 * 60) * 60_000;
      if (now.getTime() - s.lastSuccessAt.getTime() > staleAfterMs) {
        const hours = Math.round((now.getTime() - s.lastSuccessAt.getTime()) / 3_600_000);
        alerts.push({
          sourceId: s.id, sourceName: s.name, scraperKey: s.scraperKey,
          priority: s.priority ?? 50, severity: 'warning',
          type: 'stale-success',
          message: `No successful run for ~${hours}h (schedule ${s.scheduleMinutes ?? 60} min)`,
          lastRunAt: s.lastRunAt ?? null,
        });
      }
    }
  }

  return alerts.sort((a, b) =>
    (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1) ||
    b.priority - a.priority,
  );
}
