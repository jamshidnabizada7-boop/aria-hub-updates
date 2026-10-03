/**
 * Generic official-careers HTML adapter (Phase 7).
 *
 * Lets a new official source be added with ZERO code — just an ImportSource
 * row with `scraperKey: 'officialHtml'` and a selector config:
 *
 * config: {
 *   "listUrl": "https://careers.example.org/vacancies",   // defaults to baseUrl
 *   "detailFetch": true,
 *   "selectors": {
 *     "card":           "li.vacancy",
 *     "title":          "h3",
 *     "url":            "a.vacancy-link",
 *     "organization":   ".employer",      // optional
 *     "location":       ".loc",           // optional
 *     "deadline":       ".deadline",      // optional
 *     "apply":          "a.apply",        // optional (href or mailto:)
 *     "description":    ".body",          // detail page (optional)
 *     "requirements":   ".reqs",          // detail page (optional)
 *     "responsibilities": ".resp"         // detail page (optional)
 *   },
 *   "nextPageSelector": "a.next"          // optional pagination
 * }
 *
 * Everything normalizes into the existing RawListing pipeline (dedupe →
 * images → AI → translation), exactly like the hand-written scrapers.
 */
import * as cheerio from 'cheerio';
import { BaseScraper } from '../base-scraper';
import { parseDate, sanitizeListingFragment, stripHtml } from '../utils';
import type { RawListing, ScrapePage } from '../types';

interface Selectors {
  card?: string;
  title?: string;
  url?: string;
  organization?: string;
  location?: string;
  deadline?: string;
  apply?: string;
  description?: string;
  requirements?: string;
  responsibilities?: string;
}

function textOf($: cheerio.CheerioAPI, el: any, sel?: string): string {
  if (!el || !sel) return ''; // optional selectors stay empty — never the whole card
  const target = $(el).find(sel).first();
  return target.text().replace(/\s+/g, ' ').trim();
}

function hrefOf($: cheerio.CheerioAPI, el: any, sel?: string): string {
  if (!el) return '';
  const target = sel ? $(el).find(sel).first() : $(el);
  const href = target.attr('href') || target.find('a[href]').first().attr('href') || '';
  return href.trim();
}

function absolute(url: string, base: string): string {
  if (!url) return '';
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

export class OfficialHtmlScraper extends BaseScraper {
  private selectors(): Selectors {
    const cfg = this.source.config as Record<string, unknown>;
    return ((cfg.selectors ?? {}) as Selectors) ?? {};
  }

  protected parseListPage(html: string, pageUrl: string): ScrapePage {
    const sel = this.selectors();
    if (!sel.card) throw new Error('officialHtml: config.selectors.card is required');
    const $ = cheerio.load(html);
    const listings: RawListing[] = [];

    $(sel.card).each((_, el) => {
      const card = el;
      const title = textOf($, card, sel.title);
      const href = hrefOf($, card, sel.url);
      const url = absolute(href, pageUrl);
      if (!title || !url || !/^https?:/i.test(url)) return;

      const applyHref = hrefOf($, card, sel.apply);
      const apply = applyHref
        ? (applyHref.startsWith('mailto:') ? applyHref : absolute(applyHref, pageUrl))
        : undefined;
      const location = textOf($, card, sel.location) || undefined;
      const deadline = parseDate(textOf($, card, sel.deadline)) || undefined;
      const organization = textOf($, card, sel.organization) || undefined;

      listings.push({
        title,
        organization: organization || this.source.name,
        location,
        deadline,
        applyUrl: apply,
        sourceUrl: url,
        originalUrl: url,
        sourceName: this.source.name,
        extractedData: { adapter: 'officialHtml' },
      });
    });

    let nextPage: string | null = null;
    const cfg = this.source.config as Record<string, unknown>;
    if (typeof cfg.nextPageSelector === 'string' && cfg.nextPageSelector) {
      const nextHref = $(cfg.nextPageSelector).first().attr('href');
      if (nextHref) nextPage = absolute(nextHref, pageUrl);
    }
    return { listings, nextPage };
  }

  public async parseDetail(listing: RawListing): Promise<RawListing> {
    const cfg = this.source.config as Record<string, unknown>;
    const sel = this.selectors();
    if (cfg.detailFetch === false || !listing.sourceUrl) return listing;
    let html: string;
    try {
      html = await this.fetchText(listing.sourceUrl);
    } catch {
      return listing; // detail is enrichment — never fail the listing over it
    }
    const $ = cheerio.load(html);
    const pick = (selector?: string): string | undefined => {
      if (!selector) return undefined;
      const el = $(selector).first();
      if (!el.length) return undefined;
      const fragment = sanitizeListingFragment(el.html() || '');
      const text = stripHtml(fragment).replace(/\n{3,}/g, '\n\n').trim();
      return text || undefined;
    };
    const description = pick(sel.description);
    const requirements = pick(sel.requirements);
    const responsibilities = pick(sel.responsibilities);
      const deadline = parseDate(textOf($, $('body').get(0), sel.deadline)) || listing.deadline;
    return {
      ...listing,
      description: description || listing.description,
      requirements: requirements || listing.requirements,
      responsibilities: responsibilities || listing.responsibilities,
      deadline,
    };
  }
}
