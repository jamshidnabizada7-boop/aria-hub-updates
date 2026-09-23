import React from 'react';
import { PageShell } from '@/components/site/page-shell';
import { db as prisma } from '@/lib/db';
import { CommunityClient } from './community-client';
import { TranslatedText } from '@/components/ui/translated-text';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

import type { Metadata } from 'next';
import { isLang, type Lang } from '@/lib/lang-route';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const titles: Record<Lang, string> = {
    en: 'Visa Community Experiences & Success | ARIA HUB',
    fa: 'تجربیات واقعی متقاضیان ویزا | ARIA HUB',
    ps: 'د ویزې غوښتونکو ریښتینې تجربې | ARIA HUB',
  };
  const descriptions: Record<Lang, string> = {
    en: 'Read authentic embassy interview experiences and success tips shared by applicants who obtained student, work, and immigrant visas through ARIA HUB.',
    fa: 'مطالعه تجربیات موثق و دست‌اول متقاضیانی که موفق به دریافت ویزای تحصیلی، کاری و اقامتی شده‌اند. تجربیات مصاحبه و نکات طلایی قبولی در آریا هاب.',
    ps: 'د هغو غوښتونکو ریښتینې تجربې او د بریا لارښوونې ولولئ چې تحصیلي، کاري او کډوالۍ ویزې یې ترلاسه کړې دي. په آریا هاب کې د مرکو مهمې نکتې زده کړئ.',
  };

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: titles[lang] || titles.en,
    description: descriptions[lang] || descriptions.en,
    alternates: {
      canonical: `/${lang}/visa-prep/community`,
      languages: {
        en: '/en/visa-prep/community',
        fa: '/fa/visa-prep/community',
        ps: '/ps/visa-prep/community',
      },
    },
    openGraph: {
      title: titles[lang] || titles.en,
      description: descriptions[lang] || descriptions.en,
      locale: lang,
      type: 'website',
    },
  };
}

export default async function VisaCommunityPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  let stories: any[] = [];
  try {
    stories = await prisma.successStory.findMany({
      where: { status: 'published' },
      orderBy: { createdAt: 'desc' },
    });
  } catch {
    stories = [];
  }

  return (
    <PageShell lang={lang} className="pt-12 pb-16">
      <div className="bg-slate-50 dark:bg-slate-950 py-12">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        
          {/* Header */}
          <div className="mb-10 text-center max-w-3xl mx-auto">
            <Link href={`/${lang}/visa-prep`} className="inline-block mb-6">
              <Button variant="outline" size="sm" className="rounded-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Visa Prep
              </Button>
            </Link>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 text-primary rounded-full">
                <Users className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
              Success Stories
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Read real experiences from successful applicants. Learn from their journeys, the challenges they faced, and how they secured their visas.
            </p>
          </div>

          {/* Client Grid Component */}
          <CommunityClient initialStories={stories as unknown as Parameters<typeof CommunityClient>[0]['initialStories']} />
        
        </div>
      </div>
    </PageShell>
  );
}
