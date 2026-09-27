'use client';

import { useEffect, useState } from 'react';
import { CVData, TemplateType } from './types';
import { v4 as uuidv4 } from 'uuid';
import { CVForm } from './components/CVForm';
import { CVPreview } from './components/CVPreview';
import { ExportModal } from './components/ExportModal';
import { Button } from '@/components/ui/button';
import { BriefcaseBusiness, ExternalLink, Printer } from 'lucide-react';
import { useT } from '@/hooks/use-t';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLangHref } from '@/hooks/use-lang-href';
import { useLangStore } from '@/lib/lang-store';

const initialData: CVData = {
  personal: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedIn: '',
    website: '',
    summary: '',
    gender: '',
    picture: '',
  },
  socialLinks: [],
  education: [],
  experience: [],
  skills: [],
  languages: [],
  certifications: [],
  projects: [],
  references: [],
};

interface OpportunityContext {
  slug: string;
  title: string;
  organization: string | null;
  categorySlug: string | null;
  categoryLabel: string;
  summary: string;
}

export function CVBuilderClient({ settings }: { settings: any }) {
  const t = useT();
  const searchParams = useSearchParams();
  const hrefFn = useLangHref();
  const lang = useLangStore((s) => s.code);
  const opportunityContextCopy =
    lang === 'fa'
      ? { label: 'فرصت هدف برای CV', view: 'مشاهده فرصت هدف' }
      : lang === 'ps'
        ? { label: 'د CV هدف فرصت', view: 'هدف فرصت وګورئ' }
        : { label: '{opportunityContextCopy.label}', view: 'View target opportunity' };
  const [opportunity, setOpportunity] = useState<OpportunityContext | null>(null);
  const [data, setData] = useState<CVData>(initialData);
  const [template, setTemplate] = useState<TemplateType>('professional');
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const slug = searchParams.get('opportunity');
    if (!slug) {
      setOpportunity(null);
      return;
    }

    let cancelled = false;
    fetch('/api/opportunities/by-slugs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs: [slug], lang }),
    })
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        const item = Array.isArray(payload?.items) ? payload.items[0] : null;
        if (!item) return;
        setOpportunity(item as OpportunityContext);
        if (['scholarships', 'fellowships', 'exchange-programs'].includes(item.categorySlug || '')) {
          setTemplate('scholar');
        }
      })
      .catch(() => {
        if (!cancelled) setOpportunity(null);
      });

    return () => {
      cancelled = true;
    };
  }, [lang, searchParams]);

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handlePrint = () => {
    setShowExportModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:block print:w-full print:m-0 print:p-0">

      {/* Form Column - Hidden on Print */}
      <div className="space-y-6 print:hidden">
        <div className="glass-card p-6 rounded-2xl shadow-premium border border-white/20 dark:border-white/10 relative overflow-hidden">
           <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md z-0" />
           <div className="relative z-10 space-y-6">

              {opportunity && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-slate-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-slate-100">
                  <div className="flex items-start gap-3">
                    <BriefcaseBusiness className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                        CV target opportunity
                      </p>
                      <p className="mt-1 font-semibold">{opportunity.title}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                        {[opportunity.organization, opportunity.categoryLabel].filter(Boolean).join(' · ')}
                      </p>
                      {opportunity.summary && (
                        <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300" dir="auto">
                          {opportunity.summary}
                        </p>
                      )}
                    </div>
                    <Link
                      href={hrefFn(`/opportunities/${opportunity.slug}`)}
                      aria-label={opportunityContextCopy.view}
                      className="rounded-lg p-2 text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
                 <h2 className="text-2xl font-semibold text-slate-900 dark:text-white font-sans">
                   {t('tools.cvBuilder.title')}
                 </h2>
                 <Button
                   onClick={handleExport}
                   className="bg-gradient-to-r from-[#3b82f6] to-[#0ea5e9] text-white hover:opacity-90 transition-opacity border-0 shadow-lg font-medium"
                 >
                   <Printer className="w-4 h-4 mr-2" />
                   {t('tools.cvBuilder.export')}
                 </Button>
              </div>

              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setTemplate('professional')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    template === 'professional'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {t('tools.cvBuilder.templatePro')}
                </button>
                <button
                  onClick={() => setTemplate('scholar')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    template === 'scholar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {t('tools.cvBuilder.templateScholar')}
                </button>
              </div>

              <CVForm data={data} setData={setData} />
           </div>
        </div>
      </div>

      {/* Preview Column - Full width on Print */}
      <div className="print:w-full print:m-0 print:p-0">
        <div className="sticky top-6 print:static">
          <CVPreview data={data} template={template} settings={settings} />
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={handlePrint}
      />
    </div>
  );
}
