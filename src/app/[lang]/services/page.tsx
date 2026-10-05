import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Tag, HelpCircle, CheckCircle2, FileText, Sparkles, Globe, ShieldCheck } from 'lucide-react';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { CookieBanner } from '@/components/site/cookie-banner';
import { ScrollToTop } from '@/components/site/scroll-to-top';
import { Icon } from '@/components/site/icon';
import { translate } from '@/lib/i18n';
import { getLocalizedContent } from '@/lib/i18n-content';
import { isLang, type Lang } from '@/lib/lang-route';
import { stripHtml } from '@/lib/import/utils';
import { getPageSeo } from '@/lib/seo-metadata';
import type { Service } from '@/lib/types';

export const revalidate = 1800;

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'fa' }, { lang: 'ps' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const seo = getPageSeo('services', lang);
  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/services`,
      languages: {
        en: '/en/services',
        fa: '/fa/services',
        ps: '/ps/services',
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

const FALLBACK_SERVICES: {
  slug: string;
  icon: string;
  title: Record<Lang, string>;
  excerpt: Record<Lang, string>;
  description: Record<Lang, string>;
}[] = [
  {
    slug: 'cv-resume-review',
    icon: 'FileText',
    title: {
      en: 'Professional CV & Academic Resume Review',
      fa: 'بازبینی و ارتقای تخصصی رزومه و سی‌وی',
      ps: 'د مسلکي سي وي او اکاډمیک رزومې کره کتنه',
    },
    excerpt: {
      en: 'Tailored for international scholarships and global job applications.',
      fa: 'متناسب با استانداردهای بورسیه‌های بین‌المللی و کارفرمایان معتبر.',
      ps: 'د نړیوالو بورسونو او معتبرو دندو د معیارونو سره سم جوړ شوی.',
    },
    description: {
      en: 'Our certified specialists polish your achievements, align formatting to European and US standards (Europass / Harvard style), and highlight essential skills to maximize interview invitations.',
      fa: 'متخصصان ما رزومه شما را مطابق با استانداردهای بین‌المللی اروپا و امریکا بازبینی نموده و دستاوردها و مهارت‌های کلیدی شما را برای جلب نظر داوران و کارفرمایان برجسته می‌سازند.',
      ps: 'زموږ مسلکي متخصصین ستاسو سي وي د اروپا او امریکا له نړیوالو معیارونو سره سم چمتو کوي او ستاسو مهمې وړتیاوې او لاسته راوړنې د کارګمارونکو د جلب لپاره روښانه کوي.',
    },
  },
  {
    slug: 'visa-interview-consultation',
    icon: 'ShieldCheck',
    title: {
      en: 'Embassy Visa Consultation & Mock Interviews',
      fa: 'مشاوره ویزای سفارت و شبیه‌سازی مصاحبه',
      ps: 'د سفارت د ویزې مشوره او ازمایښتي مرکه',
    },
    excerpt: {
      en: 'Realistic consular interview simulation with tailored feedback.',
      fa: 'تمرین سناریوهای واقعی کنسولگری همراه با ارزیابی دقیق پاسخ‌ها.',
      ps: 'د کنسولګرۍ د ریښتینو سناریوګانو تمرین د کره ځوابونو سره.',
    },
    description: {
      en: 'Comprehensive preparation for US, Schengen, Canadian, and German visa interviews. Master common refusal traps, document verification tips, and authentic confidence techniques.',
      fa: 'آمادگی همه‌جانبه برای مصاحبه ویزاهای شنگن، امریکا، آلمان و کانادا. شناخت اشتباهات پرخطر، تکنیک‌های پاسخ‌گویی به بندهای قانونی و ارائه مطمئن مدارک.',
      ps: 'د امریکا، شینګن، جرمني او کاناډا ویزو مرکو لپاره بشپړ چمتووالی. د رد کېدو د عامو دلیلونو پیژندنه، د اسنادو بشپړول او د باوري ځواب ویلو هنر.',
    },
  },
  {
    slug: 'trilingual-document-translation',
    icon: 'Globe',
    title: {
      en: 'Certified Trilingual Document Translation',
      fa: 'ترجمه رسمی و تخصصی اسناد (سه‌زبانه)',
      ps: 'د اسنادو باوري درې ژبې مسلکي ژباړه',
    },
    excerpt: {
      en: 'Accurate translations between Persian (Afghanistan), Pashto, and English.',
      fa: 'ترجمه دقیق و روان اسناد، مدارک تحصیلی و مکاتبات اداری.',
      ps: 'د تحصیلي اسنادو، اسنادو او اداري لیکونو دقیقه او روانه ژباړه.',
    },
    description: {
      en: 'Certified translation of transcripts, diplomas, reference letters, and legal identity papers. Ready for foreign embassy submissions, university admissions, and international employers.',
      fa: 'ترجمه حرفه‌ای ترانسکریپت نمرات، دیپلوم، توصیه‌نامه‌ها و اسناد هویتی متناسب با الزامات دانشگاه‌های خارجی، سفارتخانه‌ها و نهادهای بین‌المللی.',
      ps: 'د نمرو د ترانسکریپت، ډیپلوم، سپارښت لیکونو او پېژندپاڼو مسلکي ژباړه چې د بهرنیو پوهنتونونو، سفارتونو او نړیوالو ادارو لپاره په بشپړ ډول د منلو وړ وي.',
    },
  },
];

const SERVICES_FAQS: {
  q: Record<Lang, string>;
  a: Record<Lang, string>;
}[] = [
  {
    q: {
      en: 'How do I book a consultation or request a service?',
      fa: 'چگونه می‌توانم وقت مشاوره رزرو کنم یا درخواستم را ثبت نمایم؟',
      ps: 'څنګه کولی شم د مشورې وخت وټاکم یا خپل غوښتنلیک وسپارم؟',
    },
    a: {
      en: 'Simply select your desired service and click "Book Consultation" or visit our Contact page. Our dedicated support team responds within 24 hours to coordinate dates and requirements.',
      fa: 'کافی است بر روی دکمه "رزرو مشاوره" کلیک کرده یا از طریق صفحه تماس با ما پیام بگذارید. تیم پشتیبانی ما ظرف کمتر از ۲۴ ساعت با شما هماهنگ خواهد شد.',
      ps: 'په ساده ډول د "مشورې وخت" تڼۍ کیکاږئ یا د اړیکې له لارې موږ ته پیغام واستوئ. زموږ ملاتړی ټیم به په ۲۴ ساعتونو کې له تاسو سره اړیکه ونیسي.',
    },
  },
  {
    q: {
      en: 'Are ARIA HUB opportunity listings free to access?',
      fa: 'آیا دسترسی به فرصت‌ها و بورسیه‌های آریا هاب رایگان است؟',
      ps: 'ایا په آریا هاب کې د بورسونو او فرصتونو لیدل وړیا دي؟',
    },
    a: {
      en: 'Yes! Searching, filtering, and reading verified opportunity guidelines on ARIA HUB is 100% free for all students, jobseekers, and community members.',
      fa: 'بله! جستجو، مطالعه و دسترسی به تمامی بورسیه‌ها، فرصت‌های شغلی و راهنماها در آریا هاب برای همه کاربران و محصلان کاملاً رایگان است.',
      ps: 'هو! په آریا هاب کې د ټولو تحصیلي بورسونو، کاري اعلانونو او لارښودونو لټون او لوستل د ټولو کاروونکو لپاره په بشپړ ډول وړیا دي.',
    },
  },
  {
    q: {
      en: 'In which languages are services provided?',
      fa: 'خدمات به چه زبان‌هایی ارائه می‌شوند؟',
      ps: 'خدمتونه په کومو ژبو وړاندې کیږي؟',
    },
    a: {
      en: 'All services, consultations, and document reviews are conducted trilingually in Persian (Afghanistan), Pashto, and English according to your preference.',
      fa: 'تمامی مشاوره‌ها، بررسی اسناد و ارتباطات بر اساس ترجیح شما به سه زبان دری، پشتو و انگلیسی ارائه می‌شوند.',
      ps: 'ټولې مشورې، د اسنادو بیاکتنه او لارښوونې ستاسو په خوښه په دري، پښتو او انګلیسي ژبو ترسره کیږي.',
    },
  },
];

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const t = (key: string, p?: Record<string, string | number>) =>
    translate(lang, key, p);

  const data = await getSiteData();
  const services: Service[] = data.services;
  const showFallback = services.length === 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        menu={data.menu}
        languages={data.languages}
        siteName={data.settings?.siteName || 'ARIA HUB'}
        logoUrl={data.settings?.logoUrl ?? null}
      />

      <main className="flex-1 pt-24 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Page header */}
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {t('services.eyebrow')}
            </p>
            <h1 dir="auto" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {t('services.title')}
            </h1>
            <p dir="auto" className="mt-3 text-base text-muted-foreground sm:text-lg">
              {t('services.subtitle')}
            </p>
          </div>

          {/* Services grid */}
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} lang={lang} />
            ))}
            {showFallback &&
              FALLBACK_SERVICES.map((s) => (
                <article
                  key={s.slug}
                  id={s.slug}
                  className="group flex h-full scroll-mt-28 flex-col rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-float"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-4">
                      <span
                        aria-hidden="true"
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-float"
                      >
                        <Icon name={s.icon} className="h-5 w-5" />
                      </span>
                      <h2
                        dir="auto"
                        className="text-lg font-bold leading-snug transition-colors group-hover:text-primary"
                      >
                        {s.title[lang] || s.title.en}
                      </h2>
                    </div>
                  </div>

                  <p dir="auto" className="mt-4 text-sm font-medium text-foreground/80">
                    {s.excerpt[lang] || s.excerpt.en}
                  </p>

                  <p
                    dir="auto"
                    className="mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground"
                  >
                    {s.description[lang] || s.description.en}
                  </p>

                  <div className="mt-5 border-t border-border/50 pt-4">
                    <Link
                      href={`/${lang}/contact`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:underline"
                    >
                      {t('common.bookCall')}
                      <ArrowRight className="h-4 w-4 rtl-flip" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
          </div>

          {/* Value proposition band */}
          <div className="mt-16 rounded-2xl border border-border/60 bg-muted/30 p-8 sm:p-10">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {lang === 'fa'
                ? 'چرا خدمات تخصصی آریا هاب؟'
                : lang === 'ps'
                ? 'ولې د آریا هاب مسلکي خدمتونه؟'
                : 'Why Choose ARIA HUB Professional Services?'}
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    {lang === 'fa' ? 'تیم بین‌المللی باتجربه' : lang === 'ps' ? 'نړیواله تجربه لرونکې ډله' : 'Proven Track Record'}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lang === 'fa'
                      ? 'همراهی با صدها دانشجو و متقاضی موفق در اخذ بورسیه و ویزا.'
                      : lang === 'ps'
                      ? 'سلګونو زده کوونکو او کار غوښتونکو سره د بورسونو په ترلاسه کولو کې مرسته.'
                      : 'Careful, step-by-step guidance for university admissions and career applications.'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    {lang === 'fa' ? 'سه‌زبانه و منطبق با فرهنگ' : lang === 'ps' ? 'درې ژبی او کلتوري پوهه' : 'Trilingual Support'}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lang === 'fa'
                      ? 'راهنمایی شفاف به دری، پشتو و انگلیسی بدون هیچ مانع زبانی.'
                      : lang === 'ps'
                      ? 'په دري، پښتو او انګلیسي ژبو بشپړ لارښود پرته له کوم خنډ.'
                      : 'Clear, compassionate advice in Persian (Afghanistan), Pashto, and English with minimal language barriers.'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="mt-1 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground">
                    {lang === 'fa' ? 'سرعت و دقت تضمین‌شده' : lang === 'ps' ? 'چټک او تضمین شوی دقت' : 'Fast 24h Turnaround'}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {lang === 'fa'
                      ? 'بررسی و تحویل به‌موقع اسناد برای از دست نرفتن ددلاین‌های حساس.'
                      : lang === 'ps'
                      ? 'د حساسو مهلتونو لپاره د اسنادو پر وخت کره کتنه او تحویلي.'
                      : 'Punctual review and delivery so you never miss critical application deadlines.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQs section */}
          <div className="mt-16 max-w-4xl">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <HelpCircle className="h-4 w-4" />
              <span>{lang === 'fa' ? 'سوالات متداول' : lang === 'ps' ? 'عامې پوښتنې' : 'Frequently Asked Questions'}</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {lang === 'fa'
                ? 'پاسخ به پرسش‌های رایج درباره خدمات'
                : lang === 'ps'
                ? 'د خدمتونو په اړه عامو پوښتنو ته ځوابونه'
                : 'Common Questions About Our Services'}
            </h2>
            <div className="mt-6 space-y-4">
              {SERVICES_FAQS.map((faq, idx) => (
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
      </main>

      <Footer
        settings={data.settings}
        footer={data.footer}
        socialLinks={data.socialLinks}
      />
      <ScrollToTop />
      <CookieBanner />
    </div>
  );
}

function ServiceCard({ service, lang }: { service: Service; lang: Lang }) {
  const t = (key: string, p?: Record<string, string | number>) =>
    translate(lang, key, p);

  const title = getLocalizedContent(
    service.title,
    service.titleI18n as Record<string, string> | null,
    lang
  );
  const excerpt = getLocalizedContent(
    service.excerpt,
    service.excerptI18n as Record<string, string> | null,
    lang
  );
  const description = stripHtml(
    getLocalizedContent(
      service.description,
      service.descriptionI18n as Record<string, string> | null,
      lang
    )
  );

  return (
    <article
      id={service.slug}
      className="group flex h-full scroll-mt-28 flex-col rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-float"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-float"
          >
            <Icon name={service.icon} className="h-5 w-5" />
          </span>
          <h2
            dir="auto"
            className="text-lg font-bold leading-snug transition-colors group-hover:text-primary"
          >
            {title}
          </h2>
        </div>
        {service.price && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
            <Tag className="h-3 w-3" aria-hidden="true" />
            {service.price}
          </span>
        )}
      </div>

      {excerpt && (
        <p dir="auto" className="mt-4 text-sm font-medium text-foreground/80">
          {excerpt}
        </p>
      )}

      {description && (
        <p
          dir="auto"
          className="mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground line-clamp-8"
        >
          {description}
        </p>
      )}

      <div className="mt-5 border-t border-border/50 pt-4">
        <Link
          href={`/${lang}/contact`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:underline"
        >
          {t('common.bookCall')}
          <ArrowRight className="h-4 w-4 rtl-flip" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
