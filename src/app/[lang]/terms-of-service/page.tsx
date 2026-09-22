import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { TERMS_DOC, lastUpdatedLine, pickTril } from '@/lib/static-page-content';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Terms of Service | ARIA HUB',
  description: 'Terms of Service for ARIA HUB.',
};

export default async function TermsOfServicePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  let title = pickTril(TERMS_DOC.title, lang);
  let dbHtml = '';
  let dateText = lastUpdatedLine(lang, new Date());

  try {
    const page = await db.page.findUnique({ where: { slug: 'terms-of-service' } });
    if (page) {
      if (page.status !== 'published') {
        notFound();
      }
      title = getLocalizedContent(page.title, page.titleI18n as Record<string, string> | null, lang) || title;
      dbHtml = getLocalizedContent(page.content, page.contentI18n as Record<string, string> | null, lang);
      dateText = lastUpdatedLine(lang, new Date(page.updatedAt));
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
            <p>{dateText}</p>

            {dbHtml ? (
              <div dangerouslySetInnerHTML={{ __html: dbHtml }} />
            ) : (
              TERMS_DOC.sections.map((s, i) => (
                <section key={i}>
                  <h2 className="text-xl font-semibold text-foreground">{pickTril(s.heading, lang)}</h2>
                  {s.paragraphs?.map((p, j) => (
                    <p key={j}>{pickTril(p, lang)}</p>
                  ))}
                  {s.bullets ? (
                    <ul className="list-disc ps-5 mt-2">
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
