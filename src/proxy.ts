import { NextRequest, NextResponse } from 'next/server';

const LANGS = ['en', 'fa', 'ps'];
const COOKIE_NAME = 'aria-lang';
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Next 16: the `middleware` convention was renamed to `proxy` — same
 * signature, same matcher config.
 *
 * Parse an Accept-Language header and return the first supported language
 * (ordered by q-value). fa/fa-IR -> fa, ps/ps-AF -> ps, en/en-US -> en.
 */
function matchAcceptLanguage(header: string | null): string | null {
  if (!header) return null;
  const parsed = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      let q = 1;
      for (const p of params) {
        const [k, v] = p.trim().split('=');
        if (k === 'q') {
          const n = Number.parseFloat(v);
          if (!Number.isNaN(n)) q = n;
        }
      }
      return { tag: tag.trim().toLowerCase(), q };
    })
    .filter((p) => p.tag && p.tag !== '*')
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parsed) {
    const base = tag.split('-')[0];
    if (LANGS.includes(base)) return base;
  }
  return null;
}

/** Build a copy of the request headers with `aria-lang` forced to `value`. */
function headersWithLangCookie(req: NextRequest, value: string): Headers {
  const headers = new Headers(req.headers);
  const existing = headers.get('cookie') || '';
  const cleaned = existing
    .split(';')
    .map((c) => c.trim())
    .filter((c) => c && !c.startsWith(`${COOKIE_NAME}=`))
    .join('; ');
  headers.set('cookie', cleaned ? `${cleaned}; ${COOKIE_NAME}=${value}` : `${COOKIE_NAME}=${value}`);
  return headers;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip anything that looks like a static file (last path segment has an extension).
  const lastSegment = pathname.split('/').pop() || '';
  if (lastSegment.includes('.')) {
    return NextResponse.next();
  }

  const segment = pathname.split('/')[1];

  // Heal corrupted double/mangled language prefixes (e.g. /fa/ena, /en/fa,
  // /fa/en/opportunities) produced by an old router race. Collapse the leading
  // run of lang-ish segments to the last valid lang and redirect.
  if (LANGS.includes(segment)) {
    const segs = pathname.split('/').filter(Boolean);
    let heal: string | null = null;
    if (segs.length >= 2 && /^(en|fa|ps)[a-z]{0,2}$/i.test(segs[1])) {
      // Second segment is another lang-ish block → find the last valid one.
      let i = 1;
      let lang = segs[0];
      while (i < segs.length) {
        const m = segs[i].match(/^(en|fa|ps)[a-z]{0,2}$/i);
        if (!m) break;
        if (LANGS.includes(m[1])) lang = m[1];
        i++;
      }
      heal = `/${lang}${segs.length > i ? '/' + segs.slice(i).join('/') : ''}`;
    }
    const res = NextResponse.next({
      request: { headers: headersWithLangCookie(req, heal ? (heal.split('/')[1] as string) : segment) },
    });
    if (heal) {
      const url = req.nextUrl.clone();
      url.pathname = heal;
      const redirect = NextResponse.redirect(url, 308);
      redirect.cookies.set(COOKIE_NAME, heal.split('/')[1], { path: '/', maxAge: ONE_YEAR, sameSite: 'lax' });
      return redirect;
    }
    res.cookies.set(COOKIE_NAME, segment, {
      path: '/',
      maxAge: ONE_YEAR,
      sameSite: 'lax',
    });
    return res;
  }

  // No language prefix: pick one (cookie > Accept-Language > site default fa)
  // and redirect, preserving the query string.
  // Return 308 Permanent Redirect so search engine bots and crawlers properly
  // transfer PageRank and don't flag temporary (307) redirects.
  const cookieLang = req.cookies.get(COOKIE_NAME)?.value;
  const hasUserCookie = LANGS.includes(cookieLang ?? '');
  const lang = hasUserCookie
    ? cookieLang
    : (matchAcceptLanguage(req.headers.get('accept-language') ?? '') ?? 'fa');

  const url = req.nextUrl.clone();
  url.pathname = `/${lang}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Exclude API routes, Next internals, admin, and well-known static files (llms\.txt, llms-full\.txt).
  matcher: [
    '/((?!api|_next|admin|robots\\.txt|sitemap\\.xml|ads\\.txt|llms\\.txt|llms-full\\.txt|images|uploads|favicon\\.ico|_rsc|__nextjs).*)',
  ],
};
