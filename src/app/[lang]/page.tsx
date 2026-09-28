import type { Metadata } from 'next';
import { getSiteData } from '@/lib/get-site';
import { translate } from '@/lib/i18n';
import { Home } from '@/components/site/home';
import { JsonLd } from '@/components/site/json-ld';
import { isLang, type Lang } from '@/lib/lang-route';
import {
  getClosingSoon,
  getDailySpotlight,
  getFacets,
  getHomeStats,
  getWeeklyScholarship,
  listOpportunities,
} from '@/lib/opportunity-queries';
import { getFeaturedStoryCard } from '@/lib/success-story-queries';

export const revalidate = 300;

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

  const titles: Record<Lang, string> = {
    en: 'ARIA HUB | Jobs, Scholarships & Opportunities in Afghanistan',
    fa: 'آریا هاب | معتبرترین بورسیه‌ها و فرصت‌های شغلی افغانستان',
    ps: 'آریا هاب | د افغانستان باوري تحصیلي بورسونه او دندې',
  };

  const descriptions: Record<Lang, string> = {
    en: 'Discover verified scholarships, jobs, fellowships, and opportunities in Afghanistan with updates in English, Dari, and Pashto.',
    fa: 'مرجع معتبر جدیدترین بورسیه‌های تحصیلی، وظایف و فرصت‌های آموزشی برای افغان‌ها به فارسی، پشتو و انگلیسی در آریا هاب.',
    ps: 'د افغانانو لپاره باوري تحصیلي بورسونه، کاري فرصتونه، انٹرنشیپونه او دندې په پښتو، دري او انګلیسي په آریا هاب کې ومومئ.',
  };

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: titles[lang] || titles.en,
    description: descriptions[lang] || descriptions.en,
    alternates: {
      canonical: `/${lang}`,
      languages: {
        en: '/en',
        fa: '/fa',
        ps: '/ps',
      },
    },
    openGraph: {
      title: titles[lang] || titles.en,
      description: descriptions[lang] || descriptions.en,
      url: `https://www.myariahub.com/${lang}`,
      siteName: 'ARIA HUB',
      locale: lang,
      type: 'website',
      images: [
        {
          url: 'https://www.myariahub.com/og-image.png',
          width: 1200,
          height: 630,
          alt: titles[lang] || titles.en,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: titles[lang] || titles.en,
      description: descriptions[lang] || descriptions.en,
      images: ['https://www.myariahub.com/og-image.png'],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';

  const data = await getSiteData();

  // Cached homepage numbers: active opportunities, distinct organizations and
  // the live category facets — eliminates expensive distinct scans on every request.
  const [latest, facets, homeStats, closingSoon, spotlight, weeklyScholarship, featuredStory] = await Promise.all([
    listOpportunities({ lang, sort: 'newest', perPage: 8 }),
    getFacets(lang),
    getHomeStats(),
    getClosingSoon(lang, 4),
    getDailySpotlight(lang),
    getWeeklyScholarship(lang),
    getFeaturedStoryCard(lang),
  ]);

  const organizations = homeStats.organizations;

  return (
    <>
      <JsonLd />
      <Home
        data={data}
        lang={lang}
        home={{
          latest: latest.items,
          closingSoon,
          categories: facets.categories,
          spotlight: spotlight,
          weeklyScholarship: weeklyScholarship,
          featuredStory: featuredStory,
          stats: {
            activeOpportunities: facets.totalActive,
            organizations,
            categories: facets.categories.length,
          },
          liveCounters: [
            {
              id: 'live-opps',
              label: translate(lang, 'home.statOpportunities', { count: facets.totalActive }),
              value: facets.totalActive,
              suffix: '+',
              icon: 'Briefcase',
            },
            {
              id: 'live-orgs',
              label: translate(lang, 'home.statOrganizations', { count: homeStats.orgCount }),
              value: homeStats.orgCount,
              suffix: '+',
              icon: 'Building2',
            },
            {
              id: 'live-countries',
              label: translate(lang, 'home.statCountries', { count: homeStats.countries }),
              value: homeStats.countries,
              suffix: '',
              icon: 'MapPin',
            },
            {
              id: 'live-news',
              label: translate(lang, 'home.statNews', { count: homeStats.newsCount }),
              value: homeStats.newsCount,
              suffix: '+',
              icon: 'Newspaper',
            },
          ],
        }}
      />
    </>
  );
}
