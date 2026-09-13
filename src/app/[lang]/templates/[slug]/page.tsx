import React from 'react';
import { PageShell } from '@/components/site/page-shell';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { BookOpen, Copy, Download, Share2, Sparkles, CheckCircle, AlertTriangle, Lightbulb, Bookmark } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { TranslatedText } from '@/components/ui/translated-text';

const prisma = new PrismaClient();

export default async function TemplateDetailPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const template = await prisma.documentTemplate.findUnique({
    where: { slug },
    include: {
      category: true,
    }
  });

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
      <div className="bg-slate-50 dark:bg-slate-950 py-12" dir="ltr">
        <div className="container mx-auto px-4 max-w-6xl">
        
          {/* Breadcrumb & Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
              <Link href={`/${lang}/templates`} className="hover:text-blue-600 transition-colors"><TranslatedText tKey="templates.title" /></Link>
              <span>/</span>
              {template.category && (
                <>
                  <span>{template.category.name}</span>
                  <span>/</span>
                </>
              )}
              <span className="text-slate-900 dark:text-slate-200 font-medium">{template.title}</span>
            </div>
          
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
                  {template.title}
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl">
                  {template.excerpt}
                </p>
              </div>
              <div className="flex gap-3">
                <Link 
                  href={`/${lang}/templates/${template.slug}/editor`}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  <Sparkles className="w-5 h-5" /> <TranslatedText tKey="templates.aiAssistant" />
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
            {/* Main Content: Template Preview */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200"><TranslatedText tKey="templates.preview" /></h3>
                  <div className="flex gap-2">
                    <button className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Copy Text">
                      <Copy className="w-4 h-4" />
                    </button>
                    {template.filePdfUrl && (
                      <a href={template.filePdfUrl} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Download PDF" download>
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="p-8 prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 min-h-[400px]" dir="auto">
                  <ReactMarkdown>{template.content || 'Template content not available.'}</ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Sidebar: Tips & Metadata */}
            <div className="space-y-6">
            
              {/* Required Fields */}
              {requiredFields.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5 text-blue-600" /> <TranslatedText tKey="templates.requiredInfo" />
                  </h3>
                  <ul className="space-y-3">
                    {requiredFields.map((field, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Writing Tips */}
              {writingTips.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm p-6">
                  <h3 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-4">
                    <Lightbulb className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> <TranslatedText tKey="templates.expertTips" />
                  </h3>
                  <ul className="space-y-3">
                    {writingTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-indigo-800 dark:text-indigo-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Common Mistakes */}
              {commonMistakes.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm p-6">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-500" /> <TranslatedText tKey="templates.commonMistakes" />
                  </h3>
                  <ul className="space-y-3">
                    {commonMistakes.map((mistake, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            
              {/* AI Call to Action */}
              <div className="bg-slate-900 dark:bg-slate-800 rounded-2xl shadow-lg p-6 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500 rounded-full blur-3xl opacity-30"></div>
                <Sparkles className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                <h3 className="text-xl font-bold mb-2"><TranslatedText tKey="templates.needCustom" /></h3>
                <p className="text-slate-300 text-sm mb-6">
                  <TranslatedText tKey="templates.customDesc" />
                </p>
                <Link 
                  href={`/${lang}/templates/${template.slug}/editor`}
                  className="block w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-blue-900/20"
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
