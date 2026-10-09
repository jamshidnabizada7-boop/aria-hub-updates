/**
 * Apply-link classification — single source of truth for the public rule:
 *
 *   Users must NEVER be sent to the site the data was scraped from. The Apply
 *   button only appears for a real application destination: an email address,
 *   an application form, or a direct external application portal. When the
 *   only link available is the source article itself, the UI shows "How to
 *   apply" instructions instead.
 *
 * Used by the import orchestrator (persists applyUrlType) and the public
 * detail page (renders accordingly) so both always agree.
 */

/** URLs that are clearly an application form. */
export const FORM_URL_RE =
  /kobotoolbox|docs\.google\.com\/forms|forms\.gle|forms\.office|typeform|jotform|survey|webform|application.*form|apply.*form/i;

export type ApplyUrlType =
  | 'application_email'
  | 'application_phone'
  | 'application_form'
  | 'direct_application'
  | 'source_article_fallback'
  | 'unknown';

const BARE_EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/** Accept a verified email pasted into the admin field as well as mailto:email. */
export function normalizeApplyUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (BARE_EMAIL_RE.test(trimmed)) return `mailto:${trimmed}`;
  return trimmed;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/** TRUE when the link goes to a REAL application destination (button allowed). */
export function isRealApplyLink(applyUrlType: string | null | undefined): boolean {
  return (
    applyUrlType === 'application_email' ||
    applyUrlType === 'application_phone' ||
    applyUrlType === 'application_form' ||
    applyUrlType === 'direct_application'
  );
}

/**
 * Classify an apply URL. `sourceUrl`/`originalUrl` identify the site the
 * listing was scraped from — a link pointing there is a fallback, not a
 * direct application path.
 */
export function classifyApplyUrl(
  applyUrl: string | null | undefined,
  sourceUrl: string | null | undefined,
  originalUrl?: string | null,
): ApplyUrlType {
  const url = normalizeApplyUrl(applyUrl);
  if (!url) return 'unknown';
  if (/^tel:\+[1-9][0-9]{6,14}$/.test(url)) return 'application_phone';
  if (/^mailto:/i.test(url)) {
    const recipients = url.slice(7).split('?')[0].split(',').map((email) => email.trim()).filter(Boolean);
    return recipients.length > 0 && recipients.every((email) => BARE_EMAIL_RE.test(email))
      ? 'application_email' : 'unknown';
  }
  if (!/^https?:\/\//i.test(url)) return 'unknown';
  const applyHost = hostOf(url);
  if (!applyHost) return 'unknown';
  const sourceHosts = [sourceUrl, originalUrl]
    .map((u) => (u ? hostOf(u) : ''))
    .filter(Boolean);
  if (sourceHosts.includes(applyHost)) return 'source_article_fallback';
  if (FORM_URL_RE.test(url)) return 'application_form';
  return 'direct_application';
}

/** Allow a newly discovered real destination to replace an unusable stored one. */
export function shouldHealApplyLink(
  currentUrl: string | null | undefined,
  currentSource: string | null | undefined,
  currentOriginal: string | null | undefined,
  candidateUrl: string | null | undefined,
  candidateSource: string | null | undefined,
  candidateOriginal: string | null | undefined,
): boolean {
  return !isRealApplyLink(classifyApplyUrl(currentUrl, currentSource, currentOriginal)) &&
    isRealApplyLink(classifyApplyUrl(candidateUrl, candidateSource, candidateOriginal));
}
