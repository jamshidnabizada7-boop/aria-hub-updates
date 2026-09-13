import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/site — returns all public site data in one payload
export async function GET() {
  try {
    const [
      settings,
      languages,
      sections,
      menuItems,
      serviceCategories,
      services,
      visas,
      opportunityCategories,
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
      departments,
      branches,
      processSteps,
      pricingPackages,
      teamMembers,
      comparisonRows,
      ctaBanners,
    ] = await Promise.all([
      db.siteSetting.findFirst().catch(() => null),
      db.language.findMany({ where: { enabled: true }, orderBy: { order: 'asc' } }).catch(() => []),
      db.section.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.menuItem.findMany({ where: { visible: true }, orderBy: { order: 'asc' } }).catch(() => []),
      db.serviceCategory.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.service.findMany({ where: { status: 'published' }, orderBy: { sort: 'asc' }, include: { category: true } }).catch(() => []),
      db.visa.findMany({ where: { status: 'published' }, orderBy: { sort: 'asc' } }).catch(() => []),
      db.opportunityCategory.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.opportunity.findMany({ where: { status: 'published' }, orderBy: { sort: 'asc' }, include: { category: true } }).catch(() => []),
      db.galleryItem.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.paymentMethod.findMany({ where: { status: 'active' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.testimonial.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.partner.findMany({ where: { status: 'active' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.counter.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.faq.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.news.findMany({ where: { status: 'published' }, orderBy: { publishedAt: 'desc' }, take: 6, include: { category: true } }).catch(() => []),
      db.socialLink.findMany({ where: { enabled: true }, orderBy: { order: 'asc' } }).catch(() => []),
      db.footerLink.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.department.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.branch.findMany({ orderBy: { order: 'asc' } }).catch(() => []),
      db.processStep.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.pricingPackage.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.teamMember.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.comparisonRow.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
      db.ctaBanner.findMany({ where: { status: 'published' }, orderBy: { order: 'asc' } }).catch(() => []),
    ]);

    const menuTree = buildMenuTree(menuItems as any);
    const footer: Record<string, typeof footerLinks> = {};
    for (const fl of footerLinks) {
      (footer[fl.column] ||= []).push(fl);
    }

    return NextResponse.json({
      settings,
      languages,
      sections,
      menu: menuTree,
      serviceCategories,
      services,
      visas,
      opportunityCategories,
      opportunities,
      gallery: galleryItems,
      paymentMethods,
      testimonials,
      partners,
      counters,
      faqs,
      news,
      socialLinks,
      footer,
      departments,
      branches,
      processSteps,
      pricingPackages,
      teamMembers,
      comparisonRows,
      ctaBanners,
    });
  } catch (error) {
    console.error('Error loading site data API payload:', error);
    return NextResponse.json({
      settings: null,
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
    }, { status: 200 });
  }
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
