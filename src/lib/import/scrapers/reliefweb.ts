/**
 * ReliefWeb Jobs API v2 scraper (`reliefweb`).
 *
 * Endpoint: POST https://api.reliefweb.int/v2/jobs?appname=<approved>
 * Body:
 *   {
 *     "limit": 50,
 *     "filter": { "field": "country", "value": ["Afghanistan"] },
 *     "sort": ["date:desc"],
 *     "fields": { "include": [...] }
 *   }
 *
 * IMPORTANT — appname approval:
 *   The v2 API REJECTS requests whose `appname` is not pre-approved with
 *   HTTP 403 "You are not using an approved appname". (The old v1 API is
 *   decommissioned → HTTP 410.) The appname comes from
 *   ImportSource.config.reliefwebAppname or env RELIEFWEB_APPNAME.
 *   The OWNER can request a free appname at https://apidoc.reliefweb.int.
 *
 *   Until an approved appname exists, every run ends GRACEFULLY:
 *   run status "stopped", source lastRunStatus "pending", and lastRunStats
 *   carries the message "pending ReliefWeb appname approval …". Nothing
 *   breaks, and the panel shows the pending state.
 *
 * Field mapping:
 *   title                 → title
 *   url_alias             → sourceUrl  (prefixed with https://reliefweb.int)
 *   date.created          → publishedDate
 *   closing_date          → deadline (string or {from,to} — defensive)
 *   city[].name           → location
 *   country[].name        → country
 *   source[].shortname    → organization (fallback: source[].name)
 *   description / body    → description (HTML stripped)
 *   how_to_apply          → guidelines
 *   type / level / experience → extractedData (names)
 */

import { BaseScraper } from '../base-scraper';
import { parseDate, sanitizeError, sleep, stripHtml } from '../utils';
import type { RawListing, ScrapePage } from '../types';

/** Raised when the API refuses our (missing/unapproved) appname. */
export class ReliefWebPendingError extends Error {
  constructor(message = 'pending ReliefWeb appname approval — request a free appname at https://apidoc.reliefweb.int') {
    super(message);
    this.name = 'ReliefWebPendingError';
  }
}

interface RwItem {
  id?: number;
  title?: string;
  url_alias?: string;
  date?: { created?: string; changed?: string };
  closing_date?: string | { from?: string; to?: string } | null;
  city?: Array<{ name?: string } | string> | null;
  country?: Array<{ name?: string } | string> | null;
  source?: Array<{ name?: string; shortname?: string }> | null;
  description?: string | null;
  body?: string | null;
  how_to_apply?: string | null;
  type?: Array<{ name?: string } | string> | null;
  level?: Array<{ name?: string } | string> | null;
  experience?: Array<{ name?: string } | string> | null;
}

/** Field set we ask for. The API rejects unknown fields with 400 + a list of
 * valid ones, so we retry with the minimal guaranteed set. */
const FULL_FIELDS = [
  'title', 'url_alias', 'date', 'city', 'source', 'country',
  'description', 'body', 'how_to_apply', 'closing_date', 'type', 'level', 'experience',
];
const MIN_FIELDS = ['title', 'url_alias', 'date', 'city', 'source'];

export class ReliefWebScraper extends BaseScraper {
  /** BaseScraper's GET crawl loop doesn't apply to a POST JSON API. */
  public async scrapeAll(): Promise<RawListing[]> {
    const cfg = this.source.config as Record<string, unknown>;
    const appname =
      (typeof cfg.reliefwebAppname === 'string' && cfg.reliefwebAppname.trim()) ||
      (process.env.RELIEFWEB_APPNAME || '').trim();

    // No appname configured yet — skip the network hop and report pending.
    if (!appname) throw new ReliefWebPendingError();

    const limit = Math.min(Math.max(Number(cfg.limit) || 50, 1), 200);
    const country = typeof cfg.country === 'string' && cfg.country.trim() ? cfg.country.trim() : 'Afghanistan';

    const base = {
      limit,
      filter: { field: 'country', value: [country] },
      sort: ['date:desc'],
    };

    let items: RwItem[];
    try {
      items = await this.postJobs(appname, { ...base, fields: { include: FULL_FIELDS } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Unknown/invalid fields → retry with the guaranteed minimal set.
      if (/HTTP 400/.test(msg) || /invalid/i.test(msg)) {
        items = await this.postJobs(appname, { ...base, fields: { include: MIN_FIELDS } });
      } else {
        throw e;
      }
    }

    return items
      .map((item) => this.mapItem(item))
      .filter((l): l is RawListing => l !== null);
  }

  /** POST /v2/jobs with retries; returns the data array. */
  private async postJobs(appname: string, body: Record<string, unknown>): Promise<RwItem[]> {
    const cfg = this.source.config as Record<string, unknown>;
    const timeoutMs = Number(cfg.timeoutMs) || 20000;
    const retries = 2;
    const url = `https://api.reliefweb.int/v2/jobs?appname=${encodeURIComponent(appname)}`;
    let lastErr: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (res.status === 403) {
          // Unapproved appname — parse the API's message and report pending.
          let apiMsg = '';
          try {
            const err = (await res.json()) as { error?: { message?: string } };
            apiMsg = err?.error?.message || '';
          } catch { /* body wasn't JSON */ }
          throw new ReliefWebPendingError(
            `pending ReliefWeb appname approval — API said: ${apiMsg || '403 not an approved appname'}. Request one at https://apidoc.reliefweb.int`,
          );
        }
        if (res.status === 410) {
          throw new Error('ReliefWeb API v1 is decommissioned (HTTP 410); v2 requires an approved appname.');
        }
        if (!res.ok) {
          let detail = '';
          try {
            const err = (await res.json()) as { error?: { message?: string } };
            detail = err?.error?.message || '';
          } catch { /* ignore */ }
          throw new Error(`HTTP ${res.status} ${res.statusText}${detail ? `: ${detail}` : ''}`);
        }

        const json = (await res.json()) as { data?: RwItem[] } | RwItem[];
        const items = Array.isArray(json) ? json : json.data || [];
        await sleep(500);
        return items;
      } catch (e) {
        if (e instanceof ReliefWebPendingError) throw e;
        lastErr = e;
        if (attempt < retries) await sleep(800 * Math.pow(2, attempt));
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error(`ReliefWeb request failed: ${sanitizeError(lastErr)}`);
  }

  /** Map one API item to a RawListing (null when unusable). */
  private mapItem(item: RwItem): RawListing | null {
    const title = (item.title || '').replace(/\s+/g, ' ').trim();
    const alias = item.url_alias || '';
    if (!title || !alias) return null;

    const sourceUrl = alias.startsWith('http') ? alias : `https://reliefweb.int${alias}`;
    const names = (v: RwItem['city'] | RwItem['country'] | RwItem['type'] | RwItem['level'] | RwItem['experience']): string[] =>
      (v || [])
        .map((x) => (typeof x === 'string' ? x : x?.name || ''))
        .filter(Boolean);
    const closing =
      typeof item.closing_date === 'string'
        ? item.closing_date
        : item.closing_date?.from || item.closing_date?.to || null;
    const description = stripHtml(item.description || item.body || '');

    return {
      title,
      sourceUrl,
      originalUrl: sourceUrl,
      applyUrl: sourceUrl,
      sourceName: this.source.name,
      sourceLanguage: 'en',
      jobType: 'job',
      organization: item.source?.[0]?.shortname || item.source?.[0]?.name || null,
      country: names(item.country)[0] || null,
      location: names(item.city).join(', ') || null,
      publishedDate: parseDate(item.date?.created || ''),
      deadline: parseDate(closing || ''),
      description: description || null,
      guidelines: item.how_to_apply ? stripHtml(item.how_to_apply) : null,
      extractedData: {
        reliefwebId: item.id ?? null,
        employmentType: names(item.type).join(', ') || null,
        careerLevel: names(item.level).join(', ') || null,
        experience: names(item.experience).join(', ') || null,
      },
    };
  }

  /** Never used (scrapeAll is overridden) — required abstract, stays inert. */
  protected parseListPage(_html: string, _pageUrl: string): ScrapePage {
    return { listings: [], nextPage: null };
  }
}
