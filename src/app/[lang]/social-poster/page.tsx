import type { Metadata } from 'next';
import Link from 'next/link';
import QRCode from 'qrcode';
import { resolveAriPoster, type AriPosterPreset } from '@/lib/social/ari-poster';
import { db } from '@/lib/db';
import { isLang, type Lang } from '@/lib/lang-route';
import { OpportunityPoster, buildPosterData, type PosterSize } from '@/components/site/opportunity-poster';

/**
 * /[lang]/social-poster?slug=…&size=square|portrait
 *
 * Full-size, chrome-less poster canvas used for (a) screenshots by automation,
 * (b) the admin Social Kit's "open full-size" action. Noindex — it is a
 * rendering canvas, not a content page.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Social poster | ARIA HUB',
  robots: { index: false, follow: false },
};

export default async function SocialPosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ slug?: string; size?: string; ari?: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'en';
  const { slug = '', size: rawSize, ari } = await searchParams;
  const size: PosterSize = rawSize === 'story' ? 'story' : rawSize === 'portrait' ? 'portrait' : 'square';

  let posterData: ReturnType<typeof buildPosterData> | null = null;
  let qrDataUrl: string | null = null;
  if (slug) {
    const opp = await db.opportunity.findUnique({
      where: { slug },
      select: {
        slug: true,
        status: true,
        title: true,
        titleI18n: true,
        organization: true,
        country: true,
        deadline: true,
        featured: true,
        salary: true,
        salaryI18n: true,
        category: { select: { name: true, nameI18n: true } },
      },
    });
    if (opp && opp.status === 'published') {
      posterData = buildPosterData(opp, lang);
      try {
        qrDataUrl = await QRCode.toDataURL(
          `https://www.myariahub.com/${lang}/opportunities/${opp.slug}`,
          { margin: 0, width: 168, color: { dark: '#1B2440', light: '#FFFBF2' } },
        );
      } catch {
        qrDataUrl = null;
      }
    }
  }

  return (
    <main id="main-content"
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#050a14] p-6"
      aria-label="Social poster canvas"
    >
      {posterData ? (
        <>
          <div className="origin-center overflow-hidden rounded-sm shadow-2xl" style={{ maxWidth: '100%' }}>
            <OpportunityPoster data={posterData} lang={lang} size={size} ari={resolveAriPoster({ preset: ari as AriPosterPreset })} qrDataUrl={qrDataUrl} />
          </div>
          <Link
            href={`/${lang}/opportunities/${posterData.slug}`}
            className="text-xs text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
          >
            {posterData.slug}
          </Link>
        </>
      ) : (
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-lg font-semibold text-white">No poster to render</p>
          <p className="mt-2 text-sm text-white/60">
            Append <code className="rounded bg-white/10 px-1.5 py-0.5">?slug=opportunity-slug</code> to
            this URL, e.g.{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5">/{lang}/social-poster?slug=…</code>
          </p>
        </div>
      )}
    </main>
  );
}
