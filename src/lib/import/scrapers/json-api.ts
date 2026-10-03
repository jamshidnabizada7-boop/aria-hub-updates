/**
 * Generic JSON-API adapter (Phase 7).
 *
 * For organizations exposing a JSON endpoint (their own API or a hosted
 * board). Zero code per source — just an ImportSource row:
 *
 * config: {
 *   "listUrl": "https://example.org/api/vacancies.json",  // defaults to baseUrl
 *   "itemsPath": "data.jobs",          // dot-path to the array; empty = root array
 *   "detailFetch": false,
 *   "fields": {
 *     "title":         "title",
 *     "url":           "absolute_url",
 *     "organization":  "employer.name",  // optional
 *     "location":      "location.label", // optional
 *     "deadline":      "closing_date",   // optional
 *     "apply":         "apply_url",      // optional
 *     "description":   "description",    // optional (HTML → text)
 *     "requirements":  "requirements",   // optional
 *     "responsibilities": "duties",      // optional
 *     "publishedDate": "published_at",   // optional
 *     "vacancyNumber": "reference"       // optional — enables Level-A dedupe
 *   },
 *   "nextPagePath": "links.next"       // optional: dot-path to next URL
 * }
 */
import { BaseScraper } from '../base-scraper';
import { parseDate, stripHtml } from '../utils';
import type { RawListing, ScrapePage } from '../types';

/** Resolve "a.b.0.c" against an object; returns undefined on any miss. */
function dotPath(obj: unknown, path?: string): unknown {
  if (!path) return undefined;
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function toText(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return stripHtml(value).replace(/\s+\n/g, '\n').trim() || undefined;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    const joined = value.map((v) => toText(v)).filter(Boolean).join('\n').trim();
    return joined || undefined;
  }
  if (typeof value === 'object') {
    // common shapes: {name}, {label}, {title}
    const o = value as Record<string, unknown>;
    return toText(o.name ?? o.label ?? o.title);
  }
  return undefined;
}

function absoluteUrl(value: unknown, base: string): string | undefined {
  const raw = typeof value === 'string' ? value.trim() : undefined;
  if (!raw) return undefined;
  if (/^mailto:/i.test(raw)) return raw;
  try {
    return new URL(raw, base).toString();
  } catch {
    return undefined;
  }
}

export class JsonApiScraper extends BaseScraper {
  protected parseListPage(text: string, pageUrl: string): ScrapePage {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`jsonApi: response is not JSON (${pageUrl})`);
    }
    const cfg = this.source.config as Record<string, unknown>;
    const fields = (cfg.fields ?? {}) as Record<string, string>;
    const itemsRaw = cfg.itemsPath ? dotPath(json, String(cfg.itemsPath)) : json;
    if (!Array.isArray(itemsRaw)) {
      throw new Error(`jsonApi: itemsPath "${String(cfg.itemsPath ?? '<root>')}" did not resolve to an array`);
    }

    const listings: RawListing[] = [];
    for (const item of itemsRaw.slice(0, 500)) {
      if (item == null || typeof item !== 'object') continue;
      const title = toText(dotPath(item, fields.title));
      const url = absoluteUrl(dotPath(item, fields.url), pageUrl);
      if (!title || !url) continue;

      const apply = absoluteUrl(dotPath(item, fields.apply), pageUrl);
      const deadline = parseDate(toText(dotPath(item, fields.deadline)) ?? '') || undefined;
      const vacancy = toText(dotPath(item, fields.vacancyNumber));
      const extracted: Record<string, unknown> = { adapter: 'jsonApi' };
      if (vacancy) extracted.vacancyNumber = vacancy;

      listings.push({
        title,
        organization: toText(dotPath(item, fields.organization)) || this.source.name,
        location: toText(dotPath(item, fields.location)),
        deadline,
        publishedDate: toText(dotPath(item, fields.publishedDate)),
        description: toText(dotPath(item, fields.description)),
        requirements: toText(dotPath(item, fields.requirements)),
        responsibilities: toText(dotPath(item, fields.responsibilities)),
        applyUrl: apply,
        sourceUrl: url,
        originalUrl: url,
        sourceName: this.source.name,
        extractedData: extracted,
      });
    }

    const nextRaw = dotPath(json, typeof cfg.nextPagePath === 'string' ? cfg.nextPagePath : '');
    const nextPage = absoluteUrl(nextRaw, pageUrl) ?? null;
    return { listings, nextPage };
  }
}
