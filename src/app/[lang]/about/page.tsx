import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { ABOUT_DOC, pickTril } from '@/lib/static-page-content';
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
  const seo = getPageSeo('about', lang);

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: `/${lang}/about`,
      languages: {
        en: '/en/about',
        fa: '/fa/about',
        ps: '/ps/about',
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

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  let title = pickTril(ABOUT_DOC.title, lang);
  let dbHtml = '';

  try {
    const page = await db.page.findUnique({ where: { slug: 'about' } });
    if (page) {
      if (page.status !== 'published') {
        notFound();
      }
      title = getLocalizedContent(page.title, page.titleI18n as Record<string, string> | null, lang) || title;
      dbHtml = getLocalizedContent(page.content, page.contentI18n as Record<string, string> | null, lang);
    }
  } catch (e: any) {
    if (e?.digest?.includes('NEXT_NOT_FOUND')) throw e;
    // DB or table might not exist yet — built-in trilingual doc covers it.
  }

  return (
    <PageShell lang={lang}>
      <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 lg:px-8" dir="auto">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-8 shadow-sm backdrop-blur-sm md:p-12">
          <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground md:text-4xl text-start">
            {title}
          </h1>

          <div className="prose prose-sm dark:prose-invert sm:prose-base max-w-none space-y-6 text-muted-foreground text-start">
            {dbHtml ? (
              <div dangerouslySetInnerHTML={{ __html: dbHtml }} />
            ) : (
              ABOUT_DOC.sections.map((s, i) => (
                <section key={i}>
                  <h2 className="text-2xl font-semibold text-foreground">{pickTril(s.heading, lang)}</h2>
                  {s.paragraphs?.map((p, j) => (
                    <p key={j}>{pickTril(p, lang)}</p>
                  ))}
                  {s.bullets ? (
                    <ul className="list-disc ps-5 mt-2 space-y-2">
                      {s.bullets.map((b, j) => (
                        <li key={j}>{pickTril(b, lang)}</li>
                      ))}
                    </ul>
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
