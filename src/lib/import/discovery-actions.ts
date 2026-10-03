/**
 * Discovery Inbox actions (Phase 10).
 *
 * The import pipeline records review-band cross-source matches (confidence
 * 70-89) on the new opportunity's source observation as
 * rawData.matchReview = { candidateId, confidence, reasons[] } (Phase 4).
 * This module is the admin's lever over those uncertain imports:
 *
 *   list            → everything awaiting review, with the candidate preview
 *   keepSeparate    → admin says these are two real vacancies (clears the flag)
 *   merge           → folds the incoming opportunity into the canonical one:
 *                     observations are re-pointed (never lost), authoritative
 *                     fields are promoted (official role wins), the duplicate
 *                     row is deleted. MonetizationOrders survive (SetNull FK).
 *   publish/reject  → moderation verdicts on the incoming row
 *   trust/pause     → source-level controls (trustScore bump / healthStatus)
 *
 * Every action writes an AuditLog entry with the acting admin's email.
 */
import { ROLE_RANK } from './canonical-resolver';
import { resolveApplyDestination } from '@/lib/apply-resolver';
import type { SourceRole } from './source-observations';

export interface DiscoveryMatch {
  candidateId: string;
  confidence: number;
  reasons: string[];
}

export interface DiscoveryInboxItem {
  observationId: string;
  match: DiscoveryMatch;
  opportunity: {
    id: string;
    title: string;
    organization: string | null;
    status: string;
    deadline: Date | null;
    applyUrl: string | null;
    applyUrlType: string | null;
    applyConfidence: number | null;
    sourceName: string | null;
    sourceUrl: string | null;
    importSourceId: string | null;
    locations: string[];
  };
  candidate: {
    id: string;
    title: string;
    organization: string | null;
    status: string;
    deadline: Date | null;
    sourceName: string | null;
  } | null;
}

type InboxDb = {
  opportunitySourceObservation: { findMany: (a: any) => Promise<any[]>; findFirst: (a: any) => Promise<any>; findUnique: (a: any) => Promise<any>; update: (a: any) => Promise<any>; updateMany: (a: any) => Promise<any>; delete: (a: any) => Promise<any>; groupBy: (a: any) => Promise<any[]> };
  opportunity: { findUnique: (a: any) => Promise<any>; findMany: (a: any) => Promise<any[]>; update: (a: any) => Promise<any>; delete: (a: any) => Promise<any>; count: (a: any) => Promise<number> };
  opportunityMatchProfile: { update: (a: any) => Promise<any> };
  importSource: { findUnique: (a: any) => Promise<any>; update: (a: any) => Promise<any> };
  auditLog: { create: (a: any) => Promise<any> };
};

const SELECT_OPP = {
  id: true, title: true, organization: true, status: true, deadline: true,
  applyUrl: true, applyUrlType: true, applyConfidence: true,
  sourceName: true, sourceUrl: true,
  locations: { select: { province: true, city: true } },
};

/** Everything awaiting a Discovery Inbox decision. */
export async function listDiscoveryInbox(db: InboxDb, take = 100): Promise<DiscoveryInboxItem[]> {
  const observations = await db.opportunitySourceObservation.findMany({
    where: { rawData: { path: ['matchReview'], not: 'null' } },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true, opportunityId: true, sourceName: true, sourceRole: true,
      sourceUrl: true, importSourceId: true, rawData: true, createdAt: true,
    },
  });
  if (!observations.length) return [];

  const oppIds = observations.map((o: any) => o.opportunityId);
  const candidateIds = [...new Set(observations.map((o: any) => (o.rawData as any)?.matchReview?.candidateId).filter(Boolean))];
  const [opportunities, candidates] = await Promise.all([
    db.opportunity.findMany({ where: { id: { in: oppIds } }, select: SELECT_OPP }),
    db.opportunity.findMany({
      where: { id: { in: candidateIds } },
      select: { id: true, title: true, organization: true, status: true, deadline: true, sourceName: true },
    }),
  ]);
  const byId = new Map(opportunities.map((o: any) => [o.id, o]));
  const candById = new Map(candidates.map((c: any) => [c.id, c]));

  const items: DiscoveryInboxItem[] = [];
  for (const obs of observations) {
    const opp = byId.get(obs.opportunityId);
    const match = (obs.rawData as any)?.matchReview;
    if (!opp || !match?.candidateId) continue;
    items.push({
      observationId: obs.id,
      match: { candidateId: match.candidateId, confidence: match.confidence ?? 0, reasons: match.reasons ?? [] },
      opportunity: {
        ...opp,
        importSourceId: obs.importSourceId ?? null,
        locations: (opp.locations ?? []).map((l: any) => [l.province, l.city].filter(Boolean).join(', ')),
      },
      candidate: candById.get(match.candidateId) ?? null,
    });
  }
  return items.sort((a, b) => b.match.confidence - a.match.confidence);
}

/** Clear the review flag with a recorded verdict. */
async function resolveMatch(db: InboxDb, observationId: string, decision: string, adminEmail: string): Promise<void> {
  const obs = await db.opportunitySourceObservation.findUnique({ where: { id: observationId }, select: { rawData: true } });
  if (!obs) return;
  const raw = { ...((obs.rawData as Record<string, unknown>) ?? {}) } as Record<string, unknown>;
  const reviewed = { decision, reviewedAt: new Date().toISOString(), reviewedBy: adminEmail };
  const rest = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== 'matchReview'));
  await db.opportunitySourceObservation.update({
    where: { id: observationId },
    data: { rawData: { ...rest, matchReviewResolved: reviewed } },
  });
}

export async function keepSeparate(db: InboxDb, observationId: string, adminEmail: string): Promise<void> {
  await resolveMatch(db, observationId, 'keep-separate', adminEmail);
  await db.auditLog.create({ data: { entity: 'opportunity_source_observation', entityId: observationId, action: 'discovery.keep-separate', details: JSON.stringify({ by: adminEmail }) } });
}

export async function publishFromInbox(db: InboxDb, opportunityId: string, adminEmail: string): Promise<void> {
  const obs = await db.opportunitySourceObservation.findFirst({
    where: { opportunityId, rawData: { path: ['matchReview'], not: 'null' } }, select: { id: true },
  });
  await db.opportunity.update({ where: { id: opportunityId }, data: { status: 'published' } });
  if (obs) await resolveMatch(db, obs.id, 'published', adminEmail);
  await db.auditLog.create({ data: { entity: 'opportunity', entityId: opportunityId, action: 'discovery.publish', details: JSON.stringify({ by: adminEmail }) } });
}

export async function rejectFromInbox(db: InboxDb, opportunityId: string, adminEmail: string): Promise<void> {
  const obs = await db.opportunitySourceObservation.findFirst({
    where: { opportunityId, rawData: { path: ['matchReview'], not: 'null' } }, select: { id: true },
  });
  await db.opportunity.update({ where: { id: opportunityId }, data: { status: 'archived' } });
  if (obs) await resolveMatch(db, obs.id, 'rejected', adminEmail);
  await db.auditLog.create({ data: { entity: 'opportunity', entityId: opportunityId, action: 'discovery.reject', details: JSON.stringify({ by: adminEmail }) } });
}

/**
 * Fold the incoming opportunity into the canonical candidate:
 * 1. re-point every observation (drop ones the candidate already holds),
 * 2. promote fields the candidate lacks — apply destination only ever
 *    upgrades, deadline/organization/description only fill empties,
 * 3. move the match profile if the candidate has none,
 * 4. delete the duplicate row (monetization orders survive via SetNull).
 */
export async function mergeInto(db: InboxDb, incomingId: string, candidateId: string, adminEmail: string): Promise<{ movedObservations: number; droppedObservations: number; promoted: string[] }> {
  if (incomingId === candidateId) throw new Error('cannot merge an opportunity into itself');
  const [incoming, candidate] = await Promise.all([
    db.opportunity.findUnique({
      where: { id: incomingId },
      select: { ...SELECT_OPP, description: true, extractedData: true,
        sourceObservations: { select: { id: true, sourceName: true, sourceRole: true, sourceUrl: true } } },
    }),
    db.opportunity.findUnique({
      where: { id: candidateId },
      select: { ...SELECT_OPP, description: true,
        sourceObservations: { select: { id: true, sourceRole: true, isPrimary: true } },
        matchProfile: { select: { id: true } } },
    }),
  ]);
  if (!incoming || !candidate) throw new Error('merge: opportunity not found');

  // 1. re-point observations
  let movedObservations = 0;
  let droppedObservations = 0;
  for (const obs of incoming.sourceObservations) {
    const clash = await db.opportunitySourceObservation.findFirst({
      where: { opportunityId: candidateId, sourceName: obs.sourceName, sourceUrl: obs.sourceUrl },
      select: { id: true },
    });
    if (clash) {
      await db.opportunitySourceObservation.delete({ where: { id: obs.id } });
      droppedObservations += 1;
    } else {
      // re-pointed observations always lose their primary flag from the old
      // row — the promotion step below re-assigns it only when the role
      // genuinely outranks the candidate's current primary
      await db.opportunitySourceObservation.update({ where: { id: obs.id }, data: { opportunityId: candidateId, isPrimary: false } });
      movedObservations += 1;
    }
  }

  // 2. primary + field promotion per the official-overrides-aggregator policy
  const promoted: string[] = [];
  const candidateBestRank = Math.max(0, ...candidate.sourceObservations
    .filter((o: any) => o.isPrimary)
    .map((o: any) => ROLE_RANK[(o.sourceRole as SourceRole)] ?? 0));
  const movedRanks = incoming.sourceObservations
    .filter((o: any) => !candidate.sourceObservations.some((c: any) => c.id === o.id))
    .map((o: any) => ROLE_RANK[(o.sourceRole as SourceRole)] ?? 0);
  const incomingBestRank = Math.max(0, ...movedRanks);

  if (incomingBestRank > candidateBestRank) {
    // re-read now that rows were re-pointed; promote the strongest moved row
    const fresh = await db.opportunitySourceObservation.findMany({
      where: { opportunityId: candidateId }, select: { id: true, sourceRole: true, isPrimary: true },
    });
    const best = fresh
      .filter((o: any) => (ROLE_RANK[(o.sourceRole as SourceRole)] ?? 0) === incomingBestRank)
      .sort((a: any, b: any) => a.id === b.id ? 0 : 1)[0];
    if (best) {
      await db.opportunitySourceObservation.updateMany({ where: { opportunityId: candidateId }, data: { isPrimary: false } });
      await db.opportunitySourceObservation.update({ where: { id: best.id }, data: { isPrimary: true } });
      promoted.push('primaryObservation');
    }
  }

  const data: Record<string, unknown> = {};
  if (!candidate.deadline && incoming.deadline) { data.deadline = incoming.deadline; promoted.push('deadline'); }
  const candidateApplyReal = ['application_email', 'application_form', 'direct_application'].includes(candidate.applyUrlType ?? '');
  if (!candidateApplyReal && incoming.applyUrl && !candidateApplyReal) {
    const resolution = resolveApplyDestination({
      applyUrl: incoming.applyUrl, sourceUrl: incoming.sourceUrl, originalUrl: incoming.sourceUrl,
      sourceRole: null, organizationDomains: null,
    });
    if (['application_email', 'application_form', 'direct_application'].includes(resolution.applyUrlType)) {
      data.applyUrl = incoming.applyUrl;
      data.applyUrlType = resolution.applyUrlType;
      data.applyUrlEvidence = resolution.evidence;
      data.applyConfidence = resolution.confidence;
      promoted.push('applyUrl');
    }
  }
  if (!candidate.organizationId && incoming.organizationId) { data.organizationId = incoming.organizationId; promoted.push('organizationId'); }
  if (!candidate.description && incoming.description) { data.description = incoming.description; promoted.push('description'); }
  if (Object.keys(data).length) {
    await db.opportunity.update({ where: { id: candidateId }, data });
  }

  // 3. move the match profile when the candidate has none
  const incomingProfile = await db.opportunity.findUnique({ where: { id: incomingId }, select: { matchProfile: { select: { id: true } } } });
  if (incomingProfile?.matchProfile && !candidate.matchProfile) {
    await db.opportunityMatchProfile.update({ where: { id: incomingProfile.matchProfile.id }, data: { opportunityId: candidateId } });
    promoted.push('matchProfile');
  }

  // 4. remove the duplicate
  await db.opportunity.delete({ where: { id: incomingId } });

  await db.auditLog.create({
    data: { entity: 'opportunity', entityId: candidateId, action: 'discovery.merge',
      details: JSON.stringify({ by: adminEmail, incomingId, movedObservations, droppedObservations, promoted }) },
  });
  return { movedObservations, droppedObservations, promoted };
}

export async function trustSource(db: InboxDb, importSourceId: string, adminEmail: string): Promise<number | null> {
  const source = await db.importSource.findUnique({ where: { id: importSourceId }, select: { trustScore: true, sourceRole: true } });
  if (!source) return null;
  const base = source.trustScore ?? 40;
  const next = Math.min(95, base + 10);
  await db.importSource.update({ where: { id: importSourceId }, data: { trustScore: next } });
  await db.auditLog.create({ data: { entity: 'import_source', entityId: importSourceId, action: 'discovery.trust-source', details: JSON.stringify({ by: adminEmail, from: base, to: next }) } });
  return next;
}

export async function pauseSource(db: InboxDb, importSourceId: string, adminEmail: string): Promise<boolean> {
  const source = await db.importSource.findUnique({ where: { id: importSourceId }, select: { healthStatus: true } });
  if (!source) return false;
  await db.importSource.update({ where: { id: importSourceId }, data: { healthStatus: 'paused' } });
  await db.auditLog.create({ data: { entity: 'import_source', entityId: importSourceId, action: 'discovery.pause-source', details: JSON.stringify({ by: adminEmail }) } });
  return true;
}
