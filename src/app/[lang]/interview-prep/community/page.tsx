import { PageBackLink } from '@/components/site/page-navigation';
import { TranslatedText } from '@/components/ui/translated-text';
import { PageShell } from '@/components/site/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { db as prisma } from '@/lib/db';
import { MessageSquare, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
    en: 'Scholarship Interview Experiences & Community | ARIA HUB',
    fa: 'تجربه‌های مصاحبه بورسیه و تجارب دانشجویان | ARIA HUB',
    ps: 'د بورسونو مرکو ریښتینې تجربې او ټولنه | ARIA HUB',
  };

  const descriptions: Record<Lang, string> = {
    en: 'Read and share real scholarship interview questions, tips, and personal experiences from Afghan students accepted to top global universities on ARIA HUB.',
    fa: 'تجارب واقعی مصاحبه‌های بورسیه، سوالات مطرح‌شده و نکات طلایی قبولی محصلان افغان در دانشگاه‌های معتبر بین‌المللی را در آریا هاب بخوانید و به اشتراک بگذارید.',
    ps: 'د نړیوالو تحصیلي بورسونو د مرکو ریښتینې تجربې، پوښتنې او د افغان محصلینو ګټورې سپارښتنې په آریا هاب کې ولولئ او خپله تجربه له نورو سره شریکه کړئ.',
  };

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: titles[lang] || titles.en,
    description: descriptions[lang] || descriptions.en,
    alternates: {
      canonical: `/${lang}/interview-prep/community`,
      languages: {
        en: '/en/interview-prep/community',
        fa: '/fa/interview-prep/community',
        ps: '/ps/interview-prep/community',
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

export default async function InterviewCommunityPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  
  let experiences: any[] = [];
  try {
    experiences = await prisma.interviewExperience.findMany({
      where: { status: 'published' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  } catch {
    experiences = [];
  }

  return (
    <PageShell lang={lang} className="pt-12 pb-16">
      <div className="bg-slate-50 py-12 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <PageBackLink lang={lang} to="interview" className="mb-6" />
              <h1 className="text-3xl font-bold tracking-tight">Community Experiences</h1>
              <p className="mt-2 text-muted-foreground">Learn from the real interview experiences of other students.</p>
            </div>
            <Button>
              <MessageSquare className="mr-2 h-4 w-4" /> Share Experience
            </Button>
          </div>

          {experiences.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card p-12 text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">No experiences shared yet</h3>
              <p className="mt-2 text-muted-foreground">Be the first to share your scholarship interview experience!</p>
              <Button className="mt-6">Share Now</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {experiences.map((exp) => {
                const content = typeof exp.contentI18n === 'object' && exp.contentI18n !== null && (exp.contentI18n as any)[lang] ? (exp.contentI18n as any)[lang] : exp.content;
                const studentName = typeof exp.studentNameI18n === 'object' && exp.studentNameI18n !== null && (exp.studentNameI18n as any)[lang] ? (exp.studentNameI18n as any)[lang] : (exp.studentName || 'Anonymous');
              
                return (
                  <Card key={exp.id} className="flex flex-col justify-between">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{exp.scholarshipName || 'General Scholarship'}</CardTitle>
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < exp.rating ? 'fill-current' : 'text-muted-foreground/30'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {exp.university && <span>{exp.university} • </span>}
                        <span>{exp.country || 'Global'}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="line-clamp-4 text-sm leading-relaxed">{content}</p>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between border-t bg-muted/20 px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {studentName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{studentName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(exp.createdAt), { addSuffix: true })}
                      </span>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
