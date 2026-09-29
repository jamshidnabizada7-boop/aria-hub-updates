/**
 * BaseScraper — abstract foundation for all import scrapers.
 *
 * Subclasses implement `parseListPage()` and (optionally) `parseDetail()`.
 * Adding a new source website = create one subclass + register it in
 * `registry.ts`. Everything else (fetching, retries, pagination, crawl delay,
 * caching) is handled here.
 */

import { DEFAULT_USER_AGENT, sanitizeError, sleep } from './utils';
import type { FetchOptions, RawListing, ScrapePage, SourceHandle } from './types';

/** In-memory cache keyed by URL: stores body + etag to avoid refetching. */
interface CacheEntry { body: string; etag?: string; at: number; }
const fetchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_ENTRIES = 300; // unbounded Map used to grow for the life of the process

/** Keep the cache bounded: drop the oldest entries beyond the cap. */
function trimFetchCache(): void {
  while (fetchCache.size > CACHE_MAX_ENTRIES) {
    const oldest = fetchCache.keys().next().value;
    if (oldest === undefined) break;
    fetchCache.delete(oldest);
  }
}

export abstract class BaseScraper {
  public source: SourceHandle;
  public deadline: number = 0; // if set > 0, scraping will break early

  constructor(protected src: SourceHandle) {
    this.source = src;
  }

  /** Parse a single page of the source's list view. Must return nextPage (abs URL or null). */
  protected abstract parseListPage(html: string, pageUrl: string): Promise<ScrapePage> | ScrapePage;

  /**
   * Optionally fetch and parse the detail page for a listing to enrich it
   * (full description, eligibility, etc.). Default: no-op (return as-is).
   */
  public async parseDetail(listing: RawListing): Promise<RawListing> {
    return listing;
  }

  /**
   * Fetch HTML/text from a URL with retries, timeout, crawl-delay, and caching.
   * Throws on final failure so the caller can record a per-listing error.
   */
  async fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
    const retries = opts.retries ?? 2;
    const timeoutMs = opts.timeoutMs ?? (this.source.config as any)?.timeoutMs ?? 8000;
    const delay = opts.crawlDelayMs ?? (this.source.config as any)?.crawlDelayMs ?? 500;

    const cached = fetchCache.get(url);
    const fresh = cached && Date.now() - cached.at < CACHE_TTL_MS;
    if (fresh) return cached.body;

    let lastErr: unknown;
    const headers: Record<string, string> = {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en,fa;q=0.9,ps;q=0.8',
      ...(opts.headers || {}),
    };
    if (cached?.etag) headers['If-None-Match'] = cached.etag;
    
    // ScraperAPI integration — only activated when SCRAPER_API_KEY env var is explicitly set.
    // Never fall back to a hardcoded key: an expired/rate-limited key causes 100% fetch failures.
    const apiKey = process.env.SCRAPER_API_KEY || '';
    const targetUrl = apiKey
      ? `http://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(url)}`
      : url;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(targetUrl, { headers, signal: controller.signal, redirect: 'follow' });
        if (res.status === 304 && cached) return cached.body;
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const body = await res.text();
        // Bot-protection interstitials answer 200 with a challenge page — treat
        // them as retryable failures instead of caching/returning junk markup.
        if (opts.validate && !opts.validate(body)) {
          throw new Error('challenge page (bot protection interstitial)');
        }
        fetchCache.set(url, { body, etag: res.headers.get('etag') || undefined, at: Date.now() });
        trimFetchCache();
        await sleep(delay); // respect the source
        return body;
      } catch (e) {
        lastErr = e;
        // Longer backoff when blocked (403/429/challenge): 2s, 4s, 8s...
        // Normal errors use: 500ms, 1s, 2s...
        const blocked = /HTTP (403|429)|challenge page|bot protection/i.test(
          e instanceof Error ? e.message : String(e),
        );
        const baseDelay = blocked ? 2000 : 500;
        if (attempt < retries) await sleep(baseDelay * Math.pow(2, attempt));
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error(`Fetch failed for ${url}: ${sanitizeError(lastErr)}`);
  }

  /** Fetch and parse JSON (used by API-based scrapers like WordPress REST). */
  async fetchJson<T = unknown>(url: string, opts: FetchOptions = {}): Promise<{ data: T; headers: Headers }> {
    const retries = opts.retries ?? 2;
    const timeoutMs = opts.timeoutMs ?? this.source.config.timeoutMs ?? 30_000;
    const delay = opts.crawlDelayMs ?? this.source.config.crawlDelayMs ?? 1000;
    const headers: Record<string, string> = {
      'User-Agent': DEFAULT_USER_AGENT,
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      ...(opts.headers || {}),
    };

    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { headers, signal: controller.signal, redirect: 'follow' });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const data = (await res.json()) as T;
        await sleep(delay);
        return { data, headers: res.headers };
      } catch (e) {
        lastErr = e;
        if (attempt < retries) await sleep(500 * Math.pow(2, attempt));
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error(`Fetch failed for ${url}: ${sanitizeError(lastErr)}`);
  }

  /** Yield each page before fetching the next, so scheduled imports can save
   * fresh listings within the serverless time budget. */
  async *scrapePages(): AsyncGenerator<ScrapePage> {
    const maxPages = this.source.config.maxPages ?? 10;
    let nextUrl: string | null | undefined = this.source.baseUrl;
    const visited = new Set<string>();
    let foundAny = false;

    for (let page = 0; page < maxPages && nextUrl; page++) {
      if (this.deadline > 0 && Date.now() > this.deadline) {
        console.warn(`[import] Scraper deadline exceeded (${this.deadline}), stopping at page ${page}`);
        break;
      }
      // Guard against pagination loops (a scraper returning the same nextPage)
      if (visited.has(nextUrl)) break;
      visited.add(nextUrl);
      
      let scrapePage: ScrapePage;
      try {
        const body = await this.fetchText(nextUrl);
        scrapePage = await this.parseListPage(body, nextUrl);
      } catch (e) {
        // If we fail on the very first page, throw so the run is marked as error
        if (!foundAny) throw e;
        // Otherwise, record the page failure but keep going with whatever we have.
        console.error(`[import] list page failed (${nextUrl}):`, sanitizeError(e));
        break;
      }

      if (!scrapePage.listings.length) break;

      foundAny = true;
      yield scrapePage;
      nextUrl = scrapePage.nextPage || null;
    }
  }

  /** Crawl all listing pages and return the full flattened set. */
  async scrapeAll(): Promise<RawListing[]> {
    const all: RawListing[] = [];
    for await (const page of this.scrapePages()) all.push(...page.listings);
    return all;
  }
}
