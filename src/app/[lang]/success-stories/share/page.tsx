import type { Metadata } from 'next';
import { PageShell } from '@/components/site/page-shell';
import { StorySubmitForm } from '@/components/site/story-submit-form';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n-config';
import { isLang } from '@/lib/lang-route';

const LANGS = ['en', 'fa', 'ps'];

import { ensureSeoDescription } from '@/lib/seo-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : 'fa';
  const t = (key: string) => translate(l, key);
  const rawTitle = t('stories.shareTitle');
  const title = rawTitle.length < 24
    ? `${rawTitle} — Inspire Others | ARIA HUB`
    : `${rawTitle} | ARIA HUB`;

  const description = ensureSeoDescription(
    t('stories.shareSubtitle'),
    l,
    l === 'fa'
      ? 'داستان موفقیت، پذیرش بورسیه و استخدام کاری خود را با جامعه آریا هاب به اشتراک بگذارید.'
      : l === 'ps'
      ? 'د خپلې بریا کیسه، ترلاسه شوی بورس او دنده د آریا هاب د ټولنې سره شریکه کړئ.'
      : 'Submit your scholarship, job, or visa success story to inspire Afghan students on ARIA HUB.'
  );

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title,
    description,
    alternates: {
      canonical: `/${l}/success-stories/share`,
      languages: Object.fromEntries(LANGS.map((x) => [x, `/${x}/success-stories/share`])),
    },
    openGraph: {
      title,
      description,
      locale: l,
      type: 'website',
    },
  };
}

export default async function ShareStoryPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const typedLang: Lang = isLang(lang) ? lang : 'fa';
  const t = (key: string) => translate(typedLang, key);

  return (
    <PageShell lang={lang} className="pt-20 pb-16">
      <div className="mx-auto max-w-3xl px-4 pt-8 pb-16 sm:px-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {t('stories.shareTitle')}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
            {t('stories.shareSubtitle')}
          </p>
        </header>
        <StorySubmitForm lang={typedLang} />
      </div>
    </PageShell>
  );
}
