import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ariaSans, ariaRtl } from '@/components/site/redesign/aria-fonts';
import { isLang, type Lang } from '@/lib/lang-route';
import { getClosingSoon, getDailySpotlight, getFacets, listOpportunities } from '@/lib/opportunity-queries';
import { AriaHomePreview } from '@/components/site/redesign/aria-home-preview';
import '@/components/site/redesign/aria-v2.css';
import '@/components/site/redesign/aria-public.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'ARIA HUB 2026 — Private UI preview',
  robots: { index: false, follow: false },
};

/**
 * Opt-in comparison route for a staging environment only.
 * Never expose automatically: require an explicit environment flag.
 * Real opportunity query functions, no demo/seed records.
 * The current /[lang] homepage stays entirely unchanged.
 */
export default async function RedesignPreviewPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  if (process.env.ARIA_REDESIGN_PREVIEW_ENABLED !== 'true') notFound();

  const { lang: rawLang } = await params;
  if (!isLang(rawLang)) notFound();
  const lang: Lang = rawLang;

  const [list, deadlines, spotlight, facets] = await Promise.all([
    listOpportunities({ lang, sort: 'newest', perPage: 8 }),
    getClosingSoon(lang, 4),
    getDailySpotlight(lang),
    getFacets(lang),
  ]);

  return (
    <div className={ariaSans.variable + ' ' + ariaRtl.variable}>
      <AriaHomePreview
        lang={lang}
        activeCount={facets.totalActive}
        latest={list.items}
        closingSoon={deadlines}
        spotlight={spotlight}
        categories={facets.categories}
        preview
      />
    </div>
  );
}
