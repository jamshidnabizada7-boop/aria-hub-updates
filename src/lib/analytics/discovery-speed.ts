/**
 * Discovery speed analytics (Phase 20) — can we MEASURE that ARIA HUB is
 * faster than the aggregators?
 *
 *   detection latency   = firstSeenAt − sourcePublishedAt (per observation)
 *   publication latency = publishedAt − firstSeenAt (first sighting → live)
 *   competitor lead     = ARIA HUB-before-aggregator count: opportunities
 *                         whose EARLIEST sighting came from a non-aggregator
 *                         source while an aggregator carried it later
 *
 * All metrics are computed over a sliding window from live tables — no new
 * storage. The medians use the standard nearest-rank definition.
 */

export interface DiscoveryMetrics {
  windowDays: number;
  observationsConsidered: number;
  detectionLatency: { medianMinutes: number | null; meanMinutes: number | null; sample: number };
  publicationLatency: { medianMinutes: number | null; meanMinutes: number | null; sample: number };
  officialPercentage: number;
  aggregatorOnlyPercentage: number;
  duplicatePrevented: number;
  officialSourceUpgrades: number;
  applyResolvedDirectly: number;
  sourceFailures: number;
  ariaHubBeforeAggregators: number;
}

type AnalyticsDb = {
  opportunitySourceObservation: { findMany: (a: any) => Promise<any[]> };
  opportunity: { findMany: (a: any) => Promise<any[]> };
  importRun: { findMany: (a: any) => Promise<any[]> };
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

const OFFICIAL = new Set(['official_api', 'official_feed', 'official_careers', 'official_ats', 'official_government', 'official_university']);

export async function computeDiscoveryMetrics(db: AnalyticsDb, windowDays = 30): Promise<DiscoveryMetrics> {
  const since = new Date(Date.now() - windowDays * 24 * 3600_000);

  const observations = await db.opportunitySourceObservation.findMany({
    where: { createdAt: { gte: since } },
    select: {
      opportunityId: true, sourceName: true, sourceRole: true, isPrimary: true,
      sourcePublishedAt: true, firstSeenAt: true,
    },
  });
  const opportunities = await db.opportunity.findMany({
    where: { createdAt: { gte: since }, status: { in: ['published', 'draft', 'expired', 'archived'] } },
    select: {
      id: true, status: true, importedAt: true, createdAt: true, applyConfidence: true,
      sourceObservations: { select: { sourceName: true, sourceRole: true, firstSeenAt: true } },
    },
  });
  const runs = await db.importRun.findMany({
    where: { startedAt: { gte: since } },
    select: { duplicates: true, status: true },
  });

  // detection latency: needs a machine-readable publish date from the source
  const detectionMinutes: number[] = [];
  for (const obs of observations as any[]) {
    if (obs.sourcePublishedAt && obs.firstSeenAt) {
      const minutes = (obs.firstSeenAt.getTime() - obs.sourcePublishedAt.getTime()) / 60_000;
      if (Number.isFinite(minutes)) detectionMinutes.push(Math.round(minutes * 100) / 100);
    }
  }

  // publication latency: first sighting → live (importedAt ≈ publish moment)
  const publicationMinutes: number[] = [];
  const byOpportunity = new Map((observations as any[]).map((o) => [o.opportunityId, o]));
  for (const opp of opportunities as any[]) {
    if (opp.status !== 'published') continue;
    const first = byOpportunity.get(opp.id);
    if (!first) continue;
    const publishedAt = opp.importedAt ?? opp.createdAt;
    const minutes = (publishedAt.getTime() - first.firstSeenAt.getTime()) / 60_000;
    if (Number.isFinite(minutes) && minutes >= 0) publicationMinutes.push(Math.round(minutes * 100) / 100);
  }

  // source-mix percentages over primary observations
  const primaries = (observations as any[]).filter((o) => o.isPrimary);
  const officialCount = primaries.filter((o) => OFFICIAL.has(o.sourceRole)).length;
  const aggregatorOnly = (opportunities as any[]).filter((o) => {
    const roles = (o.sourceObservations ?? []).map((s: any) => s.sourceRole);
    return roles.length > 0 && roles.every((r: string) => r === 'aggregator' || r === 'discovery');
  }).length;

  // official upgrade: same opportunity carries BOTH an aggregator and an official sighting
  const officialUpgrades = (opportunities as any[]).filter((o) => {
    const roles = (o.sourceObservations ?? []).map((s: any) => s.sourceRole);
    return roles.some((r: string) => r === 'aggregator') && roles.some((r: string) => OFFICIAL.has(r));
  }).length;

  // ARIA HUB before aggregators: earliest sighting is official/employer AND an aggregator carried it later
  const beforeAggregators = (opportunities as any[]).filter((o) => {
    const obs = o.sourceObservations ?? [];
    if (obs.length < 2) return false;
    const sorted = [...obs].sort((a, b) => a.firstSeenAt.getTime() - b.firstSeenAt.getTime());
    const trustedFirst = OFFICIAL.has(sorted[0].sourceRole) || sorted[0].sourceRole === 'employer_submission';
    return trustedFirst && sorted.slice(1).some((s: any) => s.sourceRole === 'aggregator');
  }).length;

  return {
    windowDays,
    observationsConsidered: (observations as any[]).length,
    detectionLatency: { medianMinutes: median(detectionMinutes), meanMinutes: mean(detectionMinutes), sample: detectionMinutes.length },
    publicationLatency: { medianMinutes: median(publicationMinutes), meanMinutes: mean(publicationMinutes), sample: publicationMinutes.length },
    officialPercentage: primaries.length ? Math.round((officialCount / primaries.length) * 100) : 0,
    aggregatorOnlyPercentage: opportunities.length ? Math.round((aggregatorOnly / opportunities.length) * 100) : 0,
    duplicatePrevented: runs.reduce((sum: number, r: any) => sum + (r.duplicates ?? 0), 0),
    officialSourceUpgrades: officialUpgrades,
    applyResolvedDirectly: (opportunities as any[]).filter((o) => (o.applyConfidence ?? 0) >= 80).length,
    sourceFailures: runs.filter((r: any) => r.status === 'error').length,
    ariaHubBeforeAggregators: beforeAggregators,
  };
}
