/**
 * Duplicate detection and content hashing.
 *
 * Before publishing a listing, the orchestrator checks:
 *   1. sourceUrl  (exact match — fastest)
 *   2. contentHash (sha256 of normalized key fields)
 *   3. title + organization fuzzy match (normalized, trimmed)
 *
 * If a match is found and contentHash matches → skip (duplicate, no change).
 * If a match is found but contentHash differs → update in place.
 * If no match → create new.
 */

import type { PrismaClient } from '@prisma/client';
import { sha256, normalizeForCompare } from './utils';
import type { RawListing } from './types';

/** The fields we hash to detect content changes. */
function hashPayload(listing: RawListing): string {
  const parts = [
    listing.sourceUrl,
    listing.title,
    listing.organization || '',
    listing.deadline || '',
    (listing.description || '').slice(0, 500),
  ];
  return parts.join('|');
}

/** Compute a deterministic sha256 hex string for a listing. */
export async function computeHash(listing: RawListing): Promise<string> {
  return sha256(hashPayload(listing));
}

export type DedupeResult =
  | { action: 'skip'; existing: { id: string; reason: string } }
  | { action: 'update'; existing: { id: string; reason: string }; changed: boolean }
  | { action: 'create'; existing: null };

/**
 * Check if a listing already exists in the database.
 * Returns a DedupeResult indicating what to do.
 */
export async function findExisting(
  db: PrismaClient,
  listing: RawListing,
  incomingHash: string,
): Promise<DedupeResult> {
  // 1. Exact sourceUrl match
  const byUrl = listing.sourceUrl
    ? await db.opportunity.findFirst({ where: { sourceUrl: listing.sourceUrl } })
    : null;

  if (byUrl) {
    const changed = byUrl.contentHash !== incomingHash;
    return {
      action: 'update',
      existing: { id: byUrl.id, reason: 'sourceUrl match' },
      changed,
    };
  }

  // 2. contentHash match (in case sourceUrl changed)
  const byHash = incomingHash
    ? await db.opportunity.findFirst({ where: { contentHash: incomingHash } })
    : null;

  if (byHash) {
    return {
      action: 'skip',
      existing: { id: byHash.id, reason: 'contentHash match' },
    };
  }

  // 3. Fuzzy title + organization match
  // Query at the DB level using title contains so this scales to any table size.
  // A take:50 limit here was the original bug — with 261+ rows most matches were invisible.
  const normTitle = normalizeForCompare(listing.title);
  const normOrg = normalizeForCompare(listing.organization);
  if (normTitle) {
    const candidates = await db.opportunity.findMany({
      where: {
        status: { in: ['published', 'draft'] },
        // Use a broad DB-side filter: title contains the first significant word
        title: { contains: listing.title.split(' ').slice(0, 3).join(' '), mode: 'insensitive' },
      },
      select: { id: true, title: true, organization: true, contentHash: true },
      take: 200, // reasonable upper bound after DB-side filter narrows results
    });
    for (const c of candidates) {
      if (normalizeForCompare(c.title) === normTitle) {
        // Organization matches too (or both are null)?
        if (!normOrg || !c.organization || normalizeForCompare(c.organization) === normOrg) {
          const changed = c.contentHash !== incomingHash;
          return {
            action: 'update',
            existing: { id: c.id, reason: 'fuzzy title+org match' },
            changed,
          };
        }
      }
    }
  }

  return { action: 'create', existing: null };
}

/**
 * Quick check: has the content of an existing opportunity changed compared
 * to the incoming hash?
 */
export function hasChanged(existingHash: string | null, incomingHash: string): boolean {
  return existingHash !== incomingHash;
}
