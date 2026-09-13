/**
 * Server-side data access for the opportunities experience.
 *
 * All listing/detail pages use these helpers so the query shape, the
 * expired-opportunity policy and the i18n fallback chain (lang → en → base
 * field, via getLocalizedContent) are applied in exactly one place.
 */
import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { translate } from '@/lib/i18n';
import { stripHtml } from '@/lib/import/utils';
import type { Lang } from '@/lib/lang-route';
import type { Prisma } from '@prisma/client';

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

export type OpportunityDetail = Prisma.OpportunityGetPayload<{
  include: { category: true };
}>;

// ---------------------------------------------------------------------------
// internals
// ---------------------------------------------------------------------------

/** UTC midnight of "today" — deadline comparisons are date-based. */
function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** status published AND (no deadline OR deadline not yet passed). */
function activeWhere(): Prisma.OpportunityWhereInput {
  const today = startOfTodayUtc();
  return {
    status: 'published',
    OR: [{ deadline: null }, { deadline: { gte: today } }],
  };
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

const CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  titleI18n: true,
  organization: true,
  country: true,
  jobType: true,
  jobTypeI18n: true,
  deadline: true,
  applyUrl: true,
  sourceName: true,
  status: true,
  featured: true,
  createdAt: true,
  aiSummary: true,
  aiSummaryI18n: true,
  category: { select: { slug: true, name: true, nameI18n: true } },
} satisfies Prisma.OpportunitySelect;

type CardRow = Prisma.OpportunityGetPayload<{ select: typeof CARD_SELECT }>;

function toCardData(row: CardRow, lang: Lang): OpportunityCardData {
  return {
    id: row.id,
    slug: row.slug,
    title: getLocalizedContent(row.title, row.titleI18n as Record<string, string> | null, lang),
    organization: row.organization,
    country: row.country,
    jobType: getLocalizedContent(row.jobType, row.jobTypeI18n as Record<string, string> | null, lang),
    deadline: row.deadline,
    applyUrl: row.applyUrl,
    sourceName: row.sourceName,
    categorySlug: row.category?.slug ?? null,
    categoryLabel: categoryLabel(lang, row.category?.slug, row.category?.name, row.category?.nameI18n),
    featured: row.featured,
    summary: cleanSummary(
      getLocalizedContent(row.aiSummary, row.aiSummaryI18n as Record<string, string> | null, lang)
    ),
    status: row.status,
    createdAt: row.createdAt,
  };
}

// ---------------------------------------------------------------------------
// public queries
// ---------------------------------------------------------------------------

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

export async function listOpportunities(
  opts: ListOpportunitiesOptions
): Promise<OpportunityListResult> {
  const {
    lang,
    category = 'all',
    q = '',
    location = 'all',
    deadlineDays,
    source = 'all',
    sort = 'newest',
    page = 1,
    perPage = 12,
    includeExpired = false,
  } = opts;

  const today = startOfTodayUtc();
  const where: Prisma.OpportunityWhereInput = includeExpired
    ? { status: { in: ['published', 'expired'] } }
    : { status: 'published' };

  // Combine independent conditions with AND (never overwrite each other).
  const AND: Prisma.OpportunityWhereInput[] = [];
  if (!includeExpired) {
    AND.push({ OR: [{ deadline: null }, { deadline: { gte: today } }] });
  }

  if (category && category !== 'all') {
    where.category = { slug: category };
  }
  if (location && location !== 'all') {
    where.country = location;
  }
  // Deadline horizon: only rows that HAVE a deadline closing within N days.
  if (deadlineDays && [7, 30, 90].includes(deadlineDays)) {
    const horizon = new Date(today);
    horizon.setUTCDate(horizon.getUTCDate() + deadlineDays);
    AND.push({ deadline: { gte: today, lte: horizon } });
  }
  if (source && source !== 'all') {
    where.sourceName = source;
  }
  const term = q.trim();
  if (term) {
    AND.push({
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { organization: { contains: term, mode: 'insensitive' } },
        { aiSummary: { contains: term, mode: 'insensitive' } },
        { country: { contains: term, mode: 'insensitive' } },
      ],
    });
  }
  if (AND.length > 0) {
    where.AND = AND;
  }

  let orderBy: Prisma.OpportunityOrderByWithRelationInput[];
  if (sort === 'deadline') {
    orderBy = [{ featured: 'desc' }, { deadline: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }];
  } else if (sort === 'title') {
    orderBy = [{ title: 'asc' }];
  } else {
    // Promoted listings surface first, then newest (featured rows are limited
    // and admin-managed, so this never crowds out fresh content).
    orderBy = [{ featured: 'desc' }, { createdAt: 'desc' }];
  }

  const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);

  const [rows, total] = await Promise.all([
    db.opportunity.findMany({
      where,
      orderBy,
      select: CARD_SELECT,
      skip: (safePage - 1) * perPage,
      take: perPage,
    }),
    db.opportunity.count({ where }),
  ]);

  return {
    items: rows.map((row) => toCardData(row, lang)),
    total,
    page: safePage,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/**
 * Opportunities whose deadlines close soonest (urgency strip on the homepage).
 * Only published + unexpired rows with a deadline within the next 21 days,
 * ordered ascending. Falls back to the newest when none qualify.
 */
export async function getClosingSoon(
  lang: Lang,
  limit = 4
): Promise<OpportunityCardData[]> {
  const today = startOfTodayUtc();
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + 21);

  const rows = await db.opportunity.findMany({
    where: {
      status: 'published',
      deadline: { gte: today, lte: horizon },
    },
    orderBy: [{ deadline: 'asc' }],
    select: CARD_SELECT,
    take: limit,
  });

  if (rows.length > 0) return rows.map((row) => toCardData(row, lang));

  // Fallback: newest opportunities with any future deadline.
  const fallback = await db.opportunity.findMany({
    where: {
      status: 'published',
      OR: [{ deadline: { gte: today } }],
    },
    orderBy: [{ deadline: 'asc' }],
    select: CARD_SELECT,
    take: limit,
  });
  return fallback.map((row) => toCardData(row, lang));
}

/**
 * Deadlines hub: active opportunities WITH a deadline, soonest first.
 * Also returns global urgency-bucket counts (≤7 days / ≤30 days / later)
 * so the page can badge each bucket with its full total, not just the
 * current page's slice.
 */
export interface DeadlineListResult extends OpportunityListResult {
  buckets: { within7: number; within30: number; later: number };
}

export async function listByDeadline(
  lang: Lang,
  opts: { page?: number; perPage?: number } = {}
): Promise<DeadlineListResult> {
  const { page = 1, perPage = 12 } = opts;

  const today = startOfTodayUtc();
  const in7 = new Date(today);
  in7.setUTCDate(in7.getUTCDate() + 7);
  const in30 = new Date(today);
  in30.setUTCDate(in30.getUTCDate() + 30);

  const where: Prisma.OpportunityWhereInput = {
    status: 'published',
    deadline: { gte: today },
  };

  const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);

  const [rows, total, within7, within30] = await Promise.all([
    db.opportunity.findMany({
      where,
      orderBy: [{ deadline: 'asc' }],
      select: CARD_SELECT,
      skip: (safePage - 1) * perPage,
      take: perPage,
    }),
    db.opportunity.count({ where }),
    db.opportunity.count({
      where: { ...where, deadline: { gte: today, lte: in7 } },
    }),
    db.opportunity.count({
      where: { ...where, deadline: { gt: in7, lte: in30 } },
    }),
  ]);

  return {
    items: rows.map((row) => toCardData(row, lang)),
    total,
    page: safePage,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    buckets: {
      within7,
      within30,
      later: Math.max(0, total - within7 - within30),
    },
  };
}

/**
 * Full opportunity row (+ category) for the detail page.
 * Drafts are never viewable; expired rows are returned so the page can
 * render the expired banner.
 */
export async function getOpportunityBySlug(slug: string): Promise<OpportunityDetail | null> {
  return db.opportunity.findFirst({
    where: { slug, status: { not: 'draft' } },
    include: { category: true },
  });
}

/** Saved-jobs view: fetch a set of slugs (client bookmarks), any status. */
export async function getOpportunitiesBySlugs(
  slugs: string[],
  lang: Lang
): Promise<OpportunityCardData[]> {
  if (!slugs.length) return [];
  const rows = await db.opportunity.findMany({
    where: { slug: { in: slugs.slice(0, 100) }, status: { not: 'draft' } },
    select: CARD_SELECT,
  });
  // Preserve the caller's slug order (most recently saved first)
  const bySlug = new Map(rows.map((row) => [row.slug, row] as const));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((row): row is CardRow => Boolean(row))
    .map((row) => toCardData(row, lang));
}

/**
 * Related opportunities for the detail page — tiered similarity with fill-up:
 *   1. same category + same country
 *   2. same category
 *   3. same job type
 *   4. newest active (fallback so the section is never empty on sparse data)
 * Always active (published + unexpired), excludes the item itself, deduped.
 */
export async function getRelatedOpportunities(
  opportunity: OpportunityDetail,
  lang: Lang,
  limit = 4
): Promise<OpportunityCardData[]> {
  const base = {
    ...activeWhere(),
    id: { not: opportunity.id },
  };

  const tiers: Prisma.OpportunityWhereInput[] = [
    ...(opportunity.categoryId && opportunity.country
      ? [{ ...base, categoryId: opportunity.categoryId, country: opportunity.country }]
      : []),
    ...(opportunity.categoryId ? [{ ...base, categoryId: opportunity.categoryId }] : []),
    ...(opportunity.jobType ? [{ ...base, jobType: opportunity.jobType }] : []),
    base,
  ];

  const orderBy = [
    { featured: 'desc' },
    { deadline: { sort: 'asc', nulls: 'last' } },
    { createdAt: 'desc' },
  ] as Prisma.OpportunityOrderByWithRelationInput[];

  const seen = new Set<string>([opportunity.id]);
  const picked: CardRow[] = [];

  for (const where of tiers) {
    if (picked.length >= limit) break;
    const rows = await db.opportunity.findMany({
      where,
      orderBy,
      select: CARD_SELECT,
      take: limit * 2,
    });
    for (const row of rows) {
      if (picked.length >= limit) break;
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      picked.push(row);
    }
  }

  return picked.map((row) => toCardData(row, lang));
}

/** Category chips (always all 8, with active counts) + top locations. */
export async function getFacets(lang?: Lang): Promise<Facets> {
  const today = startOfTodayUtc();
  const where = {
    status: 'published' as const,
    OR: [{ deadline: null }, { deadline: { gte: today } }],
  };

  const [categories, byCategory, byCountry, totalActive] = await Promise.all([
    db.opportunityCategory.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, name: true, nameI18n: true },
    }),
    db.opportunity.groupBy({
      by: ['categoryId'],
      where,
      _count: { _all: true },
    }),
    db.opportunity.groupBy({
      by: ['country'],
      where: { ...where, country: { not: null } },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 15,
    }),
    db.opportunity.count({ where }),
  ]);

  const countByCategory = new Map(
    byCategory.map((g) => [g.categoryId ?? '', g._count?._all ?? 0])
  );

  return {
    categories: categories.map((c) => ({
      slug: c.slug,
      // Localized when the caller passes a lang and admin-entered
      // nameI18n exists; falls back to the raw name otherwise.
      name: lang
        ? (getLocalizedContent(c.name, c.nameI18n, lang) || c.name)
        : c.name,
      count: countByCategory.get(c.id) ?? 0,
    })),
    locations: byCountry.map((g) => ({
      name: g.country as string,
      count: g._count?.country ?? 0,
    })),
    totalActive,
  };
}

// ---------------------------------------------------------------------------
// detail-page helpers
// ---------------------------------------------------------------------------

/** Localized + cleaned summary for meta descriptions & JSON-LD. */
export function resolveSummary(
  opportunity: Pick<OpportunityDetail, 'aiSummary' | 'aiSummaryI18n'>,
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

/** Deadlines are date-based: anything before UTC midnight counts as expired. */
export function isOpportunityExpired(
  status: string,
  deadline: Date | null
): boolean {
  if (status === 'expired') return true;
  if (!deadline) return false;
  const today = startOfTodayUtc();
  return deadline.getTime() < today.getTime();
}

/** Whole days between "today" (UTC midnight) and the deadline. */
export function daysUntilDeadline(deadline: Date): number {
  const today = startOfTodayUtc();
  return Math.round((deadline.getTime() - today.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Daily / weekly spotlight ("Opportunity of the Day", "Scholarship of the Week")
// ---------------------------------------------------------------------------

/**
 * Deterministic pseudo-random index from a date string. Same input → same
 * pick all day (stable across SSR + client navigations), changes every day
 * without any manual curation or extra DB writes.
 */
function spotlightIndex(seed: string, length: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % length;
}

async function pickSpotlight(
  seed: string,
  categorySlug?: string
): Promise<string | null> {
  const candidates = await db.opportunity.findMany({
    where: { ...activeWhere(), ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    select: { id: true },
    take: 60,
  });
  if (candidates.length === 0) return null;
  return candidates[spotlightIndex(seed, candidates.length)].id;
}

/** Full display-ready card for a spotlight pick (null when nothing active). */
async function pickSpotlightCard(
  seed: string,
  lang: Lang,
  categorySlug?: string
): Promise<OpportunityCardData | null> {
  const id = await pickSpotlight(seed, categorySlug);
  if (!id) return null;
  const row = await db.opportunity.findUnique({ where: { id }, select: CARD_SELECT });
  return row ? toCardData(row, lang) : null;
}

/** UTC date (YYYY-MM-DD) used as the daily spotlight seed. */
function todaySeed(): string {
  return startOfTodayUtc().toISOString().slice(0, 10);
}

/** ISO week (e.g. 2026-W37) used as the weekly spotlight seed. */
function weekSeed(): string {
  const d = new Date();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * The single highlighted opportunity of the day (any active category).
 * Deterministic per UTC date: stable across requests, changes daily.
 * Returns null when there is nothing active — callers must handle it.
 */
export async function getDailySpotlight(lang: Lang): Promise<OpportunityCardData | null> {
  try {
    return await pickSpotlightCard(todaySeed(), lang);
  } catch {
    return null;
  }
}

/** The highlighted scholarship of the current ISO week (category = scholarships). */
export async function getWeeklyScholarship(lang: Lang): Promise<OpportunityCardData | null> {
  try {
    return await pickSpotlightCard(weekSeed(), lang, 'scholarships');
  } catch {
    return null;
  }
}

/** Slim helper for card grids that only need the daily badge target id. */
export async function getDailySpotlightId(): Promise<string | null> {
  try {
    return await pickSpotlight(todaySeed());
  } catch {
    return null;
  }
}
