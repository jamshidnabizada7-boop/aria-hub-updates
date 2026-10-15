import React from 'react';
import type { Metadata } from 'next';
import { PageShell } from '@/components/site/page-shell';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { BookOpen, Copy, Download, Share2, Sparkles, CheckCircle, AlertTriangle, Lightbulb, Bookmark } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TranslatedText } from '@/components/ui/translated-text';
import { isLang, type Lang } from '@/lib/lang-route';
import { ensureSeoDescription } from '@/lib/seo-metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  let template: any = null;
  try {
    template = await db.documentTemplate.findUnique({
      where: { slug },
      select: { title: true, excerpt: true },
    });
  } catch {
    template = null;
  }
  if (!template) return { title: 'Template Document & Guide | ARIA HUB' };

  const rawTitle = `${template.title} — Template & Guide`;
  const l: Lang = isLang(lang) ? lang : 'fa';
  const description = ensureSeoDescription(
    template.excerpt,
    l,
    l === 'fa'
      ? 'دانلود قالب آماده مدارک بورسیه و راهنمای گام‌به‌گام نگارش در آریا هاب.'
      : l === 'ps'
      ? 'د بورسونو او استخدام لپاره چمتو فارمټونه او د لیکلو لارښود په آریا هاب کې.'
      : 'Download verified document templates and step-by-step writing guidelines on ARIA HUB.'
  );

  return {
    metadataBase: new URL('https://www.myariahub.com'),
    title: `${rawTitle} | ARIA HUB`,
    description,
    alternates: {
      canonical: `/${lang}/templates/${slug}`,
      languages: {
        en: `/en/templates/${slug}`,
        fa: `/fa/templates/${slug}`,
        ps: `/ps/templates/${slug}`,
      },
    },
    openGraph: {
      title: `${rawTitle} | ARIA HUB`,
      description,
      type: 'article',
    },
  };
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  let template: any = null;
  try {
    template = await db.documentTemplate.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    });
  } catch {
    template = null;
  }

  if (!template) {
    notFound();
  }

  // Safely parse JSON fields
  const safeParseArray = (val: any) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const requiredFields = safeParseArray(template.requiredFields);
  const commonMistakes = safeParseArray(template.commonMistakes);
  const writingTips = safeParseArray(template.writingTips);

  return (
    <PageShell lang={lang} className="pt-12 pb-16">
      <div className="bg-background py-12" dir={lang === 'en' ? 'ltr' : 'rtl'}>
        <div className="container mx-auto px-4 max-w-6xl">

          {/* Breadcrumb & Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link href={`/${lang}/templates`} className="hover:text-primary transition-colors"><TranslatedText tKey="templates.title" /></Link>
              <span>/</span>
              {template.category && (
                <>
                  <span>{template.category.name}</span>
                  <span>/</span>
                </>
              )}
              <span className="text-foreground font-medium">{template.title}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight mb-2">
                  {template.title}
                </h1>
                <p className="text-lg text-muted-foreground max-w-3xl">
                  {template.excerpt}
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/${lang}/templates/${template.slug}/editor`}
                  className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  <Sparkles className="w-5 h-5" /> <TranslatedText tKey="templates.aiAssistant" />
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Main Content: Template Preview */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50">
                  <h3 className="font-semibold text-foreground"><TranslatedText tKey="templates.preview" /></h3>
                  <div className="flex gap-2">
                    <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors" title="Copy Text">
                      <Copy className="w-4 h-4" />
                    </button>
                    {template.filePdfUrl && (
                      <a href={template.filePdfUrl} className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors" title="Download PDF" download>
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="p-8 prose dark:prose-invert max-w-none text-foreground min-h-[400px]" dir="auto">
                  <ReactMarkdown>{template.content || 'Template content not available.'}</ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Sidebar: Tips & Metadata */}
            <div className="space-y-6">

              {/* Required Fields */}
              {requiredFields.length > 0 && (
                <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
                  <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-primary" /> <TranslatedText tKey="templates.requiredInfo" />
                  </h3>
                  <ul className="space-y-3">
                    {requiredFields.map((field, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Writing Tips */}
              {writingTips.length > 0 && (
                <div className="bg-primary/5 rounded-2xl border border-primary/20 shadow-sm p-6">
                  <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
                    <Lightbulb className="w-5 h-5 text-primary" /> <TranslatedText tKey="templates.expertTips" />
                  </h3>
                  <ul className="space-y-3">
                    {writingTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Common Mistakes */}
              {commonMistakes.length > 0 && (
                <div className="bg-card rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm p-6">
                  <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-500" /> <TranslatedText tKey="templates.commonMistakes" />
                  </h3>
                  <ul className="space-y-3">
                    {commonMistakes.map((mistake, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Call to Action */}
              <div className="brand-panel rounded-2xl shadow-lg p-6 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary rounded-full blur-3xl opacity-30"></div>
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary" />
                <h3 className="text-xl font-bold mb-2"><TranslatedText tKey="templates.needCustom" /></h3>
                <p className="text-muted-foreground text-sm mb-6">
                  <TranslatedText tKey="templates.customDesc" />
                </p>
                <Link
                  href={`/${lang}/templates/${template.slug}/editor`}
                  className="block w-full bg-primary hover:bg-primary py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-blue-900/20"
                >
                  <TranslatedText tKey="templates.aiAssistant" />
                </Link>
              </div>

            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
