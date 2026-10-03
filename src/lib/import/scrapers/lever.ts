/**
 * Lever job-board adapter (Phase 7).
 *
 * Public postings API — no auth, no key:
 *   GET https://api.lever.co/v0/postings/{org}?mode=json
 *
 * config: { "org": "nrc" } — when omitted, the org is derived from the
 * baseUrl (https://jobs.lever.co/<org> → "<org>").
 *
 * Lever's posting id is recorded as extractedData.vacancyNumber for Level-A
 * canonical matching. applyUrl is Lever's own /apply link when present —
 * a genuine direct application destination.
 */
import { BaseScraper } from '../base-scraper';
import type { RawListing, ScrapePage } from '../types';

interface LeverPosting {
  id?: string;
  text?: string;
  hostedUrl?: string;
  applyUrl?: string | null;
  descriptionPlain?: string | null;
  description?: string | null;
  createdAt?: number;
  categories?: {
    location?: string | null;
    commitment?: string | null;
    team?: string | null;
    department?: string | null;
  } | null;
  lists?: Array<{ text?: string; content?: Array<string | { content?: string }> }> | null;
}

/** Collect list sections whose heading matches (e.g. "Requirements"). */
function sectionText(posting: LeverPosting, match: RegExp): string | undefined {
  const lists = Array.isArray(posting.lists) ? posting.lists : [];
  const parts: string[] = [];
  for (const list of lists) {
    const heading = String(list.text ?? '');
    if (!match.test(heading)) continue;
    const items = Array.isArray(list.content) ? list.content : [];
    for (const item of items) {
      const text = typeof item === 'string' ? item : String(item?.content ?? '');
      if (text.trim()) parts.push(`• ${text.trim().replace(/<[^>]+>/g, '')}`);
    }
  }
  return parts.length ? parts.join('\n') : undefined;
}

export class LeverScraper extends BaseScraper {
  private apiUrl(): string {
    const cfg = this.source.config as Record<string, unknown>;
    let org = String(cfg.org ?? cfg.leverOrg ?? '').trim();
    if (!org) {
      try {
        const path = new URL(this.source.baseUrl).pathname;
        org = path.split('/').filter(Boolean)[0] ?? '';
      } catch { /* baseUrl malformed — handled below */ }
    }
    if (!org) throw new Error('lever: config.org (or a baseUrl ending in the org) is required');
    return `https://api.lever.co/v0/postings/${encodeURIComponent(org)}?mode=json`;
  }

  protected parseListPage(text: string, pageUrl: string): ScrapePage {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`lever: response is not JSON (${pageUrl})`);
    }
    if (!Array.isArray(data)) {
      throw new Error('lever: expected a postings array (check the org name)');
    }

    const listings: RawListing[] = [];
    for (const posting of data as LeverPosting[]) {
      const title = String(posting.text ?? '').trim();
      const url = String(posting.hostedUrl ?? '').trim();
      if (!title || !url) continue;
      const apply = String(posting.applyUrl ?? '').trim() || url;
      const description = String(posting.descriptionPlain ?? posting.description ?? '').trim() || undefined;
      const publishedDate = posting.createdAt ? new Date(posting.createdAt).toISOString() : undefined;
      const location = posting.categories?.location || undefined;
      const commitment = posting.categories?.commitment || undefined;
      const extracted: Record<string, unknown> = { adapter: 'lever' };
      if (posting.id) extracted.vacancyNumber = posting.id;
      if (commitment) extracted.commitment = commitment;

      listings.push({
        title,
        organization: this.source.name,
        location,
        publishedDate,
        description,
        requirements: sectionText(posting, /require|qualif/i) || undefined,
        responsibilities: sectionText(posting, /responsibilit|duties|what you.ll do/i) || undefined,
        applyUrl: apply,
        sourceUrl: url,
        originalUrl: url,
        sourceName: this.source.name,
        extractedData: extracted,
      });
    }

    // The v0 API has no cursor in the payload; one fetch returns the full board.
    return { listings, nextPage: null };
  }
}
