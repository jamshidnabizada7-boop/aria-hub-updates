import type { OpportunityStatus } from '@prisma/client';

export interface ImportedOpportunityStatusInput {
  existingStatus?: OpportunityStatus | null;
  autoPublish: boolean;
  deadline?: Date | null;
  now?: Date;
}

/**
 * Resolve the status written by the import pipeline without letting a scraper
 * configuration silently demote an existing public record.
 *
 * Rules:
 * - New records follow the source's autoPublish policy.
 * - Existing published/draft/archived records keep their moderation state.
 * - Existing expired records are reactivated only when a trusted auto-publish
 *   source discovers that the deadline moved back into the future.
 * - A known past deadline always resolves to expired.
 */
export function resolveImportedOpportunityStatus({
  existingStatus = null,
  autoPublish,
  deadline = null,
  now = new Date(),
}: ImportedOpportunityStatusInput): OpportunityStatus {
  if (deadline && deadline.getTime() < now.getTime()) return 'expired';

  if (!existingStatus) return autoPublish ? 'published' : 'draft';

  if (existingStatus === 'archived') return 'archived';
  if (existingStatus === 'published') return 'published';
  if (existingStatus === 'draft') return 'draft';

  // Existing expired record whose source extended/removed the deadline.
  if (existingStatus === 'expired') {
    return autoPublish ? 'published' : 'expired';
  }

  return existingStatus;
}
