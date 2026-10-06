import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export const revalidate = 86400; // Cache sitemap for 24 hours

const BASE_URL = 'https://www.myariahub.com';
const LANGS = ['en', 'fa', 'ps'] as const;
// 2026-10-06 audit §8: raised from 2000 — with ~2000 opportunity/blog URLs the
// old cap left a zero budget for the organizations section.
const MAX_URLS = 5000;

type SitemapEntry = MetadataRoute.Sitemap[number];

function languageAlternates(path: string): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const lang of LANGS) {
    alternates[lang] = `${BASE_URL}/${lang}${path === '/' ? '' : path}`;
  }
  return alternates;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Use the most-recently-updated opportunity to signal freshness for the
  // opportunities section (helps crawlers detect new content).
  let oppLastModified = now;
  try {
    const latest = await db.opportunity.findFirst({
      where: { status: 'published' },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    if (latest?.updatedAt) oppLastModified = latest.updatedAt;
  } catch {
    // ignore — fall back to now
  }

  const entries: SitemapEntry[] = [];

  // ── Static pages, one entry per language with hreflang alternates ──
  const staticPaths: { path: string; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; priority: number }[] = [
    { path: '/', changeFrequency: 'daily', priority: 1 },
    { path: '/opportunities', changeFrequency: 'daily', priority: 0.9 },
    { path: '/deadlines', changeFrequency: 'daily', priority: 0.8 },
    { path: '/visas', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/templates', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/visa-prep', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/interview-prep', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/cv-builder', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/opportunity-matcher', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/submit-opportunity', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/track', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/employers', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/employers/post', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/advertise', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/services', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/partners', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/press', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/webinar', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/ambassador', changeFrequency: 'monthly', priority: 0.5 },
    { path: '/blog', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/success-stories', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/privacy-policy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/terms-of-service', changeFrequency: 'yearly', priority: 0.3 },
  ];

  for (const lang of LANGS) {
    for (const { path, changeFrequency, priority } of staticPaths) {
      entries.push({
        url: `${BASE_URL}/${lang}${path === '/' ? '' : path}`,
        lastModified: path === '/opportunities' ? oppLastModified : now,
        changeFrequency,
        priority,
        alternates: { languages: languageAlternates(path) },
      });
    }
  }

  // ── Published, non-expired opportunities (deadline in the future or null) ──
  try {
    const remaining = Math.max(0, MAX_URLS - entries.length);
    const opportunityBudget = Math.floor(remaining / LANGS.length);

    const opportunities = await db.opportunity.findMany({
      where: {
        status: 'published',
        OR: [{ deadline: null }, { deadline: { gte: now } }],
      },
      orderBy: { updatedAt: 'desc' },
      select: { slug: true, updatedAt: true },
      take: opportunityBudget,
    });

    for (const opp of opportunities) {
      const path = `/opportunities/${opp.slug}`;
      for (const lang of LANGS) {
        if (entries.length >= MAX_URLS) break;
        entries.push({
          url: `${BASE_URL}/${lang}${path}`,
          lastModified: opp.updatedAt || now,
          changeFrequency: 'daily',
          priority: 0.8,
          alternates: { languages: languageAlternates(path) },
        });
      }
    }
  } catch {
    // DB unavailable — static entries above are still emitted
  }

  // ── Published blog posts from the News table (trilingual alternates) ──
  try {
    const remaining = Math.max(0, MAX_URLS - entries.length);
    const blogBudget = Math.floor(remaining / LANGS.length);

    const posts = await db.news.findMany({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      select: { slug: true, updatedAt: true },
      take: Math.min(blogBudget, 200),
    });

    for (const post of posts) {
      const path = `/blog/${post.slug}`;
      for (const lang of LANGS) {
        if (entries.length >= MAX_URLS) break;
        entries.push({
          url: `${BASE_URL}/${lang}${path}`,
          lastModified: post.updatedAt || now,
          changeFrequency: 'weekly',
          priority: 0.6,
          alternates: { languages: languageAlternates(path) },
        });
      }
    }
  } catch {
    // DB unavailable — static entries above are still emitted
  }

  // ── Published success stories (community wins, trilingual alternates) ──
  try {
    const remaining = Math.max(0, MAX_URLS - entries.length);
    const storyBudget = Math.floor(remaining / LANGS.length);

    const stories = await db.successStory.findMany({
      where: { status: 'published' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, updatedAt: true },
      take: Math.min(storyBudget, 150),
    });

    for (const story of stories) {
      const path = `/success-stories/${story.id}`;
      for (const lang of LANGS) {
        if (entries.length >= MAX_URLS) break;
        entries.push({
          url: `${BASE_URL}/${lang}${path}`,
          lastModified: story.updatedAt || now,
          changeFrequency: 'monthly',
          priority: 0.5,
          alternates: { languages: languageAlternates(path) },
        });
      }
    }
  } catch {
    // DB unavailable — static entries above are still emitted
  }

  // ── Published document templates (trilingual alternates) ──
  try {
    const remaining = Math.max(0, MAX_URLS - entries.length);
    const templateBudget = Math.floor(remaining / LANGS.length);

    const templates = await db.documentTemplate.findMany({
      where: { status: 'published' },
      orderBy: { updatedAt: 'desc' },
      select: { slug: true, updatedAt: true },
      take: Math.min(templateBudget, 100),
    });

    for (const item of templates) {
      const path = `/templates/${item.slug}`;
      for (const lang of LANGS) {
        if (entries.length >= MAX_URLS) break;
        entries.push({
          url: `${BASE_URL}/${lang}${path}`,
          lastModified: item.updatedAt || now,
          changeFrequency: 'weekly',
          priority: 0.7,
          alternates: { languages: languageAlternates(path) },
        });
      }
    }
  } catch {
    // DB unavailable — static entries above are still emitted
  }

  // ── Active public organization profiles (trilingual alternates) ──
  try {
    const remaining = Math.max(0, MAX_URLS - entries.length);
    const orgBudget = Math.floor(remaining / LANGS.length);

    const orgs = await db.organization.findMany({
      where: { active: true },
      orderBy: { updatedAt: 'desc' },
      select: { slug: true, updatedAt: true },
      take: Math.min(orgBudget, 300),
    });

    for (const item of orgs) {
      const path = `/organizations/${item.slug}`;
      for (const lang of LANGS) {
        if (entries.length >= MAX_URLS) break;
        entries.push({
          url: `${BASE_URL}/${lang}${path}`,
          lastModified: item.updatedAt || now,
          changeFrequency: 'weekly',
          priority: 0.6,
          alternates: { languages: languageAlternates(path) },
        });
      }
    }
  } catch {
    // DB unavailable — static entries above are still emitted
  }

  return entries.slice(0, MAX_URLS);
}
