/**
 * Oracle HCM / Recruiting Cloud adapter (completion mandate, PHASE 13).
 *
 * Public CXS REST API — no auth:
 *   GET https://{host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions
 *       ?onlyData=true&expand=requisitionList&finder=findReqs;siteNumber={site}
 *
 * config: { host, siteNumber } — e.g. IOM: ekum.fa.em2.oraclecloud.com / CX_2019
 * Requisition Id is recorded as extractedData.vacancyNumber for Level-A dedupe.
 * Detail descriptions via the same REST resource (job detail RequisitionId).
 */
import { BaseScraper } from '../base-scraper';
import { stripHtml } from '../utils';
import type { RawListing, ScrapePage } from '../types';

interface OracleReq {
  Id?: string;
  Title?: string;
  PostedDate?: string;
  PrimaryLocation?: string;
  PrimaryLocationCountry?: string;
  ExternalUrl?: string;
}

interface OracleResponse {
  items?: Array<{
    TotalJobsCount?: number;
    Offset?: number;
    Limit?: number;
    requisitionList?: OracleReq[];
  }>;
  items2?: OracleReq[];
}

export class OracleHcmScraper extends BaseScraper {
  private apiUrl(offset: number): string {
    const cfg = this.source.config as Record<string, unknown>;
    const host = String(cfg.host ?? '').trim();
    const siteNumber = String(cfg.siteNumber ?? '').trim();
    if (!host || !siteNumber) {
      throw new Error('oracleHcm: config.host and config.siteNumber are required');
    }
    return `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList&finder=findReqs;siteNumber=${encodeURIComponent(siteNumber)}&offset=${offset}`;
  }

  protected parseListPage(text: string, pageUrl: string): ScrapePage {
    if (pageUrl.includes('offset=0')) this.apiUrl(0); // config validation
    let data: OracleResponse;
    try {
      data = JSON.parse(text) as OracleResponse;
    } catch {
      throw new Error(`oracleHcm: response is not JSON (${pageUrl})`);
    }
    const item = data.items?.[0];
    const reqs = item?.requisitionList ?? [];
    const listings: RawListing[] = [];

    for (const req of reqs) {
      const title = String(req.Title ?? '').trim();
      const id = String(req.Id ?? '').trim();
      if (!title || !id) continue;
      const externalUrl = String(req.ExternalUrl ?? '').trim();
      const sourceUrl = externalUrl ||
        `https://${(this.source.config as Record<string, unknown>).host}/hcmUI/CandidateExperience/en/sites/CX_2019/job/${encodeURIComponent(id)}`;
      const extracted: Record<string, unknown> = { adapter: 'oracleHcm' };
      extracted.vacancyNumber = id;
      const location = String(req.PrimaryLocation ?? '').trim() || undefined;

      listings.push({
        title,
        organization: this.source.name,
        location,
        country: req.PrimaryLocationCountry || undefined,
        publishedDate: req.PostedDate || undefined,
        applyUrl: sourceUrl,
        sourceUrl,
        originalUrl: sourceUrl,
        sourceName: this.source.name,
        extractedData: extracted,
      });
    }

    // Oracle paginates via offset; page full → next offset
    const offsetMatch = /[?&]offset=(\d+)/.exec(pageUrl);
    const prior = offsetMatch ? Number(offsetMatch[1]) : 0;
    const nextPage = reqs.length >= 25 ? this.apiUrl(prior + 25) : null;
    return { listings, nextPage };
  }

  public async parseDetail(listing: RawListing): Promise<RawListing> {
    const cfg = this.source.config as Record<string, unknown>;
    const host = String(cfg.host ?? '');
    const id = (listing.extractedData as Record<string, unknown> | null)?.vacancyNumber;
    if (!host || !id) return listing;
    try {
      const raw = await this.fetchJson<{ [k: string]: unknown }>(
        `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions/${encodeURIComponent(String(id))}?onlyData=true&expand=all`,
      );
      const info = (raw.data as Record<string, any>) ?? {};
      const description = String(info.JobDescription ?? '').trim();
      if (description) {
        listing.description = stripHtml(description).replace(/\n{3,}/g, '\n\n').trim();
      }
    } catch { /* detail is enrichment — never fail the listing */ }
    return listing;
  }
}
