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
 * - Existing records keep their publication state on scraper refresh.
 * - A new record with a known past deadline starts expired.
 */
export function resolveImportedOpportunityStatus({
  existingStatus = null,
  autoPublish,
  deadline = null,
  now = new Date(),
}: ImportedOpportunityStatusInput): OpportunityStatus {
  if (existingStatus) return existingStatus;
  if (deadline && deadline.getTime() < now.getTime()) return 'expired';
  return autoPublish ? 'published' : 'draft';
}
