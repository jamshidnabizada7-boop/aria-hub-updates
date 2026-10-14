/**
 * Legacy one-page anchors → real routes.
 *
 * The original seed wrote `#anchor` URLs (derived from labels) into MenuItem
 * and FooterLink rows. The homepage only renders a few matching DOM ids, so
 * most of these navigated nowhere useful. resolveAnchorUrl maps any legacy
 * anchor to the page route that actually serves that content; real URLs pass
 * through untouched. Kept as a runtime fallback so rows that predate the
 * repaired seed still render working links.
 */
const ANCHOR_ROUTES: Record<string, string> = {
  home: '/',
  aboutus: '/about',
  contact: '/contact',
  services: '/services',
  visas: '/visas',
  opportunities: '/opportunities',
  promote: '/advertise',
  payments: '/#payments',
  gallery: '/gallery',
  jobs: '/opportunities?category=job',
  scholarships: '/opportunities?category=scholarship',
  internships: '/opportunities?category=internship',
  conferences: '/opportunities?category=conference',
  exchangeprograms: '/opportunities?category=exchange-program',
  businesssetup: '/services',
  legalservices: '/services',
  'visa&travel': '/visas',
  translation: '/services',
  consulting: '/services',
};

export function resolveAnchorUrl(
  url: string | null | undefined,
  label?: string | null
): string {
  if (!url) return '/';
  if (!url.startsWith('#')) return url;
  const key = url.slice(1).trim().toLowerCase().replace(/\s+/g, '');
  if (ANCHOR_ROUTES[key]) return ANCHOR_ROUTES[key];
  // A few legacy rows stored the raw label where a slugified anchor was expected.
  const labelKey = (label ?? '').trim().toLowerCase().replace(/\s+/g, '');
  return ANCHOR_ROUTES[labelKey] ?? url;
}
