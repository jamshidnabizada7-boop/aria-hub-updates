import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { db } from '@/lib/db';
import { VisasClient } from './client';
import { isLang, type Lang } from '@/lib/lang-route';
import { getPageSeo } from '@/lib/seo-metadata';
import { GraduationCap, Briefcase, Plane, Compass, HelpCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const revalidate = 300;

const getCachedVisas = unstable_cache(
  async (page: number, take: number) => {
    try {
      const skip = (Math.max(1, page) - 1) * take;
      const [visas, total] = await Promise.all([
        db.visa.findMany({
          where: { status: 'published' },
          orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
          take,
          skip,
        }),
        db.visa.count({ where: { status: 'published' } }),
      ]);
      return { visas, total };
    } catch (e) {
      console.error('Failed to get cached visas:', e);
      return { visas: [], total: 0 };
    }
  },
  ['cached-visas-list-data'],
  { revalidate: 300, tags: ['visas'] }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const seo = getPageSeo('visas', lang);

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/visas`,
      languages: {
        en: '/en/visas',
        fa: '/fa/visas',
        ps: '/ps/visas',
      },
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      locale: lang,
      type: 'website',
    },
  };
}

const VISA_GUIDES = [
  {
    icon: GraduationCap,
    title: {
      en: 'Student & Academic Visas',
      fa: 'ویزاهای دانشجویی و تحصیلی',
      ps: 'د زده کړې او تحصیلي ویزې',
    },
    desc: {
      en: 'Complete guidelines for F-1 (USA), DAAD & National Visas (Germany), Student Route (UK), and MEXT (Japan). Admissions, blocked accounts, and funding proof.',
      fa: 'راهنمای کامل ویزای تحصیلی امریکا (F-1)، آلمان، بریتانیا و جاپان. مدارک پذیرش، تمکن مالی و حساب مسدودشده.',
      ps: 'د امریکا، جرمني، برتانیا او جاپان د تحصیلي ویزو بشپړ لارښود. د پوهنتون منل، د پیسو شواهد او حسابونه.',
    },
  },
  {
    icon: Briefcase,
    title: {
      en: 'Skilled Work & Employment Visas',
      fa: 'ویزاهای کاری و متخصصین',
      ps: 'د مسلکي کار او دندې ویزې',
    },
    desc: {
      en: 'Work permits, Opportunity Cards (Chancenkarte), H-1B, and skilled sponsorship pathways. Degree verification, contracts, and language credentials.',
      fa: 'مجوزهای کار، کارت شانس آلمان، ویزاهای تخصصی و جاب آفر. شرایط معادل‌سازی مدارک و الزامات زبانی.',
      ps: 'د کار اجازه لیکونه، د جرمني چانس کارت او د متخصصینو ویزې. د اسنادو تصدیق او د ژبې د مهارت شرايط.',
    },
  },
  {
    icon: Plane,
    title: {
      en: 'Exchange & Research Programs',
      fa: 'برنامه‌های تبادلی و فرصت مطالعاتی',
      ps: 'د تبادلې او څیړنې پروګرامونه',
    },
    desc: {
      en: 'J-1 exchange visitors, Erasmus+ mobility, short fellowships, and cultural exchange documentation. Return residency requirements explained.',
      fa: 'برنامه‌های تبادل فرهنگی و علمی، بورسیه‌های اراسموس پلاس و فلوشیپ‌ها. بررسی قوانین اقامت و بازگشت.',
      ps: 'د کلتوري او علمي تبادلې پروګرامونه، اراسموس پلس بورسونه او فیلوشیپونه. د استوګنې او بېرته ستنېدو شرایط.',
    },
  },
  {
    icon: Compass,
    title: {
      en: 'Special Immigrant & Humanitarian Pathways',
      fa: 'مسیرهای ویژه مهاجرتی و حمایتی',
      ps: 'ځانګړې کډوالي او بشري لارې',
    },
    desc: {
      en: 'Information regarding SIV, P-1/P-2 resettlement, family reunification, and humanitarian parole processes with official embassy sources.',
      fa: 'اطلاع‌رسانی پرونده‌های SIV، برنامه‌های پی-۱ و پی-۲، الحاق به خانواده و فرایندهای قانونی بر اساس منابع رسمی.',
      ps: 'د SIV، پي-۱ او پي-۲ پروګرامونو، د کورنۍ یوځای کېدو او قانوني پروسو په اړه کره او رسمي معلومات.',
    },
  },
];

const VISA_FAQS = [
  {
    q: {
      en: 'What documents are universally required for student visas?',
      fa: 'چه مدارکی برای تمامی ویزاهای تحصیلی الزامی است؟',
      ps: 'د ټولو تحصیلي ویزو لپاره کوم اسناد اړین دي؟',
    },
    a: {
      en: 'An official university acceptance letter (e.g. I-20 or CAS), valid passport, verified financial proof (blocked account or scholarship award letter), academic transcripts, and biometric photos.',
      fa: 'نامه رسمی قبولی دانشگاه، پاسپورت معتبر، مدارک تمکن مالی یا نامه رسمی اعطای بورسیه، ریزنمرات تحصیلی و عکس بیومتریک.',
      ps: 'د پوهنتون رسمي منل لیک، معتبر پاسپورت، د مالي وړتیا ثبوت یا د بورس سند، د نمرو ترانسکریپت او عکسونه.',
    },
  },
  {
    q: {
      en: 'How can I practice for embassy consular interviews?',
      fa: 'چگونه می‌توانم برای مصاحبه کنسولگری سفارت تمرین کنم؟',
      ps: 'څنګه کولی شم د سفارت د کنسولګرۍ مرکې لپاره تمرین وکړم؟',
    },
    a: {
      en: 'Use ARIA HUB\'s interactive Visa Prep simulator. We provide real embassy questions, rejection prevention guides (e.g., overcoming 214b), and AI-evaluated mock interview sessions.',
      fa: 'از ابزار شبیه‌ساز آمادگی ویزا (Visa Prep) آریا هاب استفاده نمایید که شامل سوالات واقعی سفارت‌ها، بررسی دلایل رد ویزا و ارزیابی هوش مصنوعی است.',
      ps: 'د آریا هاب د ویزې چمتووالي (Visa Prep) له اوزار څخه ګټه واخلئ چې د سفارت ریښتینې پوښتنې او د هوښیار ارزونې ازمایښتي مرکې لري.',
    },
  },
];

export default async function VisasPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';

  const data = await getSiteData();
  const sp = await searchParams;

  const page = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1;

  const take = 12;
  const { visas, total } = await getCachedVisas(page, take);

  const totalPages = Math.max(1, Math.ceil(total / take));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        menu={data.menu}
        languages={data.languages}
        siteName={data.settings?.siteName || 'ARIA HUB'}
        logoUrl={data.settings?.logoUrl ?? null}
      />
      <main className="flex-1 pt-24 pb-20">
        <VisasClient
          visas={visas as any}
          currentPage={page}
          totalPages={totalPages}
        />

        {/* Global Visa Pathways Overview */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-16">
          <div className="border-t border-border/60 pt-12">
            <div className="max-w-3xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {lang === 'fa' ? 'راهنمای جامع مسیرهای مهاجرتی' : lang === 'ps' ? 'د ویزو او کډوالۍ جامع لارښود' : 'Visa Pathways Guide'}
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {lang === 'fa'
                  ? 'انواع ویزا و فرصت‌های اقامت بین‌المللی'
                  : lang === 'ps'
                  ? 'د نړیوالو ویزو ډولونه او د غوښتنلیک شرایط'
                  : 'International Visa Categories & Eligibility'}
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                {lang === 'fa'
                  ? 'آریا هاب آخرین الزامات سفارتخانه‌ها، چک‌لیست مدارک و دستورالعمل‌های رسمی صدور ویزا را گردآوری کرده است.'
                  : lang === 'ps'
                  ? 'آریا هاب د سفارتونو وروستي شرایط، د اسنادو چک لېستونه او د ویزې د ترلاسه کولو رسمي لارښوونې راټولې کړې دي.'
                  : 'Key requirements, embassy document checklists, and application advice curated by ARIA HUB specialists.'}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {VISA_GUIDES.map((g, idx) => {
                const IconComp = g.icon;
                return (
                  <div key={idx} className="rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <IconComp className="h-5 w-5" />
                      </span>
                      <h3 className="font-bold text-lg text-foreground">
                        {g.title[lang] || g.title.en}
                      </h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {g.desc[lang] || g.desc.en}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Quick action bar */}
            <div className="mt-10 rounded-2xl bg-gradient-to-r from-primary/15 via-chart-2/10 to-primary/5 border border-primary/20 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-foreground">
                  {lang === 'fa' ? 'آماده مصاحبه ویزا هستید؟' : lang === 'ps' ? 'د ویزې مرکې ته چمتو یاست؟' : 'Preparing for an Embassy Interview?'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lang === 'fa'
                    ? 'با سوالات متداول و شبیه‌ساز هوش مصنوعی آریا هاب درصد قبولی خود را افزایش دهید.'
                    : lang === 'ps'
                    ? 'د آریا هاب د مصنوعي استخباراتو ازموینې سره خپله د بریا کچه لوړه کړئ.'
                    : 'Practice with real consular questions and AI feedback to maximize your approval chances.'}
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link
                  href={`/${lang}/visa-prep`}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {lang === 'fa' ? 'ورود به شبیه‌ساز ویزا' : lang === 'ps' ? 'د ویزې چمتووالی' : 'Open Visa Prep'}
                </Link>
                <Link
                  href={`/${lang}/visa-prep/calculator`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
                >
                  {lang === 'fa' ? 'محاسبه هزینه‌ها' : lang === 'ps' ? 'د لګښتونو محاسبه' : 'Cost Calculator'}
                </Link>
              </div>
            </div>

            {/* Visa FAQs */}
            <div className="mt-16 max-w-4xl">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <HelpCircle className="h-4 w-4" />
                <span>{lang === 'fa' ? 'پرسش‌های متداول ویزا' : lang === 'ps' ? 'د ویزو په اړه عامې پوښتنې' : 'Visa Application FAQs'}</span>
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {lang === 'fa'
                  ? 'پاسخ به سوالات پرتکرار داوطلبان ویزا'
                  : lang === 'ps'
                  ? 'د ویزې د غوښتونکو عامې پوښتنې او ځوابونه'
                  : 'Frequently Asked Visa Questions'}
              </h2>
              <div className="mt-6 space-y-4">
                {VISA_FAQS.map((faq, idx) => (
                  <div key={idx} className="rounded-xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                    <h3 className="text-base font-semibold text-foreground">
                      {faq.q[lang] || faq.q.en}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {faq.a[lang] || faq.a.en}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer
        settings={data.settings}
        footer={data.footer}
        socialLinks={data.socialLinks}
      />
    </div>
  );
}
