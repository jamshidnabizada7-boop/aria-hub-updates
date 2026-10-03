/**
 * Opportunity freshness & update detection (Phase 16).
 *
 * What may CHANGE after publication and how ARIA HUB reacts:
 *   deadline extended/changed, apply URL changed, location changed,
 *   requirements/salary/description updated → the update path already
 *   writes the new values; detectChanges() names them for the audit log.
 *
 * What may CLOSE an opportunity:
 *   ONLY an explicit machine signal from the source — a listing marked
 *   closed/expired/inactive in extractedData.listingStatus (official APIs
 *   can state this). A job merely DISAPPEARING from an HTML listing must
 *   never close anything: absence is not evidence (handled by design —
 *   nothing here ever closes on missing listings).
 */
import { normalizeForCompare } from './utils';
import { normalizeApplyUrl } from './canonical-resolver';
import type { RawListing } from './types';

export type FreshnessChange =
  | 'deadline-extended'
  | 'deadline-changed'
  | 'apply-url-changed'
  | 'location-changed'
  | 'requirements-changed'
  | 'salary-changed'
  | 'description-updated'
  | 'title-changed';

export const EXPLICIT_CLOSED_STATUSES = new Set(['closed', 'expired', 'inactive']);

/**
 * The source's EXPLICIT close signal, or null. Only extractedData.listingStatus
 * counts — title/description heuristics are deliberately NOT used here (they
 * misfire on "application deadline expired?" guidance text).
 */
export function explicitCloseStatus(listing: RawListing): 'expired' | null {
  const data = listing.extractedData as Record<string, unknown> | undefined;
  const status = typeof data?.listingStatus === 'string' ? data.listingStatus.trim().toLowerCase() : '';
  return EXPLICIT_CLOSED_STATUSES.has(status) ? 'expired' : null;
}

const dayKey = (d?: Date | null) => (d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null);

/** Compare the stored opportunity against the freshly-scraped listing. */
export function detectChanges(
  existing: {
    title: string; description: string; deadline?: Date | null;
    applyUrl?: string | null; salary?: string | null; country?: string | null;
    requirements?: string | null;
  },
  listing: RawListing,
): FreshnessChange[] {
  const changes: FreshnessChange[] = [];

  if (normalizeForCompare(existing.title) !== normalizeForCompare(listing.title ?? '')) {
    changes.push('title-changed');
  }

  const oldDeadline = dayKey(existing.deadline);
  const newDeadline = dayKey(listing.deadline ? new Date(listing.deadline) : null);
  if (oldDeadline !== newDeadline) {
    if (oldDeadline && newDeadline && newDeadline > oldDeadline) changes.push('deadline-extended');
    else changes.push('deadline-changed');
  }

  const oldApply = normalizeApplyUrl(existing.applyUrl);
  const newApply = normalizeApplyUrl(listing.applyUrl ?? null);
  if (oldApply !== newApply) changes.push('apply-url-changed');

  if (normalizeForCompare(existing.country ?? '') !== normalizeForCompare(listing.location ?? listing.country ?? '')) {
    changes.push('location-changed');
  }

  if (normalizeForCompare(existing.requirements ?? '') !== normalizeForCompare(listing.requirements ?? '')) {
    changes.push('requirements-changed');
  }

  if (normalizeForCompare(existing.salary ?? '') !== normalizeForCompare(listing.salary ?? '')) {
    changes.push('salary-changed');
  }

  if (normalizeForCompare((existing.description ?? '').slice(0, 2000)) !== normalizeForCompare((listing.description ?? '').slice(0, 2000))) {
    changes.push('description-updated');
  }

  return changes;
}
