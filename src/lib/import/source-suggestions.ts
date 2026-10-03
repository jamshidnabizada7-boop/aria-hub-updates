/**
 * Source suggestion engine (Phase 21) — every aggregator becomes a tool for
 * discovering potential DIRECT sources.
 *
 * When an import carries an organization that is NOT canonicalized yet AND
 * has plausible domain evidence (an apply email/URL domain that isn't an
 * aggregator or mail provider), one suggestion row per normalized org name
 * is kept. Repeats raise `occurrences`. An admin then confirms (→ linked to
 * an Organization, add a source next) or dismisses.
 */
import { normalizeOrgName } from '../organizations/normalize';
import { domainFromEmail, domainFromUrl, plausibleOfficialDomains } from '../organizations/domains';
import { resolveOrganization } from '../organizations/resolve';
import { NON_APPLY_EMAILS } from '../apply-extract';

export interface SuggestionInput {
  displayName: string;
  applyUrl?: string | null;
  applyEmail?: string | null;
  website?: string | null;
  sampleSourceUrl?: string | null;
  sampleSourceName?: string | null;
}

type SuggestionDb = {
  organizationSourceSuggestion: {
    findUnique: (a: any) => Promise<any>;
    create: (a: any) => Promise<any>;
    update: (a: any) => Promise<any>;
  };
};

/**
 * Record a suggestion for an unresolved organization. Returns
 * 'created' | 'updated' | 'skipped-canonical' | 'skipped-no-evidence'.
 */
export async function recordSuggestion(
  db: SuggestionDb & Parameters<typeof resolveOrganization>[0],
  input: SuggestionInput,
): Promise<'created' | 'updated' | 'skipped-canonical' | 'skipped-no-evidence'> {
  const displayName = String(input.displayName ?? '').trim();
  const key = normalizeOrgName(displayName);
  if (!key) return 'skipped-no-evidence';

  // already canonical → nothing to suggest
  const existingOrg = await resolveOrganization(db, displayName, { createIfMissing: false });
  if (existingOrg.organization) return 'skipped-canonical';

  // gather evidence domains from every URL/email hint the listing carries
  const domains = plausibleOfficialDomains([
    domainFromUrl(input.applyUrl),
    domainFromUrl(input.website),
    domainFromEmail(input.applyEmail ?? null),
  ]).filter((d) => !NON_APPLY_EMAILS.includes(d));
  // an email is only evidence when its DOMAIN is plausible — jobs@acbar.org
  // must never become a suggestion
  const emailDomain = domainFromEmail(input.applyEmail ?? null);
  const emails = input.applyEmail && emailDomain && domains.includes(emailDomain)
    ? [String(input.applyEmail).trim().toLowerCase()]
    : [];
  if (!domains.length && !emails.length) return 'skipped-no-evidence';

  const existing = await db.organizationSourceSuggestion.findUnique({ where: { suggestedName: key } });
  if (existing) {
    if (existing.status !== 'pending') return 'updated'; // already reviewed — leave the verdict
    const mergedDomains = Array.from(new Set([...(((existing.evidenceDomains as string[]) ?? [])), ...domains]));
    const mergedEmails = Array.from(new Set([...(((existing.evidenceEmails as string[]) ?? [])), ...emails]));
    await db.organizationSourceSuggestion.update({
      where: { suggestedName: key },
      data: {
        occurrences: { increment: 1 },
        evidenceDomains: mergedDomains,
        evidenceEmails: mergedEmails,
        sampleSourceUrl: input.sampleSourceUrl ?? existing.sampleSourceUrl,
        sampleSourceName: input.sampleSourceName ?? existing.sampleSourceName,
      },
    });
    return 'updated';
  }

  await db.organizationSourceSuggestion.create({
    data: {
      suggestedName: key,
      displayName,
      evidenceDomains: domains,
      evidenceEmails: emails,
      sampleSourceUrl: input.sampleSourceUrl ?? null,
      sampleSourceName: input.sampleSourceName ?? null,
    },
  });
  return 'created';
}

export async function listSuggestions(db: { organizationSourceSuggestion: { findMany: (a: any) => Promise<any[]> } }, status = 'pending', take = 100): Promise<any[]> {
  return db.organizationSourceSuggestion.findMany({
    where: { status },
    orderBy: [{ occurrences: 'desc' }, { createdAt: 'desc' }],
    take,
    include: { organization: { select: { name: true, slug: true } } },
  });
}

/** Admin confirms: link (or create) the canonical organization. */
export async function confirmSuggestion(
  db: Parameters<typeof recordSuggestion>[0] & {
    organizationSourceSuggestion: { findUnique: (a: any) => Promise<any>; findMany: (a: any) => Promise<any[]>; create: (a: any) => Promise<any>; update: (a: any) => Promise<any> };
    auditLog?: { create: (a: any) => Promise<any> };
  },
  suggestionId: string,
  adminEmail: string,
  overrideName?: string,
): Promise<{ organizationId: string; created: boolean }> {
  const suggestion = await db.organizationSourceSuggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion) throw new Error('Suggestion not found.');
  if (suggestion.organizationId) {
    await db.organizationSourceSuggestion.update({ where: { id: suggestionId }, data: { status: 'confirmed', reviewedBy: adminEmail, reviewedAt: new Date() } });
    return { organizationId: suggestion.organizationId, created: false };
  }
  const name = String(overrideName ?? '').trim() || suggestion.displayName;
  const resolved = await resolveOrganization(db, name);
  if (!resolved.organization) throw new Error('Could not resolve the organization name.');
  await db.organizationSourceSuggestion.update({
    where: { id: suggestionId },
    data: { status: 'confirmed', organizationId: resolved.organization.id, reviewedBy: adminEmail, reviewedAt: new Date() },
  });
  await db.auditLog?.create?.({
    data: { entity: 'organization_source_suggestion', entityId: suggestionId, action: 'suggestion.confirm', details: JSON.stringify({ by: adminEmail, organizationId: resolved.organization.id }) },
  }).catch(() => null);
  return { organizationId: resolved.organization.id, created: resolved.created };
}

/** Admin dismisses: the candidate is rejected (kept for audit). */
export async function dismissSuggestion(
  db: { organizationSourceSuggestion: { findUnique: (a: any) => Promise<any>; update: (a: any) => Promise<any> }; auditLog?: { create: (a: any) => Promise<any> } },
  suggestionId: string,
  adminEmail: string,
): Promise<void> {
  const suggestion = await db.organizationSourceSuggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion) throw new Error('Suggestion not found.');
  await db.organizationSourceSuggestion.update({
    where: { id: suggestionId },
    data: { status: 'dismissed', reviewedBy: adminEmail, reviewedAt: new Date() },
  });
  await db.auditLog?.create?.({
    data: { entity: 'organization_source_suggestion', entityId: suggestionId, action: 'suggestion.dismiss', details: JSON.stringify({ by: adminEmail }) },
  }).catch(() => null);
}
