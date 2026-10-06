import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import { getLocalizedContent, localizedContentMatchesLang } from '@/lib/i18n-content';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n-config';
import type { Prisma } from '@prisma/client';

/**
 * Success Stories — community-submitted wins (scholarships, jobs, visas,
 * exchanges). All user-facing text resolves through *I18n JSON columns with
 * graceful fallback to the base (English) column, mirroring blog-queries.
 *
 * Submissions arrive as status='pending'; only status='published' rows are
 * user-visible. contactEmail is NEVER exposed to the public queries —
 * admin-only (see /api/admin/crud).
 */

export const STORY_TYPES = [
  'scholarship',
  'job',
  'visa',
  'exchange',
  'training',
  'other',
] as const;

export type StoryType = (typeof STORY_TYPES)[number];

export type StoryCard = {
  id: string;
  title: string;
  excerpt: string;
  storyType: string;
  country: string;
  program: string | null;
  visaType: string | null;
  year: number;
  authorAlias: string;
  likes: number;
  featured: boolean;
  createdAt: Date;
};

type StoryRow = Prisma.SuccessStoryGetPayload<{ select: typeof LIST_SELECT }>;

/** Localize + clean a story row into card shape (never leaks contactEmail). */
function toCard(row: StoryRow, lang: Lang, maxExcerpt = 180): StoryCard {
  const title = getLocalizedContent(row.title, row.titleI18n as Record<string, string> | null, lang) || row.title;
  const content = getLocalizedContent(row.content, row.contentI18n as Record<string, string> | null, lang) || row.content;
  const excerpt = content
    .replace(/[#*_>`~\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxExcerpt);
  return {
    id: row.id,
    title,
    excerpt: excerpt.length < content.length ? `${excerpt}…` : excerpt,
    storyType: STORY_TYPES.includes(row.storyType as StoryType) ? row.storyType : 'other',
    country: row.country,
    program: row.program,
    visaType: row.visaType,
    year: row.year,
    authorAlias: row.authorAlias || 'ARIA Community',
    likes: row.likes,
    featured: row.featured,
    createdAt: row.createdAt,
  };
}

// Transfer-safety: lists derive a 180-char excerpt from the English `content`;
// the multi-language `contentI18n` blob (largest column) ships only in the
// detail fetch (getStory).
const LIST_SELECT: Prisma.SuccessStorySelect = {
  id: true,
  title: true,
  titleI18n: true,
  storyType: true,
  country: true,
  program: true,
  visaType: true,
  year: true,
  content: true,
  authorAlias: true,
  featured: true,
  likes: true,
  status: true,
  createdAt: true,
};

/** Published stories for the listing, newest first (featured pinned on top of page 1). */
export async function listSuccessStories(
  lang: Lang,
  opts: { storyType?: string; country?: string; page?: number; perPage?: number } = {}
): Promise<{ items: StoryCard[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(48, Math.max(1, opts.perPage ?? 12));
  const where: Prisma.SuccessStoryWhereInput = { status: 'published' };
  if (opts.storyType && opts.storyType !== 'all') where.storyType = opts.storyType;
  if (opts.country && opts.country !== 'all') where.country = opts.country;

  try {
    const [rows, total] = await Promise.all([
      db.successStory.findMany({
        where,
        select: LIST_SELECT,
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      db.successStory.count({ where }),
    ]);
    return {
      items: rows.map((r) => toCard(r, lang)),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  } catch {
    return { items: [], total: 0, page, totalPages: 1 };
  }
}

/** Full localized story for the detail page (published only). */
export async function getSuccessStory(
  id: string,
  lang: Lang
): Promise<(StoryCard & { content: string; originalLanguage?: boolean }) | null> {
  try {
    const row = await db.successStory.findFirst({
      where: { id, status: 'published' },
    });
    if (!row) return null;
    const card = toCard(row, lang, 100000);
    const content =
      getLocalizedContent(row.content, row.contentI18n as Record<string, string> | null, lang) ||
      row.content;
    return {
      ...card,
      excerpt: card.excerpt,
      content,
      // §7 original-language indicator
      originalLanguage: !localizedContentMatchesLang(row.title, row.titleI18n as Record<string, string> | null, lang) ||
        !localizedContentMatchesLang(row.content, row.contentI18n as Record<string, string> | null, lang),
    };
  } catch {
    return null;
  }
}

/** Up to n related stories (same type first, then newest). */
export async function getRelatedStories(
  id: string,
  storyType: string,
  lang: Lang,
  n = 3
): Promise<StoryCard[]> {
  try {
    const sameType = await db.successStory.findMany({
      where: { status: 'published', storyType, id: { not: id } },
      select: LIST_SELECT,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: n,
    });
    if (sameType.length >= n) return sameType.map((r) => toCard(r, lang));
    const fill = await db.successStory.findMany({
      where: { status: 'published', id: { notIn: [id, ...sameType.map((r) => r.id)] } },
      select: LIST_SELECT,
      orderBy: [{ createdAt: 'desc' }],
      take: n - sameType.length,
    });
    return [...sameType, ...fill].map((r) => toCard(r, lang));
  } catch {
    return [];
  }
}

/** Story type chips with published counts + totals for the stats band. */
export async function getStoryFacets(lang: Lang): Promise<{
  types: { type: string; label: string; count: number }[];
  total: number;
  countries: number;
  year: number | null;
}> {
  try {
    const [grouped, total, distinctCountries, latest] = await Promise.all([
      db.successStory.groupBy({
        by: ['storyType'],
        where: { status: 'published' },
        _count: true,
      }),
      db.successStory.count({ where: { status: 'published' } }),
      db.successStory.groupBy({
        by: ['country'],
        where: { status: 'published' },
        _count: true,
      }),
      db.successStory.findFirst({
        where: { status: 'published' },
        orderBy: { year: 'desc' },
        select: { year: true },
      }),
    ]);

    const countByType = new Map(grouped.map((g) => [g.storyType, g._count]));
    const types = STORY_TYPES.map((type) => ({
      type,
      label: translateStoryType(type, lang),
      count: countByType.get(type) ?? 0,
    }));
    return {
      types,
      total,
      countries: distinctCountries.length,
      year: latest?.year ?? null,
    };
  } catch {
    return { types: [], total: 0, countries: 0, year: null };
  }
}

const getCachedFeaturedStoryRow = unstable_cache(
  async () => {
    try {
      return await db.successStory.findFirst({
        where: { status: 'published' },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        select: LIST_SELECT,
      });
    } catch {
      return null;
    }
  },
  ['featured-success-story-card-row'],
  { revalidate: 600, tags: ['success-stories'] }
);

/** Slim featured-story card for the homepage teaser (1 cached query, never throws). */
export async function getFeaturedStoryCard(lang: Lang): Promise<StoryCard | null> {
  const row = await getCachedFeaturedStoryRow();
  return row ? toCard(row, lang, 160) : null;
}

const TYPE_LABEL_KEYS: Record<string, string> = {
  scholarship: 'stories.typeScholarship',
  job: 'stories.typeJob',
  visa: 'stories.typeVisa',
  exchange: 'stories.typeExchange',
  training: 'stories.typeTraining',
  other: 'stories.typeOther',
};

export function translateStoryType(type: string, lang: Lang): string {
  const key = TYPE_LABEL_KEYS[type] || 'stories.typeOther';
  return translate(lang, key, undefined) || type;
}
