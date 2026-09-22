/**
 * ARIA HUB — Brand Studio daily post planner (server-side).
 *
 * Decides WHAT to post each day, in order, from live DB pools — deterministic
 * (same day ⇒ same plan) and 100% database-driven:
 *
 *   - weekday mix: every day gets 1 opportunity spotlight + 2 rotating formats
 *   - rotation: (dayIndex mod poolSize) — cycles fresh content without repeats
 *   - freshness: only published rows; opportunities must be non-expired;
 *     deadline alerts come from the "closing soon" pool (next 14 days)
 *   - captions: pre-built with the deterministic brand-voice engine so every
 *     post is share-ready the moment the plan loads
 *
 * Brand copy (tips / quotes / promos) lives in the SocialIdea table — editable
 * from the admin panel, never hardcoded.
 */

import { db } from '@/lib/db';
import { translate } from '@/lib/i18n';
import { getLocalizedContent } from '@/lib/i18n-content';
import { formatDateLong, toEasternDigits } from '@/lib/date-format';
import type { Lang } from '@/lib/lang-route';
import { dayIndex, type PostTemplate } from '@/lib/social/brand';
import { buildCaption, captionBrief, type CaptionInput } from '@/lib/social/captions';

/** Weekday mix — index = JS getUTCDay() (0 = Sunday). 5 posts per day
 *  (spotlight + deadline first for engagement, then variety). */
const WEEK_MIX: PostTemplate[][] = [
  ['spotlight', 'deadline', 'quote', 'tip', 'stat'], // Sun
  ['spotlight', 'tip', 'stat', 'quote', 'promo'], // Mon
  ['spotlight', 'news', 'quote', 'deadline', 'tip'], // Tue
  ['spotlight', 'deadline', 'promo', 'stat', 'quote'], // Wed
  ['spotlight', 'tip', 'story', 'news', 'deadline'], // Thu
  ['spotlight', 'news', 'stat', 'quote', 'promo'], // Fri
  ['spotlight', 'quote', 'promo', 'deadline', 'tip'], // Sat
];

export interface PlanOpp {
  slug: string;
  title: string;
  titleI18n: unknown;
  organization: string | null;
  country: string | null;
  deadline: string | null;
  featured: boolean;
  salary: string | null;
  salaryI18n: unknown;
  category: { name: string; nameI18n: unknown } | null;
}

export interface PlanIdea {
  id: string;
  kind: string;
  text: string;
  textI18n: unknown;
}

export interface PlanNews {
  slug: string;
  title: string;
  titleI18n: unknown;
  excerpt: string;
  excerptI18n: unknown;
  publishedAt: string;
}

export interface PlanStory {
  id: string;
  title: string;
  titleI18n: unknown;
  content: string;
  contentI18n: unknown;
  country: string | null;
  program: string | null;
  year: string | null;
}

export interface PlanStat {
  value: string; // pre-formatted (Eastern digits where needed)
  labelKey: string;
  subKey: string;
  count: number;
}

export interface PlanPost {
  key: string;
  template: PostTemplate;
  seriesNo?: number;
  title: string; // localized display title
  meta?: string; // localized display meta line
  opp?: PlanOpp;
  idea?: PlanIdea;
  news?: PlanNews;
  story?: PlanStory;
  stat?: PlanStat;
  caption: string;
  brief: string;
}

export interface DailyPlan {
  date: string; // ISO date (UTC)
  dayNumber: number;
  lang: Lang;
  posts: PlanPost[];
  pools: {
    opportunity: PlanOpp[];
    closingSoon: PlanOpp[];
    ideaTip: PlanIdea[];
    ideaQuote: PlanIdea[];
    ideaPromo: PlanIdea[];
    news: PlanNews[];
    story: PlanStory[];
    stats: PlanStat[];
  };
}

const i18n = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, string>) : null);
const trim = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function daysLeftOf(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

export async function buildDailyPlan(lang: Lang): Promise<DailyPlan> {
  const now = new Date();
  const dayNumber = dayIndex(now);
  const mix = WEEK_MIX[now.getUTCDay()];
  const t = (key: string, params?: Record<string, string | number>) => translate(lang, key, params);

  // ── pools ────────────────────────────────────────────────────────────────
  const [oppRows, closingRows, newsRows, storyRows, ideaRows, oppCount, newsCount, countryRows] =
    await Promise.all([
      db.opportunity.findMany({
        where: { status: 'published', OR: [{ deadline: null }, { deadline: { gt: now } }] },
        orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
        take: 40,
        select: {
          slug: true, title: true, titleI18n: true, organization: true, country: true,
          deadline: true, featured: true, salary: true, salaryI18n: true,
          category: { select: { name: true, nameI18n: true } },
        },
      }),
      db.opportunity.findMany({
        where: { status: 'published', deadline: { gt: now, lte: new Date(now.getTime() + 14 * 86400000) } },
        orderBy: { deadline: 'asc' },
        take: 20,
        select: {
          slug: true, title: true, titleI18n: true, organization: true, country: true,
          deadline: true, featured: true, salary: true, salaryI18n: true,
          category: { select: { name: true, nameI18n: true } },
        },
      }),
      db.news.findMany({
        where: { status: 'published' },
        orderBy: { publishedAt: 'desc' },
        take: 30,
        select: { slug: true, title: true, titleI18n: true, excerpt: true, excerptI18n: true, publishedAt: true },
      }),
      db.successStory.findMany({
        where: { status: 'published' },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { id: true, title: true, titleI18n: true, content: true, contentI18n: true, country: true, program: true, year: true },
      }),
      db.socialIdea.findMany({
        where: { active: true },
        orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
        select: { id: true, kind: true, text: true, textI18n: true },
      }),
      db.opportunity.count({ where: { status: 'published', OR: [{ deadline: null }, { deadline: { gt: now } }] } }),
      db.news.count({ where: { status: 'published' } }),
      db.opportunity.findMany({ where: { status: 'published', country: { not: null } }, distinct: ['country'], select: { country: true } }),
    ]);

  const oppPool: PlanOpp[] = oppRows.map((o) => ({ ...o, deadline: o.deadline ? o.deadline.toISOString() : null }));
  const closingPool: PlanOpp[] = closingRows.map((o) => ({ ...o, deadline: o.deadline ? o.deadline.toISOString() : null }));
  const newsPool: PlanNews[] = newsRows.map((n) => ({ ...n, publishedAt: n.publishedAt.toISOString() }));
  const storyPool = storyRows as unknown as PlanStory[];
  const tips = ideaRows.filter((i) => i.kind === 'tip');
  const quotes = ideaRows.filter((i) => i.kind === 'quote');
  const promos = ideaRows.filter((i) => i.kind === 'promo');

  const stats: PlanStat[] = [
    {
      count: oppCount,
      value: `${toEasternDigits(String(oppCount), lang)}+`,
      labelKey: 'social.post.statLiveOpps',
      subKey: 'social.post.statSubNow',
    },
    {
      count: countryRows.length,
      value: toEasternDigits(String(countryRows.length), lang),
      labelKey: 'social.post.statCountries',
      subKey: 'social.post.statSubCountries',
    },
    {
      count: newsCount,
      value: `${toEasternDigits(String(newsCount), lang)}+`,
      labelKey: 'social.post.statNews',
      subKey: 'social.post.statSubNews',
    },
  ];

  // ── rotation cursor per pool ─────────────────────────────────────────────
  const cursor: Record<string, number> = {};
  const pick = <T,>(pool: T[], id: string): T | null => {
    if (!pool.length) return null;
    const i = cursor[id] ?? dayNumber % pool.length;
    cursor[id] = i + 1;
    return pool[i % pool.length];
  };

  // ── build posts in weekday order ─────────────────────────────────────────
  const posts: PlanPost[] = [];

  for (const template of mix) {
    if (template === 'spotlight') {
      const opp = pick(oppPool, 'opportunity');
      if (!opp) continue;
      const title = getLocalizedContent(opp.title, i18n(opp.titleI18n), lang) || opp.title;
      const dl = opp.deadline ? new Date(opp.deadline) : null;
      const input: CaptionInput = {
        template, lang, title,
        org: opp.organization ?? undefined,
        country: opp.country ?? undefined,
        deadlineText: dl ? formatDateLong(dl, lang) : undefined,
        daysLeft: daysLeftOf(opp.deadline),
        slug: opp.slug,
      };
      posts.push({
        key: `spotlight-${opp.slug}`, template, title,
        meta: [opp.category ? getLocalizedContent(opp.category.name, i18n(opp.category.nameI18n), lang) || opp.category.name : null, opp.country].filter(Boolean).join(' • ') || undefined,
        opp, caption: buildCaption(input), brief: captionBrief(input),
      });
    } else if (template === 'deadline') {
      const opp = pick(closingPool, 'closingSoon');
      if (!opp) continue;
      const title = getLocalizedContent(opp.title, i18n(opp.titleI18n), lang) || opp.title;
      const dl = opp.deadline ? new Date(opp.deadline) : null;
      const daysLeft = daysLeftOf(opp.deadline);
      const input: CaptionInput = {
        template, lang, title,
        org: opp.organization ?? undefined,
        country: opp.country ?? undefined,
        deadlineText: dl ? formatDateLong(dl, lang) : undefined,
        daysLeft, slug: opp.slug,
      };
      posts.push({
        key: `deadline-${opp.slug}`, template, title,
        meta: dl ? `${translate(lang, 'poster.applyBy')}: ${formatDateLong(dl, lang)}` : undefined,
        opp, caption: buildCaption(input), brief: captionBrief(input),
      });
    } else if (template === 'tip' || template === 'quote' || template === 'promo') {
      const pool = template === 'tip' ? tips : template === 'quote' ? quotes : promos;
      const idea = pick(pool, `idea:${template}`);
      if (!idea) continue;
      const title = getLocalizedContent(idea.text, i18n(idea.textI18n), lang) || idea.text;
      const seriesNo = pool.indexOf(idea) + 1;
      const input: CaptionInput = { template, lang, title, seriesNo };
      posts.push({
        key: `${template}-${idea.id}`, template, title, seriesNo,
        caption: buildCaption(input), brief: captionBrief(input),
      });
    } else if (template === 'news') {
      const n = pick(newsPool, 'news');
      if (!n) continue;
      const title = getLocalizedContent(n.title, i18n(n.titleI18n), lang) || n.title;
      const note = trim(getLocalizedContent(n.excerpt, i18n(n.excerptI18n), lang) || n.excerpt, 160);
      const input: CaptionInput = { template, lang, title, note };
      posts.push({
        key: `news-${n.slug}`, template, title, meta: note,
        news: n, caption: buildCaption(input), brief: captionBrief(input),
      });
    } else if (template === 'stat') {
      const stat = pick(stats, 'stat');
      if (!stat) continue;
      const label = t(stat.labelKey);
      const sub = t(stat.subKey);
      const title = `${stat.value} ${label}`;
      const input: CaptionInput = { template, lang, title, statValue: stat.value, statLabel: label, note: sub };
      posts.push({
        key: `stat-${stat.labelKey}`, template, title, meta: sub, stat,
        caption: buildCaption(input), brief: captionBrief(input),
      });
    } else if (template === 'story') {
      const s = pick(storyPool, 'story');
      if (!s) continue;
      const stitle = getLocalizedContent(s.title, i18n(s.titleI18n), lang) || s.title;
      const content = getLocalizedContent(s.content, i18n(s.contentI18n), lang) || s.content;
      const excerpt = trim(content, 190);
      const personMeta = [s.program, s.country].filter(Boolean).join(' • ');
      const input: CaptionInput = {
        template, lang, title: excerpt, personName: stitle, personMeta: personMeta || undefined,
      };
      posts.push({
        key: `story-${s.id}`, template, title: excerpt, meta: stitle,
        story: s, caption: buildCaption(input), brief: captionBrief(input),
      });
    }
  }

  return {
    date: now.toISOString().slice(0, 10),
    dayNumber,
    lang,
    posts,
    pools: {
      opportunity: oppPool.slice(0, 14),
      closingSoon: closingPool.slice(0, 10),
      ideaTip: tips.slice(0, 12),
      ideaQuote: quotes.slice(0, 10),
      ideaPromo: promos.slice(0, 6),
      news: newsPool.slice(0, 12),
      story: storyPool.slice(0, 8),
      stats,
    },
  };
}
