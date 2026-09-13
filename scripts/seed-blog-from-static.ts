/**
 * Seed the News table from the legacy static blog-data.ts posts.
 *
 * - Creates NewsCategory rows for each distinct category.
 * - Upserts every static post into News (slug preserved → existing URLs keep
 *   working), status 'published', publishedAt parsed from the post date.
 * - Idempotent: safe to re-run (upsert on slug, never duplicates).
 *
 * Usage: bun run scripts/seed-blog-from-static.ts
 */

import { PrismaClient } from '@prisma/client';
import { blogPosts } from '../src/lib/blog-data';

const db = new PrismaClient();

function parseDate(value: string): Date {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Trilingual names for the standard editorial categories. */
const CATEGORY_I18N: Record<string, { fa: string; ps: string }> = {
  'career-advice': { fa: 'مشوره‌های کاری', ps: 'مسلکي مشورې' },
  'visa-guides': { fa: 'راهنماهای ویزا', ps: 'د ویزې لارښودونه' },
  'interview-prep': { fa: 'آمادگی مصاحبه', ps: 'د مرکې چمتوالی' },
  opportunities: { fa: 'فرصت‌ها', ps: 'فرصتونه' },
  scholarships: { fa: 'بورسیه‌ها', ps: 'بورسونه' },
  'cv-resume': { fa: 'سی‌وی و رزومه', ps: 'سی‌وی او رزومه' },
};

async function main(): Promise<void> {
  console.log(`[blog-seed] ${blogPosts.length} static posts found`);

  // 1. Categories
  const categories = Array.from(new Set(blogPosts.map((p) => p.category)));
  const catIds = new Map<string, string>();
  for (const name of categories) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const i18n = CATEGORY_I18N[slug];
    const existing = await db.newsCategory.findUnique({ where: { slug } });
    const row = existing
      ? await db.newsCategory.update({
          where: { slug },
          data: {
            name,
            nameI18n: i18n
              ? { ...((existing.nameI18n as Record<string, string> | null) || {}), en: name, ...i18n }
              : existing.nameI18n,
          },
        })
      : await db.newsCategory.create({
          data: { name, slug, nameI18n: i18n ? { en: name, ...i18n } : undefined },
        });
    catIds.set(name, row.id);
    console.log(`[blog-seed] category ${name} → ${row.id}`);
  }

  // 2. Posts
  let created = 0;
  let updated = 0;
  for (const post of blogPosts) {
    const data = {
      title: post.title,
      excerpt: post.excerpt,
      content: post.content.trim(),
      author: post.author,
      status: 'published',
      publishedAt: parseDate(post.date),
      categoryId: catIds.get(post.category) ?? null,
      featured: false,
    };
    const existing = await db.news.findUnique({ where: { slug: post.slug } });
    if (existing) {
      // Only fill base fields — never clobber existing translations.
      await db.news.update({ where: { slug: post.slug }, data });
      updated++;
    } else {
      await db.news.create({ data: { ...data, slug: post.slug } });
      created++;
    }
    console.log(`[blog-seed] ${existing ? 'updated' : 'created'} ${post.slug}`);
  }

  console.log(`[blog-seed] DONE created=${created} updated=${updated}`);
}

main()
  .catch((e) => {
    console.error('[blog-seed] FAILED', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
