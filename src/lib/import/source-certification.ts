/**
 * PHASE 11 + 23 — source certification & trusted auto-publish criteria.
 *
 * Certification (testing | reviewed | trusted | paused) is an ADMIN decision,
 * deliberately separate from autoPublish: a trusted source still imports as
 * drafts until an admin explicitly flips autoPublish.
 *
 * The eligibility snapshot (PHASE 23) is advisory — it computes whether a
 * source MEETS the published criteria from measured history. Nothing flips
 * automatically.
 */

export type AutoPublishEligibility = 'ELIGIBLE' | 'NOT_ELIGIBLE';

export interface AutoPublishSnapshot {
  eligibility: AutoPublishEligibility;
  reasons: string[];
  metrics: {
    successfulRuns: number;
    totalRuns: number;
    successRate: number;
    degradedRuns: number;
    createdRows: number;
    realApplyRows: number;
    saneDeadlineRows: number;
  };
}

export const MIN_SUCCESSFUL_RUNS = 10;
export const MIN_SUCCESS_RATE = 0.9;
export const MIN_REAL_APPLY_RATE = 0.9;

export interface AutoPublishCriteria {
  minSuccessfulRuns: number;
  minSuccessRate: number;
  minRealApplyRate: number;
}

export const AUTO_PUBLISH_CRITERIA: AutoPublishCriteria = {
  minSuccessfulRuns: MIN_SUCCESSFUL_RUNS,
  minSuccessRate: MIN_SUCCESS_RATE,
  minRealApplyRate: MIN_REAL_APPLY_RATE,
};

type EligDb = {
  importSource: { findUnique: (a: any) => Promise<any> };
  importRun: { findMany: (a: any) => Promise<any[]> };
  opportunity: { count: (a: any) => Promise<number> };
};

// ─── PHASE 11: certification values (admin decision, never automatic) ───────
export const SOURCE_CERTIFICATIONS = ['testing', 'reviewed', 'trusted', 'paused'] as const;
export type SourceCertification = (typeof SOURCE_CERTIFICATIONS)[number];

export function parseSourceCertification(value: unknown): SourceCertification | null {
  return (SOURCE_CERTIFICATIONS as readonly string[]).includes(String(value ?? ''))
    ? (String(value) as SourceCertification)
    : null;
}

/** Set certification explicitly (admin) — never automatic. */
export async function setSourceCertification(
  db: {
    importSource: { findUnique: (a: any) => Promise<any>; update: (a: any) => Promise<any> };
    auditLog: { create: (a: any) => Promise<any> };
  },
  sourceId: string,
  certification: SourceCertification,
  adminEmail: string,
): Promise<void> {
  const source = await db.importSource.findUnique({ where: { id: sourceId }, select: { name: true } });
  if (!source) throw new Error('Source not found.');
  await db.importSource.update({ where: { id: sourceId }, data: { certification } });
  await db.auditLog.create({
    data: { entity: 'import_source', entityId: sourceId, action: 'source.certification',
      details: JSON.stringify({ by: adminEmail, certification }) },
  });
}

/** Pure eligibility computation from measured metrics. */
export function computeAutoPublishFromMetrics(input: {
  certification?: string | null;
  healthStatus?: string | null;
  consecutiveFailures?: number | null;
  successfulRuns: number;
  totalRuns: number;
  degradedRuns: number;
  createdRows: number;
  realApplyRows: number;
  saneDeadlineRows: number;
}): AutoPublishSnapshot {
  const successRate = input.totalRuns
    ? Math.round((input.successfulRuns / input.totalRuns) * 100) / 100
    : 0;

  const reasons: string[] = [];
  if (input.certification !== 'trusted') {
    reasons.push(`certification is '${input.certification}' — admin must set 'trusted'`);
  }
  if (input.healthStatus !== 'healthy') {
    reasons.push(`healthStatus is '${input.healthStatus}'`);
  }
  if ((input.consecutiveFailures ?? 0) !== 0) {
    reasons.push(`${input.consecutiveFailures} consecutive failures`);
  }
  if (input.successfulRuns < MIN_SUCCESSFUL_RUNS) {
    reasons.push(`only ${input.successfulRuns} successful runs (need ≥ ${MIN_SUCCESSFUL_RUNS})`);
  }
  if (input.totalRuns > 0 && successRate < MIN_SUCCESS_RATE) {
    reasons.push(`success rate ${(successRate * 100).toFixed(0)}% < 90%`);
  }
  if (input.degradedRuns > 0) {
    reasons.push(`${input.degradedRuns} zero-result (DEGRADED) runs`);
  }
  if (input.createdRows > 0 && input.realApplyRows / input.createdRows < MIN_REAL_APPLY_RATE) {
    reasons.push(`real-apply rate ${Math.round((input.realApplyRows / input.createdRows) * 100)}% < 90%`);
  }
  if (input.createdRows > 0 && input.saneDeadlineRows / input.createdRows < MIN_REAL_APPLY_RATE) {
    reasons.push(`sane-deadline rate ${Math.round((input.saneDeadlineRows / input.createdRows) * 100)}% < 90%`);
  }

  return {
    eligibility: reasons.length ? 'NOT_ELIGIBLE' : 'ELIGIBLE',
    reasons,
    metrics: {
      successfulRuns: input.successfulRuns, totalRuns: input.totalRuns,
      successRate,
      degradedRuns: input.degradedRuns, createdRows: input.createdRows,
      realApplyRows: input.realApplyRows, saneDeadlineRows: input.saneDeadlineRows,
    },
  };
}

/** Recompute the eligibility snapshot for a source from its live history. */
export async function evaluateAutoPublishEligibility(db: EligDb, sourceId: string): Promise<AutoPublishSnapshot> {
  const source = await db.importSource.findUnique({
    where: { id: sourceId },
    select: { certification: true, healthStatus: true, consecutiveFailures: true, autoPublish: true },
  });
  if (!source) throw new Error('Source not found.');

  const runs = await db.importRun.findMany({
    where: { sourceId, status: { not: 'running' } },
    orderBy: { startedAt: 'desc' },
    take: 30,
    select: { status: true, errors: true },
  });

  const successfulRuns = runs.filter((r: any) => r.status === 'ok').length;
  const degradedRuns = runs.filter((r: any) =>
    typeof r.errors === 'string' && r.errors.includes('DEGRADED'),
  ).length;

  const createdRows = await db.opportunity.count({
    where: { importSourceId: sourceId, importStatus: 'imported' },
  }).catch(() => 0);
  const realApplyRows = await db.opportunity.count({
    where: {
      importSourceId: sourceId, importStatus: 'imported',
      applyUrlType: { in: ['application_email', 'application_form', 'direct_application'] },
    },
  }).catch(() => 0);
  const saneDeadlineRows = await db.opportunity.count({
    where: {
      importSourceId: sourceId, importStatus: 'imported',
      OR: [{ deadline: null }, { deadline: { gt: new Date() } }],
    },
  }).catch(() => 0);

  return computeAutoPublishFromMetrics({
    certification: source.certification,
    healthStatus: source.healthStatus,
    consecutiveFailures: source.consecutiveFailures,
    successfulRuns,
    totalRuns: runs.length,
    degradedRuns,
    createdRows,
    realApplyRows,
    saneDeadlineRows,
  });
}
