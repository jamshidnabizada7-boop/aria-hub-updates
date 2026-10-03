/**
 * Backfill engine (Phase 2): group free-text Opportunity.organization strings
 * into canonical organizations and connect them.
 *
 * Safety properties:
 *  - Grouping is by EXACT normalized key only. No fuzzy, no similarity merge.
 *  - Alias/acronym candidates and token-containment pairs are REPORTED, never
 *    applied (controlled alias rows are a curation decision).
 *  - Opportunity.organization (display string) is never modified.
 *  - Only opportunities whose organizationId is still null get connected, so
 *    re-runs are idempotent.
 */
import {
  normalizeOrgName,
  extractAliasCandidates,
  isAmbiguousPair,
  tokensOf,
} from './normalize';
import { resolveOrganization } from './resolve';
import type { OrgDbClient, OrgGroup, AmbiguousPair, BackfillResult } from './types';

/** Build normalized groups from raw (organization, id) rows. */
export function collectOrgGroups(
  rows: { id: string; organization: string | null }[],
): OrgGroup[] {
  const byKey = new Map<string, OrgGroup>();
  for (const row of rows) {
    const raw = (row.organization ?? '').trim();
    if (!raw) continue;
    const key = normalizeOrgName(raw);
    if (!key) continue;
    let group = byKey.get(key);
    if (!group) {
      group = {
        normalizedKey: key,
        displayNames: [],
        opportunityIds: [],
        aliasCandidates: [],
        aliasCandidateKeys: [],
      };
      byKey.set(key, group);
    }
    const seen = group.displayNames.find((d) => d.name === raw);
    if (seen) seen.count += 1;
    else group.displayNames.push({ name: raw, count: 1 });
    group.opportunityIds.push(row.id);
  }
  for (const group of byKey.values()) {
    const cands = new Set<string>();
    const candKeys = new Set<string>();
    for (const { name } of group.displayNames) {
      for (const c of extractAliasCandidates(name)) {
        cands.add(c);
        candKeys.add(normalizeOrgName(c));
      }
    }
    group.aliasCandidates = Array.from(cands).sort();
    group.aliasCandidateKeys = Array.from(candKeys).filter((k) => k && k !== group.normalizedKey).sort();
  }
  return Array.from(byKey.values()).sort(
    (a, b) => b.opportunityIds.length - a.opportunityIds.length || a.normalizedKey.localeCompare(b.normalizedKey),
  );
}

/** Review-only suspicious pairs between distinct groups. */
export function detectAmbiguousPairs(groups: OrgGroup[]): AmbiguousPair[] {
  const pairs: AmbiguousPair[] = [];
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const a = groups[i];
      const b = groups[j];
      // skip pairs already covered by an alias candidate on either side
      const reason = isAmbiguousPair(
        a.normalizedKey,
        b.normalizedKey,
        a.aliasCandidateKeys,
        b.aliasCandidateKeys,
      );
      if (reason) pairs.push({ a: a.normalizedKey, b: b.normalizedKey, reason });
    }
  }
  return pairs;
}

function primaryDisplayName(group: OrgGroup): string {
  return [...group.displayNames].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0].name;
}

/**
 * Run the backfill. With apply=false (default) it only reports; with
 * apply=true it creates organizations/aliases and connects still-unlinked
 * opportunities. The display string column is never touched.
 */
export async function runBackfill(
  db: OrgDbClient,
  opts: { apply?: boolean; limit?: number } = {},
): Promise<BackfillResult> {
  const apply = opts.apply === true;
  const rows = await db.opportunity.findMany({
    where: { organization: { not: null } },
    select: { id: true, organization: true },
  });
  const limited = opts.limit ? rows.slice(0, opts.limit) : rows;
  const groups = collectOrgGroups(limited);
  const ambiguousPairs = detectAmbiguousPairs(groups);

  const result: BackfillResult = {
    dryRun: !apply,
    scanned: limited.length,
    groups,
    toCreate: [],
    toConnect: [],
    ambiguousPairs,
    connectedOpportunities: 0,
    createdOrganizations: 0,
    skippedConflicts: [],
  };

  for (const group of groups) {
    let orgId: string | null = null;
    let orgName: string | null = null;
    let created = false;

    if (apply) {
      const resolved = await resolveOrganization(db, primaryDisplayName(group));
      if (!resolved.organization) {
        result.skippedConflicts.push({ normalizedKey: group.normalizedKey, reason: 'resolve returned null' });
        continue;
      }
      orgId = resolved.organization.id;
      orgName = resolved.organization.name;
      created = resolved.created;
    }

    const unlinked = await db.opportunity.findMany({
      where: { id: { in: group.opportunityIds }, organizationId: null },
      select: { id: true },
    });

    if (!apply) {
      // Dry-run: distinguish "would create" from "would connect to existing".
      // The existence check mirrors resolveOrganization's lookup.
      const alias = await db.organizationAlias.findUnique({ where: { normalized: group.normalizedKey } });
      if (alias) {
        const org = await db.organization.findUnique({ where: { id: alias.organizationId } });
        if (org) {
          result.toConnect.push({
            normalizedKey: group.normalizedKey,
            organizationId: org.id,
            organizationName: org.name,
            opportunityCount: unlinked.length,
          });
          continue;
        }
      }
      result.toCreate.push({
        normalizedKey: group.normalizedKey,
        displayName: primaryDisplayName(group),
        opportunityCount: unlinked.length,
      });
      continue;
    }

    if (created) result.createdOrganizations += 1;
    result.toConnect.push({
      normalizedKey: group.normalizedKey,
      organizationId: orgId!,
      organizationName: orgName!,
      opportunityCount: unlinked.length,
    });

    if (unlinked.length) {
      const res = await db.opportunity.updateMany({
        where: { id: { in: unlinked.map((u: { id: string }) => u.id) } },
        data: { organizationId: orgId! },
      });
      result.connectedOpportunities += res.count ?? 0;
    }
  }

  return result;
}

/** Token containment / acronym check exposed for script reporting reuse. */
export { isAmbiguousPair, tokensOf };
