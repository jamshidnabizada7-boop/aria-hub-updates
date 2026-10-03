/**
 * Source observations (Phase 3): the link between "the opportunity" and
 * "where ARIA HUB discovered it".
 *
 * The canonical Opportunity keeps its legacy sourceName/sourceUrl/originalUrl
 * columns (public pages and dedupe depend on them). Every discovery event —
 * official careers page, ATS, employer submission, or an aggregator — is
 * additionally recorded here as an observation. The most authoritative
 * observation for an opportunity is isPrimary.
 *
 * This module is the ONLY writer of observations: the orchestrator's import
 * path (Phase 4) and the backfill script both go through ensureSourceObservation.
 */

export const SOURCE_ROLES = [
  'official_api',
  'official_feed',
  'official_careers',
  'official_ats',
  'official_government',
  'official_university',
  'employer_submission',
  'aggregator',
  'discovery',
] as const;

export type SourceRole = (typeof SOURCE_ROLES)[number];

/** Baseline trust per role (0-100). Per-source refinement lands in Phase 6+. */
export const ROLE_TRUST: Record<SourceRole, number> = {
  official_api: 95,
  official_feed: 95,
  official_careers: 90,
  official_ats: 90,
  official_government: 90,
  official_university: 90,
  employer_submission: 75,
  aggregator: 40,
  discovery: 20,
};

/** Keys that identify an aggregator/discovery site in sourceName strings. */
const AGGREGATOR_NAME_KEYS = [
  'acbar', 'wazifaha', 'jobsaf', 'jobs.af', 'jobs af', 'o4af',
  'opportunities for afghans', 'scholarshipsaf', 'scholarships.af', 'scholarships af',
  'reliefweb', 'opportunity desk', 'opportunities for youth', 'afterschoolafrica',
  'scholarship roar', 'mladiinfo', 'scholarships corner', 'youth opportunities',
  'voa', 'ideal job', 'weforum',
];

/** Role for every scraperKey in today's registry (all discovery/aggregators). */
export const SCRAPER_KEY_ROLES: Record<string, SourceRole> = {
  acbar: 'aggregator',
  wazifaha: 'aggregator',
  jobsaf: 'aggregator',
  o4af: 'aggregator',
  scholarshipsAf: 'aggregator',
  wpApi: 'aggregator', // current wpApi sources are scholarship aggregators; an official org WP site overrides via explicitRole
  reliefweb: 'aggregator',
  rssNews: 'aggregator',
};

function squash(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Resolve the source role for an observation. Precedence:
 *   explicitRole (curated/config) → scraperKey mapping → known aggregator
 *   names → employer/community submissions → discovery (conservative default).
 */
export function resolveSourceRole(input: {
  sourceName?: string | null;
  scraperKey?: string | null;
  explicitRole?: string | null;
}): SourceRole {
  const { scraperKey, explicitRole } = input;
  if (explicitRole && (SOURCE_ROLES as readonly string[]).includes(explicitRole)) {
    return explicitRole as SourceRole;
  }
  if (scraperKey && SCRAPER_KEY_ROLES[scraperKey]) return SCRAPER_KEY_ROLES[scraperKey];

  const name = String(input.sourceName ?? '').trim();
  if (!name) return 'discovery';
  const squashed = squash(name);
  if (squashed === 'employer' || squashed === 'community') return 'employer_submission';
  if (AGGREGATOR_NAME_KEYS.some((k) => squashed.includes(squash(k)))) return 'aggregator';
  return 'discovery';
}

export interface ObservationInput {
  opportunityId: string;
  sourceName: string;
  sourceRole: SourceRole;
  sourceUrl?: string | null;
  importSourceId?: string | null;
  organizationId?: string | null;
  sourcePublishedAt?: Date | null;
  contentHash?: string | null;
  vacancyNumber?: string | null;
  observedApplyUrl?: string | null;
  observedDeadline?: Date | null;
  rawData?: unknown;
  trustScore?: number | null;
  seenAt?: Date | null;
}

export interface EnsureResult {
  observation: { id: string; isPrimary: boolean };
  created: boolean;
}

/**
 * Upsert one observation keyed on (opportunityId, sourceName, sourceUrl).
 * Re-sighting updates lastSeenAt and the observed fields; it never creates a
 * second row for the same sighting key. The FIRST observation of an
 * opportunity becomes isPrimary; later roles can outrank it in Phase 4.
 */
export async function ensureSourceObservation(
  db: {
    opportunitySourceObservation: {
      findFirst: (args: any) => Promise<any>;
      create: (args: any) => Promise<any>;
      update: (args: any) => Promise<any>;
      count: (args: any) => Promise<number>;
    };
  },
  input: ObservationInput,
): Promise<EnsureResult> {
  const seenAt = input.seenAt ?? new Date();
  const sourceUrl = input.sourceUrl ?? null;

  const existing = await db.opportunitySourceObservation.findFirst({
    where: { opportunityId: input.opportunityId, sourceName: input.sourceName, sourceUrl },
  });

  if (existing) {
    const updated = await db.opportunitySourceObservation.update({
      where: { id: existing.id },
      data: {
        lastSeenAt: seenAt,
        ...(input.contentHash != null ? { contentHash: input.contentHash } : {}),
        ...(input.observedApplyUrl !== undefined ? { observedApplyUrl: input.observedApplyUrl } : {}),
        ...(input.observedDeadline !== undefined ? { observedDeadline: input.observedDeadline } : {}),
        ...(input.importSourceId != null ? { importSourceId: input.importSourceId } : {}),
        ...(input.organizationId != null ? { organizationId: input.organizationId } : {}),
        ...(input.trustScore != null ? { trustScore: input.trustScore } : {}),
      },
    });
    return { observation: { id: updated.id, isPrimary: updated.isPrimary }, created: false };
  }

  const existingCount = await db.opportunitySourceObservation.count({
    where: { opportunityId: input.opportunityId },
  });
  const created = await db.opportunitySourceObservation.create({
    data: {
      opportunityId: input.opportunityId,
      sourceName: input.sourceName,
      sourceRole: input.sourceRole,
      sourceUrl,
      importSourceId: input.importSourceId ?? null,
      organizationId: input.organizationId ?? null,
      sourcePublishedAt: input.sourcePublishedAt ?? null,
      firstSeenAt: seenAt,
      lastSeenAt: seenAt,
      contentHash: input.contentHash ?? null,
      vacancyNumber: input.vacancyNumber ?? null,
      observedApplyUrl: input.observedApplyUrl ?? null,
      observedDeadline: input.observedDeadline ?? null,
      rawData: (input.rawData ?? undefined) as any,
      trustScore: input.trustScore ?? ROLE_TRUST[input.sourceRole],
      isPrimary: existingCount === 0,
    },
  });
  return { observation: { id: created.id, isPrimary: created.isPrimary }, created: true };
}

export interface ObservationBackfillResult {
  dryRun: boolean;
  scanned: number;
  byRole: Record<string, number>;
  wouldCreate: number;
  wouldUpdate: number;
  created: number;
  updated: number;
}

/** Parse Opportunity.publishedDate (free-text-ish ISO string) safely. */
export function parseSourcePublishedAt(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Backfill observations for every imported opportunity (local-only script).
 * Legacy Opportunity fields are read, never written. Idempotent: re-runs
 * update lastSeenAt instead of duplicating.
 */
export async function backfillSourceObservations(
  db: any,
  opts: { apply?: boolean; limit?: number } = {},
): Promise<ObservationBackfillResult> {
  const apply = opts.apply === true;
  const rows = await db.opportunity.findMany({
    where: {},
    select: {
      id: true, sourceName: true, sourceUrl: true, originalUrl: true,
      publishedDate: true, deadline: true, applyUrl: true, contentHash: true,
      createdAt: true, importedAt: true, organizationId: true,
    },
    ...(opts.limit ? { take: opts.limit } : {}),
  });

  const result: ObservationBackfillResult = {
    dryRun: !apply,
    scanned: rows.length,
    byRole: {},
    wouldCreate: 0,
    wouldUpdate: 0,
    created: 0,
    updated: 0,
  };

  for (const row of rows) {
    const sourceName = String(row.sourceName ?? 'Manual');
    const role = resolveSourceRole({ sourceName });
    result.byRole[role] = (result.byRole[role] ?? 0) + 1;
    const sourceUrl = row.sourceUrl ?? row.originalUrl ?? null;
    const seenAt = row.importedAt ?? row.createdAt ?? new Date();

    const existing = await db.opportunitySourceObservation.findFirst({
      where: { opportunityId: row.id, sourceName, sourceUrl },
    });

    if (!apply) {
      if (existing) result.wouldUpdate += 1;
      else result.wouldCreate += 1;
      continue;
    }

    const res = await ensureSourceObservation(db, {
      opportunityId: row.id,
      sourceName,
      sourceRole: role,
      sourceUrl,
      sourcePublishedAt: parseSourcePublishedAt(row.publishedDate),
      contentHash: row.contentHash,
      observedApplyUrl: row.applyUrl,
      observedDeadline: row.deadline,
      organizationId: row.organizationId,
      seenAt,
    });
    if (res.created) result.created += 1;
    else result.updated += 1;
  }

  return result;
}
