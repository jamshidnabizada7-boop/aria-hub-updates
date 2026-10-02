/**
 * Generic WordPress REST API scraper (`wpApi`).
 *
 * Works with ANY WordPress site that exposes the standard `wp-json/wp/v2`
 * posts endpoint (OpportunityDesk, Mladiinfo, ScholarshipRoar, and thousands
 * more) — no per-site code needed, everything is driven by ImportSource.config:
 *
 *   config: {
 *     apiBase?: string,           // full posts endpoint; default derived from baseUrl
 *                                 //   <baseUrl>/wp-json/wp/v2/posts
 *     perPage?: number,           // per_page param (default 20, WP max 100)
 *     maxPages?: number,          // pages to crawl (BaseScraper loop)
 *     categoryInclude?: string[], // keep only posts having an embedded term
 *                                 //   whose name matches one of these (case-
 *                                 //   insensitive, substring-tolerant)
 *     (defaultDeadlineDays is no longer used — invented deadlines removed)
 *     autoDetectType?: boolean,   // jobType from title keywords
 *     crawlDelayMs?: number,
 *     timeoutMs?: number,
 *   }
 *
 * Extraction per post:
 *   title.rendered        → title (entity-decoded, tags stripped)
 *   link                  → sourceUrl / applyUrl / originalUrl
 *   excerpt.rendered      → description fallback (plain text)
 *   content.rendered      → description (boilerplate-stripped HTML → text)
 *   date_gmt              → publishedDate (ISO)
 *   _embedded["wp:featuredmedia"][0].source_url → imageUrl
 *   _embedded["wp:term"]  → category hint (first few term names)
 *
 * Pagination: standard WP `page=`/`per_page=` params. When the requested page
 * exceeds the total, WP answers 4xx — BaseScraper treats a non-first-page
 * failure as "stop paging" and keeps what it has.
 */

import * as cheerio from 'cheerio';
import { BaseScraper } from '../base-scraper';
import { htmlToExcerpt, parseDate, sleep, stripHtml, stripTextJunk } from '../utils';
import { browserHeaders, isChallengePage } from './browser-headers';
import { curlFetch, isCurlAvailable } from './curl-fallback';
import type { FetchOptions, RawListing, ScrapePage } from '../types';
import { classifyApplyUrl, isRealApplyLink } from '@/lib/apply';

/** Minimal shape of the WP REST post payload we consume. */
interface WpPost {
  id?: number;
  link?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  date_gmt?: string;
  date?: string;
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url?: string } | undefined>;
    'wp:term'?: Array<Array<{ name?: string } | undefined> | undefined>;
  };
}

/** Decode ALL HTML entities (named + numeric) via the DOM parser. */
export function decodeEntities(html: string): string {
  if (!html || !html.includes('&')) return html || '';
  try {
    return cheerio.load(`<div>${html}</div>`)('div').text();
  } catch {
    return html;
  }
}

/** Remove common WP feed/page boilerplate ("The post X first appeared on Y"). */
function stripWpBoilerplate(text: string): string {
  return (text || '')
    .replace(/<p[^>]*>\s*The post\s[\s\S]*?first appeared on\s[\s\S]*?<\/p>/gi, '')
    .replace(/The post\s[\s\S]{0,300}?first appeared on\s[\s\S]{0,120}?\.?\s*$/gi, '')
    .replace(/<p[^>]*>\s*The post\s[\s\S]*?<\/p>\s*$/gi, '');
}

/**
 * Extract an EXPLICIT application deadline stated inside the post body.
 * Most scholarship/opportunity WP sites publish a "Deadline: 30 September 2026"
 * line — far more accurate than the publishedDate + N days fallback.
 * Returns an ISO `YYYY-MM-DD` string or null.
 */
export function extractDeadlineFromText(text: string): string | null {
  if (!text) return null;
  // window after the keyword "deadline" on the same line (≤ 70 chars)
  for (const m of text.matchAll(/deadline[^\n]{0,70}/gi)) {
    const tail = m[0]
      .replace(/^deadline[^a-z0-9]{0,40}/i, ' ')   // "Deadline:", "Deadline for applications:" etc.
      .replace(/\b(is|are|was|date|until|to|by)\b\s*/gi, ' ')
      .trim();
    if (!tail) continue;
    const parsed = parseDate(tail.slice(0, 40));
    if (parsed) return parsed;
  }
  return null;
}

export class WpApiScraper extends BaseScraper {
  /**
   * Some WordPress hosts (e.g. opportunitydesk.org behind Cloudflare) reject
   * the TLS fingerprint of Node/Bun fetch with 403 while curl passes. After
   * the first native-fetch failure we switch to the curl transport.
   */
  private preferCurl = false;

  /**
   * Hybrid fetch: native fetch first (browser fingerprint headers), curl
   * fallback when blocked. The JSON API doesn't need challenge detection,
   * but 200-status interstitials are still rejected so they never get
   * JSON-parsed into an empty run.
   */
  async fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
    const referer = `${this.source.baseUrl.replace(/\/+$/, '')}/`;
    const headers = { ...browserHeaders(referer), ...(opts.headers || {}) };

    if (!this.preferCurl) {
      try {
        const body = await super.fetchText(url, { ...opts, headers, retries: opts.retries ?? 1 });
        // Native fetch sometimes answers 200 with an HTML bot interstitial
        // instead of JSON — treat that as a block so curl takes over.
        if (/^\s*</.test(body)) throw new Error('HTML response instead of JSON (bot interstitial?)');
        return body;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const blocked = /HTTP 40|HTTP 41|HTTP 42|challenge page|bot protection|Fetch failed|HTML response/i.test(msg);
        if (!blocked) throw e;
        this.preferCurl = true;
      }
    }
    if (await isCurlAvailable()) {
      const timeoutMs = (opts.timeoutMs ?? Number((this.source.config as Record<string, unknown>).timeoutMs)) || 25000;
      const body = await curlFetch(url, headers, timeoutMs);
      if (isChallengePage(body)) throw new Error(`challenge page (Cloudflare) for ${url} even via curl`);
      await sleep(Number((this.source.config as Record<string, unknown>).crawlDelayMs) || 500);
      return body;
    }
    // No curl binary — surface the original native failure.
    return super.fetchText(url, { ...opts, headers });
  }

  /** Build the endpoint for one page of results. */
  private buildUrl(page: number): string {
    const cfg = this.source.config as Record<string, unknown>;
    const apiBase =
      (typeof cfg.apiBase === 'string' && cfg.apiBase.trim()) ||
      `${this.source.baseUrl.replace(/\/+$/, '')}/wp-json/wp/v2/posts`;
    const perPage = Math.min(Math.max(Number(cfg.perPage) || 20, 1), 100);
    const sep = apiBase.includes('?') ? '&' : '?';
    return `${apiBase}${sep}page=${page}&per_page=${perPage}&_embed=1`;
  }

  /**
   * Crawl the API endpoint(s). Overridden because BaseScraper starts at
   * `baseUrl` (often the human-readable homepage, i.e. HTML) while this
   * scraper must start at the JSON endpoint and count pages itself.
   */
  public async scrapeAll(): Promise<RawListing[]> {
    const cfg = this.source.config as Record<string, unknown>;
    const maxPages = Math.max(Number(cfg.maxPages) || 3, 1);
    const all: RawListing[] = [];

    for (let page = 1; page <= maxPages; page++) {
      if (this.deadline > 0 && Date.now() > this.deadline) {
        console.warn(`[wp-api] scraper deadline exceeded, stopping at page ${page}`);
        break;
      }
      const url = this.buildUrl(page);
      let body: string;
      try {
        body = await this.fetchText(url);
      } catch (e) {
        // WP answers 400/404 for pages beyond the last one — stop paging
        // gracefully. A failure on page 1 is fatal (unreachable/misconfigured).
        if (page === 1) throw e;
        console.warn(`[wp-api] page ${page} failed (${e instanceof Error ? e.message : String(e)}) — stopping.`);
        break;
      }
      const { listings, nextPage } = await this.parseListPage(body, url);
      all.push(...listings);
      // nextPage === null ⇔ this page came back under-filled (last page).
      if (!nextPage || !listings.length) break;
    }
    return all;
  }

  /** Parse one page of the WP REST JSON response (delivered as text). */
  protected async parseListPage(body: string, pageUrl: string): Promise<ScrapePage> {
    const cfg = this.source.config as Record<string, unknown>;

    // Safe JSON parse — some hosts prepend BOM/whitespace or answer with an
    // HTML error page; any failure yields an empty page (BaseScraper stops).
    let posts: WpPost[];
    try {
      const parsed: unknown = JSON.parse(body.trim());
      posts = Array.isArray(parsed) ? (parsed as WpPost[]) : [];
    } catch {
      console.error(`[wp-api] non-JSON response from ${pageUrl} (starts: ${body.trim().slice(0, 80)})`);
      return { listings: [], nextPage: null };
    }

    const include = Array.isArray(cfg.categoryInclude)
      ? (cfg.categoryInclude as unknown[]).map((c) => String(c).toLowerCase().trim()).filter(Boolean)
      : [];

    const listings: RawListing[] = [];
    for (const post of posts) {
      try {
        const listing = this.mapPost(post, include);
        if (listing) listings.push(listing);
      } catch (e) {
        console.error(`[wp-api] post ${post?.id} parse failed:`, e instanceof Error ? e.message : e);
      }
    }

    // Next page: fewer posts than perPage means we hit the end. WP also
    // answers 4xx on overflow, which BaseScraper handles by breaking.
    const perPage = Math.min(Math.max(Number(cfg.perPage) || 20, 1), 100);
    const pageMatch = pageUrl.match(/[?&]page=(\d+)/);
    const currentPage = pageMatch ? parseInt(pageMatch[1], 10) : 1;
    return {
      listings,
      nextPage: posts.length >= perPage ? this.buildUrl(currentPage + 1) : null,
    };
  }

  /**
   * Map a WP post to a RawListing. Returns null when the post is filtered out
   * (categoryInclude mismatch) or has no usable title/link.
   */
  private mapPost(post: WpPost, include: string[]): RawListing | null {
    const link = post.link?.trim();
    const title = decodeEntities(post.title?.rendered || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!link || !title) return null;

    // Term names from all _embedded["wp:term"] groups (categories + tags).
    const termNames: string[] = [];
    for (const group of post._embedded?.['wp:term'] || []) {
      for (const term of group || []) {
        if (term?.name) termNames.push(String(term.name).trim());
      }
    }

    // Category include filter: keep the post when any embedded term name
    // equals (or contains) one of the configured include names.
    if (include.length) {
      const matched = termNames.some((name) => {
        const n = name.toLowerCase();
        return include.some((inc) => n === inc || n.includes(inc));
      });
      if (!matched) return null;
    }

    // Content → description. Boilerplate strip, then plain text (the site
    // renders opportunity bodies as pre-line text, not HTML).
    const rawContent = post.content?.rendered || post.excerpt?.rendered || '';
    // Preserve explicit application anchors before HTML stripping removes hrefs.
    // A source article URL remains an internal fallback, never a public Apply button.
    let applyUrl = link;
    try {
      const $content = cheerio.load(rawContent);
      $content('a[href]').each((_, element) => {
        if (applyUrl !== link) return;
        const label = $content(element).text().replace(/\s+/g, ' ').trim();
        if (!/\b(apply|application|submit|register)\b/i.test(label)) return;
        const href = $content(element).attr('href');
        if (!href) return;
        let candidate: string;
        try { candidate = new URL(href, link).toString(); } catch { return; }
        if (isRealApplyLink(classifyApplyUrl(candidate, link, link))) applyUrl = candidate;
      });
    } catch { /* Keep the source article fallback when HTML is malformed. */ }
    const description =
      stripHtml(stripTextJunk(stripWpBoilerplate(rawContent))) ||
      htmlToExcerpt(post.excerpt?.rendered || '');

    const publishedDate = parseDate(post.date_gmt || post.date);

    // Deadline: only an explicit "Deadline: <date>" line in the body counts.
    // The old publishedDate + N days heuristic INVENTED deadlines that could
    // be wrong by weeks and were shown to users as real — listings without a
    // stated deadline now stay deadline-less (rendered as rolling/open).
    const deadline = extractDeadlineFromText(description);

    // Featured image from _embedded["wp:featuredmedia"].
    const media = post._embedded?.['wp:featuredmedia']?.find((m) => m?.source_url);
    const imageUrl = media?.source_url || null;

    const category = termNames.slice(0, 3).join(', ') || null;
    const jobType = this.detectType(title, this.source.config as Record<string, unknown>);

    return {
      title,
      sourceUrl: link,
      originalUrl: link,
      applyUrl,
      sourceName: this.source.name,
      sourceLanguage: 'en',
      jobType,
      category,
      description,
      publishedDate,
      deadline,
      imageUrl,
      country: null,
      organization: null,
      extractedData: {
        wpPostId: post.id ?? null,
        terms: termNames.slice(0, 10),
      },
    } as RawListing;
  }

  /** jobType from title keywords when config.autoDetectType is on. */
  private detectType(title: string, cfg: Record<string, unknown>): string {
    if (cfg.autoDetectType !== true) return (this.source.type as string) || 'scholarship';
    const t = title.toLowerCase();
    if (t.includes('scholarship')) return 'scholarship';
    if (t.includes('fellowship')) return 'fellowship';
    if (t.includes('training') || t.includes('workshop')) return 'training';
    if (t.includes('grant')) return 'grant';
    if (t.includes('competition') || t.includes('contest') || t.includes('award')) return 'competition';
    if (t.includes('conference') || t.includes('summit')) return 'conference';
    if (t.includes('internship')) return 'internship';
    if (t.includes('job') || t.includes('vacanc')) return 'job';
    return 'scholarship';
  }
}
