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
import { decodeProtectedEmails, embeddedApplicationForms } from '@/lib/application-form';
import { normalizeCountry } from '@/lib/geo/provinces';

interface Selectors {
  card?: string;
  title?: string;
  url?: string;
  organization?: string;
  location?: string;
  country?: string;
  deadline?: string;
  apply?: string;
  description?: string;
  requirements?: string;
  responsibilities?: string;
  eligibility?: string;
  benefits?: string;
  guidelines?: string;
  experience?: string;
  educationReq?: string;
  salary?: string;
}

function textOf($: cheerio.CheerioAPI, el: any, sel?: string): string {
  if (!el || !sel) return ''; // optional selectors stay empty — never the whole card
  const target = $(el).find(sel).first();
  const copy = target.clone(); copy.find('.material-icons,svg').remove();
  return copy.text().replace(/\s+/g, ' ').trim();
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
    } catch (error) {
      if (cfg.requireDetail === true) throw error;
      return listing; // detail is enrichment — never fail the listing over it
    }
    const $ = cheerio.load(html);
    decodeProtectedEmails($);
    const pick = (selector?: string): string | undefined => {
      if (!selector) return undefined;
      const elements = $(selector);
      if (!elements.length) return undefined;
      const text = elements.toArray().map(element => {
        const copy = $(element).clone();
        copy.find('script,style,form,nav,footer').remove();
        // Keep public document/application URLs that plain-text conversion used to lose.
        copy.find('a[href]').each((_, anchor) => {
          try {
            const url = new URL($(anchor).attr('href')!, listing.sourceUrl);
            if (url.protocol === 'mailto:') $(anchor).text(url.pathname);
            else if (/^https?:$/.test(url.protocol)) $(anchor).text(`${$(anchor).text().trim()} (${url.href})`);
          } catch { /* Ignore malformed links. */ }
        });
        return stripHtml(sanitizeListingFragment(copy.html() || '')).trim();
      }).filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
      return text || undefined;
    };
    const result = { ...listing };
    const found = new Set<string>();
    for (const field of ['description','requirements','responsibilities','eligibility','benefits','guidelines','experience','educationReq','salary'] as const) {
      const value = pick(sel[field]);
      if (value) found.add(field);
      result[field] = value || listing[field];
    }
    const forms = embeddedApplicationForms($, listing.sourceUrl);
    if (forms[0]) { result.applyUrl = forms[0].url; result.verifiedApplicationFormUrl = forms[0].url; }
    else {
      const candidate = hrefOf($, $('body').get(0), sel.apply);
      if (candidate) result.applyUrl = absolute(candidate, listing.sourceUrl);
    }
    result.location = textOf($, $('body').get(0), sel.location) || listing.location;
    result.country = normalizeCountry(textOf($, $('body').get(0), sel.country).replace(/\s+-\s+[A-Z]{2,3}$/, '')) || listing.country;
    result.deadline = parseDate(textOf($, $('body').get(0), sel.deadline)) || listing.deadline;
    const required = Array.isArray(cfg.requiredDetailFields) ? cfg.requiredDetailFields : [];
    for (const field of required) {
      if (typeof field === 'string' && !found.has(field)) throw new Error(`incomplete-detail: missing ${field}`);
    }
    return result;
  }
}
