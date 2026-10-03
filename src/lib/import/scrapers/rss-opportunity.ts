/**
 * RSS / Atom opportunity-feed adapter (Phase 7).
 *
 * For organizations that expose their vacancies as a feed:
 *
 * config: {
 *   "listUrl": "https://example.org/jobs/feed",   // defaults to baseUrl
 *   "detailFetch": false
 * }
 *
 * Handles RSS 2.0 (`<item>`) and Atom (`<entry>`) with namespaced tags
 * (content:encoded, atom:link). Deadlines are only taken from explicit
 * "Deadline: …" text in the item body — never invented. The feed's link
 * becomes sourceUrl; applyUrl is left empty so the Apply Destination
 * Resolver classifies what the detail page offers (official feeds usually
 * link to their own apply pages → direct_application).
 */
import * as cheerio from 'cheerio';
import { BaseScraper } from '../base-scraper';
import { parseDate, sanitizeListingFragment, stripHtml } from '../utils';
import type { RawListing, ScrapePage } from '../types';

const DEADLINE_RE = /deadline[^:\n]{0,30}[:\-]\s*([^.\n<]{3,60})/i;

export class RssOpportunityScraper extends BaseScraper {
  protected parseListPage(xml: string, pageUrl: string): ScrapePage {
    const $ = cheerio.load(xml, { xmlMode: true });
    const listings: RawListing[] = [];

    const nodes = [...$('item').toArray(), ...$('entry').toArray()];
    for (const node of nodes) {
      const item = $(node);

      const title = item.children('title').first().text().trim();
      if (!title) continue;

      // RSS: <link>text</link>; Atom: <link href="…" rel="alternate">
      let link = item.children('link').first().text().trim();
      if (!link) link = item.children('link').first().attr('href')?.trim() || '';
      const selfLink = item.children('link').filter((_i, l) => $(l).attr('rel') === 'alternate').attr('href');
      if (!link && selfLink) link = selfLink;
      if (!link || !/^https?:/i.test(link)) continue;
      const url = link;

      const published = (item.children('pubDate').first().text() ||
        item.children('published').first().text() ||
        item.children('updated').first().text()).trim();

      let body = item.children('description').first().text() ||
        item.children('summary').first().text();
      if (!body) {
        // namespaced <content:encoded> / <content>
        body = item.contents().filter((_i, c) => /content(:encoded)?/i.test((c as any).tagName || '')).text() || '';
      }
      const text = stripHtml(body).replace(/\s+\n/g, '\n').trim();

      let deadline: string | undefined;
      const m = text.match(DEADLINE_RE);
      if (m) deadline = parseDate(m[1].trim()) || undefined;

      listings.push({
        title,
        location: undefined,
        deadline,
        publishedDate: published || undefined,
        description: text || undefined,
        sourceUrl: url,
        originalUrl: url,
        sourceName: this.source.name,
        extractedData: { adapter: 'rssOpportunity' },
      });
    }

    return { listings, nextPage: null };
  }

  public async parseDetail(listing: RawListing): Promise<RawListing> {
    const cfg = this.source.config as Record<string, unknown>;
    if (cfg.detailFetch === false || !listing.sourceUrl) return listing;
    try {
      const html = await this.fetchText(listing.sourceUrl);
      const $ = cheerio.load(html);
      const main = $('article').first().length
        ? $('article').first()
        : ($('main').first().length ? $('main').first() : $('body').first());
      const text = sanitizeListingFragment(main.html() || '');
      if (text) {
        const plain = text.replace(/<[^>]+>/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
        if (plain.length > (listing.description?.length ?? 0)) {
          listing.description = plain;
        }
      }
      // detail page may reveal the deadline explicitly
      const pageText = $('body').text();
      const m = pageText.match(DEADLINE_RE);
      if (m && !listing.deadline) listing.deadline = parseDate(m[1].trim()) || undefined;
    } catch {
      // enrichment only
    }
    return listing;
  }
}
