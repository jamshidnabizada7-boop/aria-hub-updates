import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';
import type { SiteData, MenuItem } from '@/lib/types';

// Transfer-safety: card grids render a 2-line snippet — pull only the fields
// they use, never the full 3-language description/JSON blobs. Full rows
// belong to the detail page queries (opportunity-queries).
const OPP_SELECT = {
  id: true, slug: true, title: true, titleI18n: true,
  aiSummary: true, aiSummaryI18n: true,
  image: true, country: true, organization: true,
  jobType: true, jobTypeI18n: true,
  deadline: true, applyUrl: true, featured: true,
  sort: true, status: true, createdAt: true,
  category: { select: { slug: true, name: true, nameI18n: true } },
} as const;

const NEWS_SELECT = {
  id: true, slug: true, title: true, titleI18n: true,
  excerpt: true, excerptI18n: true, image: true,
  publishedAt: true, createdAt: true, status: true,
  category: { select: { slug: true, name: true, nameI18n: true } },
} as const;

const fetchSiteData = async (): Promise<SiteData> => {
  try {
    // ── Batch 1: core site config ─────────────────────────────────────────
    const [
      settings,
      languages,
      sections,
      menuItems,
      serviceCategories,
      services,
      visas,
      opportunityCategories,
    ] = await Promise.all([
      db.siteSetting.findFirst().catch(() => null),
      db.language.findMany({ where: { enabled: true }, orderBy: { order: 'asc' } }).catch(() => []),
      db.section.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.menuItem.findMany({ where: { visible: true }, orderBy: { order: 'asc' } }).catch(() => []),
      db.serviceCategory.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.service.findMany({ where: { status: 'published' }, orderBy: { sort: 'asc' }, include: { category: true } }).catch(() => []),
      db.visa.findMany({ where: { status: 'published' }, orderBy: { sort: 'asc' } }).catch(() => []),
      db.opportunityCategory.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
    ]);

    // ── Batch 2: content tables ──────────────────────────────────────────
    const [
      opportunities,
      galleryItems,
      paymentMethods,
      testimonials,
      partners,
      counters,
      faqs,
      news,
      socialLinks,
      footerLinks,
    ] = await Promise.all([
      // Opportunities are fetched on-demand by dedicated queries (home.latest, /opportunities, etc.)
      // Omitting the 60-row batch here cuts ~250KB of unused RSC payload from every page shell and home.
      Promise.resolve([] as any[]),
      db.galleryItem.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.paymentMethod.findMany({ where: { status: 'active' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.testimonial.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.partner.findMany({ where: { status: 'active' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.counter.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.faq.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.news.findMany({ where: { status: 'published' }, orderBy: { publishedAt: 'desc' }, take: 6, select: NEWS_SELECT }).catch(() => []),
      db.socialLink.findMany({ where: { enabled: true }, orderBy: { order: 'asc' } }).catch(() => []),
      db.footerLink.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
    ]);

    // ── Batch 3: secondary / smaller tables ──────────────────────────────
    const [
      departments,
      branches,
      processSteps,
      pricingPackages,
      teamMembers,
      comparisonRows,
      ctaBanners,
      whyFeatures,
    ] = await Promise.all([
      db.department.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.branch.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.processStep.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.pricingPackage.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.teamMember.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.comparisonRow.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.ctaBanner.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.whyChooseUsFeature.findMany({ where: { enabled: true }, orderBy: { order: 'asc' } }).catch(() => []),
    ]);

    const menuTree = ensureApplicationTools(buildMenuTree(menuItems as any) as MenuItem[]);
    const footer: Record<string, any[]> = {};
    for (const fl of footerLinks) {
      (footer[fl.column] ||= []).push(fl);
    }

    return {
      settings: settings as any || getDefaultSettings(),
      languages: languages as any,
      sections: sections as any,
      menu: menuTree,
      serviceCategories: serviceCategories as any,
      services: services as any,
      visas: visas as any,
      opportunityCategories: opportunityCategories as any,
      opportunities: opportunities as any,
      gallery: galleryItems as any,
      paymentMethods: paymentMethods as any,
      testimonials: testimonials as any,
      partners: partners as any,
      counters: counters as any,
      faqs: faqs as any,
      news: news as any,
      socialLinks: ensureRequiredSocialLinks(socialLinks) as any,
      footer,
      departments: departments as any,
      branches: branches as any,
      processSteps: processSteps as any,
      pricingPackages: pricingPackages as any,
      teamMembers: teamMembers as any,
      comparisonRows: comparisonRows as any,
      ctaBanners: ctaBanners as any,
      whyFeatures: whyFeatures as any,
    };
  } catch (error) {
    console.error('Error fetching site data:', error);
    // Return minimal default data if database is not ready
    return {
      settings: getDefaultSettings() as any,
      languages: [],
      sections: [],
      menu: ensureApplicationTools([]),
      serviceCategories: [],
      services: [],
      visas: [],
      opportunityCategories: [],
      opportunities: [],
      gallery: [],
      paymentMethods: [],
      testimonials: [],
      partners: [],
      counters: [],
      faqs: [],
      news: [],
      socialLinks: DEFAULT_SOCIAL_LINKS as any,
      footer: {},
      departments: [],
      branches: [],
      processSteps: [],
      pricingPackages: [],
      teamMembers: [],
      comparisonRows: [],
      ctaBanners: [],
      whyFeatures: [],
    };
  }
};

const getCachedSiteData = unstable_cache(
  fetchSiteData,
  ['site-data-bundle'],
  // General site content changes far less often than the opportunity feed.
  // A five-minute data TTL forced unrelated static pages to regenerate every
  // five minutes; the live feed has its own independent cache.
  { revalidate: 1800, tags: ['site-data'] }
);

export const getSiteData = cache(async (): Promise<SiteData> => {
  return getCachedSiteData();
});

export const getToolPageData = cache(async () => {
  try {
    const [settings, languages, menuItems, socialLinks, footerLinks] = await Promise.all([
      db.siteSetting.findFirst().catch(() => null),
      db.language.findMany({ where: { enabled: true }, orderBy: { order: 'asc' } }).catch(() => []),
      db.menuItem.findMany({ where: { visible: true }, orderBy: { order: 'asc' } }).catch(() => []),
      db.socialLink.findMany({ where: { enabled: true }, orderBy: { order: 'asc' } }).catch(() => []),
      db.footerLink.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
    ]);

    const footer: Record<string, any[]> = {};
    for (const fl of footerLinks) (footer[fl.column] ||= []).push(fl);

    return {
      settings: (settings as any) || getDefaultSettings(),
      languages: languages as any,
      menu: ensureApplicationTools(buildMenuTree(menuItems as any) as MenuItem[]),
      socialLinks: socialLinks as any,
      footer,
    };
  } catch (error) {
    console.error('Error fetching tool page data:', error);
    return {
      settings: getDefaultSettings() as any,
      languages: [],
      menu: ensureApplicationTools([]),
      socialLinks: [],
      footer: {},
    };
  }
});

function getDefaultSettings() {
  return {
    id: 'default',
    siteName: 'ARIA HUB',
    tagline: 'Jobs, Scholarships & Opportunities in Afghanistan',
    description:
      'New jobs, scholarships, fellowships and training opportunities from trusted organizations in Afghanistan and internationally — summarized, translated into Persian and Pashto, and updated daily.',
    logoUrl: null,
    logoDarkUrl: null,
  };
}

function buildMenuTree(items: { id: string; label: string; url: string | null; parentId: string | null; icon: string | null; order: number; openInNewTab: boolean }[]) {
  const map = new Map<string, any>();
  items.forEach(i => map.set(i.id, { ...i, children: [] }));
  const roots: any[] = [];
  for (const i of items) {
    const node = map.get(i.id)!;
    if (i.parentId && map.has(i.parentId)) {
      map.get(i.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function ensureApplicationTools(menu: MenuItem[]): MenuItem[] {
  const tools = menu.find(item => item.label.toLowerCase() === 'tools' && !item.url);
  const parent: MenuItem = tools || {
    id: 'application-tools', label: 'Tools', labelI18n: { en: 'Tools', fa: 'ابزارها', ps: 'وسیلې' },
    url: null, parentId: null, icon: null, order: 99, visible: true, openInNewTab: false, children: [],
  };
  const defaults = [
    { label: 'CV Builder', url: '/cv-builder', i18n: { en: 'CV Builder', fa: 'سی‌وی ساز', ps: 'سي وي جوړونکی' } },
    { label: 'Letter Builder', url: '/letters', i18n: { en: 'Letter Builder', fa: 'نامه‌ساز', ps: 'د لیک جوړوونکی' } },
    { label: 'Opportunity Matcher', url: '/opportunity-matcher', i18n: { en: 'Opportunity Matcher', fa: 'فرصت‌یاب', ps: 'د فرصت موندونکی' } },
  ];
  const duplicateDestinations = new Set(['/cv-builder?templates=1', '/letters?type=cover', '/letters?type=recommendation']);
  const seen = new Set<string>();
  const children = (parent.children || []).filter(child => {
    if (duplicateDestinations.has(child.url || '')) return false;
    if (child.url && seen.has(child.url)) return false;
    if (child.url) seen.add(child.url);
    return true;
  }).map(child => {
    const canonical = defaults.find(item => item.url === child.url);
    return canonical ? { ...child, label: canonical.label, labelI18n: canonical.i18n } : child;
  });
  for (const [index, item] of defaults.entries()) {
    if (children.some(child => child.url === item.url)) continue;
    children.push({ id: `application-tool-${index}`, label: item.label, labelI18n: item.i18n,
      url: item.url, parentId: parent.id, icon: null, order: index + 1, visible: true,
      openInNewTab: false, children: [] });
  }
  const rank = new Map(defaults.map((item, index) => [item.url, index]));
  children.sort((a, b) => (rank.get(a.url || '') ?? 100) - (rank.get(b.url || '') ?? 100));
  const updated = { ...parent, children };
  return tools ? menu.map(item => item.id === tools.id ? updated : item) : [...menu, updated];
}

const DEFAULT_SOCIAL_LINKS = [
  { id: 'default-facebook', platform: 'facebook', label: 'Facebook', url: 'https://facebook.com/myariahub', color: '#1877F2', enabled: true, order: 1 },
  { id: 'default-x', platform: 'x', label: 'X (Twitter)', url: 'https://x.com/myariahub', color: '#000000', enabled: true, order: 2 },
  { id: 'default-youtube', platform: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@myariahub', color: '#FF0000', enabled: true, order: 3 },
  { id: 'default-linkedin', platform: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/myariahub', color: '#0A66C2', enabled: true, order: 4 },
  { id: 'default-telegram', platform: 'telegram', label: 'Telegram', url: 'https://t.me/myariahub', color: '#229ED9', enabled: true, order: 5 },
];

function ensureRequiredSocialLinks(links: any[]): any[] {
  if (!links || links.length === 0) return DEFAULT_SOCIAL_LINKS;
  const hasPlatform = (p: string) => links.some((l) => l.platform?.toLowerCase() === p);
  const result = [...links];
  if (!hasPlatform('x') && !hasPlatform('twitter')) {
    result.push({
      id: 'default-x',
      platform: 'x',
      label: 'X (Twitter)',
      url: 'https://x.com/myariahub',
      color: '#000000',
      enabled: true,
      order: 99,
    });
  }
  if (!hasPlatform('youtube')) {
    result.push({
      id: 'default-youtube',
      platform: 'youtube',
      label: 'YouTube',
      url: 'https://www.youtube.com/@myariahub',
      color: '#FF0000',
      enabled: true,
      order: 100,
    });
  }
  return result;
}

