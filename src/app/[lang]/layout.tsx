import type { Metadata } from 'next';
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

async function getLanguages(): Promise<Language[]> {
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
}

async function getSettings(): Promise<SiteSettings | null> {
  try {
    const settings = await db.siteSetting.findFirst();
    return (settings as unknown as SiteSettings) || null;
  } catch {
    return null;
  }
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
  const tagline = getLocalizedContent(
    settings?.tagline || DEFAULT_TAGLINES[valid] || DEFAULT_TAGLINES.en,
    settings?.taglineI18n,
    valid
  );
  const description =
    getLocalizedContent(settings?.description, settings?.descriptionI18n, valid) ||
    DEFAULT_DESCRIPTIONS[valid] ||
    `${siteName} — ${tagline}`;

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: `${siteName} | ${tagline}`,
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
      title: `${siteName} | ${tagline}`,
      description,
      siteName,
      locale: valid,
      type: 'website',
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
      <LangSync lang={lang} languages={languages} />
      {/* AdSense loads ONLY on public pages — /admin (outside this layout) is
          excluded so the dashboard never serves ads (invalid-impression risk).
          A raw <script async> is used (NOT next/script): AdSense rejects head
          tags carrying the data-nscript attribute next/script injects. */}
      <meta name="google-adsense-account" content="ca-pub-5960471686203476" />
      <script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5960471686203476"
        crossOrigin="anonymous"
      />
      {children}
    </LangProvider>
  );
}
