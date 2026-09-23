import type { Metadata } from 'next';
import { getSiteData } from '@/lib/get-site';
import { translate } from '@/lib/i18n';
import { db } from '@/lib/db';
import { Home } from '@/components/site/home';
import { JsonLd } from '@/components/site/json-ld';
import { isLang, type Lang } from '@/lib/lang-route';
import { getClosingSoon, getDailySpotlight, getFacets, getWeeklyScholarship, listOpportunities } from '@/lib/opportunity-queries';
import { getFeaturedStoryCard } from '@/lib/success-story-queries';

export const revalidate = 60;

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
    en: 'Discover verified scholarships, international jobs, fellowships, and training opportunities in Afghanistan with trilingual updates in Dari, Pashto & English.',
    fa: 'کشف جدیدترین بورسیه‌های تحصیلی، فرصت‌های شغلی بین‌المللی و برنامه‌های آموزشی معتبر برای جوانان افغانستان به همراه ددلاین و راهنمای ثبت‌نام آنلاین.',
    ps: 'په افغانستان کې باوري تحصیلي بورسونه، نړیوالې دندې او روزنیز پروګرامونه په آریا هاب کې ومومئ. د غوښتنلیک لارښود او تازه معلومات په پښتو او دري ژبو.',
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
      locale: lang,
      type: 'website',
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

  // Real homepage numbers: active opportunities, distinct organizations and
  // the live category facets — replaces the old fake counters.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const activeWhere = {
    status: 'published' as const,
    OR: [{ deadline: null }, { deadline: { gte: today } }],
  };

  const [latest, facets, orgRows, closingSoon, spotlight, weeklyScholarship, featuredStory, newsCount, countryRows] = await Promise.all([
    listOpportunities({ lang, sort: 'newest', perPage: 8 }),
    getFacets(lang),
    db.opportunity.findMany({
      where: activeWhere,
      select: { organization: true },
      distinct: ['organization'],
    }),
    getClosingSoon(lang, 4),
    getDailySpotlight(lang),
    getWeeklyScholarship(lang),
    getFeaturedStoryCard(lang),
    db.news.count({ where: { status: 'published' } }),
    db.opportunity.findMany({
      where: activeWhere,
      select: { country: true },
      distinct: ['country'],
    }),
  ]);

  const organizations = orgRows.filter((o) => o.organization?.trim()).length;

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
              label: translate(lang, 'home.statOrganizations', { count: orgRows.length }),
              value: orgRows.length,
              suffix: '+',
              icon: 'Building2',
            },
            {
              id: 'live-countries',
              label: translate(lang, 'home.statCountries', { count: countryRows.filter((r) => r.country).length }),
              value: countryRows.filter((r) => r.country).length,
              suffix: '',
              icon: 'MapPin',
            },
            {
              id: 'live-news',
              label: translate(lang, 'home.statNews', { count: newsCount }),
              value: newsCount,
              suffix: '+',
              icon: 'Newspaper',
            },
          ],
        }}
      />
    </>
  );
}
