/**
 * O4AF (Scholarship4Af) Scraper
 *
 * Source: https://www.o4af.com/opportunities/?job_type=<type>&job_page=N
 * Method:  HTML scraping via cheerio (WordPress + Careerfy/JobSearch theme).
 *
 * Opportunity types (job_type query param): job, scholarship, fellowship,
 * internship, grant-award, announcement, competition, conference, course,
 * research. Details live at /opportunity/<slug>/.
 *
 * Rate limiting: o4af.com answers 403 on rapid consecutive requests — the
 * ImportSource config uses crawlDelayMs ≥ 2000 and this scraper retries
 * with exponential backoff (see base-scraper.ts).
 *
 * List page structure (verified against live HTML):
 *   - `.jobsearch-joblisting-classic-wrap` → each opportunity card
 *     - `.jobsearch-pst-title a[title][href]` → title + /opportunity/<slug>/
 *     - `figure img[src]` → logo
 *     - `li` with `i.jobsearch-maps-and-flags` → location
 *     - `li` with `i.jobsearch-filter-tool-black-shape` → category link text
 *     - `.jobsearch-option-btn` → type button ("Job/Internship", ...)
 *     - `.urgntpkg-jobv1` → "urgent" badge
 *   - Pagination: AJAX links call `jobsearch_job_pagenation_ajax('job_page',
 *     'N', …)` but the server also honours `?job_page=N` — we extract the
 *     max page number from the onclick handlers and crawl via URL params.
 *
 * Detail page structure (verified against live HTML):
 *   - `figure.jobsearch-jobdetail-list figcaption h2` → title
 *   - `.jobsearch-jobdetail-listthumb img` / `a[href]` → logo
 *   - `.jobsearch-jobdetail-type` → type text
 *   - `.post-in-category a` → category
 *   - `ul.jobsearch-jobdetail-options li` with `i.jobsearch-maps-and-flags`
 *     → location ("China, China")
 *   - `ul.jobsearch-jobdetail-options li` with `i.jobsearch-calendar`
 *     → "Apply Before : September 30, 2026"
 *   - `.jobsearch-jobdetail-services .jobsearch-services-text`
 *     → label/value grid (Opportunity Type, Duration, Gender, ...)
 *   - `.jobsearch-description` → content with h2 sections:
 *     Key Details and Dates | Benefits | Eligibility Criteria | How to Apply?
 *   - JSON-LD (`application/ld+json`) → datePublished
 *   - External links inside content → apply URL (forms./docs.google.com or
 *     "apply"/"application"/"official website" anchors, else first external)
 */

import * as cheerio from 'cheerio';
import { BaseScraper } from '../base-scraper';
import { resolveUrl, stripHtml, parseDate, cleanHtmlWhitespace, sleep, stripThemeBoilerplate, stripTextJunk } from '../utils';
import { browserHeaders, notChallengePage } from './browser-headers';
import { curlFetch, isCurlAvailable } from './curl-fallback';
import type { FetchOptions, RawListing, ScrapePage } from '../types';

const O4AF_LIST_REFERER = 'https://www.o4af.com/opportunities/';

/** onclick handler of the AJAX pagination links: jobsearch_job_pagenation_ajax('job_page', 'N', …) */
const PAGINATION_ONCLICK_RE = /jobsearch_job_pagenation_ajax\(\s*'job_page'\s*,\s*'(\d+)'/g;

export class O4afScraper extends BaseScraper {
  /**
   * Cloudflare on o4af.com challenges the TLS fingerprint of Node/Bun fetch
   * with a 403 "Just a moment…" page while allowing curl. After the first
   * native-fetch failure we go straight to the curl transport.
   */
  private preferCurl = false;

  constructor(source: any) {
    super(source);
    if (!this.source.config) this.source.config = {};
    // o4af rate-limits aggressively: default to a slow crawl and few pages.
    if (!this.source.config.maxPages) this.source.config.maxPages = 5;
    if (!this.source.config.crawlDelayMs) this.source.config.crawlDelayMs = 2500;
    // The site is slow (10-15s responses are normal) — give fetches room.
    if (!this.source.config.timeoutMs) this.source.config.timeoutMs = 35000;
  }

  /** Send every request with a full browser fingerprint; fall back to curl. */
  async fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
    const headers = {
      ...browserHeaders(O4AF_LIST_REFERER),
      ...(opts.headers || {}),
    };
    const validate = opts.validate ?? notChallengePage;

    if (!this.preferCurl) {
      try {
        return await super.fetchText(url, {
          ...opts,
          retries: opts.retries ?? 1,
          timeoutMs: opts.timeoutMs ?? (this.source.config as Record<string, unknown>).timeoutMs as number ?? 20000,
          headers,
          validate,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const blocked = /HTTP 40|HTTP 42|challenge page|bot protection|aborted|timed out|Fetch failed/i.test(msg);
        if (!blocked) throw e;
        // fall through to curl
      }
    }

    if (await isCurlAvailable()) {
      const timeoutMs =
        opts.timeoutMs ?? ((this.source.config as Record<string, unknown>).timeoutMs as number) ?? 30000;
      const delay = opts.crawlDelayMs ?? this.source.config.crawlDelayMs ?? 2500;
      const body = await curlFetch(url, headers, timeoutMs);
      if (!validate(body)) {
        throw new Error(`challenge page (Cloudflare) for ${url} even via curl`);
      }
      this.preferCurl = true;
      await sleep(delay); // respect the source
      return body;
    }

    throw new Error(
      `Fetch failed for ${url}: native fetch blocked by Cloudflare and curl is not available`,
    );
  }

  /** Parse one page of the opportunities list. */
  protected async parseListPage(html: string, pageUrl: string): Promise<ScrapePage> {
    const $ = cheerio.load(html);
    const listings: RawListing[] = [];

    const urlObj = new URL(pageUrl);
    const jobTypeParam = urlObj.searchParams.get('job_type') || 'job';

    const seenUrls = new Set<string>();

    $('.jobsearch-joblisting-classic-wrap').each(function () {
      const card = $(this);
      const titleLink = card.find('.jobsearch-pst-title a').first();
      const href = titleLink.attr('href') || '';
      if (!href.includes('/opportunity/')) return;

      const fullUrl = resolveUrl(href, pageUrl);
      if (!fullUrl || seenUrls.has(fullUrl)) return;
      seenUrls.add(fullUrl);

      const title =
        titleLink.attr('title')?.replace(/\s+/g, ' ').trim() ||
        titleLink.text().replace(/\s+/g, ' ').trim();

      // Logo / featured image
      const imgSrc = card.find('figure img').first().attr('src');
      const imageUrl = imgSrc ? resolveUrl(imgSrc, pageUrl) : null;

      // Location: <li><i class="jobsearch-icon jobsearch-maps-and-flags"></i> China</li>
      let location: string | null = null;
      card.find('li').each(function () {
        if (!location && $(this).has('i.jobsearch-maps-and-flags').length) {
          location = $(this).text().replace(/\s+/g, ' ').trim() || null;
        }
      });

      // Category: <li><i class="…filter-tool-black-shape"></i> <a>Different Fields</a></li>
      const category =
        card
          .find('li')
          .has('i.jobsearch-filter-tool-black-shape')
          .find('a')
          .first()
          .text()
          .replace(/\s+/g, ' ')
          .trim() || null;

      // Type button text ("Job/Internship", "Scholarship", ...) — the query
      // param stays the source of truth; keep the button as extracted data.
      const typeBtn = card.find('.jobsearch-option-btn').first().text().replace(/\s+/g, ' ').trim();

      const extractedData: Record<string, any> = {};
      if (typeBtn) extractedData['Opportunity Button'] = typeBtn;
      if (card.find('.urgntpkg-jobv1').length) extractedData['Urgent'] = 'true';

      listings.push({
        title: title && title.length > 5 ? title : 'O4AF Opportunity',
        sourceUrl: fullUrl,
        originalUrl: fullUrl,
        sourceName: 'O4AF',
        sourceLanguage: 'en',
        jobType: jobTypeParam,
        category,
        location,
        imageUrl,
        logoUrl: imageUrl,
        extractedData,
      });
    });

    // ── Pagination via ?job_page=N ─────────────────────────────────────────
    // The theme renders AJAX links, but the server accepts the query param.
    // Crawl while there is a higher page number advertised on this page.
    let nextPage: string | null = null;
    if (listings.length > 0) {
      const currentPage = parseInt(urlObj.searchParams.get('job_page') || '1', 10) || 1;
      let maxPage = currentPage;
      let match: RegExpExecArray | null;
      PAGINATION_ONCLICK_RE.lastIndex = 0;
      while ((match = PAGINATION_ONCLICK_RE.exec(html)) !== null) {
        const num = parseInt(match[1], 10);
        if (num > maxPage) maxPage = num;
      }
      if (maxPage > currentPage) {
        const next = new URL(pageUrl);
        next.searchParams.set('job_page', String(currentPage + 1));
        nextPage = next.toString();
      }
    }

    return { listings, nextPage };
  }

  /** Fetch the detail page and extract full listing data. */
  public async parseDetail(listing: RawListing): Promise<RawListing> {
    try {
      const html = await this.fetchText(listing.sourceUrl);
      const $ = cheerio.load(html);

      // ── Title ──────────────────────────────────────────────────────────────
      const title = $('figure.jobsearch-jobdetail-list figcaption h2')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim();
      if (title && title.length > 3) listing.title = title;

      // ── Logo ───────────────────────────────────────────────────────────────
      const thumbImg = $('figure.jobsearch-jobdetail-list .jobsearch-jobdetail-listthumb img').first();
      const logoSrc =
        thumbImg.attr('src') ||
        $('figure.jobsearch-jobdetail-list .jobsearch-jobdetail-listthumb a').first().attr('href');
      if (logoSrc) {
        const logoUrl = resolveUrl(logoSrc, listing.sourceUrl);
        listing.logoUrl = logoUrl;
        if (!listing.imageUrl || listing.imageUrl === logoUrl) listing.imageUrl = logoUrl;
      }

      // ── Type + category ────────────────────────────────────────────────────
      const typeText = $('.jobsearch-jobdetail-type').first().text().replace(/\s+/g, ' ').trim();
      if (typeText) listing.jobType = typeText;

      const category = $('.post-in-category a').first().text().replace(/\s+/g, ' ').trim();
      if (category) listing.category = category;

      // ── Location + deadline (header options list) ──────────────────────────
      // (functional form — assignments inside .each() defeat TS narrowing)
      const optionItems = $('ul.jobsearch-jobdetail-options li');
      const locationText =
        optionItems.filter(function () { return $(this).find('i.jobsearch-maps-and-flags').length > 0; }).first().text().replace(/\s+/g, ' ').trim() || null;
      const deadlineText =
        optionItems.filter(function () { return $(this).find('i.jobsearch-calendar').length > 0; }).first().text().replace(/\s+/g, ' ').trim() || null;

      if (locationText) {
        // "China, China" → "China"; "Kabul, Afghanistan" stays as-is.
        const parts = locationText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const uniq = [...new Set(parts)];
        listing.location = uniq.join(', ');
        listing.country = uniq[uniq.length - 1] || null;
      }

      if (deadlineText) {
        // "Apply Before : September 30, 2026" → parseable date
        const cleaned = deadlineText.replace(/apply\s*before\s*:?\s*/i, '').trim();
        listing.deadline = parseDate(cleaned) || null;
      }

      // ── Services grid (label/value pairs) ──────────────────────────────────
      const services: Record<string, string> = {};
      $('.jobsearch-jobdetail-services .jobsearch-services-text').each(function () {
        const label = $(this).find('span').first().text().replace(/[:\s]+$/, '').trim();
        const values: string[] = [];
        $(this)
          .find('small')
          .each(function () {
            const v = $(this).text().replace(/\s+/g, ' ').trim();
            if (v) values.push(v);
          });
        if (label && values.length) services[label] = values.join(', ');
      });
      if (Object.keys(services).length) {
        listing.extractedData = { ...(listing.extractedData || {}), ...services };
        if (services['Opportunity Type']) listing.scholarshipType = services['Opportunity Type'];
        if (services['Duration']) listing.extractedData!['Duration'] = services['Duration'];
      }

      // ── Published date from JSON-LD ─────────────────────────────────────────
      const published = this.extractDatePublished($);
      if (published) listing.publishedDate = published;

      // ── Description with h2 sections ───────────────────────────────────────
      const descEl = $('.jobsearch-description').first();
      if (descEl.length && descEl.text().trim().length > 0) {
        this.parseDescriptionSections(descEl.html() || '', listing);
      }

      // ── Apply link ─────────────────────────────────────────────────────────
      if (!listing.applyUrl) {
        const applyUrl = this.findApplyLink(descEl.html() || '', listing.sourceUrl);
        if (applyUrl) listing.applyUrl = applyUrl;
      }

      return listing;
    } catch (e) {
      console.error(`[o4af] detail parse error for ${listing.sourceUrl}:`, e);
      return listing;
    }
  }

  /** Read `datePublished` from the page's JSON-LD graph. */
  private extractDatePublished($: cheerio.CheerioAPI): string | null {
    let published: string | null = null;
    $('script[type="application/ld+json"]').each(function () {
      if (published) return;
      try {
        const raw = $(this).contents().text();
        if (!raw || !raw.includes('datePublished')) return;
        const data = JSON.parse(raw);
        const graph = Array.isArray(data?.['@graph']) ? data['@graph'] : [data];
        for (const node of graph) {
          const dp = node?.datePublished;
          if (typeof dp === 'string' && dp) {
            published = parseDate(dp) || null;
            if (published) break;
          }
        }
      } catch {
        // malformed ld+json — ignore
      }
    });
    return published;
  }

  /**
   * Split `.jobsearch-description` into h2-delimited sections and map them to
   * RawListing fields (same convention as the Scholarships.af scraper).
   */
  private parseDescriptionSections(descHtml: string, listing: RawListing): void {
    if (!descHtml.trim()) return;

    // The o4af theme injects its share widget + site footer into the content
    // area — strip them before parsing sections so no site chrome is stored.
    descHtml = stripThemeBoilerplate(descHtml);

    const h2Pattern = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
    const parts = descHtml.split(h2Pattern);
    // parts[0] = intro before the first h2; odd indices = heading, even = body

    const descParts: string[] = [];
    if (parts[0]?.trim() && stripHtml(parts[0]).trim()) {
      descParts.push(parts[0].trim());
    }

    for (let i = 1; i < parts.length; i += 2) {
      const heading = stripHtml(parts[i] || '').trim().toLowerCase();
      const bodyHtml = (parts[i + 1] || '').trim();
      if (!heading || !bodyHtml) continue;

      const bodyText = stripHtml(bodyHtml);
      if (!bodyText.trim()) continue;

      if (heading.includes('key detail') || heading.includes('dates')) {
        this.parseKeyDetails(bodyHtml, listing);
      } else if (heading.includes('benefit') || heading.includes('financial aid')) {
        listing.benefits = stripTextJunk(bodyText);
      } else if (heading.includes('eligib') || heading.includes('criteria')) {
        listing.eligibility = stripTextJunk(bodyText);
      } else if (heading.includes('required document')) {
        listing.requirements = stripTextJunk(bodyText);
      } else if (
        heading.includes('how to apply') ||
        heading.includes('submission') ||
        heading.includes('guideline')
      ) {
        listing.guidelines = stripTextJunk(bodyText);
      } else if (
        heading.includes('other opportunit') ||
        heading.includes('more jobs') ||
        heading.includes('related') ||
        heading.includes('check more')
      ) {
        // Related-listing sections are outside .jobsearch-description, but
        // skip defensively in case the theme moves them inside.
        continue;
      } else {
        // "Opportunity Description" / "Introduction" / anything else
        descParts.push(`<h3>${stripHtml(parts[i] || '').trim()}</h3>\n${bodyHtml}`);
      }
    }

    if (descParts.length) {
      listing.description = cleanHtmlWhitespace(descParts.join('\n\n'));
    } else if (!listing.description && !listing.requirements && !listing.eligibility && !listing.benefits) {
      // No sections parsed — fall back to the whole description body.
      const rawText = stripHtml(descHtml).trim();
      if (rawText.length > 50) {
        listing.description = cleanHtmlWhitespace(descHtml);
      }
    }
  }

  /**
   * Parse the "Key Details and Dates" section — bullet items such as
   * "Application Deadline: …", "Host Country: …", "Study Level: …".
   */
  private parseKeyDetails(bodyHtml: string, listing: RawListing): void {
    const $ = cheerio.load(`<div>${bodyHtml}</div>`);
    if (!listing.extractedData) listing.extractedData = {};

    $('li, p').each(function () {
      const text = $(this).text().replace(/\s+/g, ' ').trim();
      if (!text) return;
      const strong = $(this).find('strong, b').first().text().trim();
      const key = (strong || text.split(/[:]/)[0] || '').replace(/:\s*$/, '').trim();
      const value = strong
        ? text.replace(strong, '').replace(/^[:\s]+/, '').trim()
        : text.slice(key.length).replace(/^[:\s]+/, '').trim();
      if (key && value && key !== value) {
        listing.extractedData![key] = value;
      }
    });

    const ed = listing.extractedData;
    if (!listing.deadline) {
      const raw = ed['Application Deadline'] || ed['Deadline'] || ed['Apply Before'];
      if (raw) listing.deadline = parseDate(String(raw)) || null;
    }
    if (ed['Host Country'] && !listing.country) listing.country = String(ed['Host Country']);
    if (ed['Funding Type'] && !listing.scholarshipType) listing.scholarshipType = String(ed['Funding Type']);
    if (ed['Study Level'] && !listing.educationReq) listing.educationReq = String(ed['Study Level']);
    if (ed['Host Institution'] && !listing.organization) {
      listing.organization = stripHtml(String(ed['Host Institution']));
    }
    if (ed['Duration']) listing.extractedData!['Duration'] = String(ed['Duration']);
  }

  /**
   * Find the external apply URL inside the description HTML.
   * Priority: form/survey links → anchors that mention applying → the first
   * external http(s) link (o4af posts usually deep-link the official
   * application page in their "How to Apply" section).
   */
  private findApplyLink(contentHtml: string, sourceUrl: string): string | null {
    if (!contentHtml.trim()) return null;
    const $ = cheerio.load(`<div>${contentHtml}</div>`);
    const sourceHost = (() => {
      try {
        return new URL(sourceUrl).hostname;
      } catch {
        return 'o4af.com';
      }
    })();

    const isExternal = (href: string): boolean => {
      if (!/^https?:\/\//i.test(href)) return false;
      try {
        const h = new URL(href).hostname;
        return h !== sourceHost && !h.endsWith('.o4af.com');
      } catch {
        return false;
      }
    };

    // Priority 1: known application-form hosts
    let formUrl: string | null = null;
    // Priority 2: anchor text that indicates applying
    let applyTextUrl: string | null = null;
    // Priority 3: first external content link
    let firstExternal: string | null = null;

    $('a[href]').each(function () {
      const href = $(this).attr('href') || '';
      const text = $(this).text().replace(/\s+/g, ' ').trim().toLowerCase();
      if (!isExternal(href)) return;
      if (
        href.includes('forms.') ||
        href.includes('docs.google.com') ||
        href.includes('survey') ||
        href.includes('application-form')
      ) {
        if (!formUrl) formUrl = href;
      } else if (
        !applyTextUrl &&
        (text.includes('apply') ||
          text.includes('application') ||
          (text.includes('official') && text.includes('website')))
      ) {
        applyTextUrl = href;
      } else if (!firstExternal) {
        firstExternal = href;
      }
    });

    return formUrl || applyTextUrl || firstExternal;
  }
}
