/**
 * Server-side data access for the opportunities experience.
 *
 * All listing/detail pages use these helpers so the query shape, the
 * expired-opportunity policy and the i18n fallback chain (lang → en → base
 * field, via getLocalizedContent) are applied in exactly one place.
 */
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/lang-route';
import type { Prisma } from '@prisma/client';
import {
  categoryLabel,
  cleanSummary,
  daysUntilDeadline,
  isOpportunityExpired,
  type OpportunityCardData,
  type OpportunityListResult,
  type Facets,
  type OpportunitySort,
  type ListOpportunitiesOptions,
} from '@/lib/opportunity-shared';

// Re-export every client-safe type/helper so existing server importers of
// this module keep working unchanged.
export * from '@/lib/opportunity-shared';

export type OpportunityDetail = Prisma.OpportunityGetPayload<{
  include: { category: true; locations: true };
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

// ---------------------------------------------------------------------------
// card projection
// ---------------------------------------------------------------------------

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
const getCachedOpportunities = unstable_cache(
  async (
    category: string,
    country: string,
    province: string,
    deadlineDays: number | undefined,
    source: string,
    sort: OpportunitySort,
    safePage: number,
    perPage: number,
    includeExpired: boolean
  ) => {
    try {
      const today = startOfTodayUtc();
      const where: Prisma.OpportunityWhereInput = includeExpired
        ? { status: { in: ['published', 'expired'] } }
        : { status: 'published' };

      const AND: Prisma.OpportunityWhereInput[] = [];
      if (!includeExpired) {
        AND.push({ OR: [{ deadline: null }, { deadline: { gte: today } }] });
      }

      if (category && category !== 'all') {
        where.category = { slug: category };
      }
      if (country && country !== 'all') {
        where.country = country;
      }
      if (province) {
        // Relation `some` is a filter — a multi-province opportunity still
        // appears exactly once per list page.
        where.locations = { some: { province: { equals: province, mode: 'insensitive' } } };
      }
      if (deadlineDays && [7, 30, 90].includes(deadlineDays)) {
        const horizon = new Date(today);
        horizon.setUTCDate(horizon.getUTCDate() + deadlineDays);
        AND.push({ deadline: { gte: today, lte: horizon } });
      }
      if (source && source !== 'all') {
        where.sourceName = source;
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
        orderBy = [{ featured: 'desc' }, { createdAt: 'desc' }];
      }

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
      return { rows, total };
    } catch (e) {
      console.error('Failed to query cached opportunities:', e);
      return { rows: [], total: 0 };
    }
  },
  ['cached-opportunities-list-query'],
  { revalidate: 300, tags: ['opportunities'] }
);

export async function listOpportunities(
  opts: ListOpportunitiesOptions
): Promise<OpportunityListResult> {
  const {
    lang,
    category = 'all',
    q = '',
    country: countryParam,
    province = '',
    location,
    deadlineDays,
    source = 'all',
    sort = 'newest',
    page = 1,
    perPage = 12,
    includeExpired = false,
  } = opts;

  // Legacy `location` URLs filtered by country — keep them working by
  // mapping them onto `country` when no explicit country is given.
  const country = countryParam ?? location ?? 'all';

  const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
  const term = q.trim();

  if (!term) {
    const { rows, total } = await getCachedOpportunities(
      category,
      country,
      province,
      deadlineDays,
      source,
      sort,
      safePage,
      perPage,
      includeExpired
    );
    return {
      items: rows.map((row) => toCardData(row as CardRow, lang)),
      total,
      page: safePage,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  try {
    const today = startOfTodayUtc();
    const where: Prisma.OpportunityWhereInput = includeExpired
      ? { status: { in: ['published', 'expired'] } }
      : { status: 'published' };

    const AND: Prisma.OpportunityWhereInput[] = [];
    if (!includeExpired) {
      AND.push({ OR: [{ deadline: null }, { deadline: { gte: today } }] });
    }

    if (category && category !== 'all') {
      where.category = { slug: category };
    }
    if (country && country !== 'all') {
      where.country = country;
    }
    if (province) {
      where.locations = { some: { province: { equals: province, mode: 'insensitive' } } };
    }
    if (deadlineDays && [7, 30, 90].includes(deadlineDays)) {
      const horizon = new Date(today);
      horizon.setUTCDate(horizon.getUTCDate() + deadlineDays);
      AND.push({ deadline: { gte: today, lte: horizon } });
    }
    if (source && source !== 'all') {
      where.sourceName = source;
    }

    AND.push({
      OR: [
        { title: { contains: term, mode: 'insensitive' } },
        { organization: { contains: term, mode: 'insensitive' } },
        { aiSummary: { contains: term, mode: 'insensitive' } },
        { country: { contains: term, mode: 'insensitive' } },
        // Province/city match — a search for "Kabul" finds the Kabul jobs.
        { locations: { some: { province: { contains: term, mode: 'insensitive' } } } },
        { locations: { some: { city: { contains: term, mode: 'insensitive' } } } },
      ],
    });
    where.AND = AND;

    let orderBy: Prisma.OpportunityOrderByWithRelationInput[];
    if (sort === 'deadline') {
      orderBy = [{ featured: 'desc' }, { deadline: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }];
    } else if (sort === 'title') {
      orderBy = [{ title: 'asc' }];
    } else {
      orderBy = [{ featured: 'desc' }, { createdAt: 'desc' }];
    }

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
      items: rows.map((row) => toCardData(row as CardRow, lang)),
      total,
      page: safePage,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  } catch (error) {
    console.error('Failed to list opportunities:', error);
    return {
      items: [],
      total: 0,
      page: safePage,
      perPage,
      totalPages: 1,
    };
  }
}

/**
 * Opportunities whose deadlines close soonest (urgency strip on the homepage).
 * Only published + unexpired rows with a deadline within the next 21 days,
 * ordered ascending. Falls back to the newest when none qualify.
 */
const getCachedClosingSoonRows = unstable_cache(
  async (limit: number) => {
    try {
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

      if (rows.length > 0) return rows;

      // Fallback: newest opportunities with any future deadline.
      return await db.opportunity.findMany({
        where: {
          status: 'published',
          OR: [{ deadline: { gte: today } }],
        },
        orderBy: [{ deadline: 'asc' }],
        select: CARD_SELECT,
        take: limit,
      });
    } catch (e) {
      console.error('Failed to get cached closing soon rows:', e);
      return [];
    }
  },
  ['closing-soon-rows-list'],
  { revalidate: 300, tags: ['opportunities'] }
);

export async function getClosingSoon(
  lang: Lang,
  limit = 4
): Promise<OpportunityCardData[]> {
  const rows = await getCachedClosingSoonRows(limit);
  return rows.map((row) => toCardData(row as CardRow, lang));
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

const getCachedDeadlinesData = unstable_cache(
  async (safePage: number, perPage: number) => {
    try {
      const today = startOfTodayUtc();
      const in7 = new Date(today);
      in7.setUTCDate(in7.getUTCDate() + 7);
      const in30 = new Date(today);
      in30.setUTCDate(in30.getUTCDate() + 30);

      const where: Prisma.OpportunityWhereInput = {
        status: 'published',
        deadline: { gte: today },
      };

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

      return { rows, total, within7, within30 };
    } catch (e) {
      console.error('Failed to get cached deadline data:', e);
      return { rows: [], total: 0, within7: 0, within30: 0 };
    }
  },
  ['cached-deadlines-list-data'],
  { revalidate: 300, tags: ['opportunities', 'deadlines'] }
);

export async function listByDeadline(
  lang: Lang,
  opts: { page?: number; perPage?: number } = {}
): Promise<DeadlineListResult> {
  const { page = 1, perPage = 12 } = opts;
  const safePage = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
  const { rows, total, within7, within30 } = await getCachedDeadlinesData(safePage, perPage);

  return {
    items: rows.map((row) => toCardData(row as CardRow, lang)),
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
  try {
    return await db.opportunity.findFirst({
      where: { slug, status: { not: 'draft' } },
      include: { category: true, locations: { orderBy: { province: 'asc' } } },
    });
  } catch (err) {
    console.error('Failed to get opportunity by slug:', slug, err);
    return null;
  }
}

/** Saved-jobs view: fetch a set of slugs (client bookmarks), any status. */
export async function getOpportunitiesBySlugs(
  slugs: string[],
  lang: Lang
): Promise<OpportunityCardData[]> {
  if (!slugs.length) return [];
  try {
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
  } catch (err) {
    console.error('Failed to get opportunities by slugs:', err);
    return [];
  }
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
  try {
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
  } catch (err) {
    console.error('Failed to get related opportunities:', err);
    return [];
  }
}

/** Category chips (always all 8, with active counts) + top locations. */
const getRawFacetsData = unstable_cache(
  async () => {
    try {
      const today = startOfTodayUtc();
      const where = {
        status: 'published' as const,
        OR: [{ deadline: null }, { deadline: { gte: today } }],
      };

      const [categories, byCategory, byCountry, byProvince, totalActive] = await Promise.all([
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
        // Province facet from structured locations — multi-province jobs are
        // counted under EVERY applicable province (intended behaviour).
        db.opportunityLocation.groupBy({
          by: ['province', 'country'],
          where: {
            province: { not: null },
            opportunity: where,
          },
          _count: { province: true },
          orderBy: { _count: { province: 'desc' } },
          take: 100,
        }),
        db.opportunity.count({ where }),
      ]);

      return { categories, byCategory, byCountry, byProvince, totalActive };
    } catch (e) {
      console.error('Failed to get raw facets data:', e);
      return { categories: [], byCategory: [], byCountry: [], byProvince: [], totalActive: 0 };
    }
  },
  ['raw-opportunity-facets-cache'],
  { revalidate: 300, tags: ['opportunities', 'facets'] }
);

export async function getFacets(lang?: Lang): Promise<Facets> {
  const { categories, byCategory, byCountry, byProvince, totalActive } = await getRawFacetsData();

  const countByCategory = new Map(
    byCategory.map((g) => [g.categoryId ?? '', g._count?._all ?? 0])
  );

  return {
    categories: categories.map((c) => ({
      slug: c.slug,
      name: lang
        ? (getLocalizedContent(c.name, c.nameI18n as Record<string, string> | null, lang) || c.name)
        : c.name,
      count: countByCategory.get(c.id) ?? 0,
    })),
    locations: byCountry.map((g) => ({
      name: g.country as string,
      count: g._count?.country ?? 0,
    })),
    provinces: byProvince
      .filter((g) => g.province)
      .map((g) => ({
        name: g.province as string,
        count: g._count?.province ?? 0,
        country: g.country,
      })),
    totalActive,
  };
}

export const getHomeStats = unstable_cache(
  async () => {
    try {
      const today = startOfTodayUtc();
      const activeWhere = {
        status: 'published' as const,
        OR: [{ deadline: null }, { deadline: { gte: today } }],
      };
      const [orgRows, countryRows, newsCount] = await Promise.all([
        db.opportunity.findMany({
          where: activeWhere,
          select: { organization: true },
          distinct: ['organization'],
        }),
        db.opportunity.findMany({
          where: activeWhere,
          select: { country: true },
          distinct: ['country'],
        }),
        db.news.count({ where: { status: 'published' } }),
      ]);
      const organizations = orgRows.filter((o) => o.organization?.trim()).length;
      const countries = countryRows.filter((r) => r.country).length;
      return {
        organizations,
        orgCount: orgRows.length,
        countries,
        newsCount,
      };
    } catch (e) {
      console.error('Failed to get home stats:', e);
      return {
        organizations: 0,
        orgCount: 0,
        countries: 0,
        newsCount: 0,
      };
    }
  },
  ['home-page-stats-summary'],
  { revalidate: 300, tags: ['opportunities', 'home-stats'] }
);

// ---------------------------------------------------------------------------
// detail-page helpers
// (resolveSummary / isOpportunityExpired / daysUntilDeadline are re-exported
// from '@/lib/opportunity-shared' above)

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

const getCachedSpotlightCandidates = unstable_cache(
  async (categorySlug?: string) => {
    try {
      const candidates = await db.opportunity.findMany({
        where: { ...activeWhere(), ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        select: { id: true },
        take: 60,
      });
      return candidates.map((c) => c.id);
    } catch (e) {
      console.error('Failed to get cached spotlight candidates:', e);
      return [];
    }
  },
  ['spotlight-candidates-list'],
  { revalidate: 300, tags: ['opportunities'] }
);

const getCachedCardById = unstable_cache(
  async (id: string) => {
    try {
      return await db.opportunity.findUnique({ where: { id }, select: CARD_SELECT });
    } catch (e) {
      console.error('Failed to get cached card by id:', e);
      return null;
    }
  },
  ['opportunity-card-by-id-cache'],
  { revalidate: 600, tags: ['opportunities'] }
);

async function pickSpotlight(
  seed: string,
  categorySlug?: string
): Promise<string | null> {
  const candidateIds = await getCachedSpotlightCandidates(categorySlug);
  if (candidateIds.length === 0) return null;
  return candidateIds[spotlightIndex(seed, candidateIds.length)];
}

/** Full display-ready card for a spotlight pick (null when nothing active). */
async function pickSpotlightCard(
  seed: string,
  lang: Lang,
  categorySlug?: string
): Promise<OpportunityCardData | null> {
  const id = await pickSpotlight(seed, categorySlug);
  if (!id) return null;
  const row = await getCachedCardById(id);
  return row ? toCardData(row as CardRow, lang) : null;
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
