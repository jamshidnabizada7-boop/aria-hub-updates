/**
 * Phase 19 — source health alerting rules (isolated *_test DB).
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { listSourceAlerts } = await import('../src/lib/import/source-alerts');
const { db } = await import('../src/lib/db');

let dbUp = false;
try {
  if (isolatedTestDatabase) await db.$queryRaw`SELECT 1`;
  dbUp = true;
} catch { dbUp = false; }

const describeIf = (cond: boolean) => (cond ? describe : describe.skip);
const runId = Date.now().toString(36);

describeIf(dbUp)('source alert rules (db)', () => {
  const names = {
    critical: `AlSrc Critical ${runId}`,
    degraded: `AlSrc Degraded ${runId}`,
    zero: `AlSrc Zero ${runId}`,
    healthy: `AlSrc Healthy ${runId}`,
    paused: `AlSrc Paused ${runId}`,
  };

  beforeAll(async () => {
    await db.importSource.deleteMany({ where: { name: { contains: `AlSrc ${runId}` } } });
    const mk = (name: string, data: Record<string, unknown>) =>
      db.importSource.create({ data: { name, type: 'job', scraperKey: 'officialHtml', baseUrl: `https://${name.slice(0, 12)}.example.org`, ...data } });

    await mk(names.critical, { enabled: true, priority: 90, consecutiveFailures: 4, healthStatus: 'degraded', lastRunStatus: 'error', lastRunAt: new Date() });
    await mk(names.degraded, { enabled: true, priority: 30, consecutiveFailures: 5, healthStatus: 'degraded', lastRunStatus: 'error', lastRunAt: new Date() });
    await mk(names.zero, {
      enabled: true, priority: 60, consecutiveFailures: 0, lastRunStatus: 'error', lastRunAt: new Date(),
      lastRunStats: JSON.stringify({ found: 0, message: 'DEGRADED: 0 listings found — source layout may have changed' }),
    });
    await mk(names.healthy, { enabled: true, priority: 60, consecutiveFailures: 0, lastRunStatus: 'ok', lastSuccessAt: new Date(), lastRunAt: new Date() });
    await mk(names.paused, { enabled: false, priority: 90, consecutiveFailures: 9, healthStatus: 'blocked', lastRunStatus: 'error', lastRunAt: new Date() });
  });

  afterAll(async () => {
    await db.importSource.deleteMany({ where: { name: { contains: `AlSrc ${runId}` } } });
  });

  test('failure severity follows priority; zero-result anomaly and pause exclusion work', async () => {
    const alerts = await listSourceAlerts(db);
    const byName = new Map(alerts.map((a: any) => [a.sourceName, a]));

    const critical = byName.get(names.critical);
    expect(critical?.severity).toBe('critical'); // priority 90 ≥ 60 → P0/P1 critical
    expect(critical?.type).toBe('consecutive-failures');

    const degraded = byName.get(names.degraded);
    expect(degraded?.severity).toBe('warning'); // priority 30 → warning

    const zero = byName.get(names.zero);
    expect(zero?.type).toBe('zero-result-anomaly');
    expect(zero?.severity).toBe('warning');

    expect(byName.get(names.healthy)).toBeUndefined(); // healthy source → no alert
    expect(byName.get(names.paused)).toBeUndefined(); // disabled sources excluded

    // critical alerts sort first
    expect(alerts[0].severity).toBe('critical');
  });

  test('stale-success fires only beyond max(3× schedule, 24h)', async () => {
    const name = `AlSrc Stale ${runId}`;
    await db.importSource.create({
      data: { name, type: 'job', scraperKey: 'rssOpportunity', baseUrl: 'https://stale.example.org',
        enabled: true, priority: 60, scheduleMinutes: 15, lastRunStatus: 'ok',
        lastSuccessAt: new Date(Date.now() - 30 * 3600_000), lastRunAt: new Date(Date.now() - 1800_000) },
    });
    try {
      const alerts = await listSourceAlerts(db);
      const stale = alerts.find((a: any) => a.sourceName === name);
      expect(stale?.type).toBe('stale-success'); // 30h > max(45min, 24h)
    } finally {
      await db.importSource.deleteMany({ where: { name } });
    }
  });
});
