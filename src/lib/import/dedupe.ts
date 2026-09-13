/**
 * Duplicate detection and content hashing.
 *
 * Before publishing a listing, the orchestrator checks:
 *   1. sourceUrl  (exact match — now backed by a DB unique constraint)
 *   2. contentHash (sha256 of normalized key fields)
 *   3. title + organization fuzzy match, SCOPED TO THE SAME SOURCE
 *      (cross-source look-alikes must not hijack each other's rows)
 *
 * The stored contentHash is the POST-ENRICHMENT hash (computed after the
 * detail page filled in real deadlines/descriptions), so source-side edits
 * register as changes on the next import.
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
  | {
      action: 'update';
      existing: { id: string; reason: string; contentHash: string | null; lastChecked: Date | null };
    }
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
  // 1. Exact sourceUrl match (unique constraint makes this race-proof).
  const byUrl = listing.sourceUrl
    ? await db.opportunity.findUnique({ where: { sourceUrl: listing.sourceUrl } })
    : null;

  if (byUrl) {
    return {
      action: 'update',
      existing: {
        id: byUrl.id,
        reason: 'sourceUrl match',
        contentHash: byUrl.contentHash,
        lastChecked: byUrl.lastChecked,
      },
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

  // 3. Fuzzy title + organization match — same source only. Without the
  //    sourceName scope, two aggregators carrying the same scholarship fought
  //    over one row, silently flipping its attribution on every run.
  const normTitle = normalizeForCompare(listing.title);
  const normOrg = normalizeForCompare(listing.organization);
  if (normTitle) {
    const candidates = await db.opportunity.findMany({
      where: {
        status: { in: ['published', 'draft'] },
        sourceName: listing.sourceName,
        // Broad DB-side filter: title contains the first significant words
        title: { contains: listing.title.split(' ').slice(0, 3).join(' '), mode: 'insensitive' },
      },
      select: { id: true, title: true, organization: true, contentHash: true, lastChecked: true },
      take: 200, // reasonable upper bound after DB-side filter narrows results
    });
    for (const c of candidates) {
      if (normalizeForCompare(c.title) === normTitle) {
        // Organization matches too (or both are null)?
        if (!normOrg || !c.organization || normalizeForCompare(c.organization) === normOrg) {
          return {
            action: 'update',
            existing: {
              id: c.id,
              reason: 'fuzzy title+org match (same source)',
              contentHash: c.contentHash,
              lastChecked: c.lastChecked,
            },
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
