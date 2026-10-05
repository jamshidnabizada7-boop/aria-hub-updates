/**
 * Workday CXS job-board adapter (Phase 12).
 *
 * Workday-hosted career sites expose a public JSON API ("CXS") — no auth,
 * no key. LIVE-VERIFIED 2026-10-04 against three tenants:
 *
 *   LIST (POST — the body shape matters, see below):
 *     POST https://{tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
 *     Headers: Content-Type: application/json, Accept: application/json
 *     Body:    {"appliedFacets":{},"limit":20,"offset":0}
 *     → {"total":343,"jobPostings":[{"title","externalPath","locationsText",
 *        "postedOn","bulletFields":[...]}, ...],"facets":[...]}
 *
 *     Verified tenants/sites:
 *       • theirc.wd1        / External_Careers   (International Rescue Committee)
 *       • unhcr.wd3         / External           (UNHCR)
 *       • compassion.wd5    / CompassionCareers  (Compassion International)
 *     A wrong site id answers HTTP 404 {"errorCode":"S21","message":
 *     "not found: Job_Posting_Site_ID=…"}; a wrong tenant answers 401.
 *
 *   DETAIL (GET):
 *     GET https://{tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}{externalPath}
 *     → {"jobPostingInfo":{"jobDescription":"<p>HTML</p>","jobReqId":"JR…",
 *        "location","additionalLocations":[...],"startDate","endDate",
 *        "timeType","country":{"descriptor"}, ...}}
 *
 *   Human-facing job URL (works without a locale prefix):
 *     https://{tenant}.wd{N}.myworkdayjobs.com/{site}{externalPath}
 *
 * QUIRKS the adapter must respect (all observed live):
 *   • `total` is only reliable on the FIRST page (0 on later pages), and an
 *     offset >= total wraps back to page 1 — so pagination reads the total
 *     once, advances offset by the page length, and stops on the first page
 *     that yields nothing new.
 *   • `bulletFields[0]` is the requisition id (e.g. "JR00005349"); a
 *     bulletField may also carry an ISO deadline date ("2026-10-12").
 *   • Location filtering uses {"appliedFacets":{"locations":["<facetValueId>"]}}
 *     (string array). The {facetKey,facetValue} object shape returns HTTP 500.
 *
 * config: {
 *   "tenant": "unhcr",             // optional when baseUrl host is *.myworkdayjobs.com
 *   "site":   "External",          // optional when the baseUrl path ends in the site id
 *   "wd":     3,                   // required only for custom-domain basUrls
 *   "locationsFacet": "abc123…",   // optional location facet value id (or id array,
 *                                  // or a raw appliedFacets object) — narrows the board
 *   "limit": 20, "maxPages": 10, "detailFetch": true
 * }
 * baseUrl like https://unhcr.wd3.myworkdayjobs.com/en-US/External derives
 * tenant ("unhcr"), wd (3) and site ("External") automatically.
 *
 * extractedData.vacancyNumber = Workday requisition id (JR…/R…) — powers the
 * canonical resolver's Level-A (organization + vacancy number) matching.
 */
import { BaseScraper } from '../base-scraper';
import { DEFAULT_USER_AGENT, parseDate, sanitizeError, sleep, stripHtml } from '../utils';
import type { RawListing, ScrapePage } from '../types';

/** One entry of the CXS jobs list. */
interface CxsJobPosting {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: Array<string | number> | null;
}

interface CxsJobsResponse {
  total?: number;
  jobPostings?: CxsJobPosting[] | null;
}

interface CxsJobDetail {
  jobPostingInfo?: {
    jobDescription?: string | null;
    jobReqId?: string | null;
    location?: string | null;
    additionalLocations?: string[] | null;
    startDate?: string | null;
    endDate?: string | null;
    timeType?: string | null;
  } | null;
}

/** Resolved connection details for one Workday career site. */
interface WorkdayTarget {
  tenant: string;
  site: string;
  /** e.g. "https://unhcr.wd3.myworkdayjobs.com" */
  origin: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "Posted 3 Days Ago" / "Posted Yesterday" / "Posted Today" → YYYY-MM-DD. */
export function parsePostedOn(input?: string | null, now = new Date()): string | null {
  if (!input) return null;
  const s = String(input).trim();
  const isoDay = (d: Date): string => d.toISOString().slice(0, 10);
  const daysAgo = (n: number): string => isoDay(new Date(now.getTime() - n * 86_400_000));
  if (/today/i.test(s)) return isoDay(now);
  if (/yesterday/i.test(s)) return daysAgo(1);
  const m = /(\d+)\s*\+?\s*(hour|day|week|month)s?\s*ago/i.exec(s);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const days = unit === 'hour' ? 0 : unit === 'day' ? n : unit === 'week' ? n * 7 : n * 30;
    return daysAgo(days);
  }
  return parseDate(s); // absolute date, when a tenant ships one
}

export class WorkdayScraper extends BaseScraper {
  /** Resolve tenant/site/origin from config + baseUrl; throws a clear error. */
  private target(): WorkdayTarget {
    const cfg = this.source.config as Record<string, unknown>;
    const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
    let tenant = str(cfg.tenant);
    let site = str(cfg.site);
    let origin = '';

    const u = new URL(this.source.baseUrl); // throws on a malformed baseUrl
    const hostMatch = /^([a-z0-9][a-z0-9-]*)\.wd(\d+)\.myworkdayjobs\.com$/i.exec(u.hostname);
    if (hostMatch) {
      origin = `${u.protocol}//${u.hostname}`;
      if (!tenant) tenant = hostMatch[1];
      if (!site) {
        const parts = u.pathname.split('/').filter(Boolean);
        // drop a leading locale segment ("en-US", "fr-FR", "de", …)
        if (parts.length && /^[a-z]{2}(-[a-z]{2})?$/i.test(parts[0])) parts.shift();
        site = parts[parts.length - 1] ?? '';
      }
    }

    if (!tenant || !site) {
      throw new Error(
        'workday: config.tenant and config.site are required ' +
          '(or a baseUrl like https://{tenant}.wd{n}.myworkdayjobs.com/{locale}/{site})',
      );
    }
    if (!origin) {
      const wd = Number(cfg.wd);
      if (!Number.isInteger(wd) || wd <= 0) {
        throw new Error('workday: config.wd (e.g. 1, 3, 5) is required when the baseUrl is not a *.myworkdayjobs.com host');
      }
      origin = `https://${tenant}.wd${wd}.myworkdayjobs.com`;
    }
    return { tenant, site, origin };
  }

  /** Human-facing job URL (no locale prefix — verified to answer 200). */
  private jobUrl(t: WorkdayTarget, externalPath: string): string {
    return `${t.origin}/${t.site}${externalPath}`;
  }

  /** Build the appliedFacets object from config.locationsFacet. */
  private appliedFacets(): Record<string, unknown> {
    const lf = (this.source.config as Record<string, unknown>).locationsFacet;
    if (typeof lf === 'string' && lf.trim()) return { locations: [lf.trim()] };
    if (Array.isArray(lf) && lf.length) return { locations: lf.map(String) };
    if (lf && typeof lf === 'object') return lf as Record<string, unknown>; // raw escape hatch
    return {};
  }

  /**
   * BaseScraper's GET crawl loop doesn't apply: the CXS list endpoint is a
   * POST JSON API with offset pagination (same situation as reliefweb).
   */
  public async scrapeAll(): Promise<RawListing[]> {
    const t = this.target(); // validates config up-front with a clear error
    const cfg = this.source.config as Record<string, unknown>;
    const limit = Math.min(Math.max(Number(cfg.limit ?? 20), 1), 20); // the UI uses 20
    const maxPages = Math.max(1, Number(cfg.maxPages ?? 10));

    const all: RawListing[] = [];
    const seen = new Set<string>();
    let offset = 0;
    let total = -1;

    for (let page = 0; page < maxPages; page++) {
      if (this.deadline > 0 && Date.now() > this.deadline) {
        console.warn(`[import] Scraper deadline exceeded (${this.deadline}), stopping at page ${page}`);
        break;
      }
      const data = await this.fetchJobsPage(t, limit, offset);
      if (page === 0) total = Number(data.total) || 0; // later pages report total: 0
      const postings = Array.isArray(data.jobPostings) ? data.jobPostings : [];
      if (!postings.length) break;

      // Offset >= total wraps back to page 1 on this API — detect the wrap
      // as "every posting on this page was already seen" and stop.
      const fresh = postings.filter((p) => {
        const path = String(p.externalPath ?? '').trim();
        return path && !seen.has(path);
      });
      if (!fresh.length) break;

      for (const p of postings) {
        const path = String(p.externalPath ?? '').trim();
        if (path) seen.add(path);
        const listing = this.mapPosting(t, p);
        if (listing) all.push(listing);
      }
      offset += postings.length;

      if (total >= 0 && offset >= total) break;
      if (postings.length < limit) break;
    }

    return all;
  }

  /** POST one page of the CXS jobs list with retries + backoff. */
  private async fetchJobsPage(t: WorkdayTarget, limit: number, offset: number): Promise<CxsJobsResponse> {
    const cfg = this.source.config as Record<string, unknown>;
    const retries = 2;
    const timeoutMs = Number(cfg.timeoutMs ?? 20_000);
    const delay = Number(cfg.crawlDelayMs ?? 500);
    const url = `${t.origin}/wday/cxs/${t.tenant}/${t.site}/jobs`;
    const body = JSON.stringify({ appliedFacets: this.appliedFacets(), limit, offset });
    let lastErr: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'User-Agent': DEFAULT_USER_AGENT,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body,
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const data = (await res.json()) as CxsJobsResponse;
        await sleep(delay); // respect the source
        return data;
      } catch (e) {
        lastErr = e;
        if (attempt < retries) await sleep(800 * Math.pow(2, attempt));
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error(`workday: jobs request failed for ${t.tenant}/${t.site}: ${sanitizeError(lastErr)}`);
  }

  /** Map one CXS posting to a RawListing (null when unusable). */
  private mapPosting(t: WorkdayTarget, p: CxsJobPosting): RawListing | null {
    const title = String(p.title ?? '').replace(/\s+/g, ' ').trim();
    const externalPath = String(p.externalPath ?? '').trim();
    if (!title || !externalPath || !externalPath.startsWith('/job/')) return null;

    const url = this.jobUrl(t, externalPath);
    const bullets = (Array.isArray(p.bulletFields) ? p.bulletFields : []).map(String);
    const vacancy = bullets.find((b) => b.trim() && !ISO_DATE_RE.test(b.trim()));
    const deadlineBullet = bullets.find((b) => ISO_DATE_RE.test(b.trim()));

    const extracted: Record<string, unknown> = { adapter: 'workday' };
    if (vacancy) extracted.vacancyNumber = vacancy.trim();
    if (deadlineBullet) extracted.postingEndDate = deadlineBullet.trim();

    return {
      title,
      organization: this.source.name,
      jobType: 'job',
      location: p.locationsText?.trim() || undefined,
      publishedDate: parsePostedOn(p.postedOn),
      deadline: deadlineBullet ? parseDate(deadlineBullet) || undefined : undefined,
      applyUrl: url,
      sourceUrl: url,
      originalUrl: url,
      sourceName: this.source.name,
      extractedData: extracted,
    };
  }

  /**
   * Enrich a listing from the CXS detail endpoint (GET, via the retrying
   * fetchJson). The list payload carries no description — the HTML
   * jobDescription here is the only real body the API offers.
   */
  public async parseDetail(listing: RawListing): Promise<RawListing> {
    if (!listing.sourceUrl) return listing;
    const t = this.target();
    let path = '';
    try {
      path = new URL(listing.sourceUrl).pathname;
    } catch {
      return listing;
    }
    const prefix = `/${t.site}/`;
    if (!path.startsWith(prefix)) return listing;
    const externalPath = path.slice(prefix.length - 1); // keep the leading slash
    if (!externalPath.startsWith('/job/')) return listing;

    const url = `${t.origin}/wday/cxs/${t.tenant}/${t.site}${externalPath}`;
    let info: NonNullable<CxsJobDetail['jobPostingInfo']> | null;
    try {
      const { data } = await this.fetchJson<CxsJobDetail>(url, { retries: 2 });
      info = data?.jobPostingInfo ?? null;
      if (!info) return listing;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // A 404 here means the posting was pulled after the list snapshot —
      // mark it soft-404 so the orchestrator skips instead of persisting a
      // bare, description-less row. Any other failure: stay best-effort.
      if (/HTTP 404/.test(msg)) {
        throw new Error(`soft-404: workday posting not found (${listing.sourceUrl})`);
      }
      console.warn('[import] workday detail failed (continuing):', sanitizeError(e));
      return listing;
    }

    const description = info.jobDescription
      ? stripHtml(info.jobDescription).replace(/\n{3,}/g, '\n\n').trim()
      : '';
    const deadline = parseDate(info.endDate || '') || listing.deadline;
    const additional = (Array.isArray(info.additionalLocations) ? info.additionalLocations : [])
      .map((l) => String(l).trim())
      .filter(Boolean);
    const location = info.location?.trim()
      ? additional.length
        ? [info.location.trim(), ...additional].join(', ')
        : info.location.trim()
      : listing.location;

    const extracted = { ...(listing.extractedData ?? {}) };
    const reqId = String(info.jobReqId ?? '').trim();
    if (reqId) extracted.vacancyNumber = reqId; // detail value is authoritative
    if (info.timeType?.trim()) extracted.employmentType = info.timeType.trim();
    if (info.startDate?.trim()) extracted.startDate = info.startDate.trim();

    return {
      ...listing,
      description: description || listing.description,
      deadline,
      location,
      extractedData: extracted,
    };
  }

  /** Never used (scrapeAll is overridden) — required abstract, stays inert. */
  protected parseListPage(_html: string, _pageUrl: string): ScrapePage {
    return { listings: [], nextPage: null };
  }
}
