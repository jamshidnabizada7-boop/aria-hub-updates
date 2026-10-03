/**
 * Organization resolution (Phase 2): turn a free-text organization name into
 * the canonical Organization, creating one only when nothing resolves.
 *
 * Resolution path (deterministic, no fuzzy matching):
 *   1. normalizeOrgName(raw) → matching key
 *   2. exact OrganizationAlias.normalized lookup (covers curated aliases AND
 *      the canonical name itself — findOrCreateOrganization always registers
 *      the canonical name's key as the primary alias)
 *   3. miss → create (only when createIfMissing) with a deterministic slug
 */
import { slugify } from '../import/utils';
import { normalizeOrgName } from './normalize';
import type { OrgDbClient } from './types';

export interface ResolveResult {
  organization: { id: string; name: string; slug: string } | null;
  created: boolean;
  matchedVia: 'alias' | 'created' | null;
}

/** Deterministic slug for an organization display name ("UNICEF" → "unicef"). */
export function computeOrgSlug(name: string): string {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return 'organization';
  return slugify(trimmed, 60) || 'organization';
}

async function ensureUniqueOrgSlug(db: OrgDbClient, base: string): Promise<string> {
  let candidate = base;
  for (let i = 2; i < 100; i++) {
    const existing = await db.organization.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Resolve a display name to a canonical organization. Never merges on
 * similarity: only exact normalized-name/alias equality. When nothing
 * matches and createIfMissing is true, creates the organization and
 * registers the name's normalized key as its primary alias.
 */
export async function resolveOrganization(
  db: OrgDbClient,
  rawName: string,
  opts: { createIfMissing?: boolean } = {},
): Promise<ResolveResult> {
  const key = normalizeOrgName(rawName);
  if (!key) return { organization: null, created: false, matchedVia: null };

  const alias = await db.organizationAlias.findUnique({
    where: { normalized: key },
    include: { organization: true },
  });
  if (alias?.organization) {
    return {
      organization: {
        id: alias.organization.id,
        name: alias.organization.name,
        slug: alias.organization.slug,
      },
      created: false,
      matchedVia: 'alias',
    };
  }

  if (opts.createIfMissing === false) {
    return { organization: null, created: false, matchedVia: null };
  }

  const displayName = String(rawName).trim();
  const slug = await ensureUniqueOrgSlug(db, computeOrgSlug(displayName));
  const org = await db.organization.create({
    data: { name: displayName, slug },
  });
  // The canonical name's normalized key becomes the primary alias — this is
  // what makes every later lookup land on the same row.
  try {
    await db.organizationAlias.create({
      data: { organizationId: org.id, alias: displayName, normalized: key },
    });
  } catch {
    // Lost a race on the unique alias key: re-resolve instead of merging blind.
    const raced = await db.organizationAlias.findUnique({
      where: { normalized: key },
      include: { organization: true },
    });
    if (raced?.organization) {
      return {
        organization: {
          id: raced.organization.id,
          name: raced.organization.name,
          slug: raced.organization.slug,
        },
        created: false,
        matchedVia: 'alias',
      };
    }
    throw new Error(`organization alias race unresolved for key "${key}"`);
  }
  return { organization: { id: org.id, name: org.name, slug: org.slug }, created: true, matchedVia: 'created' };
}

/**
 * Look up without creating (used by reports and the import pipeline's
 * "is this organization already canonical?" check).
 */
export async function findOrganizationByName(db: OrgDbClient, rawName: string) {
  return (await resolveOrganization(db, rawName, { createIfMissing: false })).organization;
}
