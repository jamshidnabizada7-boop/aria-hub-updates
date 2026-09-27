/**
 * Wazifaha Job Scraper
 *
 * Source: https://www.wazifaha.org/jobs/
 * Method:  HTML scraping via cheerio (no public API).
 *
 * List page structure:
 *   - `.wz-browse-link[href="/jobs/ID/slug"]` → individual listing links
 *   - `a[href*="page=N"]` → pagination
 *
 * Detail page structure:
 *   - `.wz-hero-title` → job title
 *   - `.wz-hero-org a` → organization name
 *   - `.wz-hero-logo img[src]` → organization logo
 *   - `.wz-pill` → quick info pills (job type, deadline, gender)
 *   - `.wz-details-grid .wz-grid-item` → label-value pairs
 *     (.wz-grid-label → field name, .wz-grid-value → field value)
 *   - `.wz-content-card .wz-section-body` → description body (HTML)
 *   - `a[href*="/jobs/apply/"]` → apply link
 */

import * as cheerio from 'cheerio';
import { BaseScraper } from '../base-scraper';
import {
  resolveUrl,
  stripHtml,
  parseDate,
  cleanHtmlWhitespace,
  normalizeForCompare,
  sanitizeListingFragment,
  stripTextJunk,
} from '../utils';
import type { RawListing, ScrapePage } from '../types';

// ─── Section routing helpers ─────────────────────────────────────────────────
// Wazifaha wraps content in section cards, but the important subsections
// ("Duties and Responsibilities", "Job Requirements", …) often live INSIDE a
// generic "Job Description" card as heading-like lines. We route every body
// through a heading-aware splitter so each part lands in its proper column.

type ColumnKind =
  | 'requirements'
  | 'responsibilities'
  | 'eligibility'
  | 'benefits'
  | 'guidelines'
  | 'description';

/** Classify a section or sub-section heading into a listing column. */
function headingKind(text: string): ColumnKind | null {
  const h = text.toLowerCase().trim();
  if (!h) return null;
  if (/(job\s+)?requirements?\b|qualifications?\b/.test(h)) return 'requirements';
  if (/responsib|\bduties?\b|\brole\b/.test(h)) return 'responsibilities';
  if (/eligib|criteria/.test(h)) return 'eligibility';
  if (/benefit|compensation|allowance|stipend/.test(h)) return 'benefits';
  if (/submission|guideline|how to apply|application (process|procedure)|^apply\b|apply (online|via|through)/.test(h))
    return 'guidelines';
  if (/^job description$|^job overview$|^description$|^about\b/.test(h)) return 'description';
  return null;
}

interface SubSection {
  heading: string | null;
  html: string;
}

/**
 * Split a section body on heading-like children: real h1-h6 tags, or a
 * p/strong/b whose entire text is one short heading-like line. Bullet and
 * numbered lines never count as headings. Returns ordered fragments; the
 * intro before the first heading has heading=null.
 */
function splitBySubHeadings(bodyHtml: string): SubSection[] {
  const $ = cheerio.load(`<div id="wz-split-root">${bodyHtml}</div>`);
  const root = $('#wz-split-root');
  const parts: SubSection[] = [];
  let current: SubSection = { heading: null, html: '' };

  const headingTextOf = (el: ReturnType<typeof $>): string | null => {
    const node = el.get(0) as { tagName?: string } | undefined;
    const tag = (node?.tagName || '').toLowerCase();
    let text = '';
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      text = el.text();
    } else if (['strong', 'b'].includes(tag)) {
      text = el.text();
    } else if (tag === 'p' || tag === 'label' || tag === 'span') {
      const inner = el.find('strong,b').first().text().replace(/\s+/g, ' ').trim();
      const full = el.text().replace(/\s+/g, ' ').trim();
      // Only when the strong text IS the whole paragraph (a heading line).
      if (inner && inner === full) text = full;
    }
    text = (text || '').replace(/\s+/g, ' ').trim().replace(/[:：]\s*$/, '');
    if (!text || text.length > 90) return null;
    if (/[.!?:;،؛]$/.test(text)) return null;
    if (/^[•·*‣▪●○—–-]\s/.test(text)) return null;
    if (/^\d+[.)]\s/.test(text)) return null;
    if (!/[A-Za-z\u0600-\u06FF]/.test(text)) return null;
    if (text.split(/\s+/).length > 9) return null;
    return text;
  };

  const flush = () => {
    if (current.html.trim()) parts.push({ heading: current.heading, html: current.html.trim() });
    current = { heading: null, html: '' };
  };

  root.contents().each((_, node) => {
    const el = $(node);
    if ((node as unknown as { type?: string }).type === 'text') {
      const t = el.text().trim();
      if (t) current.html += `<p>${t}</p>`;
      return;
    }
    const h = headingTextOf(el);
    if (h) {
      flush();
      current.heading = h;
      return;
    }
    current.html += $.html(node) || '';
  });
  flush();
  return parts;
}

/**
 * Second-pass splitter for run-on bodies: wazifaha often packs a whole job
 * ad into ONE <p> with <br>-separated lines ("<strong>Key
 * Objectives</strong><br>• …<br>Duties and Responsibilities<br>• …"). Split
 * on <br>/block-end boundaries and start a new group at any line that is
 * itself a known section heading (short, punctuation-free, keyword match).
 */
function splitByHeadingLines(bodyHtml: string): SubSection[] {
  const lines = bodyHtml
    .split(/<br\s*\/?>|<\/p>|<\/li>|<\/h[1-6]>|<\/div>/i)
    .map((l) => stripHtml(l).replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const parts: SubSection[] = [];
  let current: SubSection = { heading: null, html: '' };
  const flush = () => {
    if (current.html.trim()) parts.push({ heading: current.heading, html: current.html.trim() });
    current = { heading: null, html: '' };
  };

  for (const line of lines) {
    const kind = headingKind(line);
    const isHeading =
      kind !== null &&
      line.length <= 60 &&
      !/[.!?]$/.test(line) &&
      !/\d/.test(line) &&
      !line.includes('@') &&
      line.split(/\s+/).length <= 8;
    if (isHeading) {
      flush();
      current.heading = line;
      continue;
    }
    current.html += (current.html ? '<br>' : '') + line;
  }
  flush();
  return parts;
}

export class WazifahaScraper extends BaseScraper {
  constructor(source: any) {
    super(source);
    // Ensure we scrape all wazifaha pages (Wazifaha has many pages, override default 10 to 50)
    if (!this.source.config) this.source.config = {};
    if (!this.source.config.maxPages) this.source.config.maxPages = 50;
  }

  /** Parse the job listing list page. Returns titles + URLs, paginates. */
  protected async parseListPage(html: string, pageUrl: string): Promise<ScrapePage> {
    const $ = cheerio.load(html);
    const listings: RawListing[] = [];

    // Each job link: <a class="wz-job-name d-none d-md-block" href="/jobs/ID/slug">
    // We use .d-none.d-md-block to avoid grabbing the duplicate mobile links.
    // The enclosing .wz-job card also carries the org name and location, which
    // we extract so listings are useful even without a detail-page fetch.
    $('a.wz-job-name.d-none.d-md-block').each(function () {
      const href = $(this).attr('href');
      if (!href || !/\/jobs\/\d+/.test(href)) return;

      const fullUrl = resolveUrl(href, pageUrl);
      if (!fullUrl) return;

      const card = $(this).closest('.wz-job');
      // The org meta item holds two anchors (mobile + desktop variants) with
      // identical text — take just the first to avoid "Org Org" duplicates.
      const organization =
        card
          .find('.wz-job-meta-item')
          .has('i.fa-building')
          .first()
          .find('a')
          .first()
          .text()
          .replace(/\s+/g, ' ')
          .trim() || null;
      const location =
        card
          .find('.wz-job-meta-item')
          .has('i.fa-location-dot')
          .first()
          .text()
          .replace(/\s+/g, ' ')
          .trim() || null;

      listings.push({
        title: $(this).text().trim(),
        sourceUrl: fullUrl,
        originalUrl: fullUrl,
        sourceName: 'Wazifaha',
        sourceLanguage: 'en',
        jobType: 'job',
        organization,
        location,
        country: 'Afghanistan',
      });
    });

    // Pagination: find the maximum page number
    let nextPage: string | null = null;
    let maxPage = 0;
    $('a[href*="page="]').each(function () {
      const href = $(this).attr('href') || '';
      const match = href.match(/[?&]page=(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxPage) maxPage = num;
      }
    });

    // Determine current page number
    const currentPageMatch = pageUrl.match(/[?&]page=(\d+)/);
    const currentPage = currentPageMatch ? parseInt(currentPageMatch[1], 10) : 1;

    if (maxPage > currentPage) {
      nextPage = resolveUrl(`?page=${currentPage + 1}`, pageUrl);
    }

    return { listings, nextPage };
  }

  /** Fetch the detail page and extract full listing data. */
  public async parseDetail(listing: RawListing): Promise<RawListing> {
    try {
      const html = await this.fetchText(listing.sourceUrl);
      const $ = cheerio.load(html);

      // Title
      listing.title = this.text($('.wz-hero-title').first()) || listing.title;

      // Organization
      listing.organization = this.text($('.wz-hero-org a').first()) || null;

      // Logo
      const logoSrc = $('.wz-hero-logo img').first().attr('src');
      listing.logoUrl = logoSrc ? resolveUrl(logoSrc, listing.sourceUrl) : null;

      // Featured image — use logo as featured if no other image
      if (!listing.imageUrl && listing.logoUrl) {
        listing.imageUrl = listing.logoUrl;
      }

      // Extract all label-value pairs from the details grid
      const gridValues = this.extractGrid($);

      listing.location = gridValues.Location || null;
      listing.country = this.guessCountry(gridValues.Location) || listing.country || null;
      listing.deadline =
        parseDate(gridValues['Closing Date']) ||
        parseDate(gridValues['Deadline']) ||
        parseDate(gridValues['Application Deadline']) ||
        null;
      listing.salary = gridValues.Salary || null;
      listing.experience = gridValues.Experience || null;
      listing.educationReq = gridValues.Education || null;
      listing.category = gridValues.Category || null;
      listing.jobType = gridValues['Employment Type'] || listing.jobType;
      
      // Store ALL extracted fields for future reference (Nationality, Vacancy Number, Gender, City, etc.)
      listing.extractedData = { ...gridValues, detailLevel: 'full' };

      // Apply link
      const applyHref = $('a[href*="/jobs/apply/"]').first().attr('href');
      listing.applyUrl = applyHref ? resolveUrl(applyHref, listing.sourceUrl) : null;

      // Also check for external apply links in the content
      if (!listing.applyUrl) {
        const externalLink = this.findExternalApplyLink($);
        listing.applyUrl = externalLink;
      }

      // Description and specific sections. Each card body is routed by its
      // section heading; generic bodies are split on heading-like lines so
      // embedded subsections ("Duties and Responsibilities", …) land in the
      // right column instead of being buried in the description.
      const descParts: string[] = [];
      $('.wz-content-card .wz-section-body').each((_, el) => {
        const heading = $(el).prev('.wz-section-heading').text().trim();
        const body = $(el).html() || '';
        if (!body.trim()) return;
        this.routeBody(heading, body, listing, descParts);
      });

      if (descParts.length) {
        listing.description = cleanHtmlWhitespace(sanitizeListingFragment(descParts.join('\n\n')));
      }

      return listing;
    } catch (e) {
      // Return the partial listing from the list page
      console.error(`[wazifaha] detail parse error for ${listing.sourceUrl}:`, e);
      return listing;
    }
  }

  /** Route one section body into listing columns or the description. */
  private routeBody(heading: string, bodyHtml: string, listing: RawListing, descParts: string[]): void {
    const kind = headingKind(heading);
    if (kind && kind !== 'description') {
      this.appendColumn(listing, kind, bodyHtml);
      return;
    }

    for (const part of splitBySubHeadings(bodyHtml)) {
      if (!part.html.trim()) continue;
      const subKind = part.heading ? headingKind(part.heading) : 'description';
      if (subKind && subKind !== 'description') {
        this.appendColumn(listing, subKind, part.html);
        continue;
      }
      // Generic body — run the line-level splitter for run-on paragraphs.
      const groups = splitByHeadingLines(part.html);
      const routed = groups.some((g) => g.heading && headingKind(g.heading) !== 'description');
      if (!routed) {
        if (part.heading && !/^(job description|job overview|description)$/i.test(part.heading)) {
          descParts.push(`<h3>${part.heading}</h3>\n${part.html}`);
        } else {
          descParts.push(part.html);
        }
        continue;
      }
      for (const g of groups) {
        if (!g.html.trim()) continue;
        const gKind = g.heading ? headingKind(g.heading) : 'description';
        if (gKind && gKind !== 'description') {
          this.appendColumn(listing, gKind, g.html);
        } else if (g.heading) {
          descParts.push(`<h3>${g.heading}</h3>\n${g.html}`);
        } else {
          descParts.push(g.html);
        }
      }
    }
  }

  /** Append a routed body to a text column, deduping repeated content. */
  private appendColumn(
    listing: RawListing,
    kind: Exclude<ColumnKind, 'description'>,
    bodyHtml: string,
  ): void {
    const text = stripTextJunk(stripHtml(bodyHtml)).trim();
    if (!text) return;
    const existing = (listing[kind] as string | null | undefined) || '';
    const existingNorm = normalizeForCompare(existing);
    const textNorm = normalizeForCompare(text);
    if (!existingNorm) {
      listing[kind] = text;
    } else if (existingNorm === textNorm) {
      return;
    } else if (textNorm.includes(existingNorm)) {
      listing[kind] = text; // the new version is a superset — keep it
    } else if (!textNorm.includes(existingNorm)) {
      listing[kind] = `${existing}\n\n${text}`;
    }
  }

  /** Extract all label-value pairs from `.wz-details-grid .wz-grid-item`. */
  private extractGrid($: cheerio.CheerioAPI): Record<string, string> {
    const result: Record<string, string> = {};
    $('.wz-details-grid .wz-grid-item').each(function () {
      const label = $(this).find('.wz-grid-label').text().trim();
      const value = $(this).find('.wz-grid-value').text().trim();
      if (label && value) {
        result[label] = value;
      }
    });
    return result;
  }

  /** Find an external apply link (e.g., Microsoft Forms, Google Forms). */
  private findExternalApplyLink($: cheerio.CheerioAPI): string | null {
    let externalUrl: string | null = null;
    $('a[href]').each(function () {
      const href = $(this).attr('href') || '';
      const text = $(this).text().trim().toLowerCase();
      // External form links
      if (
        (href.includes('forms.') || href.includes('docs.google.com') || href.includes('survey')) &&
        !href.startsWith('/')
      ) {
        externalUrl = href;
        return false; // break
      }
      // Links with "apply" text pointing externally
      if (text.includes('apply') && !href.startsWith('/') && !href.includes('wazifaha')) {
        externalUrl = href;
        return false; // break
      }
    });
    return externalUrl;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private text(el: any): string {
    return el.text().trim() || '';
  }

  /** Guess a country name from a location string. */
  private guessCountry(location?: string): string | null {
    if (!location) return null;
    const l = location.toLowerCase();
    if (l.includes('afghanistan') || l.includes('kabul') || l.includes('herat') ||
        l.includes('mazar') || l.includes('kandahar') || l.includes('paktia') ||
        l.includes('nangarhar') || l.includes('bamyan') || l.includes('kunduz')) {
      return 'Afghanistan';
    }
    return null;
  }
}
