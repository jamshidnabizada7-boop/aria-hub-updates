/**
 * SAP SuccessFactors career-site adapter (completion mandate, PHASE 14).
 *
 * The classic SF career-module JSON endpoint — no auth:
 *   GET https://{host}/search/?q=&sortColumn=referencedate&sortDirection=desc
 *       &startrow=0&resultset=25&data=json
 *
 * config: { host, company? } — company label is only used for logging; the
 * host is the career site (e.g. career.unhcr.org). Detail pages live at
 * {host}/job/{reqId}; descriptions are fetched from the search payload's
 * rich text when present (JobDescription field) or the list snippet.
 * The SF requisition id is recorded as extractedData.vacancyNumber.
 */
import { BaseScraper } from '../base-scraper';
import { parseDate, stripHtml } from '../utils';
import type { RawListing, ScrapePage } from '../types';

interface SfJob {
  reqId?: string;
  title?: string;
  datePosted?: string;
  location?: string | { name?: string };
  company?: string;
  JobDescription?: string | null;
  jobPostDate?: string;
  referredDate?: string;
}

interface SfResponse {
  jobs?: SfJob[];
  total?: number;
}

export class SuccessFactorsScraper extends BaseScraper {
  private apiUrl(startRow: number): string {
    const cfg = this.source.config as Record<string, unknown>;
    const host = String(cfg.host ?? '').trim();
    if (!host) throw new Error('successfactors: config.host is required');
    const resultset = Number(cfg.resultset ?? 25);
    return `https://${host}/search/?q=&sortColumn=referencedate&sortDirection=desc&startrow=${startRow}&resultset=${resultset}&data=json`;
  }

  protected parseListPage(text: string, pageUrl: string): ScrapePage {
    let data: SfResponse;
    try {
      data = JSON.parse(text) as SfResponse;
    } catch {
      throw new Error(`successfactors: response is not JSON (${pageUrl})`);
    }
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    const listings: RawListing[] = [];

    for (const job of jobs) {
      const title = String(job.title ?? '').trim();
      const reqId = String(job.reqId ?? '').trim();
      if (!title || !reqId) continue;
      const sourceUrl = `https://${(this.source.config as Record<string, unknown>).host}/job/${encodeURIComponent(reqId)}`;
      const location = typeof job.location === 'string'
        ? job.location
        : job.location?.name || undefined;
      const extracted: Record<string, unknown> = { adapter: 'successfactors' };
      extracted.vacancyNumber = reqId;

      const dateRaw = job.datePosted ?? job.jobPostDate ?? job.referredDate;
      const description = String(job.JobDescription ?? '').trim()
        ? stripHtml(String(job.JobDescription)).replace(/\n{3,}/g, '\n\n').trim()
        : undefined;

      listings.push({
        title,
        organization: this.source.name,
        location,
        publishedDate: dateRaw || undefined,
        description,
        applyUrl: sourceUrl,
        sourceUrl,
        originalUrl: sourceUrl,
        sourceName: this.source.name,
        extractedData: extracted,
      });
    }

    // SF search supports startrow; page full → advance
    const startMatch = /[?&]startrow=(\d+)/.exec(pageUrl);
    const prior = startMatch ? Number(startMatch[1]) : 0;
    const nextPage = jobs.length >= 25 ? this.apiUrl(prior + 25) : null;
    return { listings, nextPage };
  }
}
