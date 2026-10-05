import type { Metadata } from 'next';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { LangSync } from '@/components/site/lang-sync';
import { LangProvider } from '@/components/site/lang-context';
import type { Language, SiteSettings } from '@/lib/types';

const LANGS = ['en', 'fa', 'ps'];

const DEFAULT_TAGLINES: Record<string, string> = {
  en: 'Jobs, Scholarships & Opportunities in Afghanistan',
  fa: 'وظایف، بورسیه‌ها و فرصت‌ها در افغانستان',
  ps: 'دندونې، بورسونه او فرصتونه په افغانستان کې',
};

const DEFAULT_DESCRIPTIONS: Record<string, string> = {
  en: 'New jobs, scholarships, fellowships and training opportunities from trusted organizations — summarized and translated into Farsi, Pashto and English.',
  fa: 'جدیدترین وظایف، بورسیه‌ها و فرصت‌های آموزشی از سازمان‌های معتبر — خلاصه‌شده و به فارسی، پشتو و انگلیسی ترجمه‌شده.',
  ps: 'تازه دندونې، بورسونه او د روزنې فرصتونه له باور وړ مؤسسو — لنډیز شوي او په دري، پښتو او انګلیسي ژباړل شوي.',
};

const FALLBACK_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', flag: '🇬🇧', isDefault: false, enabled: true, order: 1, id: 'fallback-en' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', direction: 'rtl', flag: '🇦🇫', isDefault: true, enabled: true, order: 2, id: 'fallback-fa' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', direction: 'rtl', flag: '🇦🇫', isDefault: false, enabled: true, order: 3, id: 'fallback-ps' },
];

const getCachedLanguages = unstable_cache(
  async (): Promise<Language[]> => {
    try {
      const languages = await db.language.findMany({
        where: { enabled: true },
        orderBy: { order: 'asc' },
      });
      if (languages && languages.length > 0) return languages as unknown as Language[];
    } catch {
      // fall through to static list
    }
    return FALLBACK_LANGUAGES;
  },
  ['layout-languages-list'],
  { revalidate: 3600, tags: ['languages'] }
);

const getCachedSettings = unstable_cache(
  async (): Promise<SiteSettings | null> => {
    try {
      const settings = await db.siteSetting.findFirst();
      return (settings as unknown as SiteSettings) || null;
    } catch {
      return null;
    }
  },
  ['layout-site-settings'],
  { revalidate: 1800, tags: ['site-settings'] }
);

const getLanguages = cache(() => getCachedLanguages());
const getSettings = cache(() => getCachedSettings());

const SEO_TITLES: Record<string, string> = {
  en: 'ARIA HUB — Scholarships, Jobs & Opportunities in Afghanistan',
  fa: 'آریا هاب — بورسیه‌های تحصیلی، وظایف و فرصت‌های شغلی',
  ps: 'آریا هاب — تحصیلي بورسونه، کاري فرصتونه او دندې',
};

const SEO_DESCRIPTIONS: Record<string, string> = {
  en: 'Discover verified scholarships, jobs, fellowships, and opportunities in Afghanistan with updates in English, Persian (Afghanistan), and Pashto.',
  fa: 'مرجع معتبر جدیدترین بورسیه‌های تحصیلی، وظایف و فرصت‌های آموزشی برای افغان‌ها به فارسی، پشتو و انگلیسی در آریا هاب.',
  ps: 'د افغانانو لپاره باوري تحصیلي بورسونه، کاري فرصتونه، انٹرنشیپونه او دندې په پښتو، دري او انګلیسي په آریا هاب کې ومومئ.',
};

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'fa' }, { lang: 'ps' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const valid = LANGS.includes(lang) ? lang : 'fa';
  const settings = await getSettings();
  const siteName = getLocalizedContent(settings?.siteName || 'ARIA HUB', settings?.siteNameI18n, valid);
  const title = SEO_TITLES[valid] || `${siteName} — Scholarships & Jobs`;
  const description =
    SEO_DESCRIPTIONS[valid] ||
    getLocalizedContent(settings?.description, settings?.descriptionI18n, valid) ||
    DEFAULT_DESCRIPTIONS[valid];

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: {
      default: title,
      template: `%s`,
    },
    description,
    alternates: {
      canonical: `/${valid}`,
      languages: {
        en: '/en',
        fa: '/fa',
        ps: '/ps',
      },
    },
    openGraph: {
      title,
      description,
      siteName,
      locale: valid,
      type: 'website',
      images: [
        {
          url: 'https://www.myariahub.com/og-image.png',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://www.myariahub.com/og-image.png'],
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!LANGS.includes(lang)) notFound();

  const languages = await getLanguages();

  return (
    <LangProvider lang={lang}>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang="${lang}";document.documentElement.dir="${lang === 'en' ? 'ltr' : 'rtl'}";`,
        }}
      />
      <LangSync lang={lang} languages={languages} />
      {/* AdSense loads ONLY on public pages — /admin (outside this layout) is
          excluded so the dashboard never serves ads (invalid-impression risk).
          Loaded asynchronously during browser idle time so it never blocks FCP/LCP. */}
      <meta name="google-adsense-account" content="ca-pub-5960471686203476" />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){window.adsbygoogle=window.adsbygoogle||[];function loadAdSense(){if(document.getElementById('adsbygoogle-js'))return;var s=document.createElement('script');s.id='adsbygoogle-js';s.async=true;s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5960471686203476';s.crossOrigin='anonymous';document.head.appendChild(s);}function defer(fn){if('requestIdleCallback' in window){window.requestIdleCallback(fn,{timeout:1500});}else{setTimeout(fn,1000);}}if(document.readyState==='complete'){defer(loadAdSense);}else{window.addEventListener('load',function(){defer(loadAdSense);});}})();`,
        }}
      />
      {children}
    </LangProvider>
  );
}
