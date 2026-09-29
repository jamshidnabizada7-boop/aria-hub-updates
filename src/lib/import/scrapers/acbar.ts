/**
 * ACBAR Job Scraper
 *
 * Source: https://www.acbar.org/en/jobs  (Laravel app, `?page=N` pagination)
 * Method: HTML scraping via cheerio with a full browser header fingerprint.
 *
 * Bot protection: acbar.org sits behind an Imunify360-style JS interstitial
 * ("One moment, please…" + window.location.reload()). Live testing showed a
 * plain User-Agent gets the challenge page, while the complete Chrome header
 * fingerprint (Sec-Fetch-*, sec-ch-ua, …) gets real markup. All requests in
 * this scraper therefore go through `browserHeaders()` + challenge-page
 * validation with retries (see browser-headers.ts and base-scraper.ts).
 *
 * List page structure:
 *   - `a.job-card__title[href*="/en/jobs/details/"]` → detail URL + title
 *   - `ul.pagination a[rel="next"]` → next page URL (disabled on last page)
 *   - numbered `a.page-link[href*="?page=N"]` links (fallback heuristic)
 *
 * Detail page structure (verified against live HTML):
 *   - `.acbar-jd__title`                  → job title (h1)
 *   - `.acbar-jd__org`                     → organization name
 *   - `.acbar-jd__logo img[src]`           → organization logo
 *   - `.acbar-jd__info-table .acbar-jd__info-row` → dt (label) + dd (value) grid
 *       Type, Location, Category, Published, Nationality, Gender,
 *       Salary, Contract Duration, Vacancy Number, No of Job
 *   - `.acbar-jd__info-text`               → Education / Experience
 *       (h3.acbar-jd__info-text-title + p.acbar-jd__info-text-value)
 *   - `.acbar-jd__deadline-value`          → deadline date (YYYY-MM-DD)
 *   - `.acbar-jd__badge`                   → status (Open / Closed)
 *   - `.acbar-jd__card`                    → article sections
 *       h2.acbar-jd__card-title → "About the Company" | "Job Summary"
 *                                   "Job Requirements" | "Submission Guideline"
 *       .acbar-jd__rich → section body HTML
 */

import * as cheerio from 'cheerio';
import { BaseScraper } from '../base-scraper';
import { resolveUrl, cleanHtmlWhitespace, stripHtml, parseDate, sleep, sanitizeListingFragment } from '../utils';
import { browserHeaders, notChallengePage } from './browser-headers';
import { curlFetch, isCurlAvailable } from './curl-fallback';
import { getCookieHeader, renderHtml } from './browser-fetch';
import type { FetchOptions, RawListing, ScrapePage } from '../types';

const ACBAR_LIST_URL = 'https://www.acbar.org/en/jobs';
/** Detail-page pattern — precise match avoids nav/footer false positives. */
const DETAIL_HREF_RE = /\/en\/jobs\/details\/\d+\/[a-z0-9-]*/i;

/**
 * Imunify360 clearance cookie (`wssplashchk`), shared across instances so one
 * headless-browser round-trip per process serves the list page + every
 * detail page. The clearance is long-lived; we re-clear only when a
 * challenge comes back.
 */
let clearedCookieHeader: string | null = null;
let clearingPromise: Promise<string | null> | null = null;
/**
 * When every transport fails we assume Imunify360/firewall has flagged the
 * IP; hammering again only extends the block. Back off for a while and fail
 * fast so a scheduled import doesn't burn its whole budget on one source.
 */
let blockedUntil = 0;
const BLOCK_COOLDOWN_MS = 10 * 60 * 1000;

/** Run the JS challenge in a real browser once and cache the cookie jar. */
function browserClearance(): Promise<string | null> {
  if (clearedCookieHeader) return Promise.resolve(clearedCookieHeader);
  clearingPromise ??= getCookieHeader(ACBAR_LIST_URL, {
    untilSubstring: 'job-card__title',
    timeoutMs: 45000,
    settleMs: 2000,
  })
    .then((cookie) => {
      clearedCookieHeader = cookie;
      return cookie;
    })
    .finally(() => {
      clearingPromise = null;
    });
  return clearingPromise;
}

function isChallengeBody(body: string): boolean {
  return !body || !notChallengePage(body);
}

export class AcbarScraper extends BaseScraper {
  /**
   * Imunify360 on acbar.org serves its interstitial depending on the client
   * TLS fingerprint: Node's undici passes (verified), Bun's fetch does not.
   * After a first blocked native fetch we switch to the curl transport.
   */
  private preferCurl = false;

  constructor(source: any) {
    super(source);
    if (!this.source.config) this.source.config = {};
    if (!this.source.config.maxPages) this.source.config.maxPages = 30;
    // Production stores the site root as baseUrl. Its homepage has no job
    // cards, so both scheduled and root-configured manual runs need /en/jobs.
    if (this.source.config.recentOnly || /^https?:\/\/(?:www\.)?acbar\.org\/?$/i.test(this.source.baseUrl)) {
      this.source.baseUrl = ACBAR_LIST_URL;
    }
  }

  /**
   * Route every fetch through the browser-like fingerprint so the bot
   * protection lets us through, retry harder on challenge pages/403s, fall
   * back to curl when the runtime's fetch is fingerprint-blocked, and clear
   * the JS challenge in a real browser (cookie reuse) as the last resort.
   */
  async fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
    const scheduled = this.source.config?.recentOnly === true;
    const requestOpts = scheduled
      ? { ...opts, retries: 0, timeoutMs: Math.min(opts.timeoutMs ?? 10000, 10000) }
      : opts;
    const validate = opts.validate ?? notChallengePage;

    if (Date.now() < blockedUntil) {
      throw new Error(
        `acbar: cooling down after a full transport failure (retry after ${new Date(blockedUntil).toISOString()})`,
      );
    }

    // Fast path: a previous clearance cookie is still valid.
    if (clearedCookieHeader) {
      const headers = { ...browserHeaders(ACBAR_LIST_URL), Cookie: clearedCookieHeader, ...(opts.headers || {}) };
      if (!this.preferCurl) {
        try {
          return await super.fetchText(url, { ...requestOpts, retries: requestOpts.retries ?? 2, headers, validate });
        } catch {
          /* fall through to curl */
        }
      }
      if (await isCurlAvailable()) {
        try {
          const body = await this.curlWithDelay(url, headers, requestOpts);
          if (!isChallengeBody(body)) return body;
          // Clearance expired — force a fresh one below.
          clearedCookieHeader = null;
        } catch {
          clearedCookieHeader = null;
        }
      }
    }

    const headers = { ...browserHeaders(ACBAR_LIST_URL), ...(opts.headers || {}) };

    if (!this.preferCurl) {
      try {
        return await super.fetchText(url, {
          ...requestOpts,
          retries: requestOpts.retries ?? 3,
          headers,
          validate,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const blocked = /HTTP 40|HTTP 42|challenge page|bot protection|timed out|Unable to connect/i.test(msg);
        if (!blocked) throw e;
        // fall through to curl
      }
    }

    if (await isCurlAvailable()) {
      try {
        const body = await this.curlWithDelay(url, headers, requestOpts);
        if (!isChallengeBody(body)) return body;
      } catch {
        // A full run may still clear the interstitial in a browser below.
      }
    }

    if (scheduled) {
      throw new Error(`Fetch failed for ${url}: bot protection blocked the bounded native and curl attempts`);
    }

    // Last resort: clear the JS interstitial in a real browser, then retry
    // the cheap transports with the clearance cookie.
    const cookie = await browserClearance();
    if (cookie) {
      const cookieHeaders = { ...browserHeaders(ACBAR_LIST_URL), Cookie: cookie, ...(opts.headers || {}) };
      if (await isCurlAvailable()) {
        try {
          const body = await this.curlWithDelay(url, cookieHeaders, opts);
          if (!isChallengeBody(body)) return body;
        } catch {
          /* fall through to full render */
        }
      } else {
        try {
          return await super.fetchText(url, { ...opts, retries: 2, headers: cookieHeaders, validate });
        } catch {
          /* fall through to full render */
        }
      }
      // Still challenged — render this page in the browser directly.
      const rendered = await renderHtml(url, { timeoutMs: 30000, settleMs: 1500 });
      if (rendered && !isChallengeBody(rendered)) return rendered;
    }

    blockedUntil = Date.now() + BLOCK_COOLDOWN_MS;
    throw new Error(`Fetch failed for ${url}: bot protection blocked native fetch, curl and browser clearance (cooling down ${BLOCK_COOLDOWN_MS / 60000} min)`);
  }

  /** Single curl attempt with the scraper's crawl-delay politeness. */
  private async curlWithDelay(url: string, headers: Record<string, string>, opts: FetchOptions): Promise<string> {
    const timeoutMs =
      opts.timeoutMs ?? ((this.source.config as Record<string, unknown>).timeoutMs as number) ?? 15000;
    const delay = opts.crawlDelayMs ?? this.source.config.crawlDelayMs ?? 500;
    const body = await curlFetch(url, headers, timeoutMs);
    await sleep(delay); // respect the source
    return body;
  }

  /** Parse the list page — finds all /jobs/details/ links and paginates. */
  protected async parseListPage(html: string, pageUrl: string): Promise<ScrapePage> {
    const $ = cheerio.load(html);
    const listings: RawListing[] = [];

    // Each job card on the list page has at least one
    // <a href="https://www.acbar.org/en/jobs/details/ID/slug">.
    // Dedupe by href to avoid duplicates from multiple links per card.
    const seenHrefs = new Set<string>();
    $('a').each(function () {
      const href = $(this).attr('href') || '';
      if (!DETAIL_HREF_RE.test(href)) return;
      if (seenHrefs.has(href)) return;
      seenHrefs.add(href);

      const fullUrl = resolveUrl(href, pageUrl);
      if (!fullUrl) return;

      const title = $(this).text().replace(/\s+/g, ' ').trim();

      listings.push({
        title: title.length > 5 ? title : 'ACBAR Job Opportunity',
        sourceUrl: fullUrl,
        originalUrl: fullUrl,
        sourceName: 'ACBAR',
        sourceLanguage: 'en',
        jobType: 'job',
      });
    });

    // ── Pagination ─────────────────────────────────────────────────────────
    // Preferred: the explicit rel="next" link (present on every non-last page,
    // disabled <span> on the last one). Fallback: highest ?page=N link.
    let nextPage: string | null = null;

    const nextLink = $('a[rel="next"][href*="page="]').first().attr('href');
    if (nextLink) {
      nextPage = resolveUrl(nextLink, pageUrl);
    }

    if (!nextPage) {
      let maxPage = 0;
      $('a[href*="page="]').each(function () {
        const href = $(this).attr('href') || '';
        const match = href.match(/[?&]page=(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxPage) maxPage = num;
        }
      });

      const currentPageMatch = pageUrl.match(/[?&]page=(\d+)/);
      const currentPage = currentPageMatch ? parseInt(currentPageMatch[1], 10) : 1;

      if (maxPage > currentPage) {
        nextPage = resolveUrl(`?page=${currentPage + 1}`, pageUrl);
      }
    }

    return { listings, nextPage };
  }

  /**
   * Fetch the detail page and extract all fields using the ACBAR `.acbar-jd__*`
   * class structure (selectors verified against live pages).
   */
  public async parseDetail(listing: RawListing): Promise<RawListing> {
    try {
      const html = await this.fetchText(listing.sourceUrl);
      const $ = cheerio.load(html);

      // ── Title ──────────────────────────────────────────────────────────────
      const title = $('.acbar-jd__title').first().text().trim();
      if (title && title.length > 3) listing.title = title;

      // ── Organization + Logo ────────────────────────────────────────────────
      const org = $('.acbar-jd__org').first().text().trim();
      if (org) listing.organization = org;

      const logoSrc = $('.acbar-jd__logo img').first().attr('src');
      if (logoSrc) {
        const logoUrl = resolveUrl(logoSrc, listing.sourceUrl);
        listing.logoUrl = logoUrl;
        if (!listing.imageUrl) listing.imageUrl = logoUrl;
      }

      // ── Info table (dl > .acbar-jd__info-row > dt + dd) ───────────────────
      // This is the "Quick Summary" grid with Type, Location, Category, etc.
      const extracted: Record<string, string> = {};
      $('.acbar-jd__info-row').each(function () {
        const label = $(this).find('dt, .acbar-jd__info-term').text().trim();
        const value = $(this).find('dd, .acbar-jd__info-desc').text().trim();
        if (label && value) extracted[label] = value;
      });

      // Education and Experience sit outside the dl in their own
      // .acbar-jd__info-text blocks (h3 title + p value).
      $('.acbar-jd__info-text').each(function () {
        const label = $(this).find('h3, .acbar-jd__info-text-title').text().trim();
        const value = $(this).find('p, .acbar-jd__info-text-value').text().trim();
        if (label && value) extracted[label] = value;
      });

      // Map to RawListing fields
      listing.location        = extracted['Location']          || null;
      listing.salary          = extracted['Salary']            || null;
      listing.experience      = extracted['Experience']        || null;
      listing.educationReq    = extracted['Education']         || null;
      listing.publishedDate   = parseDate(extracted['Published']) || null;
      listing.country         = 'Afghanistan';

      // jobType: ACBAR uses "Full Time", "Part Time", etc.
      if (extracted['Type']) listing.jobType = extracted['Type'];

      // Category hint from the info table
      if (extracted['Category']) listing.category = extracted['Category'];

      // Store everything for future reference
      listing.extractedData = { ...extracted };

      // ── Deadline ───────────────────────────────────────────────────────────
      const deadlineText = $('.acbar-jd__deadline-value').first().text().trim();
      if (deadlineText) listing.deadline = parseDate(deadlineText) || null;

      // ── Article sections ───────────────────────────────────────────────────
      // Each content block is an <article class="acbar-jd__card"> with:
      //   h2.acbar-jd__card-title  → section name
      //   .acbar-jd__rich          → section body HTML
      const descParts: string[] = [];

      $('.acbar-jd__card').each(function () {
        const sectionTitle = $(this).find('.acbar-jd__card-title').first().text().trim().toLowerCase();
        const bodyEl = $(this).find('.acbar-jd__rich').first();
        let bodyHtml = bodyEl.html() || '';
        // Sanitize to prevent layout breakage on frontend
        bodyHtml = bodyHtml.replace(/style="[^"]*"/gi, '');
        bodyHtml = bodyHtml.replace(/width="[^"]*"/gi, '');
        bodyHtml = bodyHtml.replace(/height="[^"]*"/gi, '');

        const bodyText = stripHtml(bodyHtml);
        if (!bodyText.trim()) return;

        if (sectionTitle.includes('requirement') || sectionTitle.includes('qualification')) {
          listing.requirements = bodyText;
        } else if (sectionTitle.includes('submission') || sectionTitle.includes('guideline') || sectionTitle.includes('how to apply')) {
          listing.guidelines = bodyText;
          // Try to extract an email apply link from the guideline text
          if (!listing.applyUrl) {
            const emailMatch = bodyText.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
            if (emailMatch) listing.applyUrl = `mailto:${emailMatch[0]}`;
          }
        } else {
          // Job Summary / About the Company / any other section → description
          descParts.push(`<h3>${$(this).find('.acbar-jd__card-title').first().text().trim()}</h3>\n${bodyHtml}`);
        }
      });

      if (descParts.length) {
        listing.description = cleanHtmlWhitespace(sanitizeListingFragment(descParts.join('\n\n')));
      }

      // ── Apply link ─────────────────────────────────────────────────────────
      // Priority 1: explicit external form/survey link anywhere on the page
      if (!listing.applyUrl) {
        $('a[href]').each(function () {
          const href = $(this).attr('href') || '';
          if (
            (href.includes('forms.') || href.includes('docs.google.com') || href.includes('survey')) &&
            !href.startsWith('/')
          ) {
            listing.applyUrl = href;
            return false; // break
          }
        });
      }

      // Priority 2: mailto link on the page (skip ACBAR's own webinfo@ address)
      if (!listing.applyUrl) {
        $('a[href^="mailto:"]').each(function () {
          const href = $(this).attr('href') || '';
          if (!href.includes('webinfo@acbar.org') && !href.includes('info@acbar.org')) {
            listing.applyUrl = href;
            return false; // break
          }
        });
      }

      return listing;
    } catch (e) {
      console.error(`[acbar] detail parse error for ${listing.sourceUrl}:`, e);
      return listing;
    }
  }
}
