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
 * - Public queries independently hide records whose deadlines have passed.
 */
export function resolveImportedOpportunityStatus({
  existingStatus = null,
  autoPublish,
}: ImportedOpportunityStatusInput): OpportunityStatus {
  if (existingStatus) return existingStatus;
  return autoPublish ? 'published' : 'draft';
}
