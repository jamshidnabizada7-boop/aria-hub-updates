/**
 * update-menu.ts
 *
 * Rebuilds the navigation MenuItem rows so every entry deep-links to a real
 * page instead of a homepage anchor:
 *
 * - Top level (order 0-5): Home → /, Opportunities → /opportunities,
 *   Services → /services, About → /about, Blog → /blog, Contact → /contact.
 *   About and Blog are created (they did not exist); labelI18n in all 3 langs.
 * - DELETED top-level items (and their descendants): Visas, Promote, Gallery,
 *   Payments — Visas stays reachable via the services page + footer.
 * - Opportunities children: /opportunities?category={slug} × 8 with trilingual
 *   labelI18n matching the opportunities.* i18n keys.
 * - Services children: /services#{slug} anchors on the new services page
 *   (plain /services where no matching service slug exists).
 * - Tools children: untouched (already URL-based).
 *
 * URLs are stored WITHOUT the language prefix — the navbar's useLangHref
 * adds /{lang} automatically. No '#' anchor urls remain.
 *
 * Run: bun scripts/update-menu.ts
 */
import { createDb } from './db-client';

interface MenuRow {
  id: string;
  label: string;
  url: string | null;
  parentId: string | null;
  order: number;
}

const TOP_LEVEL: {
  label: string;
  url: string;
  order: number;
  i18n: Record<string, string>;
}[] = [
  { label: 'Home', url: '/', order: 0, i18n: { en: 'Home', fa: 'خانه', ps: 'کور' } },
  { label: 'Opportunities', url: '/opportunities', order: 1, i18n: { en: 'Opportunities', fa: 'فرصت‌ها', ps: 'فرصتونه' } },
  { label: 'Services', url: '/services', order: 2, i18n: { en: 'Services', fa: 'خدمات', ps: 'خدمات' } },
  { label: 'About', url: '/about', order: 3, i18n: { en: 'About', fa: 'درباره ما', ps: 'زموږ په اړه' } },
  { label: 'Blog', url: '/blog', order: 4, i18n: { en: 'Blog', fa: 'بلاگ', ps: 'بلاګ' } },
  { label: 'Contact', url: '/contact', order: 5, i18n: { en: 'Contact', fa: 'تماس', ps: 'اړیکه' } },
];

const DELETE_TOP_LEVEL = ['Visas', 'Promote', 'Gallery', 'Payments'];

/** Opportunities children — values mirror the opportunities.* i18n keys. */
const CATEGORY_CHILDREN: {
  label: string;
  url: string;
  i18n: Record<string, string>;
}[] = [
  { label: 'Jobs', url: '/opportunities?category=jobs', i18n: { en: 'Jobs', fa: 'مشاغل', ps: 'دندې' } },
  { label: 'Scholarships', url: '/opportunities?category=scholarships', i18n: { en: 'Scholarships', fa: 'بورسیه‌ها', ps: 'بورسونه' } },
  { label: 'Internships', url: '/opportunities?category=internships', i18n: { en: 'Internships', fa: 'کارآموزی‌ها', ps: 'زده‌کړه (انټرنشیپ)' } },
  { label: 'Competitions', url: '/opportunities?category=competitions', i18n: { en: 'Competitions', fa: 'مسابقات', ps: 'سیالیونه' } },
  { label: 'Conferences', url: '/opportunities?category=conferences', i18n: { en: 'Conferences', fa: 'کنفرانس‌ها', ps: 'کنفرانسونه' } },
  { label: 'Volunteer', url: '/opportunities?category=volunteer', i18n: { en: 'Volunteer', fa: 'داوطلبی', ps: 'رضاکاره' } },
  { label: 'Exchange Programs', url: '/opportunities?category=exchange-programs', i18n: { en: 'Exchange Programs', fa: 'برنامه‌های تبادل', ps: 'تبادلوي پروګرامونه' } },
  { label: 'Training', url: '/opportunities?category=training', i18n: { en: 'Training', fa: 'آموزش‌ها', ps: 'روزنې' } },
];

/** Services children (+ grandchildren) — deep-link to /services#slug anchors. */
const SERVICE_CHILDREN: {
  label: string;
  url: string;
}[] = [
  { label: 'Business Setup', url: '/services#business-consulting' },
  { label: 'Legal Services', url: '/services' },
  { label: 'Travel & Visa', url: '/services' },
  { label: 'Translation', url: '/services#translation-services' },
  { label: 'Document Translation', url: '/services#translation-services' },
  { label: 'Interpretation', url: '/services#translation-services' },
];

async function main() {
  const db = createDb();
  try {
    const items = await db.menuItem.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, label: true, url: true, parentId: true, order: true },
    });
    const topLevel = (items as MenuRow[]).filter((i) => !i.parentId);

    // ── 1. Delete dead top-level items + their descendants ────────────────
    const roots = topLevel.filter((i) => DELETE_TOP_LEVEL.includes(i.label));
    const idsToDelete = new Set<string>();
    const collect = (id: string) => {
      idsToDelete.add(id);
      for (const child of items.filter((i: MenuRow) => i.parentId === id)) {
        collect(child.id);
      }
    };
    roots.forEach((r) => collect(r.id));
    if (idsToDelete.size > 0) {
      await db.menuItem.deleteMany({ where: { id: { in: [...idsToDelete] } } });
    }
    console.log(
      `Deleted ${idsToDelete.size} menu rows: ${roots
        .map((r) => `"${r.label}"${idsToDelete.size > roots.length ? ' + descendants' : ''}`)
        .join(', ')}`
    );

    // ── 2. Upsert the six primary top-level links ─────────────────────────
    for (const entry of TOP_LEVEL) {
      const existing = topLevel.find((i) => i.label === entry.label);
      if (existing) {
        await db.menuItem.update({
          where: { id: existing.id },
          data: { url: entry.url, order: entry.order, visible: true, labelI18n: entry.i18n },
        });
        console.log(`Updated top-level "${entry.label}" → ${entry.url} (order ${entry.order})`);
      } else {
        await db.menuItem.create({
          data: {
            label: entry.label,
            labelI18n: entry.i18n,
            url: entry.url,
            order: entry.order,
            visible: true,
          },
        });
        console.log(`Created top-level "${entry.label}" → ${entry.url} (order ${entry.order})`);
      }
    }

    // ── 3. Opportunities children → category deep links ───────────────────
    const opportunitiesItem = topLevel.find((i) => i.label === 'Opportunities');
    if (opportunitiesItem) {
      const children = (items as MenuRow[]).filter(
        (i) => i.parentId === opportunitiesItem.id
      );
      for (const child of children) {
        const entry = CATEGORY_CHILDREN.find((c) => c.label === child.label);
        if (!entry) continue;
        await db.menuItem.update({
          where: { id: child.id },
          data: { url: entry.url, labelI18n: entry.i18n, visible: true },
        });
        console.log(`  Opportunities child "${child.label}" → ${entry.url}`);
      }
      const missing = CATEGORY_CHILDREN.filter(
        (c) => !children.some((ch) => ch.label === c.label)
      );
      for (const entry of missing) {
        await db.menuItem.create({
          data: {
            label: entry.label,
            labelI18n: entry.i18n,
            url: entry.url,
            parentId: opportunitiesItem.id,
            visible: true,
          },
        });
        console.log(`  Created Opportunities child "${entry.label}" → ${entry.url}`);
      }
    } else {
      console.log('WARN: no top-level "Opportunities" item found — children untouched.');
    }

    // ── 4. Services children/grandchildren → /services anchors ───────────
    const servicesItem = topLevel.find((i) => i.label === 'Services');
    if (servicesItem) {
      for (const entry of SERVICE_CHILDREN) {
        const row = (items as MenuRow[]).find((i) => i.label === entry.label);
        if (!row) {
          console.log(`  WARN: no menu row labeled "${entry.label}" — skipped.`);
          continue;
        }
        await db.menuItem.update({
          where: { id: row.id },
          data: { url: entry.url, visible: true },
        });
        console.log(`  Services link "${entry.label}" → ${entry.url}`);
      }
    } else {
      console.log('WARN: no top-level "Services" item found — children untouched.');
    }

    // ── 5. Final state ────────────────────────────────────────────────────
    const finalItems = await db.menuItem.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, label: true, url: true, parentId: true, order: true, visible: true },
    });
    const byId = new Map(finalItems.map((i) => [i.id, i]));
    console.log('\nFinal menu tree:');
    for (const item of finalItems.filter((i) => !i.parentId).sort((a, b) => a.order - b.order)) {
      console.log(
        `  [${item.order}] ${item.label} → ${item.url ?? '(dropdown)'} ${item.visible ? '' : '(hidden)'}`
      );
      for (const child of finalItems
        .filter((i) => i.parentId === item.id)
        .sort((a, b) => a.order - b.order)) {
        console.log(`        [${child.order}] ${child.label} → ${child.url}`);
        for (const grand of finalItems
          .filter((i) => i.parentId === child.id)
          .sort((a, b) => a.order - b.order)) {
          void byId;
          console.log(`              [${grand.order}] ${grand.label} → ${grand.url}`);
        }
      }
    }
    const anchorUrls = finalItems.filter((i) => (i.url ?? '').startsWith('#'));
    console.log(`\nMenu rows using '#' anchor urls: ${anchorUrls.length}`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
