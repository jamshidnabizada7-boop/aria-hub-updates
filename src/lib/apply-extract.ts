/**
 * Deterministic apply-link extraction from raw listing text.
 * Pure module (no AI/provider imports) so import-time pipeline, backfill
 * scripts and tests can all share the exact same logic.
 */
import type { RawListing } from './import/types';
import { registrableDomain } from './organizations/domains';

/** Domains that belong to source/aggregator sites, not employers. */
export const NON_APPLY_EMAILS = [
  'webinfo@acbar.org',
  'info@acbar.org',
  'acbar.org',
  'wazifaha.org',
  'scholarships.af',
  'o4af.com',
  'jobs.af',
];

/** Bounce-only addresses can never receive an application. */
const NON_REPLY_PREFIXES = ['no-reply', 'noreply', 'donotreply', 'do-not-reply'];

/**
 * Full email match: every domain label is alnum+hyphen, so
 * "Intake@academy.rwth-aachen.de" is captured whole (the old one-dot regex
 * truncated such addresses at the hyphen).
 */
const EMAIL_RE = /[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

/**
 * Blacklist check by REGISTRABLE DOMAIN, not substring: "webinfo@acbar.org"
 * is rejected, while an unrelated "jobs@acbar.org.af" (or any org whose name
 * merely contains an aggregator string) is accepted. The full addresses in
 * NON_APPLY_EMAILS keep their exact-match meaning.
 */
export function isApplyEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  const localPart = lower.split('@')[0] ?? '';
  if (NON_APPLY_EMAILS.includes(lower)) return false;
  if (NON_REPLY_PREFIXES.some((p) => localPart.startsWith(p))) return false;
  const domain = lower.split('@')[1] ?? '';
  if (!domain) return false;
  const root = registrableDomain(domain) || domain;
  if (NON_APPLY_EMAILS.includes(root)) return false;
  if (NON_APPLY_EMAILS.includes(domain)) return false;
  return true;
}

const EXPLICIT_APPLY_URL_RE =
  /(?:apply|application|submit)[^\n]{0,80}(https?:\/\/[^\s)"'<>]+)/gi;

/**
 * Form-host candidates in listing text: forms.<host> covers Google Forms and
 * any subdomain-style form host; the explicit list catches Typeform, Jotform,
 * KoboToolbox, MS Forms and SurveyMonkey, which the old pattern missed.
 */
const FORM_URL_TEXT_RE =
  /https?:\/\/(?:forms\.|docs\.google\.com\/forms\/|survey|typeform\.com\/(?:to|[^/\s]+)\/|jotform(?:eu)?\.com\/|kobotoolbox\.org\/|forms\.office\.com\/|forms\.gle\/)[^\s)"'<>]+/gi;

/** URLs that must never be presented as an application destination. */
function isBlacklistedUrl(url: string): boolean {
  const lower = url.toLowerCase();
  try {
    const host = new URL(lower).hostname;
    const root = registrableDomain(host) || host;
    return NON_APPLY_EMAILS.slice(2).some((bad) => root === bad || host === bad);
  } catch {
    return NON_APPLY_EMAILS.some((bad) => lower.includes(bad));
  }
}

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
    FORM_URL_TEXT_RE.lastIndex = 0;
    const formMatches = text.match(FORM_URL_TEXT_RE) || [];
    for (const url of formMatches) {
      if (!candidates.includes(url)) candidates.push(url);
    }
  }

  for (const text of haystacks) {
    EXPLICIT_APPLY_URL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EXPLICIT_APPLY_URL_RE.exec(text)) !== null) {
      const url = m[1];
      if (!isBlacklistedUrl(url) && !candidates.includes(url)) {
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
    FORM_URL_TEXT_RE.lastIndex = 0;
    const formMatches = text.match(FORM_URL_TEXT_RE) || [];
    if (formMatches.length) return formMatches[0] ?? null;
  }
  for (const text of texts) {
    if (!text) continue;
    EXPLICIT_APPLY_URL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EXPLICIT_APPLY_URL_RE.exec(text)) !== null) {
      const url = m[1];
      if (!isBlacklistedUrl(url)) return url;
    }
  }
  return null;
}
