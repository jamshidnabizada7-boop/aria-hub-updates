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
  | 'application_form'
  | 'direct_application'
  | 'source_article_fallback'
  | 'unknown';

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
  if (!applyUrl || !applyUrl.trim()) return 'unknown';
  const url = applyUrl.trim();
  if (/^mailto:/i.test(url)) return 'application_email';
  if (FORM_URL_RE.test(url)) return 'application_form';
  const applyHost = hostOf(url);
  if (!applyHost) return 'unknown';
  const sourceHosts = [sourceUrl, originalUrl]
    .map((u) => (u ? hostOf(u) : ''))
    .filter(Boolean);
  if (sourceHosts.includes(applyHost)) return 'source_article_fallback';
  return 'direct_application';
}
