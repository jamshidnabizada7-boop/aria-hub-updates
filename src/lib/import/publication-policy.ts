import type { OpportunityStatus } from '@prisma/client';

/**
 * Publication policy for imported opportunities.
 *
 * Existing rows keep their current editorial/publication state. A scraper
 * refresh is content maintenance, not a moderation decision, so it must never
 * silently demote a published row to draft (or revive an expired/archived row).
 *
 * autoPublish applies only when the importer is creating a brand-new row.
 */
export function resolveImportedOpportunityStatus(
  existingStatus: OpportunityStatus | null | undefined,
  autoPublish: boolean,
): OpportunityStatus {
  if (existingStatus) return existingStatus;
  return autoPublish ? 'published' : 'draft';
}
