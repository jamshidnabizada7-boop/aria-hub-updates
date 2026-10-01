import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { pickTril, type LocalDoc } from './static-page-content';
import type { Lang } from './lang-route';

/**
 * Admin override loader for the growth pages (press / partners / webinar /
 * ambassador). Same contract as the about page: a published `Page` row whose
 * slug matches (press | partners | webinar | ambassador) overrides the
 * built-in trilingual doc (title/titleI18n, content/contentI18n HTML); a
 * draft row hides the page (notFound) like the about page; DB errors fall
 * back to the built-in doc so the page never breaks.
 */
export async function loadGrowthPage(slug: string, lang: Lang, fallback: LocalDoc) {
  let title = pickTril(fallback.title, lang);
  let dbHtml = '';

  try {
    const page = await db.page.findUnique({ where: { slug } });
    if (page) {
      if (page.status !== 'published') {
        notFound();
      }
      title =
        getLocalizedContent(page.title, page.titleI18n as Record<string, string> | null, lang) || title;
      dbHtml = getLocalizedContent(page.content, page.contentI18n as Record<string, string> | null, lang);
    }
  } catch (e: any) {
    if (e?.digest?.includes('NEXT_NOT_FOUND')) throw e;
    // DB or table might not exist yet — built-in trilingual doc covers it.
  }

  return { title, dbHtml };
}
