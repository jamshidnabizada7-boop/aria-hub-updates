/**
 * PHASE 11 + 23 — source certification & trusted auto-publish criteria.
 * The eligibility snapshot is advisory; nothing flips automatically.
 */
import { describe, test, expect, mock } from 'bun:test';

mock.module('server-only', () => ({}));

const { computeAutoPublishFromMetrics } = await import('../src/lib/import/source-certification');
const { setSourceCertification } = await import('../src/lib/import/source-certification');

describe('auto-publish eligibility (PHASE 23)', () => {
  test('NOT_ELIGIBLE with reasons when any criterion fails', () => {
    const snapshot = computeAutoPublishFromMetrics({
      certification: 'reviewed', healthStatus: 'healthy', consecutiveFailures: 0,
      successfulRuns: 4, totalRuns: 5, degradedRuns: 0,
      createdRows: 20, realApplyRows: 20, saneDeadlineRows: 20,
    });
    expect(snapshot.eligibility).toBe('NOT_ELIGIBLE');
    expect(snapshot.reasons.some((r: string) => r.includes('successful runs'))).toBe(true);
  });

  test('ELIGIBLE requires trusted certification + clean health + high success + real applies', () => {
    const snapshot = computeAutoPublishFromMetrics({
      certification: 'trusted', healthStatus: 'healthy', consecutiveFailures: 0,
      successfulRuns: 12, totalRuns: 12, degradedRuns: 0,
      createdRows: 30, realApplyRows: 30, saneDeadlineRows: 30,
    });
    expect(snapshot.eligibility).toBe('ELIGIBLE');
    expect(snapshot.reasons).toEqual([]);
  });

  test('degraded (zero-result) runs block eligibility', () => {
    const snapshot = computeAutoPublishFromMetrics({
      certification: 'trusted', healthStatus: 'healthy', consecutiveFailures: 0,
      successfulRuns: 12, totalRuns: 14, degradedRuns: 2,
      createdRows: 30, realApplyRows: 30, saneDeadlineRows: 30,
    });
    expect(snapshot.eligibility).toBe('NOT_ELIGIBLE');
    expect(snapshot.reasons.some((r: string) => r.includes('DEGRADED'))).toBe(true);
  });

  test('low real-apply rate blocks', () => {
    const snapshot = computeAutoPublishFromMetrics({
      certification: 'trusted', healthStatus: 'healthy', consecutiveFailures: 0,
      successfulRuns: 12, totalRuns: 12, degradedRuns: 0,
      createdRows: 30, realApplyRows: 10, saneDeadlineRows: 30,
    });
    expect(snapshot.eligibility).toBe('NOT_ELIGIBLE');
    expect(snapshot.reasons.some((r: string) => r.includes('real-apply'))).toBe(true);
  });

  test('setSourceCertification validates input and updates the row', async () => {
    const updates: any[] = [];
    const logs: any[] = [];
    const db = {
      importSource: {
        findUnique: async () => ({ name: 'Test Source' }),
        update: async (a: any) => { updates.push(a); return a; },
      },
      auditLog: { create: async (a: any) => { logs.push(a); return a; } },
    };
    await setSourceCertification(db as never, 'src1', 'trusted', 'admin@test');
    expect(updates[0].data.certification).toBe('trusted');
    expect(logs.length).toBe(1);
    let err: unknown = null;
    try { await setSourceCertification({ ...db, importSource: { findUnique: async () => null } } as never, 'missing', 'trusted', 'x'); } catch (e) { err = e; }
    expect(String(err)).toMatch(/not found/);
  });
});
