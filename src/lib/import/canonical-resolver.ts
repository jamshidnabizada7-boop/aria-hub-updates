/**
 * Canonical cross-source deduplication (Phase 4).
 *
 * One real-world vacancy must become ONE canonical Opportunity even when
 * ACBAR, Wazifaha and the employer's own careers page all carry it. This
 * resolver runs AFTER the same-source protection in dedupe.ts (which stays
 * untouched) and decides what a listing from a DIFFERENT source means:
 *
 *   confidence >= 90  → 'merge'   (attach observation to the existing row)
 *   70 … 89           → 'review'  (create new; candidate recorded for the
 *                                  Discovery Inbox — never auto-merged)
 *   < 70              → 'new'
 *
 * Matching hierarchy (deterministic, no LLM):
 *   A  organization + official vacancy/reference number      → 100
 *   B  organization + exact vacancy-specific apply URL       → 92
 *   C  organization + title + deadline (+ province)          → 90
 *      (missing/disagreeing deadline or province degrades C into review)
 *   D  organization + title (+ weak signals)                 → 70-89 review
 *   NEVER: title equality alone, organization mismatch.
 *
 * Merge policy: official data outranks aggregator data. When an official
 * observation lands on an aggregator-born opportunity, it becomes the
 * primary observation and authoritative fields (deadline, apply URL,
 * organization link — and legacy source identity where safe) are promoted.
 */
import { normalizeOrgName } from '../organizations/normalize';
import { normalizeForCompare } from './utils';
import { resolveOrganization } from '../organizations/resolve';
import { classifyApplyUrl, isRealApplyLink } from '../apply';
import type { RawListing } from './types';
import type { SourceRole } from './source-observations';

export const MERGE_THRESHOLD = 90;
export const REVIEW_THRESHOLD = 70;

/** Role rank for the merge policy (higher outranks lower). */
export const ROLE_RANK: Record<SourceRole, number> = {
  official_api: 95,
  official_feed: 94,
  official_careers: 93,
  official_ats: 92,
  official_government: 91,
  official_university: 90,
  employer_submission: 60,
  aggregator: 30,
  discovery: 10,
};

export interface CrossSourceContext {
  sourceId: string;
  sourceName: string;
  scraperKey: string;
  incomingRole: SourceRole;
}

export interface CrossSourceCandidate {
  opportunityId: string;
  sourceName: string | null;
  sourceRole: string | null;
  confidence: number;
  reasons: string[];
}

export interface CrossSourceResult {
  decision: 'merge' | 'review' | 'new';
  confidence: number;
  reasons: string[];
  candidate: CrossSourceCandidate | null;
}

interface CanonicalSignature {
  /** `id:<organizationId>` when the org is canonicalized, else the normalized name key. */
  orgKey: string;
  titleKey: string;
  deadline: Date | null;
  provinces: string[];
  vacancyNumber: string | null;
  applyUrl: string | null;
  applyIsReal: boolean;
}

/** Likely vacancy/reference number keys inside listing.extractedData. */
const VACANCY_KEYS = ['vacancyNumber', 'vacancyNo', 'vacancy', 'referenceNumber', 'refNumber', 'jobReference', 'jobId'];

export function extractVacancyNumber(listing: RawListing): string | null {
  const data = listing.extractedData;
  if (!data || typeof data !== 'object') return null;
  for (const key of VACANCY_KEYS) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

/** Stable comparison form of an apply URL: no protocol, www, tracking, fragment. */
export function normalizeApplyUrl(url: string | null | undefined): string {
  if (!url) return '';
  let s = String(url).trim().toLowerCase();
  if (!s) return '';
  try {
    const u = new URL(s);
    u.hostname = u.hostname.replace(/^www\./, '');
    u.hash = '';
    const kept = new URLSearchParams();
    u.searchParams.forEach((value, key) => {
      if (!/^(utm_|fbclid|gclid|ref$)/i.test(key)) kept.set(key, value);
    });
    const query = kept.toString();
    let path = u.pathname.replace(/\/+$/, '');
    if (!path) path = '/';
    return `${u.hostname}${path}${query ? `?${query}` : ''}`;
  } catch {
    // mailto: or junk — collapse to a squashed string
    return s.replace(/^mailto:/, '').replace(/\/+$/, '');
  }
}

/** True when an apply URL looks vacancy-specific (a real per-job destination). */
export function isVacancySpecificApplyUrl(url: string | null | undefined): boolean {
  const n = normalizeApplyUrl(url);
  if (!n || n.includes('@')) return false; // mailto
  if (!n.includes('/')) return false;
  const path = n.split('?')[0];
  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 1) return false; // site roots like org.org/apply
  if (/\/(jobs?|careers?|vacanc(y|ies)|apply|opportunities)\/?$/i.test(path)) return false;
  return /\d/.test(path) || segments.length >= 2;
}

function dayKey(d: Date | null | undefined): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Organization identity guard across BOTH identity spaces: an incoming
 * canonicalized org (`id:...`) requires the same organization id on the
 * candidate; a name-space key compares the candidate's free-text name.
 */
function orgMatches(incomingOrgKey: string, candidate: {
  organization?: string | null; organizationRef?: { id: string } | null; organizationId?: string | null;
}): boolean {
  if (incomingOrgKey.startsWith('id:')) {
    const candId = candidate.organizationRef?.id ?? candidate.organizationId ?? null;
    return !!candId && incomingOrgKey === `id:${candId}`;
  }
  const candName = normalizeOrgName(candidate.organization);
  return !!candName && candName === incomingOrgKey;
}

/**
 * Score ONE candidate against the incoming signature. Returns [confidence, reasons].
 * Guards: organization must match (by resolved org id or normalized name);
 * title alone never merges.
 */
export function scoreCandidate(
  incoming: CanonicalSignature,
  incomingRole: SourceRole,
  candidate: {
    organization?: string | null;
    organizationRef?: { id: string } | null;
    organizationId?: string | null;
    title: string;
    deadline?: Date | null;
    provinces?: string[];
    extractedData?: unknown;
    applyUrl?: string | null;
    applyUrlType?: string | null;
    contentHash?: string | null;
  },
): [number, string[]] {
  if (!incoming.orgKey || !orgMatches(incoming.orgKey, candidate)) return [0, []];

  const reasons: string[] = ['same organization'];
  const candTitle = normalizeForCompare(candidate.title);
  const titleMatch = !!candTitle && candTitle === incoming.titleKey;

  const candVacancy = extractVacancyNumber({ extractedData: candidate.extractedData } as RawListing);
  if (incoming.vacancyNumber && candVacancy &&
      incoming.vacancyNumber.toUpperCase().replace(/[^A-Z0-9]/g, '') === candVacancy.toUpperCase().replace(/[^A-Z0-9]/g, '')) {
    // Level A — organization + official vacancy/reference number
    return [100, [...reasons, 'same vacancy number']];
  }
  if (incoming.vacancyNumber && candVacancy) {
    // mandatory case: BOTH sides state a vacancy number and they differ —
    // the employer said these are different vacancies. Never merge.
    return [60, [...reasons, 'different vacancy numbers']];
  }

  const inApply = normalizeApplyUrl(incoming.applyUrl);
  const candApply = normalizeApplyUrl(candidate.applyUrl);
  const sameApply = !!inApply && !!candApply && inApply === candApply;

  const inDeadline = dayKey(incoming.deadline);
  const candDeadline = dayKey(candidate.deadline ?? null);
  const sameDeadline = !!inDeadline && !!candDeadline && inDeadline === candDeadline;

  const inProv = new Set(incoming.provinces.filter(Boolean));
  const candProv = new Set((candidate.provinces ?? []).filter(Boolean));
  const provOverlap = inProv.size > 0 && candProv.size > 0 &&
    [...inProv].some((p) => candProv.has(p));
  const provConflict = inProv.size > 0 && candProv.size > 0 && !provOverlap;

  if (sameApply && isVacancySpecificApplyUrl(incoming.applyUrl)) {
    // Level B — organization + exact vacancy-specific application URL
    return [92, [...reasons, 'same vacancy-specific application URL']];
  }

  if (titleMatch) {
    if (sameDeadline) {
      // Level C — organization + title + deadline (+ province agreement)
      if (provConflict) return [72, [...reasons, 'same title and deadline', 'different province — likely distinct vacancy']];
      return [90, [...reasons, 'same title', 'same deadline', ...(provOverlap ? ['same province'] : [])]];
    }
    if (!inDeadline || !candDeadline) {
      // one side lacks a deadline — not enough for auto-merge
      return [80, [...reasons, 'same title', 'deadline unavailable for comparison']];
    }
    // explicit deadline disagreement → weak candidate only
    return [74, [...reasons, 'same title', 'deadline differs']];
  }

  if (sameApply) {
    // same GENERIC destination (mailto / form root) — supporting signal only
    return [78, [...reasons, 'same generic apply destination']];
  }

  return [0, []];
}

/** Resolve an incoming listing to a canonical opportunity across sources. */
export async function resolveCrossSource(
  db: any,
  listing: RawListing,
  ctx: CrossSourceContext,
): Promise<CrossSourceResult> {
  const orgKey = normalizeOrgName(listing.organization);
  const titleKey = normalizeForCompare(listing.title);
  if (!orgKey || !titleKey) return { decision: 'new', confidence: 0, reasons: [], candidate: null };

  const provinces = (listing.provinces ?? []).map((p) => String(p || '').trim()).filter(Boolean);

  // Canonicalized org (if any) first — it decides the identity space used below.
  let orgRef: { id: string } | null = null;
  if (listing.organization) {
    const org = await resolveOrganization(db, listing.organization, { createIfMissing: false });
    if (org.organization) orgRef = { id: org.organization.id };
  }

  const signature: CanonicalSignature = {
    // canonicalized org → identity space is the organization id; the
    // name-space key is only used for un-canonicalized comparisons
    orgKey: orgRef ? `id:${orgRef.id}` : orgKey,
    titleKey,
    deadline: listing.deadline ? new Date(listing.deadline) : null,
    provinces,
    vacancyNumber: extractVacancyNumber(listing),
    applyUrl: listing.applyUrl ?? null,
    applyIsReal: !!listing.applyUrl && isRealApplyLink(classifyApplyUrl(listing.applyUrl, listing.sourceUrl, listing.originalUrl)),
  };

  // Candidate pool: resolved organization first, then a title-prefix fallback
  // (mirrors dedupe.ts's query shape) filtered to the same normalized org.
  let candidates: any[] = [];
  if (orgRef) {
    candidates = await db.opportunity.findMany({
      where: { organizationId: orgRef.id, status: { in: ['published', 'draft'] }, sourceName: { not: ctx.sourceName } },
      select: {
        id: true, sourceName: true, title: true, deadline: true, organization: true, organizationId: true,
        applyUrl: true, applyUrlType: true, extractedData: true,
        locations: { select: { province: true } },
      },
      take: 200,
    });
  } else {
    const firstWords = titleKey.split(' ').slice(0, 3).join(' ');
    if (!firstWords) return { decision: 'new', confidence: 0, reasons: [], candidate: null };
    const pool = await db.opportunity.findMany({
      where: {
        status: { in: ['published', 'draft'] },
        sourceName: { not: ctx.sourceName },
        title: { contains: firstWords },
        organization: { not: null },
      },
      select: {
        id: true, sourceName: true, title: true, deadline: true, organization: true, organizationId: true,
        applyUrl: true, applyUrlType: true, extractedData: true,
        locations: { select: { province: true } },
      },
      take: 200,
    });
    candidates = pool.filter((c: any) => normalizeOrgName(c.organization) === orgKey);
  }
  if (!candidates.length) return { decision: 'new', confidence: 0, reasons: [], candidate: null };

  let best: CrossSourceCandidate | null = null;
  for (const c of candidates) {
    const [confidence, reasons] = scoreCandidate(
      signature, ctx.incomingRole,
      { ...c, provinces: (c.locations ?? []).map((l: any) => l.province) },
    );
    if (!best || confidence > best.confidence) {
      best = {
        opportunityId: c.id,
        sourceName: c.sourceName ?? null,
        sourceRole: null,
        confidence,
        reasons,
      };
    }
  }

  if (!best || best.confidence < REVIEW_THRESHOLD) {
    return { decision: 'new', confidence: best?.confidence ?? 0, reasons: best?.reasons ?? [], candidate: null };
  }
  return {
    decision: best.confidence >= MERGE_THRESHOLD ? 'merge' : 'review',
    confidence: best.confidence,
    reasons: best.reasons,
    candidate: best,
  };
}

/**
 * Merge policy execution: attach the incoming listing as an observation on the
 * canonical opportunity; when the incoming role outranks the current primary
 * observation's role, promote authoritative fields and flip isPrimary.
 */
export async function mergeIntoCanonical(
  db: any,
  listing: RawListing,
  ctx: CrossSourceContext,
  targetId: string,
  extras: { applyUrl?: string | null; deadline?: Date | null; organizationId?: string | null; contentHash?: string | null },
): Promise<{ observationId: string; promoted: string[]; newPrimary: boolean }> {
  const { ensureSourceObservation } = await import('./source-observations');
  const res = await ensureSourceObservation(db, {
    opportunityId: targetId,
    sourceName: ctx.sourceName,
    sourceRole: ctx.incomingRole,
    sourceUrl: listing.sourceUrl ?? null,
    importSourceId: ctx.sourceId,
    organizationId: extras.organizationId ?? null,
    sourcePublishedAt: listing.publishedDate ? new Date(listing.publishedDate) : null,
    contentHash: extras.contentHash ?? null,
    observedApplyUrl: extras.applyUrl ?? null,
    observedDeadline: extras.deadline ?? null,
    vacancyNumber: extractVacancyNumber(listing),
    seenAt: new Date(),
  });

  const target = await db.opportunity.findUnique({
    where: { id: targetId },
    select: {
      id: true, deadline: true, applyUrl: true, applyUrlType: true, organizationId: true,
      sourceName: true, sourceUrl: true, originalUrl: true, status: true,
      sourceObservations: { select: { id: true, sourceRole: true, isPrimary: true } },
    },
  });
  if (!target) return { observationId: res.observation.id, promoted: [], newPrimary: false };

  const primaries = target.sourceObservations.filter((o: any) => o.isPrimary);
  const currentBestRank = primaries.length
    ? Math.max(...primaries.map((o: any) => ROLE_RANK[(o.sourceRole as SourceRole)] ?? 0))
    : 0;
  const incomingRank = ROLE_RANK[ctx.incomingRole];
  const promoted: string[] = [];

  if (res.observation.isPrimary === false && incomingRank > currentBestRank) {
    await db.opportunitySourceObservation.update({ where: { id: res.observation.id }, data: { isPrimary: true } });
    for (const o of primaries) {
      if (o.id !== res.observation.id) {
        await db.opportunitySourceObservation.update({ where: { id: o.id }, data: { isPrimary: false } });
      }
    }
  }
  const newPrimary = incomingRank > currentBestRank || res.observation.isPrimary === true;

  if (incomingRank > currentBestRank || primaries.length === 0) {
    const data: Record<string, unknown> = {};
    if (extras.deadline && (!target.deadline || incomingRank > currentBestRank)) {
      data.deadline = extras.deadline;
      promoted.push('deadline');
    }
    const existingReal = isRealApplyLink(classifyApplyUrl(target.applyUrl, target.sourceUrl, target.originalUrl));
    // Official observations are trusted even when the apply URL shares the
    // source host (an official careers page links to its own /apply/ path —
    // the same-host aggregator rule must not demote it; Phase 5 refines this).
    const incomingReal = !!extras.applyUrl && (
      incomingRank >= 90 ||
      isRealApplyLink(classifyApplyUrl(extras.applyUrl, listing.sourceUrl, listing.originalUrl))
    );
    if (incomingReal && !existingReal) {
      data.applyUrl = extras.applyUrl;
      data.applyUrlType = classifyApplyUrl(extras.applyUrl, listing.sourceUrl, listing.originalUrl);
      promoted.push('applyUrl');
    }
    if (!target.organizationId && extras.organizationId) {
      data.organizationId = extras.organizationId;
      promoted.push('organizationId');
    }
    if (incomingRank >= 90 && target.sourceUrl !== (listing.sourceUrl ?? null)) {
      // promote the official source identity where safe (sourceUrl is unique —
      // if another canonical row already carries it, leave the legacy identity)
      try {
        await db.opportunity.update({
          where: { id: targetId },
          data: {
            ...data,
            sourceName: ctx.sourceName,
            sourceUrl: listing.sourceUrl,
            originalUrl: listing.originalUrl || listing.sourceUrl,
          },
        });
        promoted.push('sourceIdentity');
      } catch {
        if (Object.keys(data).length) {
          await db.opportunity.update({ where: { id: targetId }, data });
        }
      }
    } else if (Object.keys(data).length) {
      await db.opportunity.update({ where: { id: targetId }, data });
    }
  }

  // Phase 17: refresh the internal verification/trust label after the merge
  try {
    const { recomputeVerificationStatus } = await import('@/lib/verification');
    await recomputeVerificationStatus(db, targetId);
  } catch { /* label refresh never breaks the merge */ }

  return { observationId: res.observation.id, promoted, newPrimary };
}
