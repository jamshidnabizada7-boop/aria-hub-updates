/**
 * ARIA HUB — Brand Studio deterministic caption engine.
 *
 * Every template has a fixed caption PATTERN per language (hook → body → CTA
 * → link → hashtags). This is code, not an LLM: the same post always yields
 * the same on-brand caption. The optional AI-polish endpoint rewrites the
 * output in the same brand voice, but the pattern below is always the
 * guaranteed fallback and the daily-plan default.
 *
 * Inputs must already be localized by the caller (title / note / org …).
 */

import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/lang-route';
import type { PostTemplate } from '@/lib/social/brand';

const SITE = 'https://www.myariahub.com';

const TAGS: Record<Lang, string[]> = {
  en: ['#ARIAHUB', '#Afghanistan', '#Scholarships', '#Jobs', '#VisaGuide'],
  fa: ['#آریا_هاب', '#افغانستان', '#بورسیه', '#وظایف', '#ویزا'],
  ps: ['#آریا_هاب', '#افغانستان', '#بورسونه', '#کارونه', '#ویزه'],
};

const EXTRA_TAGS: Partial<Record<PostTemplate, Record<Lang, string[]>>> = {
  spotlight: {
    en: ['#Opportunities', '#StudyAbroad'],
    fa: ['#فرصت‌ها', '#تحصیل_درخارج'],
    ps: ['#فرصتونه', '#بهره زده کړه'],
  },
  deadline: {
    en: ['#DeadlineAlert', '#ApplyNow'],
    fa: ['#هشدار_ددلاین', '#همین_حالا_درخواست_دهید'],
    ps: ['#د_نېټې_خبرداری', '#همدا_اوس_غوښتنه'],
  },
  tip: {
    en: ['#CareerTips', '#TipOfTheDay'],
    fa: ['#مشورهٔ_شغلی', '#نکتهٔ_روز'],
    ps: ['#د_کار_مشورې', '#د_ورځې_مشوره'],
  },
  quote: {
    en: ['#Motivation', '#Education'],
    fa: ['#انگیزش', '#تحصیل'],
    ps: ['#هڅول', '#زده کړه'],
  },
  promo: {
    en: ['#FreePlatform', '#Trilingual'],
    fa: ['#رایگان', '#سه‌زبانه'],
    ps: ['#وړیا', '#درې_ژبي'],
  },
  news: {
    en: ['#EducationNews'],
    fa: ['#خبرهای_تحصیلی'],
    ps: ['#د_زده_کړې_خبرونه'],
  },
  stat: {
    en: ['#Milestone'],
    fa: ['#دستاورد'],
    ps: ['#لاسته_راوړنه'],
  },
  story: {
    en: ['#SuccessStory', '#AfghanStudents'],
    fa: ['#داستان_موفقیت', '#محصلان_افغان'],
    ps: ['#بریالیتوب_کیسه', '#افغان_زده_کوونکي'],
  },
};

export interface CaptionInput {
  template: PostTemplate;
  lang: Lang;
  /** localized headline / main text */
  title: string;
  note?: string;
  org?: string;
  country?: string;
  /** localized deadline phrase (e.g. "12 اسد 1404") */
  deadlineText?: string;
  slug?: string;
  daysLeft?: number | null;
  expired?: boolean;
  seriesNo?: number;
  statValue?: string;
  statLabel?: string;
  personName?: string;
  personMeta?: string;
}

/** Template slug → public link for the caption CTA. */
function linkOf(input: CaptionInput): string {
  const seg = input.lang;
  switch (input.template) {
    case 'spotlight':
    case 'deadline':
      return input.slug ? `${SITE}/${seg}/opportunities/${input.slug}` : `${SITE}/${seg}/opportunities`;
    case 'news':
      return `${SITE}/${seg}/blog`;
    case 'story':
      return `${SITE}/${seg}/success-stories`;
    default:
      return `${SITE}/${seg}`;
  }
}

export function buildCaption(input: CaptionInput): string {
  const t = (key: string, params?: Record<string, string | number>) => translate(input.lang, key, params);
  const L: string[] = [];
  const link = linkOf(input);
  const cta = t('social.cap.cta');

  switch (input.template) {
    case 'spotlight': {
      L.push(t('social.cap.spotHook'));
      L.push(input.title);
      const meta = [input.org, input.country].filter(Boolean).join(' • ');
      if (meta) L.push(meta);
      if (input.deadlineText) L.push(`📅 ${t('poster.applyBy')}: ${input.deadlineText}`);
      L.push('');
      L.push(t('social.cap.spotBody'));
      L.push(`🔗 ${link}`);
      break;
    }
    case 'deadline': {
      const n = input.daysLeft ?? null;
      const hook =
        input.expired || n === null
          ? t('social.cap.deadlineSoon')
          : n <= 0
            ? t('poster.today')
            : n === 1
              ? t('social.cap.deadline1')
              : t('social.cap.deadlineN', { n });
      L.push(`⏰ ${hook}`);
      L.push(input.title);
      if (input.deadlineText) L.push(`📅 ${t('poster.applyBy')}: ${input.deadlineText}`);
      L.push('');
      L.push(cta);
      L.push(`🔗 ${link}`);
      break;
    }
    case 'tip': {
      L.push(`💡 ${t('social.cap.tipHook', { n: input.seriesNo ?? 1 })}`);
      L.push(input.title);
      if (input.note) L.push(input.note);
      L.push('');
      L.push(cta);
      L.push(`🔗 ${link}`);
      break;
    }
    case 'quote': {
      L.push(`❝ ${input.title} ❞`);
      L.push(t('social.cap.quoteBy'));
      L.push('');
      L.push(t('social.cap.quoteBody'));
      L.push(`🔗 ${link}`);
      break;
    }
    case 'promo': {
      L.push(`✨ ${input.title}`);
      if (input.note) L.push(input.note);
      L.push('');
      L.push(cta);
      L.push(`🔗 ${link}`);
      break;
    }
    case 'news': {
      L.push(`📰 ${input.title}`);
      if (input.note) L.push(input.note);
      L.push('');
      L.push(t('social.cap.newsBody'));
      L.push(`🔗 ${link}`);
      break;
    }
    case 'stat': {
      L.push(`${input.statValue ?? ''} ${input.statLabel ?? ''}`.trim());
      if (input.note) L.push(input.note);
      L.push('');
      L.push(cta);
      L.push(`🔗 ${link}`);
      break;
    }
    case 'story': {
      L.push(`🎓 ${t('social.cap.storyHook')}`);
      L.push(`❝ ${input.title} ❞`);
      if (input.personName) L.push(`— ${input.personName}${input.personMeta ? ` • ${input.personMeta}` : ''}`);
      L.push('');
      L.push(t('social.cap.storyBody'));
      L.push(`🔗 ${link}`);
      break;
    }
  }

  const tags = [...TAGS[input.lang], ...(EXTRA_TAGS[input.template]?.[input.lang] ?? [])];
  return `${L.join('\n')}\n\n${tags.join(' ')}`;
}

/**
 * Compact fact brief sent to the AI-polish endpoint — the LLM may reword the
 * caption but never invents facts beyond this brief.
 */
export function captionBrief(input: CaptionInput): string {
  return JSON.stringify({
    template: input.template,
    title: input.title,
    note: input.note ?? undefined,
    org: input.org ?? undefined,
    country: input.country ?? undefined,
    deadline: input.deadlineText ?? undefined,
    daysLeft: input.daysLeft ?? undefined,
    link: linkOf(input),
    person: input.personName ? `${input.personName} (${input.personMeta ?? ''})` : undefined,
  });
}
