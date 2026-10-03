/**
 * Greenhouse job-board adapter (Phase 7).
 *
 * Public boards API — no auth, no key:
 *   GET https://boards-api.greenhouse.io/v1/boards/{boardToken}/jobs?content=true
 *
 * config: { "boardToken": "unicef" }  (boardToken required; the baseUrl is
 * only used as the human board URL, e.g. https://job-boards.greenhouse.io/unicef)
 *
 * The job's own id is recorded as extractedData.vacancyNumber, which powers
 * the canonical resolver's Level-A (organization + vacancy number) matching.
 */
import { BaseScraper } from '../base-scraper';
import { stripHtml } from '../utils';
import type { RawListing, ScrapePage } from '../types';

interface GreenhouseJob {
  id?: number | string;
  title?: string;
  absolute_url?: string;
  updated_at?: string;
  content?: string | null;
  location?: { name?: string } | null;
  metadata?: Array<{ name?: string; value?: unknown }> | null;
  offices?: Array<{ name?: string }> | null;
}

interface GreenhouseResponse {
  jobs?: GreenhouseJob[];
  meta?: { total?: number; next_page?: number | null } | null;
}

export class GreenhouseScraper extends BaseScraper {
  private apiUrl(offset?: number): string {
    const cfg = this.source.config as Record<string, unknown>;
    const token = String(cfg.boardToken ?? '').trim();
    if (!token) throw new Error('greenhouse: config.boardToken is required');
    const base = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs`;
    const params = new URLSearchParams({ content: 'true' });
    if (offset && offset > 0) params.set('offset', String(offset));
    return `${base}?${params.toString()}`;
  }

  protected parseListPage(text: string, pageUrl: string): ScrapePage {
    this.apiUrl(); // validates the boardToken early with a clear error
    let data: GreenhouseResponse;
    try {
      data = JSON.parse(text) as GreenhouseResponse;
    } catch {
      throw new Error(`greenhouse: response is not JSON (${pageUrl})`);
    }
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    const listings: RawListing[] = [];

    for (const job of jobs) {
      const title = String(job.title ?? '').trim();
      const url = String(job.absolute_url ?? '').trim();
      if (!title || !url) continue;
      const description = job.content ? stripHtml(job.content).replace(/\n{3,}/g, '\n\n').trim() : undefined;
      const vacancy = job.id != null ? String(job.id) : undefined;
      const extracted: Record<string, unknown> = { adapter: 'greenhouse' };
      if (vacancy) extracted.vacancyNumber = vacancy;

      listings.push({
        title,
        organization: this.source.name,
        location: job.location?.name || job.offices?.map((o) => o.name).filter(Boolean).join(', ') || undefined,
        publishedDate: job.updated_at || undefined,
        description,
        applyUrl: url,
        sourceUrl: url,
        originalUrl: url,
        sourceName: this.source.name,
        extractedData: extracted,
      });
    }

    // Greenhouse paginates via offset; meta.next_page is the next offset when present
    let nextPage: string | null = null;
    const nextOffset = data.meta?.next_page;
    if (nextPage !== undefined && nextOffset != null) {
      nextPage = this.apiUrl(nextOffset);
    } else if (jobs.length >= 50) {
      const current = new URL(pageUrl);
      const prior = Number(current.searchParams.get('offset') ?? 0);
      nextPage = this.apiUrl(prior + jobs.length);
    }
    return { listings, nextPage };
  }
}
