import * as cheerio from 'cheerio';
import { classifyApplyUrl, isRealApplyLink, normalizeApplyUrl, FORM_URL_RE } from '../apply';
import { extractRealApplyLink, isApplyEmail } from '../apply-extract';
import { decodeProtectedEmails } from '../application-form';

/** Read only vacancy/application content supplied by the caller, never page footers. */
export function applicationDestination(html: string, sourceUrl: string): string | null {
  const $ = cheerio.load(html);
  decodeProtectedEmails($);
  $('script,style,nav,footer').remove();
  const candidates: Array<{ url: string; rank: number }> = [];
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href')?.trim();
    if (!href) return;
    let url: string;
    try { url = new URL(href, sourceUrl).href; } catch { return; }
    if (!isRealApplyLink(classifyApplyUrl(url, sourceUrl, sourceUrl))) return;
    if (/^mailto:/i.test(url)) {
      if (isApplyEmail(url.slice(7).split('?')[0])) candidates.push({ url, rank: 1 });
    } else if (FORM_URL_RE.test(url)) candidates.push({ url, rank: 0 });
    else if (/\b(apply|application|submit|register)\b/i.test($(element).text())) candidates.push({ url, rank: 2 });
  });
  // Dedicated submission fields may contain an unlinked email or portal URL.
  const text = $.root().text().trim();
  const exact = normalizeApplyUrl(text);
  if (exact && !/\s/.test(exact) && isRealApplyLink(classifyApplyUrl(exact, sourceUrl, sourceUrl)) &&
      (!exact.startsWith('mailto:') || isApplyEmail(exact.slice(7)))) candidates.push({ url: exact, rank: 2 });
  const fromText = extractRealApplyLink([text]);
  if (fromText && isRealApplyLink(classifyApplyUrl(fromText, sourceUrl, sourceUrl))) candidates.push({ url: fromText, rank: 3 });
  return candidates.sort((a, b) => a.rank - b.rank)[0]?.url || null;
}
