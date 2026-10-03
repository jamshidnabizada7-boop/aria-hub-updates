/**
 * Phase 8 — import-worker scheduling selection.
 * Pure logic: no db, no network.
 */
import { describe, test, expect } from 'bun:test';

const { pickNextSource, dueSources, dueSummary } =
  await import('../src/lib/import/worker-scheduler');

const NOW = new Date('2026-10-03T12:00:00Z');
const src = (over: Partial<Record<string, unknown>> = {}) => ({
  id: over.id ?? 's', name: over.name ?? 'Source', scraperKey: 'wpApi', type: 'job',
  priority: 50, healthStatus: 'healthy', enabled: true,
  nextRunAt: null, backoffUntil: null, lastRunAt: null, scheduleMinutes: 60,
  ...over,
}) as any;

describe('due filtering', () => {
  test('enabled + due by nextRunAt / schedule / never-run; excludes paused and backoff', () => {
    const due = dueSources([
      src({ id: '1', nextRunAt: new Date('2026-10-03T11:00:00Z') }),          // due
      src({ id: '2', nextRunAt: new Date('2026-10-03T13:00:00Z') }),          // future
      src({ id: '3', lastRunAt: new Date('2026-10-03T11:40:00Z'), scheduleMinutes: 60 }), // not due yet
      src({ id: '4', lastRunAt: new Date('2026-10-03T10:00:00Z'), scheduleMinutes: 60 }), // due
      src({ id: '5' }),                                                       // never ran → due
      src({ id: '6', enabled: false, nextRunAt: new Date('2026-10-03T10:00:00Z') }), // disabled
      src({ id: '7', healthStatus: 'paused', nextRunAt: new Date('2026-10-03T10:00:00Z') }), // paused
      src({ id: '8', healthStatus: 'pending_configuration' }),                 // pending
      src({ id: '9', nextRunAt: new Date('2026-10-03T10:00:00Z'), backoffUntil: new Date('2026-10-03T13:00:00Z') }), // backoff
      src({ id: '10', healthStatus: 'blocked', nextRunAt: new Date('2026-10-03T10:00:00Z'), backoffUntil: new Date('2026-10-03T11:00:00Z') }), // blocked but backoff expired → eligible
    ], NOW);
    expect(due.map((d: any) => d.id).sort()).toEqual(['1', '10', '4', '5']);
  });
});

describe('pickNextSource ordering (plan: overdue → priority → health)', () => {
  test('most overdue wins over higher priority', () => {
    const picked = pickNextSource([
      src({ id: 'high-pri', name: 'High', priority: 95, nextRunAt: new Date('2026-10-03T11:50:00Z') }),
      src({ id: 'overdue', name: 'Overdue', priority: 30, nextRunAt: new Date('2026-10-03T09:00:00Z') }),
    ], NOW);
    expect(picked?.id).toBe('overdue');
  });

  test('equal overdue → higher priority wins', () => {
    const picked = pickNextSource([
      src({ id: 'low', name: 'Low', priority: 20, nextRunAt: new Date('2026-10-03T11:00:00Z') }),
      src({ id: 'high', name: 'High', priority: 90, nextRunAt: new Date('2026-10-03T11:00:00Z') }),
    ], NOW);
    expect(picked?.id).toBe('high');
  });

  test('equal overdue + priority → healthier wins; ties break by name', () => {
    const picked = pickNextSource([
      src({ id: 'deg', name: 'B Degraded', priority: 60, healthStatus: 'degraded', nextRunAt: new Date('2026-10-03T11:00:00Z') }),
      src({ id: 'ok', name: 'A Healthy', priority: 60, healthStatus: 'healthy', nextRunAt: new Date('2026-10-03T11:00:00Z') }),
    ], NOW);
    expect(picked?.id).toBe('ok');

    const tie = pickNextSource([
      src({ id: 'b', name: 'Beta', nextRunAt: new Date('2026-10-03T11:00:00Z') }),
      src({ id: 'a', name: 'Alpha', nextRunAt: new Date('2026-10-03T11:00:00Z') }),
    ], NOW);
    expect(tie?.id).toBe('a');
  });

  test('a never-run source bootstraps first on a fresh install', () => {
    const picked = pickNextSource([
      src({ id: 'scheduled', name: 'Scheduled', priority: 95, nextRunAt: new Date('2026-10-03T11:59:00Z') }),
      src({ id: 'fresh', name: 'Fresh' }), // never ran, nextRunAt null
    ], NOW);
    expect(picked?.id).toBe('fresh');
  });

  test('nothing due → null', () => {
    expect(pickNextSource([src({ nextRunAt: new Date('2026-10-03T20:00:00Z') })], NOW)).toBeNull();
    expect(pickNextSource([], NOW)).toBeNull();
  });

  test('low-priority sources are not permanently starved: after the P95 runs, the P20 is next', () => {
    // both due; P95 picked
    const first = pickNextSource([
      src({ id: 'p95', name: 'P95', priority: 95, nextRunAt: new Date('2026-10-03T11:00:00Z') }),
      src({ id: 'p20', name: 'P20', priority: 20, nextRunAt: new Date('2026-10-03T11:00:00Z') }),
    ], NOW);
    expect(first?.id).toBe('p95');
    // simulate p95 having run (not due for 60min) → p20 is now picked
    const second = pickNextSource([
      src({ id: 'p95', name: 'P95', priority: 95, nextRunAt: new Date('2026-10-03T13:00:00Z') }),
      src({ id: 'p20', name: 'P20', priority: 20, nextRunAt: new Date('2026-10-03T11:00:00Z') }),
    ], NOW);
    expect(second?.id).toBe('p20');
  });
});

describe('dueSummary', () => {
  test('reports count and an overdue-ordered queue', () => {
    const s = dueSummary([
      src({ name: 'A', priority: 90, nextRunAt: new Date('2026-10-03T11:30:00Z') }),
      src({ name: 'B', priority: 20, nextRunAt: new Date('2026-10-03T10:00:00Z') }),
    ], NOW);
    expect(s.dueCount).toBe(2);
    expect(s.byPriority[0].name).toBe('B');
    expect(s.byPriority[0].overdueMinutes).toBe(120);
  });
});
