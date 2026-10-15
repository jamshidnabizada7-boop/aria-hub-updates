"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Save, Download, ArrowLeft, Languages, CheckCheck, RefreshCw, Briefcase, FileText, FileDown, Printer } from 'lucide-react';
import { marked } from 'marked';
import { useT } from '@/hooks/use-t';

export default function TemplateEditorPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const router = useRouter();
  const { lang, slug } = React.use(params);
  const [template, setTemplate] = useState<any>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const t = useT();

  useEffect(() => {
    async function fetchTemplate() {
      try {
        const res = await fetch(`/api/templates/${slug}`);
        if (!res.ok) {
          router.push(`/${lang}/templates`);
          return;
        }

        const data = await res.json();
        const savedDraft = localStorage.getItem(`draft_${slug}`);
        if (savedDraft) {
          if (data.success && data.data) {
            setTemplate(data.data);
          }
          setContent(savedDraft);
        } else if (data.success && data.data) {
          setTemplate(data.data);
          setContent(data.data.content || '');
        }

        const siteRes = await fetch('/api/site');
        if (siteRes.ok) {
          const siteData = await siteRes.json();
          if (siteData.settings) {
            setSiteSettings(siteData.settings);
          }
        }
      } catch (error) {
        console.error('Failed to fetch:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplate();
  }, [slug, lang, router]);

  const handleAiAction = async (action: string, contextPrompt?: string) => {
    setAiLoading(true);
    setAiAction(action);
    try {
      const res = await fetch('/api/ai/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          content,
          context: contextPrompt || '',
          language: 'en'
        })
      });
      const json = await res.json();
      if (json.success && json.text) {
        setContent(json.text);
      } else {
        alert('AI processing failed. Please try again.');
      }
    } catch (error) {
      console.error('AI action failed:', error);
      alert('An error occurred. Check the console.');
    } finally {
      setAiLoading(false);
      setAiAction('');
    }
  };

  const handlePersonalize = () => {
    const context = prompt('Enter details about yourself (e.g. "I am applying for a Master\'s in Computer Science at MIT. I have 2 years of work experience at Google."):');
    if (context) {
      handleAiAction('personalize', context);
    }
  };


/**
 * Sanitize rendered markdown before it goes into an export window/blob.
 * Template content is admin-authored, but scripts/handlers/javascript: URLs
 * must never reach the export document regardless of who wrote it.
 */
function sanitizeExportHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

  const handleExportWord = async () => {
    setExportMenuOpen(false);
    const htmlContent = sanitizeExportHtml(await marked.parse(content));

    const brandingFooter = `
      <br><br><br>
      <hr style="border: 0; border-bottom: 1px solid #ccc; margin-bottom: 20px;" />
      <table width="100%" style="font-family: Arial, sans-serif; color: #666; font-size: 12px;">
        <tr>
          <td width="60" valign="middle">
            <img src="https://www.myariahub.com/images/logo-mark.webp" width="50" height="50" alt="ARIA HUB Logo" />
          </td>
          <td valign="middle">
            <strong>${siteSettings?.siteName || 'ARIA HUB'} - ${siteSettings?.tagline || 'Business & Visa Services'}</strong><br/>
            ${siteSettings?.description || 'Your gateway to international success.'}<br/>
            Website: www.myariahub.com | Address: ${siteSettings?.address || 'Sediqyar Square, Opposite of Balkh Medical Faculty, Mazar-e-Sharif, Afghanistan'}
          </td>
        </tr>
      </table>
    `;

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + htmlContent + brandingFooter + footer;

    // Create Blob to ensure it downloads as a true file and isn't opened as txt
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = url;
    fileDownload.download = `${slug}-document.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    setExportMenuOpen(false);
    const htmlContent = sanitizeExportHtml(await marked.parse(content));
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${template?.title || 'Document'}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
              h1, h2, h3 { color: #111; }
              ul { padding-left: 20px; }
            </style>
          </head>
          <body>
            ${htmlContent}

            <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; display: flex; align-items: center; gap: 15px; font-size: 12px; color: #666; page-break-inside: avoid;">
              <img src="https://www.myariahub.com/images/logo-mark.webp" width="40" height="40" alt="${siteSettings?.siteName || 'ARIA HUB'}" style="border-radius: 8px;" />
              <div>
                <strong style="color: #333; font-size: 14px;">${siteSettings?.siteName || 'ARIA HUB'} - ${siteSettings?.tagline || 'Business & Visa Services'}</strong><br/>
                ${siteSettings?.description || 'Your gateway to international success.'}<br/>
                Website: www.myariahub.com | Address: ${siteSettings?.address || 'Sediqyar Square, Opposite of Balkh Medical Faculty, Mazar-e-Sharif, Afghanistan'}
              </div>
            </div>

            <script>
              window.onload = function() {
                setTimeout(() => { window.print(); window.close(); }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* Editor Top Bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-card border-b border-border shadow-sm">
        <div className="flex items-center gap-4">
          <Link href={`/${lang}/templates/${slug}`} aria-label={lang==='fa'?'بازگشت به قالب':lang==='ps'?'فارمټ ته ستنېدل':'Back to template'} className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl border bg-card text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="font-bold text-foreground line-clamp-1">{template?.title}</h1>
            <p className="text-xs text-muted-foreground">AI-Powered Editor</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              localStorage.setItem(`draft_${slug}`, content);
              alert('Draft saved to browser storage!');
            }}
            className="flex items-center gap-2 text-muted-foreground hover:bg-accent px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Save className="w-4 h-4" /> {t('templates.saveDraft')}
          </button>
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> {t('templates.export')}
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-popover rounded-xl shadow-lg border border-border overflow-hidden z-50">
                <button
                  onClick={handleExportWord}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <FileDown className="w-4 h-4 text-primary" />
                  Word (.doc)
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <Printer className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  PDF (Print)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Toolbar (AI Tools) */}
        <div className="w-64 bg-card border-r border-border p-4 flex flex-col gap-2 overflow-y-auto hidden md:flex">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> {t('templates.aiAssistant')}
          </h3>

          <button
            onClick={() => handleAiAction('rewrite')}
            disabled={aiLoading}
            className="flex items-center gap-3 px-3 py-3 w-full text-left rounded-xl hover:bg-accent text-foreground transition-colors disabled:opacity-50"
          >
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <RefreshCw className={`w-4 h-4 ${aiAction === 'rewrite' ? 'animate-spin' : ''}`} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{t('templates.rewrite')}</div>
              <div className="text-xs text-muted-foreground">Make it sound professional</div>
            </div>
          </button>

          <button
            onClick={() => handleAiAction('improve_grammar')}
            disabled={aiLoading}
            className="flex items-center gap-3 px-3 py-3 w-full text-left rounded-xl hover:bg-accent text-foreground transition-colors disabled:opacity-50"
          >
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCheck className={`w-4 h-4 ${aiAction === 'improve_grammar' ? 'animate-pulse' : ''}`} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{t('templates.improveGrammar')}</div>
              <div className="text-xs text-muted-foreground">Fix typos & readability</div>
            </div>
          </button>

          <button
            onClick={handlePersonalize}
            disabled={aiLoading}
            className="flex items-center gap-3 px-3 py-3 w-full text-left rounded-xl hover:bg-accent text-foreground transition-colors disabled:opacity-50"
          >
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <FileText className={`w-4 h-4 ${aiAction === 'personalize' ? 'animate-pulse' : ''}`} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{t('templates.personalize')}</div>
              <div className="text-xs text-muted-foreground">Add your own details</div>
            </div>
          </button>

          <button
            onClick={() => handleAiAction('translate', 'Spanish')} // Hardcoded for demo
            disabled={aiLoading}
            className="flex items-center gap-3 px-3 py-3 w-full text-left rounded-xl hover:bg-accent text-foreground transition-colors disabled:opacity-50"
          >
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400">
              <Languages className={`w-4 h-4 ${aiAction === 'translate' ? 'animate-pulse' : ''}`} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{t('templates.translate')}</div>
              <div className="text-xs text-muted-foreground">Convert language</div>
            </div>
          </button>

          <button
            onClick={() => handleAiAction('rewrite', 'Optimize this CV content for ATS tracking systems by highlighting keywords and formatting strictly.')}
            disabled={aiLoading || template?.category?.name !== 'CV'}
            className="flex items-center gap-3 px-3 py-3 w-full text-left rounded-xl hover:bg-accent text-foreground transition-colors disabled:opacity-50"
          >
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
              <Briefcase className={`w-4 h-4 ${aiAction === 'optimize' ? 'animate-pulse' : ''}`} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{t('templates.atsOptimize')}</div>
              <div className="text-xs text-muted-foreground">For CVs / Resumes</div>
            </div>
          </button>

        </div>

        {/* Editor Area */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-2xl shadow-sm border border-border min-h-[800px] flex flex-col relative overflow-hidden">

              {/* Overlay while AI is generating */}
              {aiLoading && (
                <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 relative flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-t-2 border-blue-500 animate-spin"></div>
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                  </div>
                  <p className="mt-4 font-medium text-foreground">
                    AI is processing your document...
                  </p>
                </div>
              )}

              {/* Simple textarea for demo purposes. In production, use @mdxeditor/editor */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 w-full p-8 md:p-12 resize-none outline-none text-foreground bg-transparent leading-relaxed"
                placeholder="Start typing your document here..."
                dir="auto"
              ></textarea>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
