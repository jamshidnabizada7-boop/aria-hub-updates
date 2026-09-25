import { getLocalizedContent } from '@/lib/i18n-content';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/lang-route';
import type { PlanPost } from '@/lib/social/plan';
import type { PosterSize, SocialCanvasProps } from '@/lib/social/templates';
import { normalizeStudioMedia } from '@/lib/social/studio/media';

export interface StudioDesignSnapshot {
  themeId?: string;
  layout?: string;
  size?: string;
  overrides?: Record<string, unknown> | null;
}

export interface StudioPosterData {
  slug: string;
  title: string;
  titleI18n: Record<string, string> | null;
  organization: string | null;
  country: string | null;
  deadline: string | null;
  featured: boolean;
  salary: string | null;
  salaryI18n: Record<string, string> | null;
  category: { name: string; nameI18n: Record<string, string> | null } | null;
}

export type StudioCanvasProps = SocialCanvasProps & {
  posterData?: StudioPosterData | null;
};

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function bool(v: unknown, fallback = true): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function array(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : [];
}

function localized(base: string | null | undefined, i18n: unknown, lang: Lang): string {
  const obj = i18n && typeof i18n === 'object' ? i18n as Record<string, string> : null;
  return getLocalizedContent(base ?? '', obj, lang) || base || '';
}

export function studioContentRef(post: PlanPost): string {
  return post.key;
}

export function buildStudioCanvasProps(
  post: PlanPost,
  lang: Lang,
  size: PosterSize,
  design?: StudioDesignSnapshot | null,
): StudioCanvasProps {
  const o = design?.overrides ?? {};
  const tr = (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
  const title = str(o.title) ?? post.title;
  const note = str(o.note) ?? post.meta;
  const deadlineDate = str(o.deadlineDate) ?? post.opp?.deadline ?? null;
  const designFamily = str(o.designFamily) ?? 'legacy';
  const media = normalizeStudioMedia(o.media, str(o.visualUrl));
  const visualUrl = media.background?.url ?? str(o.visualUrl) ?? null;

  const base: SocialCanvasProps = {
    template: post.template,
    lang,
    size,
    themeId: design?.themeId,
    layout: design?.layout,
    designFamily,
    media,
    visualUrl,
    title,
    note,
    eyebrow: str(o.eyebrow),
    subheadline: str(o.subheadline),
    badge: str(o.badge),
    ctaLabel: str(o.ctaLabel),
    accentText: str(o.accentText),
    showFooter: bool(o.showFooter, true),
    showQr: bool(o.showQr, true),
  };

  switch (post.template) {
    case 'spotlight': {
      const opp = post.opp;
      const category = str(o.category)
        ?? (opp?.category ? localized(opp.category.name, opp.category.nameI18n, lang) : '');
      const organization = str(o.organization) ?? opp?.organization ?? '';
      const country = str(o.country) ?? opp?.country ?? '';
      const salary = str(o.salary) ?? (opp ? localized(opp.salary, opp.salaryI18n, lang) : '');
      const fundingStatus = str(o.fundingStatus);
      const degreeLevel = str(o.degreeLevel);
      return {
        ...base,
        deadlineDate,
        spotlight: {
          category,
          organization,
          country,
          salary,
          featured: Boolean(opp?.featured),
          fundingStatus,
          degreeLevel,
        },
        posterData: opp
          ? {
              slug: opp.slug,
              title,
              titleI18n: null,
              organization,
              country,
              deadline: deadlineDate,
              featured: Boolean(opp.featured),
              salary,
              salaryI18n: null,
              category: category ? { name: category, nameI18n: null } : null,
            }
          : null,
      };
    }
    case 'deadline':
      return {
        ...base,
        deadlineDate,
        spotlight: post.opp
          ? {
              category: post.opp.category ? localized(post.opp.category.name, post.opp.category.nameI18n, lang) : '',
              organization: post.opp.organization ?? '',
              country: post.opp.country ?? '',
              salary: localized(post.opp.salary, post.opp.salaryI18n, lang),
              featured: Boolean(post.opp.featured),
              fundingStatus: str(o.fundingStatus),
              degreeLevel: str(o.degreeLevel),
            }
          : undefined,
      };
    case 'tip':
      return { ...base, seriesNo: post.seriesNo ?? 1 };
    case 'quote':
      return base;
    case 'promo': {
      const items = array(o.items);
      return {
        ...base,
        checklist: items.length
          ? items
          : [tr('social.post.promoCheck1'), tr('social.post.promoCheck2'), tr('social.post.promoCheck3')],
      };
    }
    case 'news':
      return { ...base, newsDate: post.news?.publishedAt ?? null };
    case 'stat':
      return {
        ...base,
        stat: {
          value: str(o.statValue) ?? post.stat?.value ?? '',
          label: str(o.statLabel) ?? (post.stat ? tr(post.stat.labelKey) : ''),
          sub: post.stat ? tr(post.stat.subKey) : undefined,
        },
      };
    case 'packages': {
      const card1 = {
        value: str(o.p1Value) ?? post.stat?.value ?? '',
        label: str(o.p1Label) ?? (post.stat ? tr(post.stat.labelKey) : ''),
        sub: str(o.p1Sub) ?? (post.stat ? tr(post.stat.subKey) : undefined),
      };
      const card2 = {
        value: str(o.p2Value) ?? '',
        label: str(o.p2Label) ?? '',
        sub: str(o.p2Sub),
      };
      return {
        ...base,
        packages: [card1, ...(card2.value || card2.label ? [card2] : [])],
      };
    }
    case 'teaser':
    case 'greeting':
    case 'follow':
      return base;
    case 'pick':
    case 'hiring':
      return {
        ...base,
        checklist: array(o.callouts).length ? array(o.callouts) : post.meta ? [post.meta] : [],
      };
    case 'day': {
      const big = str(o.badgeBig);
      return {
        ...base,
        dateBadge: big ? { big, small: str(o.badgeSmall) } : undefined,
      };
    }
    case 'story': {
      const personName = str(o.personName) ?? post.meta;
      const personMeta = str(o.personMeta)
        ?? [post.story?.program, post.story?.country].filter(Boolean).join(' • ');
      return {
        ...base,
        person: personName ? { name: personName, meta: personMeta } : undefined,
      };
    }
    default:
      return base;
  }
}
