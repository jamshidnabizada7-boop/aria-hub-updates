import type { Metadata } from 'next';
import { PageShell } from '@/components/site/page-shell';
import TemplatesClient from './templates-client';
import { isLang, type Lang } from '@/lib/lang-route';
import { getPageSeo } from '@/lib/seo-metadata';
import { FileText, Award, BookOpen, CheckCircle2, HelpCircle, Sparkles } from 'lucide-react';

export const revalidate = 1800;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const seo = getPageSeo('templates', lang);

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/templates`,
      languages: {
        en: '/en/templates',
        fa: '/fa/templates',
        ps: '/ps/templates',
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

const TEMPLATE_CATEGORIES = [
  {
    icon: FileText,
    title: {
      en: 'Statement of Purpose (SOP) & Motivation Letters',
      fa: 'انگیزه‌نامه و بیانیه هدف (SOP)',
      ps: 'انګېزه لیک او د موخو بیان (SOP)',
    },
    desc: {
      en: 'Proven templates for DAAD, Chevening, Fulbright, and Erasmus Mundus applications with structural outlines and opening hooks.',
      fa: 'قالب‌های امتحان‌شده برای بورسیه‌های داد، چیونینگ، فولبرایت و اراسموس موندوس با ساختار استاندارد و مقدمه‌های تأثیرگذار.',
      ps: 'د داد، چیونینګ، فولبرایټ او اراسموس موندوس لپاره ازمویل شوي فارمټونه له معیارونو او قوي پیل سره.',
    },
  },
  {
    icon: Award,
    title: {
      en: 'Letters of Recommendation (LOR)',
      fa: 'توصیه‌نامه‌های آکادمیک و شغلی',
      ps: 'تحصیلي او کاري سپارښت لیکونه',
    },
    desc: {
      en: 'Professor and supervisor reference letters designed to highlight research capability, leadership, and personal integrity.',
      fa: 'نمونه توصیه‌نامه‌های استادان و مدیران با تأکید بر توانایی پژوهشی، رهبری، پشتکار و صلاحیت‌های متقاضی.',
      ps: 'د استادانو او مدیرانو سپارښت لیکونه چې څیړنیزې وړتیاوې، اخلاق او مسلکي وړتوبونه روښانه کوي.',
    },
  },
  {
    icon: BookOpen,
    title: {
      en: 'Academic CVs & Research Proposals',
      fa: 'سی‌وی دانشگاهی و پروپوزل تحقیقاتی',
      ps: 'علمي سي وي او څیړنیز وړاندیزونه',
    },
    desc: {
      en: 'Standard academic curriculum vitae templates (Europass & US format) plus structured PhD and Master research proposal drafts.',
      fa: 'قالب‌های استاندارد رزومه دانشگاهی و ساختار مدون طرح تحقیق و پروپوزل برای مقاطع ماستری و دکترا.',
      ps: 'د پوهنتوني رزومې معیاري فارمټونه او د ماسټرۍ او دوکتورا لپاره د څیړنیزو پروپوزلونو چمتو چوکاټ.',
    },
  },
];

const TEMPLATE_FAQS = [
  {
    q: {
      en: 'Are these document templates free to use and edit?',
      fa: 'آیا این قالب‌ها رایگان و قابل ویرایش هستند؟',
      ps: 'ایا دا فارمټونه وړیا او د بدلولو وړ دي؟',
    },
    a: {
      en: 'Yes! All core templates on ARIA HUB are free to read, copy, and personalize in Markdown, Word, or plain text formats.',
      fa: 'بله! تمامی قالب‌های اصلی آریا هاب برای کپی، دانلود و ویرایش شخصی در فرمت‌های ورد و متن کاملاً رایگان هستند.',
      ps: 'هو! په آریا هاب کې ټول اصلي فارمټونه د کاپي، ډاونلوډ او شخصي کولو لپاره په بشپړ ډول وړیا دي.',
    },
  },
  {
    q: {
      en: 'Should I copy the templates word-for-word?',
      fa: 'آیا باید قالب‌ها را کلمه به کلمه کپی کنم؟',
      ps: 'ایا موږ باید دا متن ټکي په ټکي کاپي کړو؟',
    },
    a: {
      en: 'No. Admissions committees use plagiarism checkers. Use these templates as structural guides and inspiration, inserting your authentic achievements and goals.',
      fa: 'خیر. کمیته‌های پذیرش از ابزارهای ضدسرقت ادبی استفاده می‌کنند. از ساختار و راهنمایی‌ها الگو بگیرید و تجربیات واقعی خود را جایگزین نمایید.',
      ps: 'نه. پوهنتونونه ادبي غلا څاري. له دې څخه یوازې د چوکاټ او لارښود په توګه ګټه واخلئ او خپلې ریښتینې کیسې پکې ولیکئ.',
    },
  },
];

export default async function TemplatesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';

  return (
    <PageShell lang={lang} className="pt-12 pb-16">
      {/* Server-rendered SEO & Intro Header */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-8">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {lang === 'fa' ? 'مدارک و قالب‌های استاندارد' : lang === 'ps' ? 'معیاري اسناد او فارمټونه' : 'Application Document Library'}
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {lang === 'fa'
              ? 'قالب‌های آماده مدارک بورسیه و استخدام'
              : lang === 'ps'
              ? 'د بورسونو او استخدام لپاره چمتو فارمټونه'
              : 'Scholarship & Job Application Templates'}
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            {lang === 'fa'
              ? 'نمونه‌های استاندارد بین‌المللی انگیزه‌نامه، توصیه‌نامه، سی‌وی و بیانیه هدف برای افزایش شانس قبولی در بهترین دانشگاه‌های جهان.'
              : lang === 'ps'
              ? 'د نړۍ په غوره پوهنتونونو کې د بریا لپاره د انګېزه لیکونو، سپارښت لیکونو او تحصیلي سي وي باوري نمونې.'
              : 'Verified templates, writing frameworks, and samples tailored for international university admissions and prestigious scholarships.'}
          </p>
        </div>

        {/* Categories Overview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {TEMPLATE_CATEGORIES.map((c, i) => {
            const IconC = c.icon;
            return (
              <div key={i} className="rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <IconC className="h-5 w-5" />
                  </span>
                  <h2 className="font-bold text-base text-foreground">
                    {c.title[lang] || c.title.en}
                  </h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {c.desc[lang] || c.desc.en}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Library Client */}
      <TemplatesClient />

      {/* Templates FAQs */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-4xl border-t border-border/60 pt-12">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <HelpCircle className="h-4 w-4" />
            <span>{lang === 'fa' ? 'نکات و سوالات متداول نگارش' : lang === 'ps' ? 'د لیکلو لارښوونې او پوښتنې' : 'Writing Tips & FAQs'}</span>
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {lang === 'fa'
              ? 'چگونه مدارک پذیرش قوی‌تری آماده کنیم؟'
              : lang === 'ps'
              ? 'څنګه د غوښتنلیک پیاوړي اسناد چمتو کړو؟'
              : 'How to Build a Winning Application Package'}
          </h2>
          <div className="mt-6 space-y-4">
            {TEMPLATE_FAQS.map((faq, idx) => (
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
    </PageShell>
  );
}
