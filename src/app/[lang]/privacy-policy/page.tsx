import { Metadata } from 'next';
import { db } from '@/lib/db';
import { getLocalizedContent } from '@/lib/i18n-content';
import { PRIVACY_DOC, PRIVACY_ADSENSE_TAIL, lastUpdatedLine, pickTril } from '@/lib/static-page-content';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Privacy Policy | ARIA HUB',
  description: 'Privacy Policy for ARIA HUB services.',
};

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  let title = pickTril(PRIVACY_DOC.title, lang);
  let dbHtml = '';
  let dateText = lastUpdatedLine(lang, new Date());

  try {
    const page = await db.page.findUnique({ where: { slug: 'privacy-policy' } });
    if (page && page.status === 'published') {
      title = getLocalizedContent(page.title, page.titleI18n as Record<string, string> | null, lang) || title;
      dbHtml = getLocalizedContent(page.content, page.contentI18n as Record<string, string> | null, lang);
      dateText = lastUpdatedLine(lang, new Date(page.updatedAt));
    }
  } catch {
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
              PRIVACY_DOC.sections.map((s, i) => (
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
                      {s.bulletLinks?.map((l, j) => (
                        <li key={`l${j}`}>
                          {pickTril(l.label, lang).replace(/\.$/, '')}{' '}
                          (<a href={l.href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            {lang === 'fa' ? 'تنظیمات تبلیغات' : lang === 'ps' ? 'د اعلانونو تنظیمات' : 'Ads Settings'}
                          </a>).
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {s.heading.en === '3. Google AdSense & Cookies' ? (
                    <p className="mt-2">
                      {pickTril(PRIVACY_ADSENSE_TAIL.text, lang)}{' '}
                      <a href={PRIVACY_ADSENSE_TAIL.linkHref} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {pickTril(PRIVACY_ADSENSE_TAIL.linkLabel, lang)}
                      </a>.
                    </p>
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
