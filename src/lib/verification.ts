/**
 * Verification / trust system (Phase 17) — an INTERNAL status that
 * distinguishes trustworthy official data from secondary discovery.
 *
 * Public badges stay conservative: the site may only show "Verified
 * organization" / "Official source" when the status actually starts with
 * `verified_` — see the detail page. Never claim government/official
 * verification without evidence.
 *
 * Status mapping (deterministic, from the opportunity's observations):
 *   verified_official      primary observation has an official_* role
 *   verified_employer      primary is employer_submission AND the
 *                          organization itself is verified
 *   needs_review           the primary observation still carries a pending
 *                          matchReview (uncertain import, Phase 4) — or
 *                          nothing at all is known (fallback)
 *   aggregator_confirmed   the aggregator sighting was confirmed by a second,
 *                          different source
 *   multi_source_confirmed seen by two or more distinct sources
 *   single_source          exactly one (non-official, non-verified) source
 */

export const VERIFICATION_STATUSES = [
  'verified_official',
  'verified_employer',
  'aggregator_confirmed',
  'multi_source_confirmed',
  'single_source',
  'needs_review',
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

const OFFICIAL_ROLES = new Set([
  'official_api', 'official_feed', 'official_careers', 'official_ats',
  'official_government', 'official_university',
]);

export interface VerificationInput {
  primarySourceRole?: string | null;
  /** number of DISTINCT sourceName values across observations */
  distinctSourceCount: number;
  organizationVerified: boolean;
  /** pending matchReview on any observation (uncertain import) */
  hasPendingMatchReview: boolean;
}

export function computeVerificationStatus(input: VerificationInput): VerificationStatus {
  const primary = input.primarySourceRole ?? null;
  if (primary && OFFICIAL_ROLES.has(primary)) return 'verified_official';
  if (primary === 'employer_submission' && input.organizationVerified) return 'verified_employer';
  if (input.hasPendingMatchReview) return 'needs_review';
  if (input.distinctSourceCount >= 2) {
    return primary === 'aggregator' ? 'aggregator_confirmed' : 'multi_source_confirmed';
  }
  if (input.distinctSourceCount === 1) return 'single_source';
  return 'needs_review';
}

type VerDb = {
  opportunitySourceObservation: { findMany: (a: any) => Promise<any[]> };
  organization: { findUnique: (a: any) => Promise<any> };
  opportunity: { findUnique: (a: any) => Promise<any>; findMany: (a: any) => Promise<any[]>; update: (a: any) => Promise<any>; updateMany: (a: any) => Promise<any> };
};

/**
 * Recompute and persist the status for one opportunity from its live
 * observations. Cheap (two small queries); call after any observation,
 * membership or organization-verification change.
 */
export async function recomputeVerificationStatus(db: VerDb, opportunityId: string): Promise<VerificationStatus | null> {
  const opportunity = await db.opportunity.findUnique({
    where: { id: opportunityId },
    select: { organizationId: true, organizationRef: { select: { verified: true } } },
  });
  if (!opportunity) return null;

  const observations = await db.opportunitySourceObservation.findMany({
    where: { opportunityId },
    select: { sourceName: true, sourceRole: true, isPrimary: true, rawData: true },
  });
  const primary = observations.find((o: any) => o.isPrimary) ?? observations[0] ?? null;
  const distinctSources = new Set(observations.map((o: any) => o.sourceName)).size;
  const hasPendingMatchReview = observations.some((o: any) => {
    const raw = o.rawData as Record<string, unknown> | null;
    return Boolean(raw?.matchReview) && !raw?.matchReviewResolved;
  });

  let organizationVerified = Boolean(opportunity.organizationRef?.verified);
  if (!organizationVerified && opportunity.organizationId) {
    const org = await db.organization.findUnique({ where: { id: opportunity.organizationId }, select: { verified: true } });
    organizationVerified = Boolean(org?.verified);
  }

  const status = computeVerificationStatus({
    primarySourceRole: primary?.sourceRole ?? null,
    distinctSourceCount: distinctSources,
    organizationVerified,
    hasPendingMatchReview,
  });
  await db.opportunity.update({ where: { id: opportunityId }, data: { verificationStatus: status } });
  return status;
}
