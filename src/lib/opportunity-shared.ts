/**
 * Opportunity display types + pure helpers — CLIENT-SAFE.
 *
 * This module intentionally has ZERO database/runtime dependencies so client
 * components (opportunity-card, opportunity-feed, …) can import it without
 * dragging the Prisma client into the browser bundle — which broke the
 * production build (`@prisma/client/index-browser.js` unresolvable on Vercel).
 *
 * Server-side code lives in `@/lib/opportunity-queries`, which re-exports
 * everything from here.
 */

import { translate } from '@/lib/i18n';
import { getLocalizedContent } from '@/lib/i18n-content';
import type { Lang } from '@/lib/lang-route';

export type OpportunitySort = 'newest' | 'deadline' | 'title';

/** Slim, display-ready projection of an opportunity for cards & grids. */
export interface OpportunityCardData {
  id: string;
  slug: string;
  /** Localized via titleI18n fallback chain (server-side). */
  title: string;
  organization: string | null;
  country: string | null;
  jobType: string | null;
  deadline: Date | null;
  applyUrl: string | null;
  sourceName: string | null;
  categorySlug: string | null;
  categoryLabel: string;
  /** Promoted listing (admin-managed) — surfaces first + wears a badge. */
  featured: boolean;
  /** Localized via aiSummaryI18n fallback chain, capped at 220 chars. */
  summary: string;
  status: string;
  createdAt: Date;
}

export interface OpportunityListResult {
  items: OpportunityCardData[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface CategoryFacet {
  slug: string;
  name: string;
  count: number;
}

export interface Facets {
  categories: CategoryFacet[];
  /** Top countries by active-opportunity count (label + count for filters). */
  locations: { name: string; count: number }[];
  /** Total active (published + unexpired) opportunities across all categories. */
  totalActive: number;
}

export interface ListOpportunitiesOptions {
  lang: Lang;
  category?: string; // category slug, or 'all'
  q?: string;
  location?: string; // exact country value, or 'all'
  /** Only opportunities whose deadline lands within N days (7/30/90). */
  deadlineDays?: number;
  /** Exact sourceName filter, or 'all'. */
  source?: string;
  sort?: OpportunitySort;
  page?: number; // 1-based
  perPage?: number;
  /** Include status:'expired' rows and opportunities whose deadline passed. */
  includeExpired?: boolean;
}

// ---------------------------------------------------------------------------
// pure helpers
// ---------------------------------------------------------------------------

/** UTC midnight of "today" — deadline comparisons are date-based. */
export function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Whole days between "today" (UTC midnight) and the deadline. */
export function daysUntilDeadline(deadline: Date): number {
  const today = startOfTodayUtc();
  return Math.round((deadline.getTime() - today.getTime()) / 86_400_000);
}

/** status expired, or deadline before UTC midnight of today. */
export function isOpportunityExpired(
  status: string,
  deadline: Date | null
): boolean {
  if (status === 'expired') return true;
  if (!deadline) return false;
  const today = startOfTodayUtc();
  return deadline.getTime() < today.getTime();
}

/** Local copy of the import-utils tag stripper (keeps this module browser-safe). */
function stripHtml(html: string): string {
  if (!html) return '';
  let s = html;
  s = s.replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/tr)\s*>/gi, '\n');
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<[^>]+>/g, '');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
  return s;
}

/** Legacy imported summaries sometimes begin with scraped boilerplate. */
const ABOUT_COMPANY_RE = /^\s*about the company\s*[:\-–—]?\s*/i;

/** Plain-text, single-line snippet capped at `max` characters. */
export function cleanSummary(raw: string, max = 220): string {
  if (!raw) return '';
  let s = stripHtml(raw).replace(ABOUT_COMPANY_RE, '');
  s = s.replace(/\s+/g, ' ').trim();
  // A summary that is just a URL is scraped junk (sitemap seed that survived
  // enrichment) — return empty so cards hide the summary line entirely.
  if (/^https?:\/\/\S+$/i.test(s)) return '';
  if (s.length > max) s = s.slice(0, max - 1).trimEnd() + '…';
  return s;
}

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  jobs: 'opportunities.jobs',
  scholarships: 'opportunities.scholarships',
  internships: 'opportunities.internships',
  competitions: 'opportunities.competitions',
  conferences: 'opportunities.conferences',
  volunteer: 'opportunities.volunteer',
  'exchange-programs': 'opportunities.exchangePrograms',
  training: 'opportunities.training',
};

/** Localized category label (static key → DB nameI18n → DB raw name). */
export function categoryLabel(
  lang: Lang,
  slug: string | null | undefined,
  fallbackName?: string | null,
  fallbackNameI18n?: unknown
): string {
  const key = slug ? CATEGORY_LABEL_KEYS[slug] : undefined;
  if (key) {
    const label = translate(lang, key);
    // translate() returns the key itself when a translation is missing.
    if (label !== key) return label;
  }
  if (fallbackNameI18n) {
    const localized = getLocalizedContent(
      fallbackName ?? '',
      fallbackNameI18n as Record<string, string> | null,
      lang
    );
    if (localized) return localized;
  }
  return fallbackName ?? '';
}

/** Detail-page summary (aiSummary fallback chain, capped at `max`). */
export function resolveSummary(
  opportunity: { aiSummary: string | null; aiSummaryI18n: unknown },
  lang: Lang,
  max = 155
): string {
  return cleanSummary(
    getLocalizedContent(
      opportunity.aiSummary,
      opportunity.aiSummaryI18n as Record<string, string> | null,
      lang
    ),
    max
  );
}
