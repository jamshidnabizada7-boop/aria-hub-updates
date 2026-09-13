/**
 * Seed visa-prep data: destination countries relevant to Afghan applicants,
 * visa categories, and starter required-document lists per country.
 *
 * Idempotent — upserts by unique code/slug, safe to re-run.
 *
 *   DATABASE_URL=... bun run scripts/seed-visa-data.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const here = fileURLToPath(new URL('.', import.meta.url));

function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL || '';
  if (envUrl.startsWith('postgres')) return envUrl;
  try {
    const raw = readFileSync(join(here, '..', '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (v.startsWith('postgres')) return v;
    }
  } catch { /* fallthrough */ }
  throw new Error('No PostgreSQL DATABASE_URL found');
}

const db = new PrismaClient({ datasources: { db: { url: resolveDatabaseUrl() } } });

const COUNTRIES = [
  { code: 'US', name: 'United States', nameFa: 'ایالات متحده آمریکا', namePs: 'امریکا متحده ایالات', processingTime: '3–12 months', cost: '$185 (MRV fee)', successRate: 'Moderate', embassy: 'U.S. Embassy Kabul — visa services are currently processed in third countries for Afghan applicants. Check travel.state.gov for the latest procedure.', order: 1 },
  { code: 'DE', name: 'Germany', nameFa: 'آلمان', namePs: 'آلمان', processingTime: '6–12 weeks', cost: '€75', successRate: 'Moderate–High', embassy: 'German Embassy Kabul — appointments are handled through the external service provider. Student applicants apply via the APS/uni-assist route first.', order: 2 },
  { code: 'CA', name: 'Canada', nameFa: 'کانادا', namePs: 'کاناډا', processingTime: '8–14 weeks (study)', cost: 'CAD $150 (study permit)', successRate: 'Moderate', embassy: 'Canada does not operate an embassy in Kabul — Afghan applicants apply online through IRCC and give biometrics at a VAC in a neighboring country (e.g. Islamabad, Ankara).', order: 3 },
  { code: 'GB', name: 'United Kingdom', nameFa: 'بریتانیا', namePs: 'برتانیه', processingTime: '3 weeks (priority available)', cost: 'From £115 (visit) / £490 (student)', successRate: 'Moderate', embassy: 'UK Visa Application Centres for Afghan residents operate in Islamabad and other regional hubs; applications go through gov.uk.', order: 4 },
  { code: 'TR', name: 'Turkey', nameFa: 'ترکیه', namePs: 'ترکیه', processingTime: '2–4 weeks', cost: '$60–220 (varies by visa type)', successRate: 'High', embassy: 'Turkish Embassy Kabul accepts applications; e-Visa is available for many nationalities transiting or visiting for tourism.', order: 5 },
  { code: 'AE', name: 'United Arab Emirates', nameFa: 'امارات متحده عربی', namePs: 'متحده عربي امارات', processingTime: '3–7 working days', cost: 'From $90', successRate: 'High', embassy: 'UAE visas are mostly arranged by sponsors/airlines online; Afghan passport holders need a pre-arranged visa (no visa on arrival).', order: 6 },
  { code: 'IN', name: 'India', nameFa: 'هند', namePs: 'هند', processingTime: '2–4 weeks', cost: '$25–118 (varies)', successRate: 'Moderate', embassy: 'Indian Embassy Kabul — e-Medical, business and student visa categories exist; regular applications are processed via the embassy when operational.', order: 7 },
  { code: 'PK', name: 'Pakistan', nameFa: 'پاکستان', namePs: 'پاکستان', processingTime: '1–2 weeks', cost: 'Low / often free for Afghan nationals under bilateral rules', successRate: 'High', embassy: 'Pakistani visas for Afghans are issued at the Islamabad embassy and border consulates (Torkham/Chaman) with valid documents.', order: 8 },
  { code: 'IR', name: 'Iran', nameFa: 'ایران', namePs: 'ایران', processingTime: '1–3 weeks', cost: 'Varies by type', successRate: 'High', embassy: 'Iranian consulates in Herat, Mazar-e-Sharif and Kandahar process Afghan applicant visas (ziarat, student, medical, work permits).', order: 9 },
  { code: 'AU', name: 'Australia', nameFa: 'استرالیا', namePs: 'آسترالیا', processingTime: '4–8 weeks (student)', cost: 'From AUD $710 (student)', successRate: 'Moderate', embassy: 'Australia processes Afghan applications through its global network — Humanitarian Program (subclass 200) and student visas online via immi.homeaffairs.gov.au.', order: 10 },
];

const CATEGORIES = [
  { slug: 'student', name: 'Student Visa', nameFa: 'ویزای تحصیلی', namePs: 'د زده کړې ویزه', icon: 'graduation', desc: 'For admitted students — universities, scholarships, exchange programs.' },
  { slug: 'work', name: 'Work Visa', nameFa: 'ویزای کاری', namePs: 'د کار ویزه', icon: 'briefcase', desc: 'Employment-sponsored visas, NGO deployments and labor migration.' },
  { slug: 'tourist', name: 'Tourist Visa', nameFa: 'ویزای سیاحتی', namePs: 'د سیاحت ویزه', icon: 'tent', desc: 'Short visits, family visits and tourism.' },
  { slug: 'business', name: 'Business Visa', nameFa: 'ویزای تجارتی', namePs: 'د سوداګرۍ ویزه', icon: 'building', desc: 'Trade missions, conferences and commercial travel.' },
  { slug: 'family', name: 'Family Visa', nameFa: 'ویزای خانوادگی', namePs: 'د کورنۍ ویزه', icon: 'users', desc: 'Family reunification, spousal and dependent visas.' },
  { slug: 'transit', name: 'Transit Visa', nameFa: 'ویزای ترانزیت', namePs: 'د تېرېدو ویزه', icon: 'plane', desc: 'Short layovers through a third country en route to your destination.' },
];

const GENERIC_DOCS = [
  { name: 'Valid Passport', nameFa: 'پاسپورت معتبر', namePs: 'سم پاسپورټ', desc: 'At least 6 months validity beyond your planned stay, with blank visa pages.', req: true },
  { name: 'Completed Application Form', nameFa: 'فورم درخواست تکمیل‌شده', namePs: 'بشپړ شوی د غوښتنلیک فورم', desc: 'Filled accurately and signed — mismatched answers are a top rejection reason.', req: true },
  { name: 'Passport-size Photos', nameFa: 'عکس‌های سایز پاسپورت', namePs: 'د پاسپورت اندازه عکسونه', desc: 'Recent (under 6 months), white background, per the embassy spec sheet.', req: true },
  { name: 'Proof of Financial Means', nameFa: 'مدرک توانایی مالی', namePs: 'د مالي ظرفیت ثبوت', desc: 'Bank statements (3–6 months), sponsor letter, or scholarship award letter.', req: true },
  { name: 'Admission / Invitation Letter', nameFa: 'نامه پذیرش یا دعوت‌نامه', namePs: 'د منلو یا بلنې لیک', desc: 'Official university admission, employer contract, or invitation letter.', req: true },
];

async function main(): Promise<void> {
  console.log('Seeding visa-prep data…');

  // Categories
  for (const c of CATEGORIES) {
    await db.visaCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, nameI18n: { en: c.name, fa: c.nameFa, ps: c.namePs }, icon: c.icon, description: c.desc, order: c.order ?? 0 },
      create: {
        slug: c.slug,
        name: c.name,
        nameI18n: { en: c.name, fa: c.nameFa, ps: c.namePs },
        icon: c.icon,
        description: c.desc,
        order: c.order ?? 0,
      },
    });
  }
  console.log(`  categories: ${CATEGORIES.length} upserted`);

  // Countries
  for (const c of COUNTRIES) {
    await db.visaCountry.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        nameI18n: { en: c.name, fa: c.nameFa, ps: c.namePs },
        processingTime: c.processingTime,
        costEstimate: c.cost,
        embassyInfo: c.embassy,
        successRate: c.successRate,
        order: c.order,
        status: 'published',
      },
      create: {
        code: c.code,
        name: c.name,
        nameI18n: { en: c.name, fa: c.nameFa, ps: c.namePs },
        processingTime: c.processingTime,
        costEstimate: c.cost,
        embassyInfo: c.embassy,
        successRate: c.successRate,
        order: c.order,
        status: 'published',
      },
    });
  }
  console.log(`  countries: ${COUNTRIES.length} upserted`);

  // Starter required documents per country (skip if the country already has docs)
  const countries = await db.visaCountry.findMany({ select: { id: true, code: true } });
  const cats = await db.visaCategory.findMany({ select: { id: true, slug: true } });
  const studentCat = cats.find((x) => x.slug === 'student');

  let docs = 0;
  for (const country of countries) {
    const existing = await db.visaDocument.count({ where: { countryId: country.id } });
    if (existing > 0) continue;
    for (const [i, d] of GENERIC_DOCS.entries()) {
      await db.visaDocument.create({
        data: {
          name: d.name,
          nameI18n: { en: d.name, fa: d.nameFa, ps: d.namePs },
          description: d.desc,
          isRequired: d.req,
          countryId: country.id,
          categoryId: studentCat?.id ?? null,
          order: i,
        },
      });
      docs++;
    }
  }
  console.log(`  documents: ${docs} created (skipped countries that already had docs)`);

  console.log('Done.');
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => db.$disconnect());
