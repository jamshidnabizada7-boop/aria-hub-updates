import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isLang, type Lang } from '@/lib/lang-route';
import { getPublicOrganization } from '@/lib/organizations/public-profile';
import { BadgeCheck, ExternalLink, MapPin } from 'lucide-react';
import { OriginalContentBadge } from '@/components/site/original-content-badge';

/**
 * Public organization profile (Phase 15) — "/[lang]/organizations/[slug]".
 * Targets searches like "UNICEF jobs Afghanistan" / "NRC jobs Afghanistan".
 * Renders ONLY public-safe data (see public-profile.ts): identity,
 * description, verified badge, official website and active opportunities.
 * Internal import machinery (scraper keys, trust scores, logs) is never shown.
 */
export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ lang: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: rawLang, slug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'en';
  const org = await getPublicOrganization(slug, lang);
  if (!org) return {};
  // Title/description are templated per locale; the org name itself stays as
  // recorded (orgs are usually known by their Latin name in Afghan listings).
  const titleByLang: Record<Lang, string> = {
    en: `${org.name} Jobs in Afghanistan | ARIA HUB`,
    fa: `${org.name} — وظایف و فرصت‌های شغلی در افغانستان | آریا هاب`,
    ps: `${org.name} — د افغانستان کاري فرصتونه | آریا هاب`,
  };
  const descByLang: Record<Lang, string> = {
    en: org.description
      ? `${org.name} — active jobs, scholarships and opportunities, verified and translated on ARIA HUB. ${org.description.slice(0, 140)}`
      : `Active jobs and opportunities from ${org.name} on ARIA HUB — verified, summarized and translated into Persian and Pashto.`,
    fa: org.description
      ? `${org.name} — وظایف، بورسیه‌ها و فرصت‌های فعال، بررسی و ترجمه‌شده در آریا هاب. ${org.description.slice(0, 140)}`
      : `وظایف و فرصت‌های فعال از ${org.name} در آریا هاب — بررسی‌شده و به فارسی دری و پشتو ترجمه شده.`,
    ps: org.description
      ? `${org.name} — دندنې، بورسونه او فعال فرصتونه، په آریا هاب کې بیاکتنه او ژباړه شوې. ${org.description.slice(0, 140)}`
      : `له ${org.name} څخه په آریا هاب کې فعال دندنې او فرصتونه — بیاکتنه شوې او پښتو ژباړه لري.`,
  };
  const title = titleByLang[lang];
  const description = descByLang[lang];
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/organizations/${slug}`,
      languages: {
        en: `/en/organizations/${slug}`,
        fa: `/fa/organizations/${slug}`,
        ps: `/ps/organizations/${slug}`,
      },
    },
    openGraph: { title, description, type: 'website' },
  };
}

export default async function OrganizationPage({ params }: Props) {
  const { lang: rawLang, slug } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'en';
  const org = await getPublicOrganization(slug, lang);

  // A missing/inactive org must return a real HTTP 404 — rendering the shell
  // with 200 creates a soft-404 that search engines index.
  if (!org) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name,
    ...(org.logoUrl ? { logo: org.logoUrl } : {}),
    ...(org.website ? { sameAs: org.website } : {}),
    description: org.description ?? undefined,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="flex flex-wrap items-center gap-3">
        {org.logoUrl
          ? (
            <img src={org.logoUrl} alt={`${org.name} logo`} className="h-14 w-14 rounded-lg object-contain" />
          )
          : (
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
              {org.name.charAt(0)}
            </div>
          )}
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
            {org.name}
            {org.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified organization
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {org.organizationType?.replace(/_/g, ' ') ?? 'Organization'}
            {org.country ? ` · ${org.country}` : ''}
            {` · ${org.opportunities.length} active ${org.opportunities.length === 1 ? 'opportunity' : 'opportunities'}`}
          </p>
        </div>
        {org.website && (
          <a href={org.website} target="_blank" rel="noreferrer noopener nofollow"
            className="ms-auto inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs">
            <ExternalLink className="h-3.5 w-3.5" /> Official website
          </a>
        )}
      </div>

      {org.description && (
        <p className="mt-5 whitespace-pre-line rounded-lg border bg-card p-4 text-sm leading-relaxed">
          {org.description}
          {org.descriptionIsOriginal && (
            <span className="mt-3 flex">
              <OriginalContentBadge lang={lang} />
            </span>
          )}
        </p>
      )}

      <h2 className="mt-8 text-lg font-bold">Active opportunities</h2>
      <div className="mt-3 space-y-2">
        {org.opportunities.map((job) => (
          <Link key={job.slug} href={`/${lang}/opportunities/${job.slug}`}
            className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/40">
            <span className="font-medium">{job.title}</span>
            {job.jobType && <span className="text-xs text-muted-foreground">{job.jobType}</span>}
            <span className="ms-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
              {job.location && <><MapPin className="h-3 w-3" /> {job.location} · </>}
              {job.deadline ? `deadline ${job.deadline.toISOString().slice(0, 10)}` : 'rolling deadline'}
            </span>
          </Link>
        ))}
        {org.opportunities.length === 0 && (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No active opportunities right now.
          </p>
        )}
      </div>
    </div>
  );
}
