/**
 * Seed: Automated import sources + opportunity categories.
 *
 * Run with:  npx tsx scripts/seed-import-sources.ts
 *
 * Idempotent: safe to re-run. Creates the two initial import sources and a
 * starter set of opportunity categories (with {en,fa,ps} names) if missing.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ── Opportunity categories (multilingual names) ──────────────────────────────
const CATEGORIES: Array<{ slug: string; icon: string; nameI18n: { en: string; fa: string; ps: string } }> = [
  { slug: 'scholarship',     icon: '🎓', nameI18n: { en: 'Scholarship',      fa: 'بورسیه',          ps: 'بورسونه' } },
  { slug: 'fellowship',      icon: '🏛️', nameI18n: { en: 'Fellowship',       fa: 'موقت‌المលت',        ps: 'فیلوشپ' } },
  { slug: 'internship',      icon: '💼', nameI18n: { en: 'Internship',       fa: 'کارآموزی',        ps: 'کار احاطه' } },
  { slug: 'government-job',  icon: '🏢', nameI18n: { en: 'Government Job',   fa: 'کار دولتی',       ps: 'دولتي دنده' } },
  { slug: 'ngo-job',         icon: '🤝', nameI18n: { en: 'NGO Job',          fa: 'کار NGO',         ps: 'د غیر دولتي بنسټونو دنده' } },
  { slug: 'remote-job',      icon: '🖥️', nameI18n: { en: 'Remote Job',       fa: 'کار از راه دور',   ps: 'لرې دنده' } },
  { slug: 'training',        icon: '📚', nameI18n: { en: 'Training',         fa: 'آموزش',           ps: 'روزنه' } },
  { slug: 'conference',      icon: '🎤', nameI18n: { en: 'Conference',       fa: 'کنفرانس',         ps: 'کنفرانس' } },
  { slug: 'volunteer',       icon: '🙌', nameI18n: { en: 'Volunteer',        fa: 'داوطلب',          ps: 'راوولنتر' } },
  { slug: 'exchange-program', icon: '🌍', nameI18n: { en: 'Exchange Program', fa: 'برنامه تبادل',   ps: 'تبادلي برنامه' } },
  { slug: 'job',             icon: '📋', nameI18n: { en: 'Job',              fa: 'شغل',             ps: 'دنده' } },
];

// ── Import sources ───────────────────────────────────────────────────────────
const SOURCES: Array<{
  name: string; type: string; scraperKey: string; baseUrl: string;
  autoPublish: boolean; scheduleMinutes: number; defaultCategory: string | null;
  config?: Record<string, unknown>;
}> = [
  {
    name: 'Wazifaha Jobs',
    type: 'job',
    scraperKey: 'wazifaha',
    baseUrl: 'https://www.wazifaha.org/jobs/',
    autoPublish: false,
    scheduleMinutes: 60,
    defaultCategory: 'job',
    config: { crawlDelayMs: 1500, detailFetch: true, maxPages: 5 },
  },
  {
    name: 'Scholarships.af',
    type: 'scholarship',
    scraperKey: 'scholarshipsAf',
    baseUrl: 'https://scholarships.af/opportunities/?job_type=scholarship',
    autoPublish: false,
    scheduleMinutes: 60,
    defaultCategory: 'scholarship',
    config: { crawlDelayMs: 1000, apiBase: 'https://scholarships.af/wp-json/wp/v2/job', perPage: 20, maxPages: 5 },
  },
];

async function main() {
  // Categories (upsert by slug)
  let order = 0;
  for (const c of CATEGORIES) {
    await db.opportunityCategory.upsert({
      where: { slug: c.slug },
      update: { nameI18n: c.nameI18n, icon: c.icon },
      create: {
        slug: c.slug,
        name: c.nameI18n.en,
        nameI18n: c.nameI18n,
        icon: c.icon,
        order: order++,
      },
    });
    console.log(`✓ category: ${c.slug}`);
  }

  // Sources (upsert by name)
  for (const s of SOURCES) {
    await db.importSource.upsert({
      where: { name: s.name },
      update: {
        type: s.type,
        scraperKey: s.scraperKey,
        baseUrl: s.baseUrl,
        defaultCategory: s.defaultCategory,
        config: s.config ? JSON.stringify(s.config) : null,
      },
      create: {
        name: s.name,
        type: s.type,
        scraperKey: s.scraperKey,
        baseUrl: s.baseUrl,
        autoPublish: s.autoPublish,
        scheduleMinutes: s.scheduleMinutes,
        defaultCategory: s.defaultCategory,
        config: s.config ? JSON.stringify(s.config) : null,
      },
    });
    console.log(`✓ source: ${s.name}`);
  }

  console.log('\n✅ Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
