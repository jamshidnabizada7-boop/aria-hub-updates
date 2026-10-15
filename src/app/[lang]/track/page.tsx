import { PageBackLink } from '@/components/site/page-navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteData } from '@/lib/get-site';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { translate } from '@/lib/i18n';
import { isLang, type Lang } from '@/lib/lang-route';
import { getPageSeo } from '@/lib/seo-metadata';
import { TrackForm } from './track-form';
import { CheckCircle2, Clock, Globe, HelpCircle, ArrowRight, ShieldCheck, Send } from 'lucide-react';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = (isLang(raw) ? raw : 'fa') as Lang;
  const seo = getPageSeo('track', lang);
  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/track`,
      languages: { en: '/en/track', fa: '/fa/track', ps: '/ps/track' },
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      locale: lang,
      type: 'website',
    },
  };
}

const PIPELINE_STEPS = [
  {
    step: '01',
    title: {
      en: 'Instant Submission & Tracking ID',
      fa: 'ثبت فوری و دریافت کد پیگیری',
      ps: 'فوري ثبت او د تعقیب کوډ ترلاسه کول',
    },
    desc: {
      en: 'Your listing is logged in our verification queue and a unique tracking reference code is generated.',
      fa: 'درخواست شما در صف بررسی ثبت شده و کد اختصاصی پیگیری برای شما صادر می‌گردد.',
      ps: 'ستاسو غوښتنه زموږ په کتار کې ثبت کیږي او یو ځانګړی تعقیب کوډ درکول کیږي.',
    },
  },
  {
    step: '02',
    title: {
      en: 'Editorial & Legitimacy Review',
      fa: 'بررسی اصالت و معیارهای کیفی',
      ps: 'د اعتبار او معیارونو کره کتنه',
    },
    desc: {
      en: 'Our editorial team independently verifies the organization, deadline, and official application links within 24 hours.',
      fa: 'تیم نظارت آریا هاب صحت اطلاعات، لینک‌های ثبت‌نام و تاریخ انقضا را ظرف ۲۴ ساعت اعتبارسنجی می‌کند.',
      ps: 'زموږ ټیم په ۲۴ ساعتونو کې د ادارې اعتبار، د غوښتنلیک لینکونه او وروستۍ نېټه تصدیق کوي.',
    },
  },
  {
    step: '03',
    title: {
      en: 'Trilingual Translation',
      fa: 'ترجمه دقیق و روان سه‌زبانه',
      ps: 'په درې ژبو مسلکي ژباړه',
    },
    desc: {
      en: 'Approved listings are translated and adapted into Persian (Afghanistan), Pashto, and English for maximum community accessibility.',
      fa: 'موقعیت‌های تأییدشده به زبان‌های دری، پشتو و انگلیسی ترجمه و بومی‌سازی می‌شوند.',
      ps: 'منل شوي اعلانونه په دري، پښتو او انګلیسي ژباړل کیږي ترڅو ټول ورته لاسرسی ولري.',
    },
  },
  {
    step: '04',
    title: {
      en: 'Live Publication & Broadcast',
      fa: 'انتشار در سایت و شبکه‌های اجتماعی',
      ps: 'په ویب پاڼه او چینلونو کې خپرېدل',
    },
    desc: {
      en: 'The opportunity is published on the portal and broadcasted via our Telegram community channels and daily digests.',
      fa: 'فرصت کاری یا تحصیلی در صفحه اصلی آریا هاب و کانال‌های اطلاع‌رسانی به صدها هزار مخاطب ارائه می‌گردد.',
      ps: 'فرصت په ویب پاڼه او زموږ په رسمي ټیلیګرام او ټولنیزو شبکو کې خپریږي.',
    },
  },
];

const TRACK_FAQS = [
  {
    q: {
      en: 'Where can I find my tracking reference code?',
      fa: 'کد رهگیری خود را از کجا پیدا کنم؟',
      ps: 'خپل د تعقیب کوډ له کومه ځایه پیدا کړم؟',
    },
    a: {
      en: 'Your tracking code was displayed on the confirmation screen immediately upon submitting, and sent to the contact email you provided.',
      fa: 'کد رهگیری شما بلافاصله پس از ثبت موفق بر روی صفحه نمایش داده شده و به آدرس ایمیل شما نیز ارسال گردیده است.',
      ps: 'ستاسو د تعقیب کوډ د سپارلو سره سم پر سکرین ښودل شوی او ستاسو برېښنالیک ته هم استول شوی دی.',
    },
  },
  {
    q: {
      en: 'How long does the editorial review take?',
      fa: 'فرایند بررسی و تأیید چقدر طول می‌کشد؟',
      ps: 'د بیاکتنې او خپرېدو پروسه څومره وخت نیسي؟',
    },
    a: {
      en: 'Most opportunities are reviewed, translated, and published within 12 to 24 hours. Urgent deadlines receive expedited priority.',
      fa: 'بیشتر فرصت‌ها ظرف ۱۲ الی ۲۴ ساعت کاری بررسی، ترجمه و منتشر می‌شوند. موارد دارای مهلت فوری در اولویت قرار می‌گیرند.',
      ps: 'ډیری فرصتونه په ۱۲ تر ۲۴ کاري ساعتونو کې کتل کیږي، ژباړل کیږي او خپریږي.',
    },
  },
  {
    q: {
      en: 'Can I edit or update a submitted opportunity?',
      fa: 'آیا می‌توانم اطلاعات یک فرصت ثبت‌شده را ویرایش کنم؟',
      ps: 'ایا کولی شم د خپل ثبت شوي فرصت معلومات بدل کړم؟',
    },
    a: {
      en: 'If you need to make changes, please contact our support team with your reference code and we will update the details promptly.',
      fa: 'در صورت نیاز به اعمال تغییرات، کافی است از طریق صفحه تماس با ما همراه با کد رهگیری پیام بگذارید تا همکاران ما آن را اعمال کنند.',
      ps: 'که بدلونونو ته اړتیا وي، د خپل تعقیب کوډ سره د اړیکې له لارې موږ ته ولیکئ ترڅو ژر تر ژره یې نوي کړو.',
    },
  },
];

export default async function TrackSubmissionPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang = (isLang(raw) ? raw : 'fa') as Lang;
  const data = await getSiteData();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        menu={data.menu}
        languages={data.languages}
        siteName={data.settings?.siteName || 'ARIA HUB'}
        logoUrl={data.settings?.logoUrl ?? null}
      />
      <main id="main-content" className="flex-1 pt-24 pb-20">
        <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          <PageBackLink lang={lang} to="home" className="mb-6" />
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto">
            <span
              aria-hidden="true"
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-chart-2/15 text-primary shadow-inner"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-9-9" strokeLinecap="round" />
                <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h1 dir="auto" className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
              {translate(lang, 'track.title')}
            </h1>
            <p dir="auto" className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              {translate(lang, 'track.subtitle')}
            </p>
          </div>

          {/* Form container */}
          <div className="mt-8 max-w-2xl mx-auto">
            <TrackForm lang={lang} />
          </div>

          {/* Review Pipeline Explainer */}
          <section className="mt-20 border-t border-border/60 pt-12">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {lang === 'fa' ? 'فرایند بررسی و انتشار' : lang === 'ps' ? 'د بیاکتنې او خپرېدو پړاوونه' : 'Workflow Overview'}
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {lang === 'fa'
                  ? 'پس از ارسال چه اتفاقی می‌افتد؟'
                  : lang === 'ps'
                  ? 'د فرصت له سپارلو وروسته څه کیږي؟'
                  : 'What Happens After You Submit?'}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {lang === 'fa'
                  ? 'تمامی آگهی‌ها و فرصت‌های ارسالی مراحل زیر را با بالاترین استانداردهای شفافیت طی می‌کنند.'
                  : lang === 'ps'
                  ? 'ټول سپارل شوي فرصتونه د روڼتیا او باوري معیارونو له لاندې پړاوونو تیریږي.'
                  : 'Every submitted opportunity is verified and processed through our 4-stage quality pipeline.'}
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
              {PIPELINE_STEPS.map((step) => (
                <div key={step.step} className="rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                      {step.step}
                    </span>
                    <h3 className="font-bold text-base text-foreground">
                      {step.title[lang] || step.title.en}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {step.desc[lang] || step.desc.en}
                  </p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-10 rounded-2xl bg-muted/40 border border-border/60 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-foreground">
                  {lang === 'fa' ? 'فرصت دیگری برای به اشتراک‌گذاری دارید؟' : lang === 'ps' ? 'بل کوم فرصت لرئ چې شریک یې کړئ؟' : 'Have another opportunity to share?'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {lang === 'fa'
                    ? 'به دیگر متقاضیان افغان کمک کنید تا از تازه‌ترین موقعیت‌ها باخبر شوند.'
                    : lang === 'ps'
                    ? 'نورو افغان غوښتونکو سره مرسته وکړئ چې له نویو فرصتونو خبر شي.'
                    : 'Help students and jobseekers discover life-changing scholarships and careers.'}
                </p>
              </div>
              <Link
                href={`/${lang}/submit-opportunity`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors shrink-0"
              >
                <Send className="h-4 w-4 rtl-flip" />
                {lang === 'fa' ? 'ثبت فرصت جدید' : lang === 'ps' ? 'نوې فرصت ثبت کړه' : 'Submit Opportunity'}
              </Link>
            </div>

            {/* FAQs */}
            <div className="mt-16 max-w-3xl mx-auto">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <HelpCircle className="h-4 w-4" />
                <span>{lang === 'fa' ? 'پرسش‌های متداول پیگیری' : lang === 'ps' ? 'د تعقیب په اړه عامې پوښتنې' : 'Tracking FAQs'}</span>
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                {lang === 'fa'
                  ? 'سوالات متداول درباره پیگیری ارسال‌ها'
                  : lang === 'ps'
                  ? 'د ثبت شویو فرصتونو د تعقیب عامې پوښتنې'
                  : 'Frequently Asked Questions'}
              </h2>
              <div className="mt-6 space-y-4">
                {TRACK_FAQS.map((faq, idx) => (
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
          </section>
        </div>
      </main>
      <Footer
        settings={data.settings}
        footer={data.footer}
        socialLinks={data.socialLinks}
      />
    </div>
  );
}
