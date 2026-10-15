import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { PRIVACY_DOC, PRIVACY_ADSENSE_TAIL, lastUpdatedLine, pickTril } from '@/lib/static-page-content';
import { PageShell } from '@/components/site/page-shell';
import { isLang, type Lang } from '@/lib/lang-route';
import { getPageSeo } from '@/lib/seo-metadata';

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
  const seo = getPageSeo('privacyPolicy', lang);

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/privacy-policy`,
      languages: {
        en: '/en/privacy-policy',
        fa: '/fa/privacy-policy',
        ps: '/ps/privacy-policy',
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

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  let title = pickTril(PRIVACY_DOC.title, lang);
  let dbHtml = '';
  let dateText = lastUpdatedLine(lang, new Date());

  try {
    const page = await db.page.findUnique({ where: { slug: 'privacy-policy' } });
    if (page) {
      if (page.status !== 'published') {
        notFound();
      }
      title = getLocalizedContent(page.title, page.titleI18n as Record<string, string> | null, lang) || title;
      dbHtml = getLocalizedContent(page.content, page.contentI18n as Record<string, string> | null, lang);
      dateText = lastUpdatedLine(lang, new Date(page.updatedAt));
    }
  } catch (e: any) {
    if (e?.digest?.includes('NEXT_NOT_FOUND')) throw e;
    // DB or table might not exist yet — built-in trilingual doc covers it.
  }

  return (
    <PageShell lang={lang} backTo="home">
      <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 lg:px-8" dir="auto">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-8 shadow-sm backdrop-blur-sm md:p-12">
          <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground md:text-4xl text-start">
            {title}
          </h1>

          <div className="prose prose-sm dark:prose-invert sm:prose-base max-w-none space-y-6 text-muted-foreground text-start">
            <p>{dateText}</p>
            <section>
              <h2 className="text-xl font-semibold text-foreground">{lang==='en'?'Social campaign measurement':lang==='fa'?'اندازه‌گیری کمپاین‌های اجتماعی':'د ټولنیزو کمپاینونو اندازه کول'}</h2>
              <p>{lang==='en'?'When you accept analytics cookies, ARIA HUB measures campaign visits, opportunity clicks, new registrations and email-verified accounts. A first-party cookie attributes a new account to the first campaign for up to 30 days. Measurement records use pseudonymous hashes, without storing your IP address or email in the campaign database. Event records are retained for up to 180 days. Choose essential cookies only to disable this measurement.':lang==='fa'?'با پذیرش کوکی‌های تحلیلی، آریا هاب بازدید کمپاین، کلیک فرصت، ثبت‌نام جدید و تأیید ایمیل را اندازه‌گیری می‌کند. یک کوکی داخلی تا ۳۰ روز حساب جدید را به نخستین کمپاین نسبت می‌دهد. سوابق با شناسهٔ مستعار ذخیره می‌شوند؛ آی‌پی و ایمیل شما در دیتابیس کمپاین ذخیره نمی‌شود. سوابق رویداد تا ۱۸۰ روز نگهداری می‌شوند. انتخاب فقط کوکی‌های ضروری این اندازه‌گیری را غیرفعال می‌کند.':'د تحلیلي کوکیو په منلو سره آریا هاب د کمپاین لیدنې، د فرصت کلیکونه، نوې نوملیکنې او د ایمیل تایید شوي حسابونه اندازه کوي. یو داخلي کوکي تر ۳۰ ورځو نوی حساب لومړي کمپاین ته منسوبوي. ریکارډونه په مستعارو پېژندونو ساتل کېږي؛ ستاسو آی‌پي او ایمیل د کمپاین په ډیټابیس کې نه ساتل کېږي. د پېښو ریکارډونه تر ۱۸۰ ورځو ساتل کېږي. یوازې اړین کوکي غوره کول دا اندازه کول بندوي.'}</p>
            </section>

            {dbHtml ? (
              <div dangerouslySetInnerHTML={{ __html: dbHtml }} />
            ) : (
              PRIVACY_DOC.sections.map((s, i) => (
                <section key={i}>
                  <h2 className="text-xl font-semibold text-foreground">{pickTril(s.heading, lang)}</h2>
                  {s.paragraphs?.map((p, j) => (
                    <p key={j}>{pickTril(p, lang)}</p>
                  ))}
                  {s.bullets ? (
                    <ul className="list-disc ps-5 mt-2">
                      {s.bullets.map((b, j) => (
                        <li key={j}>{pickTril(b, lang)}</li>
                      ))}
                      {s.bulletLinks?.map((l, j) => (
                        <li key={`l${j}`}>
                          {pickTril(l.label, lang).replace(/\.$/, '')}{' '}
                          (<a href={l.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {lang === 'fa' ? 'تنظیمات تبلیغات' : lang === 'ps' ? 'د اعلانونو تنظیمات' : 'Ads Settings'}
                          </a>).
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {s.heading.en === '3. Google AdSense & Cookies' ? (
                    <p className="mt-2">
                      {pickTril(PRIVACY_ADSENSE_TAIL.text, lang)}{' '}
                      <a href={PRIVACY_ADSENSE_TAIL.linkHref} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {pickTril(PRIVACY_ADSENSE_TAIL.linkLabel, lang)}
                      </a>.
                    </p>
                  ) : null}
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
