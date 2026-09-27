/**
 * Jobs.af scraper (`jobsaf`) — https://www.jobs.af/
 *
 * Jobs.af is a Next.js (App Router) SPA. Verified against the live site:
 *   - The HOMEPAGE (https://www.jobs.af/) server-renders the latest job cards
 *     and embeds their full structured JSON inside the React Server Component
 *     flight payload (`self.__next_f.push([1,"…"])` chunks, quotes escaped).
 *   - `/jobs?page=N` and detail pages `/jobs/<slug>` return an empty client
 *     shell over plain HTTP (data loads client-side / is auth-gated), so
 *     list pagination and detail fetching CANNOT rely on HTML markup.
 *
 * Strategy (tolerant of their class soup — we never parse CSS classes):
 *   1. Extract all `self.__next_f.push` string literals and JSON.parse them
 *      to obtain the unescaped flight text.
 *   2. Scan for job objects (`{"id":"<uuid>","title":"…","slug":"…"` …) using
 *      a string-aware brace matcher, JSON.parse each candidate.
 *   3. Keep objects that carry title + slug + (company | expiryDate); dedupe
 *      by slug within the run.
 *   4. deadline = expiryDate, publishedDate = publishDate, organization =
 *      company.name, location = provinces, imageUrl = company logo.
 *   5. Detail pages are client-rendered, so `parseDetail` re-extracts the
 *      flight JSON from the detail URL (in case the site ever server-renders
 *      descriptions) and otherwise keeps the synthesized description built
 *      from the structured card fields.
 */

import * as cheerio from 'cheerio';
import { BaseScraper } from '../base-scraper';
import { parseDate, stripHtml } from '../utils';
import { hasPersistentProfile, renderHtmlPersistent } from './browser-fetch';
import type { RawListing, ScrapePage } from '../types';

/** A job card object as embedded by jobs.af in its RSC flight payload. */
interface JobsAfJob {
  id?: string;
  title?: string;
  slug?: string;
  reference?: string;
  numberOfVacancies?: number;
  educationLevel?: string | null;
  workType?: string | null;
  contractType?: string | null;
  gender?: string | null;
  minimumSalary?: number | null;
  maximumSalary?: number | null;
  fixedSalary?: number | null;
  salaryType?: string | null;
  salaryGrade?: string | null;
  currency?: string | null;
  period?: string | null;
  probationPeriod?: string | null;
  isExtendable?: boolean | null;
  publishDate?: string | null;
  expiryDate?: string | null;
  submissionThroughout?: string | null;
  company?: { name?: string; slug?: string; profile?: { logoUrl?: string } | null } | null;
  country?: { name?: string } | null;
  provinces?: Array<{ province?: { name?: string } | null } | null> | null;
  functionalAreas?: Array<{ area?: { name?: string } | null } | null> | null;
  description?: string | null;
  howToApply?: string | null;
  applyInstructions?: string | null;
}

/**
 * Extract and concatenate every `self.__next_f.push([1,"…"])` payload,
 * JSON.parse-ing each string literal so escaped quotes become real JSON.
 */
export function extractFlightText(html: string): string {
  const chunks: string[] = [];
  const re = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  for (const m of html.matchAll(re)) {
    try {
      chunks.push(JSON.parse(m[1]) as string);
    } catch {
      // Malformed literal — skip it; other chunks still carry data.
    }
  }
  return chunks.join('');
}

/** String-aware balanced-brace matcher. Returns the object text or null. */
function matchBalancedObject(s: string, start: number): string | null {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) return s.slice(start, i + 1);
      }
    }
  }
  return null;
}

/**
 * Scan the flight text for complete JSON objects starting at `startPattern`
 * (e.g. '{"id":"'), parse each and keep those carrying `mustHaveKeys`.
 * Advances past each accepted object so nested copies aren't re-parsed.
 */
export function extractFlightObjects<T>(flightText: string, startPattern: string, mustHaveKeys: string[]): T[] {
  const objs: T[] = [];
  let idx = 0;
  while (true) {
    const at = flightText.indexOf(startPattern, idx);
    if (at === -1) break;
    idx = at + 1;
    const start = flightText.lastIndexOf('{', at);
    if (start === -1) continue;
    const text = matchBalancedObject(flightText, start);
    if (!text) continue;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (mustHaveKeys.every((k) => k in parsed)) {
        objs.push(parsed as T);
        idx = start + text.length;
      }
    } catch {
      // Not a complete/valid object at this position — keep scanning.
    }
  }
  return objs;
}

export class JobsAfScraper extends BaseScraper {
  /** Parse the homepage flight payload into RawListings. */
  protected async parseListPage(html: string, _pageUrl: string): Promise<ScrapePage> {
    void _pageUrl;
    const flight = extractFlightText(html);
    if (!flight) {
      console.error('[jobsaf] no RSC flight payload found (site markup changed?)');
      return { listings: [], nextPage: null };
    }

    // Primary: structured JSON embedded in the RSC flight payload.
    const candidates = extractFlightObjects<JobsAfJob>(flight, '{"id":"', ['title', 'slug']);

    const seen = new Set<string>();
    const listings: RawListing[] = [];
    for (const job of candidates) {
      const slug = typeof job.slug === 'string' ? job.slug.trim() : '';
      const title = typeof job.title === 'string' ? stripHtml(job.title).replace(/\s+/g, ' ').trim() : '';
      // Guard: a real job card has a slug, a title and a company or a deadline.
      if (!slug || slug.includes(' ') || !title) continue;
      if (!job.company?.name && !job.expiryDate) continue;
      if (seen.has(slug)) continue;
      seen.add(slug);

      const sourceUrl = `https://www.jobs.af/jobs/${slug}`;
      const provinces = (job.provinces || [])
        .map((p) => p?.province?.name)
        .filter((n): n is string => Boolean(n));
      const areas = (job.functionalAreas || [])
        .map((f) => f?.area?.name)
        .filter((n): n is string => Boolean(n));
      const organization = job.company?.name?.trim() || null;

      listings.push({
        title,
        organization,
        sourceUrl,
        originalUrl: sourceUrl,
        applyUrl: null, // source article is not an application destination
        sourceName: this.source.name,
        sourceLanguage: 'en',
        jobType: 'job',
        country: job.country?.name || 'Afghanistan',
        location: provinces.join(', ') || null,
        deadline: parseDate(job.expiryDate || ''),
        publishedDate: parseDate(job.publishDate || ''),
        imageUrl: job.company?.profile?.logoUrl || null,
        description: this.synthesizeDescription(job, title, organization, provinces, areas),
        educationReq: this.humanize(job.educationLevel),
        salary: this.buildSalary(job),
        extractedData: {
          reference: job.reference || null,
          vacancies: job.numberOfVacancies ?? null,
          workType: this.humanize(job.workType),
          contractType: this.humanize(job.contractType),
          gender: this.humanize(job.gender),
          salary: this.buildSalary(job),
          salaryGrade: job.salaryGrade || null,
          probationPeriod: this.humanize(job.probationPeriod),
          extendable: job.isExtendable == null ? null : job.isExtendable ? 'Yes' : 'No',
          submission: this.humanize(job.submissionThroughout),
          functionalAreas: areas,
          slug,
        },
      });
    }

    // The homepage embeds only the first page of results and ignores ?page=,
    // so there is no server-side pagination to follow.
    if (listings.length) return { listings, nextPage: null };

    // Legacy fallback: if jobs.af ever server-renders plain <a href="/jobs/
    // <slug>"> cards again, extract those anchors (tolerant of class soup).
    return { listings: this.parseAnchorFallback(html), nextPage: null };
  }

  /** Anchor-based fallback for a possible future server-rendered redesign. */
  private parseAnchorFallback(html: string): RawListing[] {
    const $ = cheerio.load(html);
    const out: RawListing[] = [];
    const seen = new Set<string>();
    $('a[href]').each(function () {
      const href = ($(this).attr('href') || '').trim();
      const text = $(this).text().replace(/\s+/g, ' ').trim();
      const m = href.match(/^\/jobs\/([^/]+)$/);
      if (!m || !text || seen.has(m[1])) return;
      seen.add(m[1]);
      out.push({
        title: text,
        sourceUrl: `https://www.jobs.af/jobs/${m[1]}`,
        originalUrl: `https://www.jobs.af/jobs/${m[1]}`,
        sourceName: 'Jobs.af',
        sourceLanguage: 'en',
        jobType: 'job',
        country: 'Afghanistan',
      });
    });
    return out;
  }

  /**
   * Detail enrichment, two tiers:
   *  1. Plain HTTP: look for a description-bearing job object in the page's
   *     flight payload (works if the site ever server-renders details).
   *  2. Logged-in persistent profile: jobs.af gates the full fact sheet +
   *     description behind a login (the plain-HTTP detail page is a login
   *     shell). After `bun run scripts/jobsaf-login.ts` has been run once,
   *     the saved session unlocks the real content — parse it generically.
   * Otherwise the (already synthesized) listing-level data is kept.
   */
  public async parseDetail(listing: RawListing): Promise<RawListing> {
    // Tier 1 — flight payload over plain HTTP.
    try {
      const html = await this.fetchText(listing.sourceUrl, { timeoutMs: 12000, retries: 1 });
      const flight = extractFlightText(html);
      if (flight) {
        const jobs = extractFlightObjects<JobsAfJob>(flight, '{"id":"', ['title', 'slug']);
        const match = jobs.find((j) => listing.sourceUrl.endsWith(`/jobs/${j.slug}`));
        const detail = match?.description || match?.howToApply || match?.applyInstructions || null;
        if (detail && detail.trim().length > 80) {
          listing.description = stripHtml(detail).trim();
          return listing;
        }
      }
    } catch {
      /* fall through to the logged-in profile */
    }

    // Tier 2 — logged-in browser profile (no-op unless jobsaf-login ran once).
    if (!hasPersistentProfile()) return listing;
    try {
      const rendered = await renderHtmlPersistent(listing.sourceUrl, { timeoutMs: 35000, settleMs: 2500 });
      if (rendered && !isJobsAfLoginWall(rendered)) {
        const parsed = parseJobsAfDetailHtml(rendered);
        if (parsed) {
          if (parsed.description && parsed.description.length > 200 && !/Full job details, requirements/.test(listing.description || '')) {
            listing.description = parsed.description;
          }
          if (parsed.responsibilities && !listing.responsibilities) listing.responsibilities = parsed.responsibilities;
          if (parsed.requirements && !listing.requirements) listing.requirements = parsed.requirements;
          if (parsed.guidelines && !listing.guidelines) {
            listing.guidelines = parsed.guidelines;
            const email = parsed.guidelines.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
            if (email && !listing.applyUrl) listing.applyUrl = `mailto:${email[0]}`;
          }
          if (parsed.eligibility && !listing.eligibility) listing.eligibility = parsed.eligibility;
          if (parsed.experience && !listing.experience) listing.experience = parsed.experience;
          if (parsed.facts && Object.keys(parsed.facts).length) {
            listing.extractedData = { ...(listing.extractedData || {}), ...parsed.facts };
          }
        }
      }
    } catch {
      // Profile unavailable or parse failed — keep the list-level data.
    }
    return listing;
  }

  /** Structured fallback description (detail pages are client-rendered). */
  private synthesizeDescription(
    job: JobsAfJob,
    title: string,
    organization: string | null,
    provinces: string[],
    areas: string[],
  ): string {
    const lines: string[] = [];
    lines.push(`${title}${organization ? ` — ${organization}` : ''}`);
    const bits = [
      provinces.length ? `Location: ${provinces.join(', ')}` : null,
      job.country?.name ? `Country: ${job.country.name}` : null,
      areas.length ? `Functional areas: ${areas.join(', ')}` : null,
      job.numberOfVacancies && job.numberOfVacancies > 1 ? `Vacancies: ${job.numberOfVacancies}` : null,
      this.humanize(job.educationLevel) ? `Education: ${this.humanize(job.educationLevel)}` : null,
      this.humanize(job.workType) ? `Work type: ${this.humanize(job.workType)}` : null,
      this.humanize(job.contractType) ? `Contract: ${this.humanize(job.contractType)}` : null,
      this.humanize(job.gender) ? `Gender: ${this.humanize(job.gender)}` : null,
      this.buildSalary(job),
      job.salaryGrade ? `Salary grade: ${job.salaryGrade}` : null,
      this.humanize(job.probationPeriod) ? `Probation period: ${this.humanize(job.probationPeriod)}` : null,
      job.isExtendable == null ? null : `Extendable: ${job.isExtendable ? 'Yes' : 'No'}`,
      parseDate(job.expiryDate || '') ? `Deadline: ${parseDate(job.expiryDate || '')}` : null,
    ].filter(Boolean) as string[];
    if (bits.length) lines.push(bits.join('\n'));
    lines.push(
      'Full job details, requirements and the application form are available on the original listing page on Jobs.af.',
    );
    return lines.join('\n\n');
  }

  /** "as_per_company_scale" → "As per company scale"; null-safe. */
  private humanize(v?: string | null): string | null {
    if (!v || typeof v !== 'string') return null;
    return v
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /** Salary string from fixed/min/max/currency/period/grade when present. */
  private buildSalary(job: JobsAfJob): string | null {
    const min = job.minimumSalary ?? null;
    const max = job.maximumSalary ?? null;
    const fixed = job.fixedSalary ?? null;
    if (min == null && max == null && fixed == null) return null;
    const cur = job.currency || 'AFN';
    let range: string;
    if (min != null && max != null && min !== max) range = `${min} - ${max}`;
    else if (fixed != null) range = String(fixed);
    else range = String(min ?? max);
    const period = job.period ? ` / ${this.humanize(job.period)}` : '';
    return `${range} ${cur}${period}`;
  }
}

// ─── Logged-in detail-page parsing ───────────────────────────────────────────
// The logged-in detail DOM has not been pinned down yet (login required),
// so this parser is intentionally generic: collect visible text lines in
// document order, lift `Label → next line` fact pairs for the known fact
// table, and route prose sections to listing columns by heading keywords.

const JOBSAF_FACT_LABELS = [
  'Publish Date', 'Closing Date', 'Reference Number', 'Number of Vacancies',
  'Announcement Type', 'Work Type', 'Salary Range', 'Experience Required',
  'Probationary Period', 'Contract Type', 'Contract Duration',
  'Contract Extension', 'Languages', 'Functional Area', 'Country',
  'Provinces', 'Nationality', 'Travel Required', 'Gender', 'Education Level',
  'Years of Experience',
];

function isJobsAfLoginWall(html: string): boolean {
  return /type=["']password["']/.test(html);
}

interface ParsedJobsAfDetail {
  description: string | null;
  responsibilities: string | null;
  requirements: string | null;
  guidelines: string | null;
  eligibility: string | null;
  experience: string | null;
  facts: Record<string, string>;
}

function parseJobsAfDetailHtml(html: string): ParsedJobsAfDetail | null {
  const $ = cheerio.load(html);
  $('script, style, noscript, nav, header, footer, iframe, svg').remove();

  // Visible text lines in document order, from block-level elements.
  const lines: string[] = [];
  $('p, li, h1, h2, h3, h4, h5, h6, td, th, dt, dd').each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim();
    if (t && lines[lines.length - 1] !== t) lines.push(t);
  });
  if (lines.length < 5) return null;

  // Fact pairs: a line that IS a known label → the next line is its value.
  const facts: Record<string, string> = {};
  const isLabel = (s: string) =>
    JOBSAF_FACT_LABELS.some((l) => l.toLowerCase() === s.replace(/[:：]\s*$/, '').toLowerCase());
  for (let i = 0; i < lines.length; i++) {
    const bare = lines[i].replace(/[:：]\s*$/, '').trim();
    if (!isLabel(bare)) continue;
    const val = (lines[i + 1] || '').trim();
    if (val && !isLabel(val)) facts[bare] = val;
  }

  // Prose sections routed by heading keywords.
  const out: ParsedJobsAfDetail = {
    description: null, responsibilities: null, requirements: null,
    guidelines: null, eligibility: null, experience: null, facts,
  };
  const buckets: Record<string, string[]> = { description: [], responsibilities: [], requirements: [], guidelines: [], eligibility: [] };
  let current: keyof typeof buckets | null = null;
  const headingOf = (line: string): keyof typeof buckets | null => {
    const l = line.replace(/[:：]\s*$/, '').trim().toLowerCase();
    if (l.length > 60 || /\d/.test(l)) return null;
    if (/responsib|duties/.test(l)) return 'responsibilities';
    if (/qualific|requirement|important requirement/.test(l)) return 'requirements';
    if (/submission|how to apply|guideline/.test(l)) return 'guidelines';
    if (/eligib|criteria/.test(l)) return 'eligibility';
    if (/^about\b|job summary|overview/.test(l)) return 'description';
    return null;
  };
  for (const line of lines) {
    if (isLabel(line)) continue;
    const h = headingOf(line);
    if (h) {
      current = h;
      if (h === 'description') continue; // "Job Summary" heading itself is noise
    }
    if (current) buckets[current].push(line);
  }

  const join = (arr: string[]) => arr.join('\n').trim() || null;
  out.description = join(buckets.description);
  out.responsibilities = join(buckets.responsibilities);
  out.requirements = join(buckets.requirements);
  out.guidelines = join(buckets.guidelines);
  out.eligibility = join(buckets.eligibility);
  out.experience = facts['Experience Required'] || facts['Years of Experience'] || null;

  // Only claim success if we actually captured meaningful prose.
  const total = (out.description?.length || 0) + (out.responsibilities?.length || 0) + (out.requirements?.length || 0);
  return total > 300 ? out : null;
}
