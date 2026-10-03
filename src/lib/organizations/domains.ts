/**
 * Domain helpers for organization identity (Phase 2).
 *
 * Used to collect `Organization.officialDomains` evidence and, in later
 * phases, to verify that an apply URL genuinely belongs to the organization.
 * Pure string logic — no network access, no db.
 */

/** Domains that must never be recorded as an organization's official domain. */
export const NON_OFFICIAL_DOMAINS = new Set([
  // aggregators / discovery sources
  'acbar.org', 'wazifaha.org', 'o4af.com', 'scholarships.af', 'jobs.af',
  'reliefweb.int', 'myariahub.com', 'ariahub.com',
  // mail providers and placeholder hosts
  'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'mail.ru', 'icloud.com', 'protonmail.com', 'aol.com', 'live.com',
  'example.com', 'example.org', 'example.net', 'localhost',
]);

/** Two-part public suffixes we care about (kept small and purposeful). */
const TWO_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au',
  'co.jp', 'or.jp', 'ne.jp', 'com.af', 'org.af', 'edu.af', 'gov.af',
  'com.pk', 'org.pk', 'edu.pk', 'gov.pk', 'co.in', 'org.in', 'gov.in',
  'com.tr', 'org.tr', 'com.br', 'com.cn', 'com.my', 'co.nz', 'org.nz',
]);

/** Lowercase host: strips scheme/path if a URL was passed, www., port, dot. */
export function normalizeDomain(input?: string | null): string {
  if (!input) return '';
  let s = String(input).trim().toLowerCase();
  if (s.includes('://')) {
    try {
      s = new URL(s).hostname;
    } catch {
      return '';
    }
  }
  return s
    .replace(/^[a-z0-9-]+:\/\//, '')
    .replace(/^www\./, '')
    .replace(/:\d+.*$/, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '')
    .trim();
}

/** Registrable root: last two labels, or three for known two-part suffixes. */
export function registrableDomain(host?: string | null): string {
  const h = normalizeDomain(host);
  if (!h || !h.includes('.')) return h;
  const labels = h.split('.');
  const lastTwo = labels.slice(-2).join('.');
  if (TWO_PART_SUFFIXES.has(lastTwo) && labels.length >= 3) {
    return labels.slice(-3).join('.');
  }
  return lastTwo;
}

/** Domain of an http(s) URL, or '' when the URL is malformed/non-http. */
export function domainFromUrl(url?: string | null): string {
  if (!url) return '';
  try {
    const u = new URL(String(url).trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return normalizeDomain(u.hostname);
  } catch {
    return '';
  }
}

/** Domain of an email address, or '' when it does not look like an email. */
export function domainFromEmail(email?: string | null): string {
  const s = String(email ?? '').trim().toLowerCase();
  const m = s.match(/^[^@\s]+@([^@\s]+)$/);
  return m ? normalizeDomain(m[1]) : '';
}

/** True when host and base are the same site or host is a subdomain of base. */
export function isSubdomainOf(host?: string | null, base?: string | null): boolean {
  const h = normalizeDomain(host);
  const b = normalizeDomain(base);
  if (!h || !b) return false;
  return h === b || h.endsWith(`.${b}`);
}

/**
 * Filter a set of candidate domains down to plausible official-domain
 * evidence: drops empty/aggregator/mail-provider/localhost/IP-shaped hosts.
 */
export function plausibleOfficialDomains(candidates: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const c of candidates) {
    const d = normalizeDomain(c);
    if (!d || !d.includes('.')) continue;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(d) || d === 'localhost') continue;
    if (NON_OFFICIAL_DOMAINS.has(d)) continue;
    if (NON_OFFICIAL_DOMAINS.has(registrableDomain(d))) continue;
    out.add(d);
  }
  return Array.from(out).sort();
}
