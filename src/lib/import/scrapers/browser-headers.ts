/**
 * Browser-fingerprint request headers + bot-protection detection.
 *
 * Several sources (acbar.org, scholarships.af) sit behind JS interstitial
 * bot-protection (Imunify360 / "One moment, please…" pages). Live testing
 * showed that a plain User-Agent is NOT enough — the full browser header
 * fingerprint (Sec-Fetch-*, sec-ch-ua, Accept-Encoding…) is what passes:
 *
 *   curl with UA only                          → challenge page (200)
 *   curl with UA + full Sec-Fetch/sec-ch-ua set → real markup (200)
 *
 * Scrapers for protected sites override `fetchText()` and merge the result of
 * `browserHeaders(referer)` into every request, plus pass `notChallengePage`
 * as the `validate` option so 200-status challenge pages are retried instead
 * of being parsed as (empty) listing pages.
 */

/** Clean desktop Chrome UA — no bot suffix (unlike utils.DEFAULT_USER_AGENT). */
export const CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Build a complete browser-like header set for a GET navigation request,
 * as sent by desktop Chrome when following a link on `referer`.
 */
export function browserHeaders(referer: string): Record<string, string> {
  return {
    'User-Agent': CHROME_USER_AGENT,
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,' +
      'image/avif,image/webp,image/apng,*/*;q=0.8,application/xml+rss;entries=0.5',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    Referer: referer,
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  };
}

/**
 * Detect a bot-protection challenge page. These interstitials answer with
 * HTTP 200 but contain a `window.location.reload()` timer instead of content:
 *
 *   <title>One moment, please...</title>
 *   <script> setTimeout(function(){ window.location.reload(); }, 5000); </script>
 *
 * Also matches Imunify360 JSON/text denial bodies and Cloudflare "Just a
 * moment…" pages. Real content (job lists, XML sitemaps) never matches.
 */
export function isChallengePage(body: string): boolean {
  if (!body) return false;
  const head = body.slice(0, 4000); // interstitials are tiny; check the top
  if (/One moment, please|Just a moment|Attention Required/i.test(head)) return true;
  if (/Access denied by Imunify360/i.test(body)) return true;
  if (
    /<title>\s*One moment/i.test(head) ||
    (head.includes('window.location.reload()') && head.includes('setTimeout') && body.length < 20000)
  ) {
    return true;
  }
  return false;
}

/** Inverse of `isChallengePage` — used as the `validate` fetch option. */
export function notChallengePage(body: string): boolean {
  return !isChallengePage(body);
}
