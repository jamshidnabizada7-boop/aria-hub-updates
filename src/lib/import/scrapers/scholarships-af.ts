/**
 * Scholarships.af Scraper
 *
 * Source: https://scholarships.af/opportunities/?job_type=scholarship
 * Method:  Sitemap-first HTML scraping via cheerio (WP JobSearch plugin),
 *          with an HTML listing page as fallback.
 *
 * Bot protection: the site is behind Imunify360 (same interstitial family
 * as ACBAR). The WP REST API (/wp-json/wp/v2/posts) answers 403
 * "Access denied by Imunify360 bot-protection" and the HTML/sitemap
 * endpoints intermittently serve the "One moment, please…" interstitial.
 * All requests therefore use the full browser header fingerprint plus
 * challenge-page validation with retries (see browser-headers.ts).
 *
 * List page structure:
 *   - `.jobsearch-joblisting-classic-wrap` → each opportunity card
 *     - `.jobsearch-pst-title a[href]` → detail URL + title
 *     - `.job-company-name a` → organization
 *     - `figure img[src]` → logo/featured image
 *     - `<li>` with "Deadline" → deadline text
 *     - `.jobsearch-option-btn` → type (Scholarship / Fellowship / ...)
 *
 * Detail page structure:
 *   - `<title>` → "Scholarship Name - Scholarships.af"
 *   - `.careerfy-company-name a` → organization
 *   - `.careerfy-jobdetail-services li` → label-value pairs
 *     (Gender, Level, Eligible Region/Countries, Medium, Field, Duration, ...)
 *   - `.jobsearch-description` → full description (HTML)
 *   - `a` with text "Apply Now" / class `careerfy-job-apply` → apply URL
 *
 * Pagination: the HTML listing uses JS pagination (links are
 * `javascript:void(0)`), so we prefer the Yoast job-sitemap XML files
 * (job-sitemap1.xml, job-sitemap2.xml, …) for full coverage, falling back
 * to `/page/N/` URLs when the sitemap is unreachable.
 */

import * as cheerio from 'cheerio';
import { BaseScraper } from '../base-scraper';
import { resolveUrl, stripHtml, parseDate, cleanHtmlWhitespace, sleep } from '../utils';
import { browserHeaders, notChallengePage } from './browser-headers';
import { curlFetch, isCurlAvailable } from './curl-fallback';
import type { FetchOptions, RawListing, ScrapePage } from '../types';

const SCH_LIST_URL = 'https://scholarships.af/opportunities/?job_type=scholarship';
const SCH_RECENT_URL = 'https://scholarships.af/opportunities/';
const SCH_SITEMAP_URL = 'https://scholarships.af/job-sitemap1.xml';

export class ScholarshipsAfScraper extends BaseScraper {
  private fallbackUrl: string;
  /**
   * Imunify360 also fingerprints the HTTP client. When the runtime's fetch
   * is challenged, retry through curl (same pattern as the ACBAR scraper).
   */
  private preferCurl = false;

  constructor(source: any) {
    super(source);
    if (this.source.config?.recentOnly) {
      // The scheduled refresh needs the newest jobs AND scholarships. The
      // sitemap starts with historical posts and can consume the whole budget.
      this.source.baseUrl = SCH_RECENT_URL;
      this.fallbackUrl = SCH_RECENT_URL;
      return;
    }
    // Store the original HTML listing URL as a fallback
    this.fallbackUrl = SCH_LIST_URL;
    // Prefer the sitemap for broader coverage
    if (this.source.baseUrl.includes('opportunities/?job_type=scholarship')) {
      this.source.baseUrl = SCH_SITEMAP_URL;
    }
  }

  /**
   * Route every fetch through the browser-like fingerprint so the
   * Imunify360 bot protection lets us through; retry on challenge pages,
   * and fall back to curl when the runtime's fetch is fingerprint-blocked.
   */
  async fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
    const scheduled = this.source.config?.recentOnly === true;
    const configuredTimeout =
      opts.timeoutMs ?? ((this.source.config as Record<string, unknown>).timeoutMs as number) ?? 15000;
    const timeoutMs = scheduled ? Math.min(configuredTimeout, 10000) : configuredTimeout;
    const headers = {
      ...browserHeaders(SCH_LIST_URL),
      ...(opts.headers || {}),
    };
    const validate = opts.validate ?? notChallengePage;

    if (!this.preferCurl) {
      try {
        return await super.fetchText(url, {
          ...opts,
          retries: opts.retries ?? (scheduled ? 0 : 3),
          timeoutMs,
          headers,
          validate,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const blocked = /HTTP 40|HTTP 42|challenge page|bot protection/i.test(msg);
        if (!blocked) throw e;
        // fall through to curl
      }
    }

    if (await isCurlAvailable()) {
      const delay = opts.crawlDelayMs ?? this.source.config.crawlDelayMs ?? 1200;
      const body = await curlFetch(url, headers, timeoutMs);
      if (!validate(body)) {
        throw new Error(`challenge page (bot protection interstitial) for ${url} even via curl`);
      }
      this.preferCurl = true;
      await sleep(delay); // respect the source
      return body;
    }

    throw new Error(`Fetch failed for ${url}: blocked by bot protection and curl is not available`);
  }

  /**
   * Override scrapeAll to fall back to HTML listing page if the sitemap
   * is unreachable (the site may block XML or be temporarily down).
   */
  async scrapeAll(): Promise<RawListing[]> {
    if (this.source.config?.recentOnly) return super.scrapeAll();
    try {
      const results = await super.scrapeAll();
      if (results.length > 0) return results;
    } catch (e) {
      console.warn(`[scholarships.af] sitemap failed, falling back to HTML listing:`, e);
    }
    // Fallback: try the HTML listing page
    this.source.baseUrl = this.fallbackUrl;
    return super.scrapeAll();
  }

  /**
   * Parse the listing page. Each card links to a detail page
   * `/opportunity/<slug>/` which `parseDetail()` enriches.
   */
  protected async parseListPage(html: string, pageUrl: string): Promise<ScrapePage> {
    const $ = cheerio.load(html, { xmlMode: html.trim().startsWith('<?xml') || html.includes('<urlset') });
    const listings: RawListing[] = [];

    if (html.trim().startsWith('<?xml') || html.includes('<urlset') || html.includes('<sitemapindex')) {
      // It's a sitemap!
      if (html.includes('<urlset')) {
        // Individual sitemap with URLs
        $('loc').each(function () {
          const url = $(this).text().trim();
          if (url && url.includes('/opportunity/')) {
            // Use the URL as the initial title so the pre-detail hash is stable and
            // unique. 'Unknown Title' would change to the real title on every re-run,
            // causing spurious "updated" counts on every scheduled scrape.
            listings.push({
              title: url,
              sourceUrl: url,
              originalUrl: url,
              sourceName: 'Scholarships.af',
              sourceLanguage: 'en',
              category: 'scholarship',
            });
          }
        });
      }

      // Yoast splits large post types across job-sitemap1.xml, job-sitemap2.xml, …
      // Chain to the next index while this one had listings; the crawl loop
      // stops naturally when the next file 404s or parses to 0 URLs.
      let nextPage: string | null = null;
      const sitemapMatch = pageUrl.match(/job-sitemap(\d+)\.xml/i);
      if (listings.length > 0 && sitemapMatch) {
        const nextIdx = parseInt(sitemapMatch[1], 10) + 1;
        nextPage = pageUrl.replace(/job-sitemap\d+\.xml/i, `job-sitemap${nextIdx}.xml`);
      }
      return { listings, nextPage };
    }

    // Standard HTML parse fallback
    $('.jobsearch-joblisting-classic-wrap').each(function () {
      const card = $(this);
      const titleLink = card.find('.jobsearch-pst-title a').first();
      const href = titleLink.attr('href') || '';
      const fullUrl = resolveUrl(href, pageUrl);
      if (!fullUrl) return;

      const title = titleLink.attr('title')?.trim() || titleLink.text().trim();
      const orgText = card.find('.job-company-name a').first().text().trim();
      const organization = orgText.replace(/^@\s*/i, '').trim() || null;
      const imgSrc = card.find('figure img').first().attr('src') || null;
      const imageUrl = imgSrc ? resolveUrl(imgSrc, pageUrl) : null;
      const typeBtn = card.find('.jobsearch-option-btn').first().text().trim();
      const jobType = typeBtn ? typeBtn.toLowerCase() : 'scholarship';

      let deadline: string | null = null;
      card.find('li').each(function () {
        const li = $(this).text().trim();
        if (/deadline/i.test(li) && !deadline) {
          const m = li.replace(/.*deadline\s*/i, '').trim();
          deadline = parseDate(m) || m || null;
        }
      });

      listings.push({
        title,
        sourceUrl: fullUrl,
        originalUrl: fullUrl,
        sourceName: 'Scholarships.af',
        sourceLanguage: 'en',
        organization,
        imageUrl,
        logoUrl: imageUrl,
        deadline,
        jobType,
        category: /job|internship/i.test(jobType) ? 'job' : 'scholarship',
      });
    });

    let nextPage: string | null = null;
    if (listings.length > 0) {
      const pageMatch = pageUrl.match(/\/page\/(\d+)/);
      if (pageMatch) {
        const nextNum = parseInt(pageMatch[1], 10) + 1;
        // No hardcoded cap here — the scrapeAll maxPages config governs depth.
        nextPage = pageUrl.replace(/\/page\/\d+/, `/page/${nextNum}`);
      } else {
        const urlObj = new URL(pageUrl);
        let path = urlObj.pathname;
        if (!path.endsWith('/')) path += '/';
        path += 'page/2/';
        nextPage = `${urlObj.origin}${path}${urlObj.search}`;
      }
    }

    return { listings, nextPage };
  }

  /** Enrich a listing with full detail-page content. */
  public async parseDetail(listing: RawListing): Promise<RawListing> {
    try {
      const html = await this.fetchText(listing.sourceUrl);
      const $ = cheerio.load(html);

      // ── Soft-404 guard ─────────────────────────────────────────────────────
      // The site serves styled 404 pages ("Page not found - Scholarships.af")
      // with sidebar widgets intact; scraping those yields other posts' data.
      // Detect and abort so the orchestrator skips the listing entirely.
      const rawTitle = $('title').text().trim();
      const hasDetailBody = $('.careerfy-jobdetail-content').length > 0;
      const longestDescLen = Math.max(
        -1,
        ...$('.jobsearch-description').map(function () { return $(this).text().trim().length; }).get(),
      );
      if (/page not found|404|not found/i.test(rawTitle) || (!hasDetailBody && longestDescLen < 150)) {
        throw new Error(`soft-404 (detail page missing) for ${listing.sourceUrl}`);
      }

      // ── Title ──────────────────────────────────────────────────────────────
      // Priority: og:title → <title> (site suffix stripped) → h1 → slug repair.
      // A URL-looking title after this chain means every source failed; the
      // slug prettifier is the last resort so rows never save a raw URL.
      const ogTitle = ($('meta[property="og:title"]').attr('content') || '')
        .replace(/\s*[-–—]\s*Scholarships\.af\s*$/i, '').trim();
      let newTitle = ogTitle;
      if (!newTitle && rawTitle && !/page not found|404/i.test(rawTitle)) {
        newTitle = rawTitle.replace(/\s*[-–—]\s*Scholarships\.af\s*$/i, '').trim();
      }
      if (!newTitle) {
        newTitle = $('h1').first().text().trim();
      }
      newTitle = newTitle.trim();
      if (newTitle && !/^https?:\/\//i.test(newTitle)) {
        listing.title = newTitle;
      } else if (/^https?:\/\//i.test(listing.title || '')) {
        // Title is still the sitemap URL — derive a human title from the slug.
        const fromSlug = prettifySlug(listing.sourceUrl);
        if (fromSlug) listing.title = fromSlug;
      }

      // ── Organization ───────────────────────────────────────────────────────
      // NOTE: `.careerfy-company-name` also matches SIDEBAR listing cards
      // ("other opportunities" widget) — scraping it page-wide stole other
      // posts' organizations. Scope strictly to the detail body; most detail
      // pages have no org element at all, in which case we leave it null
      // (parseKeyDetails may still set it from the Host Institution field).
      const org = $('.careerfy-jobdetail-content .careerfy-company-name a').first().text().trim();
      if (org) listing.organization = org.replace(/^@\s*/i, '').trim();

      // ── Service items (Gender, Level, Region, Medium, Field, Duration, etc.) ─
      const services = this.extractServices($);
      listing.extractedData = { ...services };
      
      if (services['Eligible Region/Countries']) {
        listing.eligibility = services['Eligible Region/Countries'];
      }
      if (services['Field of study']) {
        listing.category = services['Field of study'];
      }

      // ── Featured image / logo ──────────────────────────────────────────────
      const logoSrc = $('.careerfy-joblisting-media img, .careerfy-services-text img').first().attr('src');
      if (logoSrc) {
        const url = resolveUrl(logoSrc, listing.sourceUrl);
        if (!listing.imageUrl) listing.imageUrl = url;
        if (!listing.logoUrl) listing.logoUrl = url;
      }

      // All rich content lives inside .jobsearch-description — BUT pages can
      // contain several: a junk wrapper around the services box ("All" +
      // "Sponsored links", < 100 chars) and the real article. Pick the LONGEST
      // element instead of .first() so ads wrappers never win.
      let descEl: any = null;
      let descLen = -1;
      $('.jobsearch-description').each(function () {
        const len = $(this).text().trim().length;
        if (len > descLen) { descLen = len; descEl = $(this).clone(); }
      });
      if (!descEl || descLen < 150) {
        // Fallback selectors — also pick the longest, and only accept ≥150
        // chars so we never overwrite with an ads stub.
        $('.text-content, .entry-content, .post-content').each(function () {
          const len = $(this).text().trim().length;
          if (len > descLen) { descLen = len; descEl = $(this).clone(); }
        });
      }
      if (descEl) descEl.find('script, ins.adsbygoogle, .code-block, .code-block-label').remove();

      // Parse h2-delimited sections from the description
      this.parseDescriptionSections($, descEl, listing);

      // ── Deadline from Key Details or description text ──────────────────────
      if (!listing.deadline) {
        listing.deadline = this.extractDeadlineFromKeyDetails(listing.extractedData) ||
                           this.extractDeadlineFromText(descEl.text());
      }

      // ── Apply link ─────────────────────────────────────────────────────────
      const applyUrl = this.findApplyLink($);
      if (applyUrl) listing.applyUrl = applyUrl;

      return listing;
    } catch (e) {
      console.error(`[scholarships.af] detail parse error for ${listing.sourceUrl}:`, e);
      return listing;
    }
  }

  /**
   * Parse the .jobsearch-description into h2-delimited sections.
   * Maps each section (Benefits, Eligibility, Required Documents, How to Apply, etc.)
   * to the correct RawListing field. Non-matched sections become the main description.
   */
  private parseDescriptionSections(
    $: cheerio.CheerioAPI,
    descEl: any,
    listing: RawListing,
  ): void {
    const descHtml = descEl.html() || '';
    if (!descHtml.trim()) return;

    // Split the description by <h2> headings into named sections
    const sections: Array<{ heading: string; body: string }> = [];
    // Regex to split by h2 tags, capturing the heading text
    const h2Pattern = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
    const parts = descHtml.split(h2Pattern);

    // parts[0] = content before the first h2 (the main description)
    // parts[1] = first h2 heading text, parts[2] = content after first h2
    // parts[3] = second h2 heading text, parts[4] = content after second h2, etc.

    const mainDescParts: string[] = [];
    if (parts[0]?.trim()) {
      mainDescParts.push(parts[0].trim());
    }

    for (let i = 1; i < parts.length; i += 2) {
      const heading = stripHtml(parts[i] || '').trim().toLowerCase();
      const bodyHtml = (parts[i + 1] || '').trim();
      if (!heading || !bodyHtml) continue;

      // Strip trailing ads/related blocks from body
      const cleanBody = this.stripTrailingJunk(bodyHtml);
      const bodyText = stripHtml(cleanBody);
      if (!bodyText.trim()) continue;

      // Map heading → RawListing field
      if (heading.includes('key detail') || heading.includes('dates')) {
        // Parse key details as structured data into extractedData
        this.parseKeyDetails(cleanBody, listing);
      } else if (heading.includes('benefit') || heading.includes('financial aid')) {
        listing.benefits = bodyText;
      } else if (heading.includes('eligib') || heading.includes('criteria')) {
        listing.eligibility = listing.eligibility
          ? `${listing.eligibility}\n\n${bodyText}` : bodyText;
      } else if (heading.includes('required document')) {
        listing.requirements = bodyText;
      } else if (heading.includes('selection process')) {
        // Store in extractedData as supplementary info
        if (!listing.extractedData) listing.extractedData = {};
        listing.extractedData['Selection Process'] = bodyText;
        // Also append to requirements
        listing.requirements = listing.requirements
          ? `${listing.requirements}\n\nSelection Process:\n${bodyText}` : `Selection Process:\n${bodyText}`;
      } else if (heading.includes('how to apply') || heading.includes('submission') || heading.includes('guideline')) {
        listing.guidelines = bodyText;
      } else if (heading.includes('check more') || heading.includes('related') ||
                 heading.includes('other opportunit')) {
        // Skip related links / footer sections entirely
        continue;
      } else {
        // Any other section (e.g., "Opportunity Description") → main description
        mainDescParts.push(`<h3>${stripHtml(parts[i] || '').trim()}</h3>\n${cleanBody}`);
      }
    }

    // Assemble the main description from non-extracted parts
    if (mainDescParts.length) {
      listing.description = cleanHtmlWhitespace(mainDescParts.join('\n\n'));
    } else if (!listing.description && !listing.requirements && !listing.eligibility && !listing.benefits) {
      // If we couldn't parse ANY sections successfully, just use the entire clean body as the description
      // to prevent "short details" bug.
      const rawText = descEl.text().trim();
      if (rawText.length > 50) {
        listing.description = cleanHtmlWhitespace(descHtml);
      }
    }
  }

  /**
   * Parse the "Key Details and Dates" section.
   * This section contains structured bullet points like:
   *   - Application Deadline: 2 May 2027
   *   - Host Country: Sweden
   *   - Study Level: Bachelor's and Master's
   */
  private parseKeyDetails(bodyHtml: string, listing: RawListing): void {
    const $ = cheerio.load(`<div>${bodyHtml}</div>`);
    if (!listing.extractedData) listing.extractedData = {};
    
    $('li').each(function () {
      const text = $(this).text().trim();
      // Try to split on colon or first bold text
      const strong = $(this).find('strong, b').first().text().trim();
      if (strong) {
        const key = strong.replace(/:?\s*$/, '').trim();
        const value = text.replace(strong, '').replace(/^[:\s]+/, '').trim();
        if (key && value) {
          listing.extractedData![key] = value;
        }
      }
    });

    // Map known key details to listing fields
    const ed = listing.extractedData;
    if (ed['Application Deadline'] || ed['Deadline']) {
      listing.deadline = parseDate(ed['Application Deadline'] || ed['Deadline']) || null;
    }
    if (ed['Host Country']) {
      listing.country = ed['Host Country'];
    }
    if (ed['Funding Type']) {
      listing.scholarshipType = ed['Funding Type'];
    }
    if (ed['Duration']) {
      // Prefer Key Details duration over services duration
      ed['Duration'] = ed['Duration'];
    }
    if (ed['Study Level']) {
      listing.educationReq = ed['Study Level'];
    }
    if (ed['Host Institution']) {
      if (!listing.organization) listing.organization = stripHtml(ed['Host Institution']);
    }
    if (ed['Program Language']) {
      // Store as extracted data (already there)
    }
  }

  /** Extract label-value pairs from `.careerfy-jobdetail-services li`. */
  private extractServices($: cheerio.CheerioAPI): Record<string, string> {
    const result: Record<string, string> = {};
    $('.careerfy-jobdetail-services li').each(function () {
      const label = $(this).find('.careerfy-services-text span').first().text().trim();
      // Collect ALL small values (e.g., Gender: Male, Female)
      const smallValues: string[] = [];
      $(this).find('.careerfy-services-text small').each(function () {
        const v = $(this).text().trim();
        if (v) smallValues.push(v);
      });
      // Also check for div content (e.g., Eligible Region/Countries uses a div)
      const divValue = $(this).find('.careerfy-services-text > div').first().text().trim();
      
      const value = smallValues.length > 0
        ? smallValues.join(', ')
        : divValue || '';
      
      if (label && value) {
        result[label.replace(/:?\s*$/, '').trim()] = value;
      }
    });
    return result;
  }

  /** Find the external apply URL (Apply Now button or external link). */
  private findApplyLink($: cheerio.CheerioAPI): string | null {
    let url: string | null = null;
    // Priority 1: explicit apply button
    $('a').each(function () {
      const href = $(this).attr('href') || '';
      const text = $(this).text().trim().toLowerCase();
      const cls = $(this).attr('class') || '';
      if (
        (text.includes('apply now') || text.includes('apply for') ||
         cls.includes('apply') || text.includes('official') && text.includes('website')) &&
        href && !href.startsWith('javascript') && href !== '#' &&
        !href.includes('scholarships.af')
      ) {
        url = href;
        return false; // break
      }
    });
    return url;
  }

  /** Extract deadline from the Key Details extractedData. */
  private extractDeadlineFromKeyDetails(data?: Record<string, unknown>): string | null {
    if (!data) return null;
    const raw = (data['Application Deadline'] || data['Deadline']) as string;
    if (!raw) return null;
    return parseDate(raw) || null;
  }

  /** Pull a date from description text mentioning "Deadline". */
  private extractDeadlineFromText(text: string): string | null {
    // Match patterns like "Application Deadline 2 May 2027" or "Deadline: Aug 15, 2026"
    const patterns = [
      /application\s*deadline[:\s]*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
      /deadline[^:]*:\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
    ];
    for (const pat of patterns) {
      const m = text.match(pat);
      if (m) return parseDate(m[1]) || null;
    }
    return null;
  }

  /**
   * Strip trailing junk from section body HTML (related listings, social links,
   * "Check More Scholarships", etc.)
   */
  private stripTrailingJunk(html: string): string {
    const cutPhrases = [
      'Check More Scholarships',
      'Other Opportunities You May Like',
      'Other Opportunities you may like',
      'Related Opportunities',
      'Frequently Asked Questions',
    ];
    let result = html;
    for (const phrase of cutPhrases) {
      const idx = result.indexOf(phrase);
      if (idx !== -1) {
        const blockStart = result.lastIndexOf('<', idx);
        result = result.substring(0, blockStart !== -1 ? blockStart : idx);
      }
    }
    return result;
  }

  private text(el: { text: () => string }): string {
    return el.text().trim() || '';
  }
}

/**
 * Derive a human-readable title from an opportunity URL's slug:
 * "…/opportunity/un-ocha-ers-internships-switzerland/" →
 * "Un Ocha Ers Internships Switzerland".
 */
export function prettifySlug(url: string): string | null {
  try {
    const path = new URL(url).pathname;
    const slug = path.split('/').filter(Boolean).pop() || '';
    const words = slug
      .replace(/\.html?$/i, '')
      .split('-')
      .filter(Boolean)
      .map((w) => (/\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)));
    const title = words.join(' ').trim();
    return title.length >= 8 ? title : null;
  } catch {
    return null;
  }
}

