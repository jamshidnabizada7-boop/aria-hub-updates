import { cache } from 'react';
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

export const getSiteData = cache(async (): Promise<SiteData> => {
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
      db.opportunity.findMany({ where: { status: 'published' }, orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }], take: 60, select: OPP_SELECT }).catch(() => []),
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

    const menuTree = buildMenuTree(menuItems as any) as MenuItem[];
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
      socialLinks: socialLinks as any,
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
      menu: [],
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
      socialLinks: [],
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
      menu: buildMenuTree(menuItems as any) as MenuItem[],
      socialLinks: socialLinks as any,
      footer,
    };
  } catch (error) {
    console.error('Error fetching tool page data:', error);
    return {
      settings: getDefaultSettings() as any,
      languages: [],
      menu: [],
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
