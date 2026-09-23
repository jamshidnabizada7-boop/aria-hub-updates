import { notFound } from 'next/navigation';
import { PageShell } from '@/components/site/page-shell';
import { db as prisma } from '@/lib/db';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Globe, Info, Play, FileQuestion, Users, Briefcase, GraduationCap, Tent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Helper to map category to icon
const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('student')) return <GraduationCap className="h-5 w-5" />;
  if (n.includes('work')) return <Briefcase className="h-5 w-5" />;
  if (n.includes('tourist')) return <Tent className="h-5 w-5" />;
  if (n.includes('family')) return <Users className="h-5 w-5" />;
  return <FileText className="h-5 w-5" />;
};

import type { Metadata } from 'next';
import { ensureSeoDescription } from '@/lib/seo-metadata';
import { isLang, type Lang } from '@/lib/lang-route';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; country: string }>;
}): Promise<Metadata> {
  const { lang: rawLang, country: countryCode } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const country = await prisma.visaCountry.findUnique({
    where: { code: countryCode.toUpperCase() },
  });

  if (!country || country.status !== 'published') {
    return {
      metadataBase: new URL('https://www.myariahub.com'),
      title: 'Visa Preparation Guide | ARIA HUB',
      description: 'Prepare for embassy visa interviews with questions, document checklists, and requirements on ARIA HUB.',
    };
  }

  const name =
    typeof country.nameI18n === 'object' && country.nameI18n !== null && (country.nameI18n as any)[lang]
      ? (country.nameI18n as any)[lang]
      : country.name;

  const title =
    lang === 'fa'
      ? `آمادگی مصاحبه و مدارک ویزای ${name} | ARIA HUB`
      : lang === 'ps'
      ? `د ${name} د ویزې مرکو او اسنادو چمتووالی | ARIA HUB`
      : `${name} Visa Interview Preparation & Documents | ARIA HUB`;

  const rawDesc =
    lang === 'fa'
      ? `راهنمای کامل اخذ ویزای ${name}: سوالات مصاحبه سفارت، چک‌لیست مدارک مورد نیاز و زمان‌بندی برای متقاضیان افغان.`
      : lang === 'ps'
      ? `د ${name} د ویزې ترلاسه کولو بشپړ لارښود: د سفارت د مرکې پوښتنې، د اړینو اسنادو لست او مهالوېش په آریا هاب کې.`
      : `Comprehensive ${name} visa guide: embassy interview questions, document checklist, costs, and processing times on ARIA HUB.`;

  const description = ensureSeoDescription(rawDesc, lang);

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title,
    description,
    alternates: {
      canonical: `/${lang}/visa-prep/${countryCode.toLowerCase()}`,
      languages: {
        en: `/en/visa-prep/${countryCode.toLowerCase()}`,
        fa: `/fa/visa-prep/${countryCode.toLowerCase()}`,
        ps: `/ps/visa-prep/${countryCode.toLowerCase()}`,
      },
    },
    openGraph: {
      title,
      description,
      locale: lang,
      type: 'website',
    },
  };
}

export default async function VisaCountryPage({ params }: { params: Promise<{ lang: string; country: string }> }) {
  const { lang, country: countryCode } = await params;
  
  const country = await prisma.visaCountry.findUnique({
    where: { code: countryCode.toUpperCase() },
    include: {
      documents: {
        orderBy: { order: 'asc' }
      },
      questions: {
        where: { status: 'published' },
        take: 5 // preview
      }
    }
  });

  const categories = await prisma.visaCategory.findMany({
    orderBy: { order: 'asc' }
  });

  if (!country || country.status !== 'published') {
    notFound();
  }

  const name = typeof country.nameI18n === 'object' && country.nameI18n !== null && (country.nameI18n as any)[lang] ? (country.nameI18n as any)[lang] : country.name;

  return (
    <PageShell lang={lang}>
      <div className="bg-slate-50 dark:bg-slate-950 pb-20">
        {/* Header */}
        <div className="bg-primary px-4 py-12 text-primary-foreground">
          <div className="mx-auto max-w-5xl">
            <Link href={`/${lang}/visa-prep`} className="inline-flex items-center text-sm font-medium hover:underline mb-6 text-primary-foreground/80">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Countries
            </Link>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-4 border border-primary-foreground/20">
                  <Globe className="mr-2 h-3 w-3" /> {country.code}
                </div>
                <h1 className="text-4xl font-extrabold sm:text-5xl">{name} Visa Prep</h1>
                <p className="mt-4 max-w-2xl text-lg text-primary-foreground/80">
                  Everything you need to know about {name} visa interviews, processing times, and required documents.
                </p>
              </div>
              <div className="flex flex-col gap-3 min-w-[250px] bg-primary-foreground/5 p-4 rounded-xl border border-primary-foreground/10">
                <div className="flex justify-between items-center text-sm border-b border-primary-foreground/10 pb-2">
                  <span className="text-primary-foreground/70">Processing Time</span>
                  <span className="font-bold">{country.processingTime || 'Varies'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-primary-foreground/70">Cost Estimate</span>
                  <span className="font-bold">{country.costEstimate || 'Varies'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 mt-8">
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b rounded-none h-auto p-0 space-x-6">
              <TabsTrigger value="overview" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-0 pb-3">Overview</TabsTrigger>
              <TabsTrigger value="documents" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-0 pb-3">Required Documents</TabsTrigger>
              <TabsTrigger value="interview" className="data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none px-0 pb-3">Interview Prep</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map(category => {
                  const catName = typeof category.nameI18n === 'object' && category.nameI18n !== null && (category.nameI18n as any)[lang] ? (category.nameI18n as any)[lang] : category.name;
                  return (
                    <Card key={category.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-lg text-primary">
                            {getCategoryIcon(category.name)}
                          </div>
                          <CardTitle className="text-xl">{catName}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <p className="text-muted-foreground text-sm mb-4">
                          {category.description || `Preparation material for ${catName}.`}
                        </p>
                        <Button asChild className="w-full">
                          <Link href={`/${lang}/visa-prep/practice?country=${country.id}&category=${category.id}`}>
                            Practice {catName} Interview
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {country.guideContent && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-primary" /> General Guidelines
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: country.guideContent }} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Visa Document Checklist</CardTitle>
                  <CardDescription>Common documents required for {name} visa applications.</CardDescription>
                </CardHeader>
                <CardContent>
                  {country.documents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No document checklists available yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {country.documents.map(doc => {
                        const docName = typeof doc.nameI18n === 'object' && doc.nameI18n !== null && (doc.nameI18n as any)[lang] ? (doc.nameI18n as any)[lang] : doc.name;
                        return (
                          <div key={doc.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                            <div>
                              <h4 className="font-bold">{docName} {doc.isRequired && <Badge variant="destructive" className="ml-2">Required</Badge>}</h4>
                              {doc.description && <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interview" className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle>AI Mock Interview</CardTitle>
                    <CardDescription>Simulate a real visa interview for {name}.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-6">Our AI analyzes your speech for confidence, fluency, and content, giving you a final pass probability score.</p>
                    <Button asChild size="lg" className="w-full gap-2">
                      <Link href={`/${lang}/visa-prep/practice?country=${country.id}`}>
                        <Play className="h-4 w-4" /> Start AI Interview
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              
                <Card className="flex-1">
                  <CardHeader>
                    <CardTitle>Sample Questions</CardTitle>
                    <CardDescription>Commonly asked questions.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {country.questions.map((q, i) => (
                        <li key={q.id} className="flex items-start gap-2 text-sm">
                          <span className="font-medium text-primary">{i+1}.</span>
                          <span>{q.question}</span>
                        </li>
                      ))}
                      {country.questions.length === 0 && (
                        <li className="text-muted-foreground">No sample questions available.</li>
                      )}
                    </ul>
                    {country.questions.length > 0 && (
                      <Button variant="link" className="mt-4 p-0">View all questions <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageShell>
  );
}
