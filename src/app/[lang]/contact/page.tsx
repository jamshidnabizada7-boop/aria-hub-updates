import type { Metadata } from 'next';
import { PageShell } from '@/components/site/page-shell';
import { ContactSection } from '@/components/site/sections/contact';
import { getSiteData } from '@/lib/get-site';
import { translate } from '@/lib/i18n';
import { isLang, type Lang } from '@/lib/lang-route';
import { getPageSeo } from '@/lib/seo-metadata';
import { Clock, MessageSquare, ShieldCheck, Mail, HelpCircle } from 'lucide-react';
import Link from 'next/link';

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
  const seo = getPageSeo('contact', lang);

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/contact`,
      languages: {
        en: `/en/contact`,
        fa: `/fa/contact`,
        ps: `/ps/contact`,
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

const CONTACT_FAQS: {
  q: Record<Lang, string>;
  a: Record<Lang, string>;
}[] = [
  {
    q: {
      en: 'What are ARIA HUB support response times?',
      fa: 'زمان پاسخ‌گویی پشتیبانی آریا هاب چقدر است؟',
      ps: 'د آریا هاب د ملاتړ ټیم څومره وخت کې ځواب ورکوي؟',
    },
    a: {
      en: 'Our trilingual customer support team reviews all incoming inquiries daily and responds within 12 to 24 hours during business days.',
      fa: 'تیم پشتیبانی سه‌زبانه ما روزانه تمامی پیام‌های دریافتی را بررسی کرده و معمولاً ظرف ۱۲ الی ۲۴ ساعت کاری پاسخ می‌دهد.',
      ps: 'زموږ درې ژبی ملاتړی ټیم ټول ترلاسه شوي پیغامونه هره ورځ ګوري او په ۱۲ تر ۲۴ کاري ساعتونو کې ځواب درکوي.',
    },
  },
  {
    q: {
      en: 'How can organizations advertise or post jobs on ARIA HUB?',
      fa: 'چگونه سازمان‌ها و کارفرمایان می‌توانند در آریا هاب آگهی دهند؟',
      ps: 'څنګه ادارې او کارګمارونکي کولی شي په آریا هاب کې اعلانونه خپاره کړي؟',
    },
    a: {
      en: 'You can submit jobs directly through our "Employers" portal or reach out using this contact form with "Advertising & Partnerships" as your subject.',
      fa: 'می‌توانید مستقیماً از بخش "کارفرمایان" آگهی خود را ثبت کنید یا از طریق همین فرم با موضوع "تبلیغات و همکاری" با ما تماس بگیرید.',
      ps: 'تاسو کولی شئ خپلې دندې مستقیماً د کارګمارونکو له لارې ثبت کړئ یا د دې فورم له لارې د "اعلانونو او همکارۍ" تر سرلیک لاندې اړیکه ونیسئ.',
    },
  },
  {
    q: {
      en: 'Is there any fee to contact or ask questions about opportunities?',
      fa: 'آیا برای ارتباط با پشتیبانی یا سوال درباره فرصت‌ها هزینه‌ای دریافت می‌شود؟',
      ps: 'ایا د ملاتړ سره د اړیکې یا د بورسونو پوښتنو لپاره کوم لګښت شته؟',
    },
    a: {
      en: 'General guidance, tracking queries, and public opportunity questions are completely free. Specialized one-on-one document reviews and mock interviews are available under our Services.',
      fa: 'راهنمایی عمومی، پیگیری درخواست‌ها و پرسش‌ها پیرامون بورسیه‌ها کاملاً رایگان است. خدمات تخصصی بازبینی مدارک و شبیه‌سازی مصاحبه در بخش خدمات ما ارائه می‌شوند.',
      ps: 'عمومي لارښوونې، د غوښتنلیکونو تعقیب او د بورسونو پوښتنې په بشپړ ډول وړیا دي. د اسنادو ځانګړې بیاکتنه او ازمایښتي مرکې زموږ د خدماتو په برخه کې شتون لري.',
    },
  },
];

export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';

  const data = await getSiteData();

  return (
    <PageShell lang={lang} className="pb-20">
      {/* Trilingual, DB-driven contact section (heading + form + departments + branches) */}
      <ContactSection
        settings={data.settings}
        departments={data.departments}
        branches={data.branches}
        lang={lang}
      />

      {/* Support commitments & helpful details */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Clock className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-bold text-foreground">
                {lang === 'fa' ? 'ساعات کاری و پاسخ‌گویی' : lang === 'ps' ? 'کاري او د ځواب ساعتونه' : 'Response Times'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === 'fa'
                  ? 'شنبه تا پنج‌شنبه: ۹:۰۰ صبح الی ۶:۰۰ عصر (پاسخ در ۲۴ ساعت کاری)'
                  : lang === 'ps'
                  ? 'شنبه تر پنجشنبې: ۹:۰۰ سهار تر ۶:۰۰ ماښام (په ۲۴ ساعتونو کې ځواب)'
                  : 'Saturday to Thursday: 9:00 AM – 6:00 PM (AFT). Response within 24h.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-bold text-foreground">
                {lang === 'fa' ? 'ارتباط مستقیم و فوری' : lang === 'ps' ? 'مستقیمه او فوري اړیکه' : 'Direct Channels'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === 'fa'
                  ? 'پشتیبانی سریع از طریق کانال تلگرام و واتساپ رسمی آریا هاب.'
                  : lang === 'ps'
                  ? 'د آریا هاب د رسمي ټیلیګرام او واټساپ له لارې چټک ملاتړ.'
                  : 'Quick updates and direct messaging via official Telegram & WhatsApp.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-bold text-foreground">
                {lang === 'fa' ? 'حفظ کامل حریم خصوصی' : lang === 'ps' ? 'د محرمیت بشپړ ساتنه' : 'Confidentiality'}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === 'fa'
                  ? 'تمامی پیام‌ها، ایمیل‌ها و اسناد شما نزد ما کاملاً محفوظ می‌مانند.'
                  : lang === 'ps'
                  ? 'ستاسو ټول پیغامونه، برېښنالیکونه او اسناد زموږ سره خوندي دي.'
                  : 'Your personal data, emails, and shared documents are strictly protected.'}
              </p>
            </div>
          </div>
        </div>

        {/* Contact FAQs */}
        <div className="mt-16 max-w-4xl">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <HelpCircle className="h-4 w-4" />
            <span>{lang === 'fa' ? 'پرسش‌های متداول' : lang === 'ps' ? 'عامې پوښتنې' : 'Frequently Asked Questions'}</span>
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {lang === 'fa'
              ? 'سوالات متداول درباره تماس و همکاری'
              : lang === 'ps'
              ? 'د اړیکې او همکارۍ په اړه عامې پوښتنې'
              : 'Support & Partnership FAQs'}
          </h2>
          <div className="mt-6 space-y-4">
            {CONTACT_FAQS.map((faq, idx) => (
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
