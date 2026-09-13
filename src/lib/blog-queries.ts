/**
 * DB-backed blog queries — trilingual via *I18n fields with English fallback.
 * Source-hiding rules don't apply here (posts are original content), but
 * drafts/archived rows never reach users.
 */

import { db } from '@/lib/db';
import type { News } from '@prisma/client';
import { getLocalizedContent } from '@/lib/i18n-content';
import type { Lang } from '@/lib/i18n-config';

export interface BlogCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author: string | null;
  image: string | null;
  featured: boolean;
  publishedAt: Date;
  categorySlug: string | null;
  categoryName: string | null;
  readingMinutes: number;
}

export interface BlogPostDetail extends BlogCard {
  content: string;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
}

function readingMinutes(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Minimal shape the mapper needs — includes narrow `category` to a subset. */
type NewsRowForCard = Omit<News, 'category'> & {
  category: { slug: string; name: string; nameI18n: unknown } | null;
};

function toCard(row: NewsRowForCard, lang: Lang): BlogCard {
  const title = getLocalizedContent(row.title, row.titleI18n as Record<string, string> | null, lang);
  return {
    id: row.id,
    slug: row.slug,
    title,
    excerpt: getLocalizedContent(row.excerpt, row.excerptI18n as Record<string, string> | null, lang),
    author: row.author,
    image: row.image,
    featured: row.featured,
    publishedAt: row.publishedAt,
    categorySlug: row.category?.slug ?? null,
    categoryName: row.category
      ? getLocalizedContent(row.category.name, row.category.nameI18n as Record<string, string> | null, lang)
      : null,
    readingMinutes: readingMinutes(
      getLocalizedContent(row.content, row.contentI18n as Record<string, string> | null, lang)
    ),
  };
}

/** Published posts, newest first. Optional category filter. */
export async function listBlogPosts(
  lang: Lang,
  categorySlug?: string | null,
  take = 48
): Promise<BlogCard[]> {
  const rows = await db.news.findMany({
    where: {
      status: 'published',
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
    take,
    include: { category: { select: { slug: true, name: true, nameI18n: true } } },
  });
  return rows.map((row) => toCard(row, lang));
}

/** Distinct categories that actually have published posts (for filter chips). */
export async function listBlogCategories(
  lang: Lang
): Promise<Array<{ slug: string; name: string; count: number }>> {
  const rows = await db.newsCategory.findMany({
    select: {
      slug: true,
      name: true,
      nameI18n: true,
      _count: { select: { posts: { where: { status: 'published' } } } },
    },
  });
  return rows
    .map((c) => ({
      slug: c.slug,
      name: getLocalizedContent(c.name, c.nameI18n as Record<string, string> | null, lang),
      count: c._count.posts,
    }))
    .filter((c) => c.count > 0);
}

export async function getBlogPost(slug: string, lang: Lang): Promise<BlogPostDetail | null> {
  const row = await db.news.findFirst({
    where: { slug, status: 'published' },
    include: { category: { select: { slug: true, name: true, nameI18n: true } } },
  });
  if (!row) return null;
  const card = toCard(row, lang);
  return {
    ...card,
    content: getLocalizedContent(row.content, row.contentI18n as Record<string, string> | null, lang),
    tags: (() => {
      try {
        const parsed = row.tags ? (JSON.parse(row.tags) as unknown) : [];
        return Array.isArray(parsed) ? parsed.map(String).slice(0, 8) : [];
      } catch {
        return [];
      }
    })(),
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
  };
}

/** Related posts in the same category (fallback: latest). */
export async function listRelatedPosts(
  lang: Lang,
  categorySlug: string | null,
  excludeSlug: string,
  take = 3
): Promise<BlogCard[]> {
  const rows = await db.news.findMany({
    where: {
      status: 'published',
      slug: { not: excludeSlug },
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    },
    orderBy: { publishedAt: 'desc' },
    take,
    include: { category: { select: { slug: true, name: true, nameI18n: true } } },
  });
  return rows.map((row) => toCard(row, lang));
}
