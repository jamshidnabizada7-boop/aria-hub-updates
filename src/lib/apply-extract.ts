/**
 * Deterministic apply-link extraction from raw listing text.
 * Pure module (no AI/provider imports) so import-time pipeline, backfill
 * scripts and tests can all share the exact same logic.
 */
import type { RawListing } from './import/types';

/** Addresses that belong to the source site itself, not the employer. */
export const NON_APPLY_EMAILS = [
  'webinfo@acbar.org',
  'info@acbar.org',
  'acbar.org',
  'wazifaha.org',
  'scholarships.af',
  'o4af.com',
];

/** Bounce-only addresses can never receive an application. */
const NON_REPLY_PREFIXES = ['no-reply', 'noreply', 'donotreply', 'do-not-reply'];

/**
 * Full email match: every domain label is alnum+hyphen, so
 * "Intake@academy.rwth-aachen.de" is captured whole (the old one-dot regex
 * truncated such addresses at the hyphen).
 */
const EMAIL_RE = /[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

function isApplyEmail(email: string): boolean {
  const lower = email.toLowerCase();
  if (NON_APPLY_EMAILS.some((bad) => lower.includes(bad))) return false;
  if (NON_REPLY_PREFIXES.some((p) => lower.startsWith(p))) return false;
  return true;
}

const EXPLICIT_APPLY_URL_RE =
  /(?:apply|application|submit)[^\n]{0,80}(https?:\/\/[^\s)"'<>]+)/gi;

/**
 * Extract the best application link from listing text.
 * Priority: emails in guidelines > emails anywhere > form links >
 * explicit "apply at URL" > scraped applyUrl (last-resort fallback).
 */
export function extractApplyLink(listing: RawListing): string | null {
  const candidates: string[] = [];
  const guidelines = listing.guidelines || '';
  const description = typeof listing.description === 'string' ? listing.description : '';
  const haystacks = [guidelines, description, listing.requirements || ''];

  for (const text of haystacks) {
    const emailMatches = text.match(EMAIL_RE) || [];
    for (const email of emailMatches) {
      if (!isApplyEmail(email)) continue;
      if (!candidates.includes(`mailto:${email}`)) candidates.push(`mailto:${email}`);
    }
    if (candidates.length) break; // guidelines emails are enough
  }

  for (const text of haystacks) {
    const formMatches =
      text.match(/https?:\/\/(?:forms\.|docs\.google\.com\/forms\/|survey)[^\s)"'<>]+/gi) || [];
    for (const url of formMatches) {
      if (!candidates.includes(url)) candidates.push(url);
    }
  }

  for (const text of haystacks) {
    EXPLICIT_APPLY_URL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EXPLICIT_APPLY_URL_RE.exec(text)) !== null) {
      const url = m[1];
      if (!NON_APPLY_EMAILS.some((bad) => url.toLowerCase().includes(bad)) && !candidates.includes(url)) {
        candidates.push(url);
      }
    }
  }

  if (listing.applyUrl && !candidates.includes(listing.applyUrl)) {
    candidates.push(listing.applyUrl);
  }

  return candidates[0] || null;
}

/**
 * Extract only REAL application links (email / form / explicit "apply at")
 * from raw text — without the scraped-applyUrl fallback. Used to upgrade
 * records whose applyUrl currently points at the source article itself:
 * the public rule is that users are never sent to the scraped site.
 */
export function extractRealApplyLink(texts: Array<string | null | undefined>): string | null {
  for (const text of texts) {
    if (!text) continue;
    const emailMatches = text.match(EMAIL_RE) || [];
    for (const email of emailMatches) {
      if (!isApplyEmail(email)) continue;
      return `mailto:${email}`;
    }
  }
  for (const text of texts) {
    if (!text) continue;
    const formMatches =
      text.match(/https?:\/\/(?:forms\.|docs\.google\.com\/forms\/|survey)[^\s)"'<>]+/gi) || [];
    if (formMatches.length) return formMatches[0] ?? null;
  }
  for (const text of texts) {
    if (!text) continue;
    EXPLICIT_APPLY_URL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EXPLICIT_APPLY_URL_RE.exec(text)) !== null) {
      const url = m[1];
      if (!NON_APPLY_EMAILS.some((bad) => url.toLowerCase().includes(bad))) return url;
    }
  }
  return null;
}
