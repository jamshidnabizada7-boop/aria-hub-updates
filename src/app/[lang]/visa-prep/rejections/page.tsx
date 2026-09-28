import React from 'react';
import { PageShell } from '@/components/site/page-shell';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RejectionsClient } from './rejections-client';
import { db as prisma } from '@/lib/db';
import { translate } from '@/lib/i18n';
import type { Metadata } from 'next';

import { ensureSeoDescription } from '@/lib/seo-metadata';
import { isLang, type Lang } from '@/lib/lang-route';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const t = (key: string) => translate(lang, key);

  const titles: Record<Lang, string> = {
    en: 'Visa Rejection Reasons & Mitigation Guide | ARIA HUB',
    fa: 'دلایل رایج رد شدن ویزا و راهکارهای قبولی | ARIA HUB',
    ps: 'د ویزې د رد کېدو لاملونه او د حل لارښود | ARIA HUB',
  };

  const description = ensureSeoDescription(t('visaRej.subtitle'), lang);

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: titles[lang] || titles.en,
    description,
    alternates: {
      canonical: `/${lang}/visa-prep/rejections`,
      languages: {
        en: '/en/visa-prep/rejections',
        fa: '/fa/visa-prep/rejections',
        ps: '/ps/visa-prep/rejections',
      },
    },
    openGraph: {
      title: titles[lang] || titles.en,
      description,
      locale: lang,
      type: 'website',
    },
  };
}

export default async function VisaRejectionsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = (key: string, p?: Record<string, string | number>) =>
    translate(lang, key, p);

  let rejections: Awaited<ReturnType<typeof getRejections>> = [];
  try {
    rejections = await getRejections();
  } catch (e) {
    console.error('visa-rejections fetch failed:', e);
  }

  return (
    <PageShell lang={lang} className="pt-12 pb-16">
      <div className="bg-slate-50 dark:bg-slate-950 py-12">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6">

          {/* Header */}
          <div className="mb-10 text-center max-w-3xl mx-auto">
            <Link href={`/${lang}/visa-prep`} className="inline-block mb-6">
              <Button variant="outline" size="sm" className="rounded-full">
                <ArrowLeft className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2 rtl-flip" />
                {t('visaRej.back')}
              </Button>
            </Link>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500 rounded-full">
                <AlertTriangle className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
              {t('visaRej.title')}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              {t('visaRej.subtitle')}
            </p>
          </div>

          {/* Interactive Client Component — DB-driven */}
          <RejectionsClient lang={lang} rejections={rejections} />

        </div>
      </div>
    </PageShell>
  );
}

async function getRejections() {
  try {
    const rows = await prisma.visaRejection.findMany({
      where: { status: 'published' },
      orderBy: { order: 'asc' },
    });
    return rows.map((r) => ({
      id: r.code,
      code: r.section,
      titleI18n: r.titleI18n,
      title: r.title,
      descriptionI18n: r.descriptionI18n,
      description: r.description,
      mitigationI18n: r.mitigationI18n,
      mitigation: r.mitigation,
      icon: r.icon,
    }));
  } catch {
    return [];
  }
}
