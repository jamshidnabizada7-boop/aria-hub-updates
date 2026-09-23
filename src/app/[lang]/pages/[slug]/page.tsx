import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { PageShell } from '@/components/site/page-shell';
import type { Lang } from '@/lib/lang-route';

import { ensureSeoDescription } from '@/lib/seo-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { slug, lang } = await params;
  const page = await db.page.findUnique({ where: { slug } }).catch(() => null);
  if (!page || page.status !== 'published') {
    return { title: 'Page Not Found | ARIA HUB' };
  }
  const title = getLocalizedContent(page.title, page.titleI18n as Record<string, string> | null, lang as Lang) || page.title;
  const pageTitle = title.length < 24
    ? `${title} — Official Information | ARIA HUB`
    : `${title} | ARIA HUB`;

  const description = ensureSeoDescription(
    page.seoDescription || page.title,
    lang as Lang,
    lang === 'fa'
      ? 'اطلاعات کامل، راهنما و شرایط این بخش در سامانه آریا هاب.'
      : lang === 'ps'
      ? 'بشپړ معلومات، لارښود او شرایط په آریا هاب کې ولولئ.'
      : 'Find official guidelines, updates, and comprehensive information on ARIA HUB.'
  );

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: pageTitle,
    description,
    alternates: {
      canonical: `/${lang}/pages/${slug}`,
      languages: {
        en: `/en/pages/${slug}`,
        fa: `/fa/pages/${slug}`,
        ps: `/ps/pages/${slug}`,
      },
    },
    openGraph: {
      title: pageTitle,
      description,
      locale: lang,
      type: 'website',
    },
  };
}

export default async function DynamicCmsPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;

  const page = await db.page.findUnique({ where: { slug } }).catch(() => null);
  if (!page || page.status !== 'published') {
    notFound();
  }

  const title = getLocalizedContent(page.title, page.titleI18n as Record<string, string> | null, lang as Lang) || page.title;
  const html = getLocalizedContent(page.content, page.contentI18n as Record<string, string> | null, lang as Lang) || page.content;

  return (
    <PageShell lang={lang}>
      <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 lg:px-8" dir="auto">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-8 shadow-sm backdrop-blur-sm md:p-12">
          <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground md:text-4xl text-start">
            {title}
          </h1>

          <div
            className="prose prose-sm dark:prose-invert sm:prose-base max-w-none space-y-6 text-muted-foreground text-start"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </PageShell>
  );
}
