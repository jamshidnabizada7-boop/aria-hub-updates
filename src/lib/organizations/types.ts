/**
 * Shared types for the organization resolution & backfill engine (Phase 2).
 * Pure types only — no runtime imports — so every module here stays usable
 * from bun scripts, tests, and the Next.js server alike.
 */

/** Minimal db surface needed by the resolver/backfill (client or transaction). */
export type OrgDbClient = {
  organization: {
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  organizationAlias: {
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
  opportunity: {
    findMany: (args: any) => Promise<any[]>;
    updateMany: (args: any) => Promise<any>;
  };
};

/** One normalized group of free-text organization names from Opportunity rows. */
export interface OrgGroup {
  /** normalizeOrgName() of every display variant in the group — the group key. */
  normalizedKey: string;
  /** verbatim display names seen for this key, with counts. */
  displayNames: { name: string; count: number }[];
  /** ids of opportunities carrying this name (linked + unlinked alike). */
  opportunityIds: string[];
  /** alias candidates extracted from parentheses/acronyms — REPORT ONLY in backfill. */
  aliasCandidates: string[];
  /** normalized alias-candidate keys derived from aliasCandidates. */
  aliasCandidateKeys: string[];
}

/** A suspicious near-match between two distinct groups — never auto-merged. */
export interface AmbiguousPair {
  a: string;
  b: string;
  reason: 'token-containment' | 'acronym-match';
}

/** Outcome of a backfill run (dry-run reports the same shape with would-* counters). */
export interface BackfillResult {
  dryRun: boolean;
  scanned: number;
  groups: OrgGroup[];
  /** groups whose normalized key did not resolve to an existing organization. */
  toCreate: { normalizedKey: string; displayName: string; opportunityCount: number }[];
  /** groups resolving to an existing organization via alias/name. */
  toConnect: { normalizedKey: string; organizationId: string; organizationName: string; opportunityCount: number }[];
  ambiguousPairs: AmbiguousPair[];
  connectedOpportunities: number;
  createdOrganizations: number;
  skippedConflicts: { normalizedKey: string; reason: string }[];
}
