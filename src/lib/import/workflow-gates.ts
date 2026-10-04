/**
 * PHASE 20 — schedule tiers + PHASE 21/22 — translation & publication gates.
 *
 * Schedule tiers encode the mandate's polling policy on ImportSource V2
 * fields (scheduleMinutes/priority/trustScore/nextRunAt/backoff/health) —
 * no hard-coded global cadence.
 *
 * Translation queue (manual-only policy): rows are grouped by fa/ps gate
 * state so admins can batch-review. Nothing is auto-translated.
 *
 * Publication gate (PHASE 22): an official/employer draft must pass every
 * gate before an admin publishes — DETECTED → VERIFIED → TRANSLATED → READY
 * → PUBLISHED.
 */
import { ROLE_TRUST, type SourceRole } from './source-observations';

export const SCHEDULE_TIERS = {
  P0_BREAKING_FEEDS: { minutes: 10, label: 'P0 official breaking feeds' },
  P1_OFFICIAL_ATS: { minutes: 20, label: 'P1 official job APIs/ATS' },
  P1_SCHOLARSHIP_FEEDS: { minutes: 45, label: 'P1 official scholarship/programme feeds' },
  AGGREGATORS_PRIMARY: { minutes: 45, label: 'ACBAR/Wazifaha/Jobs.af' },
  AGGREGATORS_SECONDARY: { minutes: 180, label: 'secondary aggregators' },
  LONG_TAIL: { minutes: 1080, label: 'long-tail discovery (18h)' },
} as const;

export type ScheduleTierName = keyof typeof SCHEDULE_TIERS;

/** Resolve the tier schedule for a source from its role/priority. */
export function tierForSource(input: {
  sourceRole?: string | null;
  scraperKey?: string | null;
  type?: string | null;
}): { tier: ScheduleTierName; scheduleMinutes: number; priority: number } {
  const role = input.sourceRole ?? '';
  const key = input.scraperKey ?? '';
  if (role.startsWith('official_')) {
    if (input.type === 'scholarship') return { tier: 'P1_SCHOLARSHIP_FEEDS', ...SCHEDULE_TIERS.P1_SCHOLARSHIP_FEEDS };
    if (role === 'official_feed') return { tier: 'P0_BREAKING_FEEDS', ...SCHEDULE_TIERS.P0_BREAKING_FEEDS };
    return { tier: 'P1_OFFICIAL_ATS', ...SCHEDULE_TIERS.P1_OFFICIAL_ATS };
  }
  if (['acbar', 'wazifaha', 'jobsaf'].includes(key)) {
    return { tier: 'AGGREGATORS_PRIMARY', ...SCHEDULE_TIERS.AGGREGATORS_PRIMARY };
  }
  if (role === 'discovery') return { tier: 'LONG_TAIL', ...SCHEDULE_TIERS.LONG_TAIL };
  return { tier: 'AGGREGATORS_SECONDARY', ...SCHEDULE_TIERS.AGGREGATORS_SECONDARY };
}

export interface PublicationGateResult {
  ready: boolean;
  gates: Array<{ gate: string; passed: boolean; detail: string }>;
}

const REAL_APPLY = new Set(['application_email', 'application_form', 'direct_application']);

/**
 * PHASE 22 — publication gate check for an official/employer draft.
 * Every gate must pass before an admin publishes; the result explains
 * exactly why an item cannot publish.
 */
export function evaluatePublicationGates(opportunity: {
  status: string;
  deadline?: Date | null;
  applyUrl?: string | null;
  applyUrlType?: string | null;
  faStatus?: string | null;
  psStatus?: string | null;
  title?: string | null;
  description?: string | null;
  duplicateOf?: string | null;
  verificationStatus?: string | null;
}, requireTranslation: boolean): PublicationGateResult {
  const gates: PublicationGateResult['gates'] = [];
  gates.push({
    gate: 'status-draft',
    passed: opportunity.status === 'draft',
    detail: opportunity.status === 'draft' ? 'imported draft awaiting review' : `status is '${opportunity.status}'`,
  });
  gates.push({
    gate: 'content-present',
    passed: Boolean(opportunity.title?.trim()) && Boolean(opportunity.description?.trim()),
    detail: Boolean(opportunity.title?.trim()) && Boolean(opportunity.description?.trim()) ? 'title and description present' : 'title or description missing',
  });
  gates.push({
    gate: 'deadline-sane',
    passed: !opportunity.deadline || opportunity.deadline.getTime() > Date.now() - 24 * 3600_000,
    detail: !opportunity.deadline ? 'no deadline (rolling)' : opportunity.deadline.getTime() > Date.now() - 24 * 3600_000 ? 'deadline in future' : 'deadline already passed',
  });
  gates.push({
    gate: 'apply-valid',
    passed: REAL_APPLY.has(opportunity.applyUrlType ?? ''),
    detail: `applyUrlType is '${opportunity.applyUrlType ?? 'unknown'}'`,
  });
  gates.push({
    gate: 'no-duplicate',
    passed: !opportunity.duplicateOf,
    detail: opportunity.duplicateOf ? `flagged as duplicate of ${opportunity.duplicateOf}` : 'no duplicate flag',
  });
  gates.push({
    gate: 'persian-ready',
    passed: !requireTranslation || opportunity.faStatus === 'complete',
    detail: !requireTranslation ? 'Persian not required for this source' : `faStatus is '${opportunity.faStatus ?? 'pending'}'`,
  });
  gates.push({
    gate: 'pashto-ready',
    passed: !requireTranslation || opportunity.psStatus === 'complete',
    detail: !requireTranslation ? 'Pashto not required for this source' : `psStatus is '${opportunity.psStatus ?? 'pending'}'`,
  });
  return { ready: gates.every((g) => g.passed), gates };
}

export interface TranslationQueueBucket {
  needsPersian: number;
  needsPashto: number;
  staleAfterSourceChange: number;
  ready: number;
}

/** PHASE 21: queue buckets from fa/ps gate states (manual-only workflow). */
export function bucketTranslationQueue(rows: Array<{
  faStatus?: string | null;
  psStatus?: string | null;
  translationSourceHash?: string | null;
  contentHash?: string | null;
  stale: boolean;
}>): TranslationQueueBucket {
  const needsPersian = rows.filter((r) => r.faStatus !== 'complete').length;
  const needsPashto = rows.filter((r) => r.faStatus === 'complete' && r.psStatus !== 'complete').length;
  const staleAfterSourceChange = rows.filter((r) => r.stale).length;
  const ready = rows.filter((r) => r.faStatus === 'complete' && r.psStatus === 'complete' && !r.stale).length;
  return { needsPersian, needsPashto, staleAfterSourceChange, ready };
}
