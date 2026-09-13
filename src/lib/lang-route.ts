export const LANGS = ['en', 'fa', 'ps'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'fa';

const LANG_PREFIX_RE = /^\/(en|fa|ps)(\/|$)/;

export function isLang(code: string | undefined | null): code is Lang {
  return !!code && (LANGS as readonly string[]).includes(code);
}

/** Remove the leading /en|/fa|/ps segment from a pathname. */
export function stripLangPrefix(pathname: string): string {
  const m = pathname.match(LANG_PREFIX_RE);
  return m ? pathname.slice(m[0].length - 1) || '/' : pathname;
}

/** Re-prefix a pathname with the given language (replaces any existing lang prefix). */
export function withLangPrefix(lang: string, pathname: string): string {
  const stripped = stripLangPrefix(pathname);
  return `/${lang}${stripped === '/' ? '' : stripped}`;
}

/**
 * Prefix an internal (root-relative) href with the current language.
 * Leaves anchors (#...), external urls (http...), api/admin paths and
 * already-prefixed paths untouched.
 */
export function langHref(lang: string, href: string): string {
  if (!href.startsWith('/') || LANG_PREFIX_RE.test(href)) return href;
  // '/' (menu "Home") maps straight to the language root, no trailing slash.
  if (href === '/') return `/${lang}`;
  return `/${lang}${href}`;
}

/**
 * Heal corrupted language-prefixed paths before navigation.
 *
 * A historical router race produced doubled / mangled prefixes such as
 * `/fa/ena`, `/en/fa/opportunities` or `/fa/en`. This collapses any run of
 * lang-ish segments at the START of the path into the LAST valid lang seen,
 * so `sanitizeLangPath('fa', '/en/fa')` → '/fa' and a path like `/en/ena`
 * (a mangled 'en') heals to '/en'. Real route segments after the lang block
 * (e.g. '/fa/opportunities/x') are preserved untouched.
 */
export function sanitizeLangPath(lang: string, pathname: string): string {
  const segs = pathname.split('/').filter(Boolean);
  let i = 0;
  // Skip over the leading block of lang-ish segments (valid codes, or valid
  // codes with 1-2 stray trailing letters such as 'ena'), keeping the last
  // valid code encountered.
  let sawLang = false;
  while (i < segs.length) {
    const m = segs[i].match(/^(en|fa|ps)[a-z]{0,2}$/i);
    if (!m) break;
    if ((LANGS as readonly string[]).includes(m[1].toLowerCase())) lang = m[1].toLowerCase();
    sawLang = true;
    i++;
  }
  // A lang-ish run must be followed by a NON-lang segment or nothing.
  const rest = segs.slice(i);
  if (!sawLang) return pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `/${lang}${rest.length ? '/' + rest.join('/') : ''}`;
}
