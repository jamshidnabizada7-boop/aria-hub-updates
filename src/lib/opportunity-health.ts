import { classifyApplyUrl, isRealApplyLink } from './apply';

export type HealthIssue = 'apply' | 'core' | 'evidence' | 'translation';

export interface HealthOpportunity {
  id: string;
  title: string;
  sourceName: string | null;
  sourceUrl: string | null;
  originalUrl: string | null;
  applyUrl: string | null;
  categoryId: string | null;
  country: string | null;
  eligibility: string | null;
  educationReq: string | null;
  experience: string | null;
  requirements: string | null;
  extractedData: unknown;
  faStatus: string | null;
  psStatus: string | null;
}

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

const ELIGIBILITY_KEY = /nationalit|citizenship|eligible|education|degree|experience|field.?of.?study|study.?field|minimum.?age|maximum.?age|age.?limit|language.?require|funding.?type|visa.?sponsor/i;

function hasExtractedEligibility(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value as Record<string, unknown>).some(([key, item]) =>
    (ELIGIBILITY_KEY.test(key) && (hasText(item) || (Array.isArray(item) && item.length > 0))) ||
    hasExtractedEligibility(item));
}

export function opportunityHealth(row: HealthOpportunity) {
  const applyType = classifyApplyUrl(row.applyUrl, row.sourceUrl, row.originalUrl);
  const missing: string[] = [];
  if (!row.categoryId) missing.push('category');
  if (!hasText(row.country)) missing.push('country');
  const hasExtracted = hasExtractedEligibility(row.extractedData);
  const evidenceCount = [row.eligibility, row.educationReq, row.experience, row.requirements].filter(hasText).length + Number(hasExtracted);
  if (evidenceCount === 0) missing.push('eligibility evidence');
  return {
    applyType,
    hasRealApply: isRealApplyLink(applyType),
    coreReady: !!row.categoryId && hasText(row.country),
    evidenceCount,
    missing,
    translationComplete: row.faStatus === 'complete' && row.psStatus === 'complete',
  };
}

export function matchesHealthIssue(row: HealthOpportunity, issue: HealthIssue) {
  const health = opportunityHealth(row);
  if (issue === 'apply') return !health.hasRealApply;
  if (issue === 'core') return !health.coreReady;
  if (issue === 'evidence') return health.evidenceCount === 0 || !health.coreReady;
  return !health.translationComplete;
}
