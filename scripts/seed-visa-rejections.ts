/**
 * Creates the VisaRejection table (raw DDL — db:push is forbidden in sandbox)
 * and seeds it with fully trilingual (en/fa/ps) rejection-reason content.
 * Idempotent: upsert by `code`.
 *
 * Run: bun run scripts/seed-visa-rejections.ts
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

async function ensureTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "VisaRejection" (
      "id" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "section" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "titleI18n" JSONB,
      "description" TEXT NOT NULL,
      "descriptionI18n" JSONB,
      "mitigation" JSONB,
      "mitigationI18n" JSONB,
      "icon" TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'published',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,

      CONSTRAINT "VisaRejection_pkey" PRIMARY KEY ("id")
    )
  `);
  await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "VisaRejection_code_key" ON "VisaRejection"("code")`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "VisaRejection_status_idx" ON "VisaRejection"("status")`);
}

const DATA = [
  {
    code: '214b',
    section: 'Section 214(b)',
    icon: 'Users',
    title: { en: 'Immigrant Intent / Insufficient Ties', fa: 'قصد مهاجرت / پیوندهای ناکافی', ps: 'د کډوالۍ نیت / ناکافي تړاونې' },
    description: {
      en: 'The most common reason for rejection. The consular officer believed you intend to immigrate permanently rather than return to your home country.',
      fa: 'شایع‌ترین دلیل رد شدن. افسر کنسولی معتقد بود که شما قصد مهاجرت دائمی دارید نه بازگشت به وطن.',
      ps: 'تر ټولو عام د رد کېدو دلیل. کونسولي افسر باور درلود چې ته دایمي کډوالۍ نیت لرې، نه خپل هېواد ته راستنېدل.',
    },
    mitigation: {
      en: [
        'Demonstrate strong family ties in your home country.',
        'Show stable, long-term employment or business ownership.',
        'Provide evidence of property ownership or financial investments.',
        'Be prepared to concisely explain your specific, temporary purpose of travel.',
      ],
      fa: [
        'پیوندهای قوی خانوادگی در وطن خود را نشان دهید.',
        'اشتغال پایدار بلندمدت یا مالکیت تجاری خود را اثبات کنید.',
        'سند مالکیت ملکیت یا سرمایه‌گذاری مالی ارائه کنید.',
        'برای توضیح مختصر و مشخص هدف موقت سفر خود آماده باشید.',
      ],
      ps: [
        'په خپل هېواد کې قوي کورنۍ تړاونې وښيه.',
        'پایېدونکی اوږدمهاله کار یا سوداګریزه ملکیت ثابت کړه.',
        'د ملکیت یا مالي پانګونې سند وړاندې کړه.',
        'د سفر ځانګړی موقت موخه په لنډ ډول تشریح کولو ته چمتو شه.',
      ],
    },
    order: 1,
  },
  {
    code: '221g',
    section: 'Section 221(g)',
    icon: 'FileWarning',
    title: { en: 'Incomplete Application / Administrative Processing', fa: 'درخواست ناقص / پروسس اداری', ps: 'ناکملې غوښتنلیک / اداري پروسه' },
    description: {
      en: 'Your application is missing crucial information or requires additional administrative processing.',
      fa: 'درخواست شما معلومات حیاتی را کم دارد یا به پروسس اداری اضافه نیاز دارد.',
      ps: 'ستا غوښتنلیک مهم معلومات نه لري یا اضافي اداري پروسې ته اړتیا لري.',
    },
    mitigation: {
      en: [
        'Follow the exact instructions provided on the 221(g) slip given to you.',
        'Submit any requested documents promptly via the specified channel (email or drop-off).',
        'Do not re-apply while your case is in administrative processing.',
        'Ensure all forms (DS-160) are completely and accurately filled out.',
      ],
      fa: [
        'دستورالعمل دقیق ورق ۲21(g) داده‌شده را دنبال کنید.',
        'اسناد خواسته‌شده را به‌موقع از طریق کانال مشخص (ایمیل یا تحویل حضوری) ارسال کنید.',
        'تا زمانی که پرونده شما در پروسس اداری است، دوباره درخواست ندهید.',
        'اطمینان حاصل کنید که همه فورم‌ها (DS-160) کامل و دقیق پر شده‌اند.',
      ],
      ps: [
        'ستا ته ورکړل شوي 221(g) ورق دقیقې لارښوونې تعقیب کړه.',
        'غوښتل شوي اسناد سمدلاسه د ټاکل شوې لارې (ایمیل یا لاسي تسلیم) ولېږه.',
        'تر هغو چې ستا دوسیه په اداري پروسه کې ده، بیا غوښتنه مه کوه.',
        'ډاډ ترلاسه کړه چې ټولې فورمې (DS-160) بشپړ او سم ډک شوي دي.',
      ],
    },
    order: 2,
  },
  {
    code: '212a6c',
    section: 'Section 212(a)(6)(C)(i)',
    icon: 'XCircle',
    title: { en: 'Misrepresentation / Fraud', fa: 'ارائه اطلاعات نادرست / تقلب', ps: 'ناسم معلومات / درغلي' },
    description: {
      en: 'The officer determined you attempted to obtain a visa by willful misrepresentation of a material fact.',
      fa: 'افسر تشخیص داده است که شما تلاش کردید با ارائه عمدی اطلاعات نادرست ویزا به دست آورید.',
      ps: 'افسر پرېکړه کړې چې ته د عمدي ناسمو معلوماتو له لارې د ویزې ترلاسه کولو هڅه کړې ده.',
    },
    mitigation: {
      en: [
        'Always answer all DS-160 questions and interview questions truthfully.',
        'Never use fake documents (bank statements, job letters). Consulates routinely verify these.',
        'If you made an honest mistake, apply for a waiver if eligible, though this is difficult.',
        'Hire a reputable immigration attorney if dealing with a fraud finding.',
      ],
      fa: [
        'همیشه به همه سوالات DS-160 و مصاحبه صادقانه پاسخ دهید.',
        'هرگز از اسناد جعلی (صورت‌حساب بانکی، نامه کاری) استفاده نکنید. کنسولگری‌ها این‌ها را به‌طور منظم راستی‌آزمایی می‌کنند.',
        'اگر اشتباه صادقانه کرده‌اید، در صورت واجد شرایط بودن درخواست معافیت بدهید، هرچند دشوار است.',
        'در برخورد با موضوع تقلب، از وکیل مهاجرتی معتبر کمک بگیرید.',
      ],
      ps: [
        'تل له ټولو DS-160 او د مرکې پوښتنو سره رښتیا ځواب ورکړه.',
        'هېڅکله جعلي اسناد (بانکي سټیټمینټ، د کار لیک) مه کاروه. کونسولګريونه دا په منظم ډول تاییدوي.',
        'که ریښتینې تېروتنه کړې وي، که وړ یې نو د معافیت غوښتنه وکړه، که څه هم سخته ده.',
        'د درغلي موضوع سره مخامخ شوې، معتبر کډوال وکیل وګماره.',
      ],
    },
    order: 3,
  },
  {
    code: 'financial',
    section: 'Financial',
    icon: 'Briefcase',
    title: { en: 'Insufficient Funds / Public Charge', fa: 'بودجه کافی نیست / بار بر دولت', ps: 'ناکافي پیسې / د حکومت بار' },
    description: {
      en: 'The officer is not convinced you have the financial means to support your trip without working illegally or becoming a public charge.',
      fa: 'افسر قانع نشده است که شما وسایل مالی کافی برای تأمین سفر خود بدون کار غیرقانونی یا بار شدن بر دولت دارید.',
      ps: 'افسر قانع نه دی چې ته د خپل سفر د پر مخ وړلو لپاره کافي مالي وسایل لرې، بې له غیرقانوني کار یا د حکومت بار کېدو.',
    },
    mitigation: {
      en: [
        'Provide legitimate, verifiable bank statements spanning 3-6 months.',
        'If sponsored by a relative, provide an Affidavit of Support (I-134) along with their tax returns.',
        'Clearly explain how your trip will be funded if asked during the interview.',
        'Show proof of steady income.',
      ],
      fa: [
        'صورت‌حساب‌های بانکی معتبر و قابل راستی‌آزمایی ۳ تا ۶ ماهه ارائه کنید.',
        'اگر توسط اقوام حمایت می‌شوید، سند کفالت (I-134) را همراه با اسناد مالیاتی آن‌ها ارائه کنید.',
        'در مصاحبه اگر پرسیده شد، به‌روشنی توضیح دهید سفر شما چگونه تمویل می‌شود.',
        'اثبات درآمد ثابت ارائه کنید.',
      ],
      ps: [
        'د ۳ تر ۶ میاشتو معتبره او د تایید وړ بانکي سټیټمینټونه وړاندې کړه.',
        'که خپلوان سپانسر دي، د کفالت سند (I-134) له هغوی د ماليې اسنادو سره یوځای وړاندې کړه.',
        'په مرکه کې که پوښتنه وشوه، په ډاډ سره ووایه چې ستا سفر څنګه تمویل کیږي.',
        'د پایېدونکي عاید ثبوت وښيه.',
      ],
    },
    order: 4,
  },
  {
    code: 'purpose',
    section: 'Travel Purpose',
    icon: 'HelpCircle',
    title: { en: 'Unclear Purpose of Travel', fa: 'هدف سفر نامشخص', ps: 'د سفر ناڅرګنده موخه' },
    description: {
      en: 'The applicant could not clearly articulate the specific reason for their trip, their itinerary, or whom they are meeting.',
      fa: 'متقاضی نتوانست دلیل مشخص سفر، برنامه سفر یا فردی که ملاقات می‌کند را واضح بیان کند.',
      ps: 'غوښتونکي نه شو کولی د سفر ځانګړی دلیل، پروګرام یا هغه څوک چې ورسره یې وګوري په روښانه ډول بیان کړي.',
    },
    mitigation: {
      en: [
        "Have a clear, logical itinerary (e.g., 'I am attending my brother's wedding on June 15th at X location').",
        'Know the details of the conference or university you are attending.',
        "Avoid vague answers like 'I just want to visit' without specifics.",
        'If visiting friends/family, know their exact status and address in the destination country.',
      ],
      fa: [
        'برنامه سفر روشن و منطقی داشته باشید (مثلاً: «در عروسی برادرم در تاریخ ۱۵ جون در مکان X شرکت می‌کنم»).',
        'جزئیات کنفرانس یا دانشگاهی که در آن شرکت می‌کنید را بدانید.',
        'از پاسخ‌های مبهم مانند «فقط می‌خواهم سفر کنم» بدون جزئیات بپرهیزید.',
        'اگر از اقوام یا دوستان دیدن می‌کنید، وضعیت دقیق و آدرس آن‌ها در کشور مقصد را بدانید.',
      ],
      ps: [
        'روښانه او منطقي سفرني پروګرام ولره (لکه: «زه د خپل ورور واده کې د جون په ۱۵ نېټه په X ځای کې ګډون کوم»).',
        'د هغې کنفرانس یا پوهنتون جزئیات په یاد لره چې پکې ګډون کوې.',
        'له بې جزئیاتو مبهمو ځوابونو لکه «یوازې د سیل لپاره» ډډه وکړه.',
        'که ملګرو یا کورنۍ ته ځې، د هغوی دقیق حالت او پته په مقصد هېواد کې په یاد لره.',
      ],
    },
    order: 5,
  },
];

async function main() {
  await ensureTable();
  console.log('Table VisaRejection ready.');

  let created = 0, updated = 0;
  for (const item of DATA) {
    const existing = await db.visaRejection.findUnique({ where: { code: item.code } });
    const payload = {
      code: item.code,
      section: item.section,
      title: item.title.en,
      titleI18n: item.title,
      description: item.description.en,
      descriptionI18n: item.description,
      mitigation: item.mitigation.en,
      mitigationI18n: item.mitigation,
      icon: item.icon,
      order: item.order,
      status: 'published',
    };
    if (existing) {
      await db.visaRejection.update({ where: { code: item.code }, data: payload });
      updated++;
    } else {
      await db.visaRejection.create({ data: payload });
      created++;
    }
  }
  console.log(`VisaRejection: ${created} created, ${updated} updated`);

  // Verify
  const count = await db.visaRejection.count();
  const incomplete = await db.visaRejection.count({
    where: {
      OR: [
        { titleI18n: { equals: null } },
        { descriptionI18n: { equals: null } },
        { mitigationI18n: { equals: null } },
      ],
    },
  });
  console.log(`Verify: ${count} rows, ${incomplete} missing i18n`);
}

main()
  .catch((e) => {
    console.error(e.message?.slice(0, 300));
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
