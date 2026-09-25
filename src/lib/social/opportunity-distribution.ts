import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { formatDateLong } from '@/lib/date-format';
import { buildCaption, captionBrief, type CaptionInput } from '@/lib/social/captions';
import type { Lang } from '@/lib/lang-route';
import type { PlanOpp, PlanPost } from '@/lib/social/plan';

export {
  DEFAULT_OPPORTUNITY_DAILY_TARGET,
  DEFAULT_OPPORTUNITY_BATCH_SIZE,
  DEFAULT_OPPORTUNITY_REPEAT_DAYS,
  DEFAULT_OPPORTUNITY_BATCH_TIMES_AFT,
} from '@/lib/social/opportunity-distribution-schedule';
import {
  DEFAULT_OPPORTUNITY_DAILY_TARGET,
  DEFAULT_OPPORTUNITY_REPEAT_DAYS,
} from '@/lib/social/opportunity-distribution-schedule';

export interface OpportunityDistributionOptions {
  target?: number;
  repeatDays?: number;
}


type Candidate = {
  slug: string;
  title: string;
  titleI18n: unknown;
  organization: string | null;
  country: string | null;
  deadline: Date | null;
  featured: boolean;
  salary: string | null;
  salaryI18n: unknown;
  updatedAt: Date;
  category: { name: string; nameI18n: unknown } | null;
};

const i18n = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, string>) : null);

function daysLeft(deadline: Date | null, now: Date): number | null {
  if (!deadline) return null;
  return Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
}

function toPlanOpp(row: Candidate): PlanOpp {
  return {
    slug: row.slug,
    title: row.title,
    titleI18n: row.titleI18n,
    organization: row.organization,
    country: row.country,
    deadline: row.deadline ? row.deadline.toISOString() : null,
    featured: row.featured,
    salary: row.salary,
    salaryI18n: row.salaryI18n,
    category: row.category,
  };
}

/**
 * Automatic social planner dedicated to opportunities.
 *
 * Brand Studio's editorial planner remains unchanged; this planner is only for
 * automatic distribution. It prefers never-posted inventory, respects a
 * repeat cooldown, and prioritizes urgent/featured/recent opportunities.
 */
export async function buildOpportunityDistributionPlan(
  lang: Lang,
  options: OpportunityDistributionOptions = {},
): Promise<PlanPost[]> {
  const now = new Date();
  const target = Math.min(50, Math.max(1, options.target ?? DEFAULT_OPPORTUNITY_DAILY_TARGET));
  const repeatDays = Math.min(90, Math.max(1, options.repeatDays ?? DEFAULT_OPPORTUNITY_REPEAT_DAYS));
  const repeatCutoff = new Date(now.getTime() - repeatDays * 86400000);

  const [rows, history] = await Promise.all([
    db.opportunity.findMany({
      where: {
        status: 'published',
        OR: [{ deadline: null }, { deadline: { gte: now } }],
      },
      orderBy: [
        { featured: 'desc' },
        { updatedAt: 'desc' },
        { slug: 'asc' },
      ],
      take: 1000,
      select: {
        slug: true,
        title: true,
        titleI18n: true,
        organization: true,
        country: true,
        deadline: true,
        featured: true,
        salary: true,
        salaryI18n: true,
        updatedAt: true,
        category: { select: { name: true, nameI18n: true } },
      },
    }),
    db.socialPostQueue.findMany({
      where: {
        contentRef: { not: null },
        templateType: { in: ['spotlight', 'deadline'] },
      },
      orderBy: { scheduledFor: 'desc' },
      take: 5000,
      select: { contentRef: true, scheduledFor: true },
    }),
  ]);

  const lastScheduled = new Map<string, Date>();
  for (const item of history) {
    if (!item.contentRef || lastScheduled.has(item.contentRef)) continue;
    lastScheduled.set(item.contentRef, item.scheduledFor);
  }

  const eligible = rows.filter((row) => {
    const last = lastScheduled.get(row.slug);
    return !last || last < repeatCutoff;
  });

  // Stable multi-factor priority:
  // 1) never distributed
  // 2) deadline <= 7 days
  // 3) featured
  // 4) recently updated
  // 5) oldest previous distribution first
  eligible.sort((a, b) => {
    const aLast = lastScheduled.get(a.slug);
    const bLast = lastScheduled.get(b.slug);
    if (!aLast && bLast) return -1;
    if (aLast && !bLast) return 1;

    const aDays = daysLeft(a.deadline, now);
    const bDays = daysLeft(b.deadline, now);
    const aUrgent = aDays !== null && aDays <= 7 ? 0 : 1;
    const bUrgent = bDays !== null && bDays <= 7 ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;

    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.updatedAt.getTime() !== b.updatedAt.getTime()) return b.updatedAt.getTime() - a.updatedAt.getTime();

    const aLastMs = aLast?.getTime() ?? 0;
    const bLastMs = bLast?.getTime() ?? 0;
    return aLastMs - bLastMs || a.slug.localeCompare(b.slug);
  });

  return eligible.slice(0, target).map((row) => {
    const opp = toPlanOpp(row);
    const title = getLocalizedContent(row.title, i18n(row.titleI18n), lang) || row.title;
    const n = daysLeft(row.deadline, now);
    const template = n !== null && n <= 7 ? 'deadline' as const : 'spotlight' as const;
    const deadlineText = row.deadline ? formatDateLong(row.deadline, lang) : undefined;
    const input: CaptionInput = {
      template,
      lang,
      title,
      org: row.organization ?? undefined,
      country: row.country ?? undefined,
      deadlineText,
      daysLeft: n,
      slug: row.slug,
    };

    return {
      key: `${template}-${row.slug}`,
      template,
      title,
      meta: [
        row.category ? getLocalizedContent(row.category.name, i18n(row.category.nameI18n), lang) || row.category.name : null,
        row.country,
      ].filter(Boolean).join(' • ') || undefined,
      opp,
      caption: buildCaption(input),
      brief: captionBrief(input),
    };
  });
}
