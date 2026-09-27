'use client';

import { useMemo, useState } from 'react';
import { Copy, FilePlus2, FileText, Printer, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CVForm } from './components/CVForm';
import { CVPreview } from './components/CVPreview';
import { ExportModal } from './components/ExportModal';
import { useCVDrafts } from './hooks/use-cv-drafts';
import { DEFAULT_TEMPLATE_BY_PURPOSE, displayDraftName } from './lib/cv-utils';
import { validateDraft } from './lib/cv-validation';
import { cvText } from './lib/cv-copy';
import type { CVOutputLang, CVPurpose, CVSourceContext, PaperSize, TemplateType } from './types';

interface Props {
  initialLang: CVOutputLang;
  initialPurpose?: CVPurpose;
  source?: CVSourceContext;
}

function saveLabel(status: string, lang: CVOutputLang) {
  if (status === 'loading') return cvText(lang, 'Loading drafts…');
  if (status === 'saving') return cvText(lang, 'Saving…');
  if (status === 'error') return cvText(lang, 'Save problem');
  return cvText(lang, 'Saved on this device');
}

export function CVBuilderClient({ initialLang, initialPurpose = 'professional', source }: Props) {
  const {
    drafts,
    activeDraft,
    status,
    updateActive,
    createNewDraft,
    duplicateActive,
    switchDraft,
    removeDraft,
  } = useCVDrafts({ purpose: initialPurpose, outputLang: initialLang, source });

  const [exportOpen, setExportOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('edit');

  const readiness = useMemo(() => activeDraft ? validateDraft(activeDraft) : null, [activeDraft]);

  if (!activeDraft || !readiness) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">{cvText(initialLang, 'Loading your CV drafts…')}</div>;
  }

  const updateMeta = <K extends 'name'|'purpose'|'template'|'paperSize'|'outputLang'>(key: K, value: any) => {
    updateActive((draft) => {
      if (key === 'purpose') {
        const purpose = value as CVPurpose;
        return { ...draft, purpose, template: DEFAULT_TEMPLATE_BY_PURPOSE[purpose] };
      }
      return { ...draft, [key]: value };
    });
  };

  const doPrint = () => {
    setExportOpen(false);
    const previousTitle = document.title;
    document.title = `${displayDraftName(activeDraft, 'CV')} - ARIA HUB`;
    window.addEventListener('afterprint', () => { document.title = previousTitle; }, { once: true });
    requestAnimationFrame(() => window.print());
  };

  return (
    <div className="mx-auto max-w-[1500px] px-3 sm:px-5 lg:px-8" data-clarity-mask="true">
      <div className="print:hidden mb-5 rounded-2xl border bg-card/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="size-5 text-primary" />
              <h1 className="text-xl font-bold sm:text-2xl">{cvText(initialLang, 'ARIA HUB CV Builder')}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700">
                <Save className="size-3.5" /> {saveLabel(status, initialLang)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{cvText(initialLang, 'Build a professional CV with purpose-aware guidance, local autosave, multilingual output, ATS checks, and print-ready PDF export.')}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => createNewDraft(activeDraft.purpose, activeDraft.outputLang)}>
              <FilePlus2 className="size-4" /> {cvText(initialLang, 'New CV')}
            </Button>
            <Button type="button" variant="outline" onClick={() => duplicateActive()}>
              <Copy className="size-4" /> {cvText(initialLang, 'Duplicate')}
            </Button>
            <Button type="button" onClick={() => setExportOpen(true)}>
              <Printer className="size-4" /> {cvText(initialLang, 'Review & export')}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="draft-select">{cvText(initialLang, 'Saved CV')}</label>
            <select id="draft-select" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={activeDraft.id} onChange={(e) => switchDraft(e.target.value)}>
              {drafts.map((draft) => <option key={draft.id} value={draft.id}>{displayDraftName(draft, 'Untitled CV')}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-name">{cvText(initialLang, 'CV name')}</label>
            <input id="cv-name" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={activeDraft.name} onChange={(e) => updateMeta('name', e.target.value)} placeholder={cvText(initialLang, 'e.g. Software internship CV')} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-purpose">{cvText(initialLang, 'Purpose')}</label>
            <select id="cv-purpose" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={activeDraft.purpose} onChange={(e) => updateMeta('purpose', e.target.value as CVPurpose)}>
              <option value="professional">{cvText(initialLang, 'Job / Professional')}</option>
              <option value="student">{cvText(initialLang, 'Student / Internship')}</option>
              <option value="scholarship">{cvText(initialLang, 'Scholarship / Academic')}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-template">{cvText(initialLang, 'Template')}</label>
            <select id="cv-template" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={activeDraft.template} onChange={(e) => updateMeta('template', e.target.value as TemplateType)}>
              <option value="ats">{cvText(initialLang, 'ATS Simple')}</option>
              <option value="modern">{cvText(initialLang, 'Modern Professional')}</option>
              <option value="academic">{cvText(initialLang, 'Academic Classic')}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-language">{cvText(initialLang, 'CV language')}</label>
            <select id="cv-language" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={activeDraft.outputLang} onChange={(e) => updateMeta('outputLang', e.target.value as CVOutputLang)}>
              <option value="en">English</option>
              <option value="fa">فارسی</option>
              <option value="ps">پښتو</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-paper">{cvText(initialLang, 'Paper size')}</label>
            <select id="cv-paper" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={activeDraft.paperSize} onChange={(e) => updateMeta('paperSize', e.target.value as PaperSize)}>
              <option value="a4">A4</option>
              <option value="letter">US Letter</option>
            </select>
          </div>
        </div>

        {source?.opportunityTitle ? (
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
            {cvText(initialLang, 'Building this CV for:')} <strong>{source.opportunityTitle}</strong>
            {source.returnTo ? <a href={source.returnTo} className="ms-2 font-medium text-primary hover:underline">{cvText(initialLang, 'Return to opportunity')}</a> : null}
          </div>
        ) : null}
      </div>

      <Tabs value={mobileTab} onValueChange={setMobileTab} className="lg:hidden print:hidden">
        <TabsList className="mb-4 grid h-11 w-full grid-cols-2">
          <TabsTrigger value="edit">{cvText(initialLang, 'Edit')}</TabsTrigger>
          <TabsTrigger value="preview">{cvText(initialLang, 'Preview')}</TabsTrigger>
        </TabsList>
        <TabsContent value="edit"><CVForm draft={activeDraft} onChange={updateActive} uiLang={initialLang} /></TabsContent>
        <TabsContent value="preview">
          <div className="overflow-x-auto rounded-xl bg-slate-200/70 p-2 dark:bg-slate-950/50">
            <div className="min-w-[700px]"><CVPreview draft={activeDraft} /></div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(620px,1.05fr)] print:block">
        <div className="print:hidden min-w-0"><CVForm draft={activeDraft} onChange={updateActive} uiLang={initialLang} /></div>
        <div className="min-w-0">
          <div className="sticky top-4 print:static">
            <div className="print:hidden mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{cvText(initialLang, 'Live preview')}</span>
              <span>{readiness.completion}% {cvText(initialLang, 'complete')} · {readiness.issues.filter((x) => x.severity === 'error').length} {cvText(initialLang, 'blocking issues')}</span>
            </div>
            <CVPreview draft={activeDraft} />
          </div>
        </div>
      </div>

      <div className="print:hidden mt-5 flex flex-wrap justify-between gap-3 rounded-2xl border bg-card p-4">
        <div className="text-sm text-muted-foreground">
          {cvText(initialLang, 'Draft data is stored locally in your browser. Cloud sync is not enabled until ARIA HUB has end-user authentication wired to these drafts.')}
        </div>
        <Button type="button" variant="destructive" onClick={() => removeDraft(activeDraft.id)} disabled={drafts.length === 1 && !activeDraft.data.personal.fullName}>
          <Trash2 className="size-4" /> {cvText(initialLang, 'Delete this CV')}
        </Button>
      </div>

      <ExportModal isOpen={exportOpen} onOpenChange={setExportOpen} draft={activeDraft} readiness={readiness} onConfirm={doPrint} uiLang={initialLang} />
    </div>
  );
}
