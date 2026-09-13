import { getSiteData } from '@/lib/get-site';
import { db } from '@/lib/db';
import { Home } from '@/components/site/home';
import { JsonLd } from '@/components/site/json-ld';
import { isLang, type Lang } from '@/lib/lang-route';
import { getClosingSoon, getDailySpotlight, getFacets, getWeeklyScholarship, listOpportunities } from '@/lib/opportunity-queries';
import { getFeaturedStoryCard } from '@/lib/success-story-queries';

export const revalidate = 60;

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
    status: 'published',
    OR: [{ deadline: null }, { deadline: { gte: today } }],
  };

  const [latest, facets, orgRows, closingSoon, spotlight, weeklyScholarship, featuredStory] = await Promise.all([
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
        }}
      />
    </>
  );
}
