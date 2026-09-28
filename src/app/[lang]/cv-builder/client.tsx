'use client';

import { useMemo, useState } from 'react';
import { Copy, Download, FilePlus2, FileText, LayoutTemplate, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CVForm } from './components/CVForm';
import { CVPreview } from './components/CVPreview';
import { ExportModal } from './components/ExportModal';
import { TemplateGallery } from './components/TemplateGallery';
import { useCVDrafts } from './hooks/use-cv-drafts';
import { displayDraftName } from './lib/cv-utils';
import { validateDraft } from './lib/cv-validation';
import { CV_TEMPLATE_BY_ID } from './lib/cv-templates';
import { cvText } from './lib/cv-copy';
import { getCVBuilderIntro, getEnabledPurposeIds, getEnabledTemplateIds, type CVBuilderAdminConfig } from './lib/cv-admin-config';
import type { CVIssue, CVOutputLang, CVPurpose, CVSourceContext, PaperSize, TemplateType } from './types';

interface Props {
  initialLang: CVOutputLang;
  initialPurpose?: CVPurpose;
  config: CVBuilderAdminConfig;
  source?: CVSourceContext;
}

function saveLabel(status:string,lang:CVOutputLang){
  if(status==='loading') return cvText(lang,'Loading drafts…');
  if(status==='saving') return cvText(lang,'Saving…');
  if(status==='error') return cvText(lang,'Save problem');
  return cvText(lang,'Saved on this device');
}

function cleanFilename(value:string){
  return (value.trim()||'CV').replace(/[\\/:*?"<>|\x00-\x1F]/g,'-').replace(/\s+/g,' ').slice(0,90);
}

export function CVBuilderClient({ initialLang, initialPurpose='professional', config, source }:Props){
  const initialTemplate=config.defaultTemplates[initialPurpose];
  const {drafts,activeDraft,status,updateActive,createNewDraft,duplicateActive,switchDraft,removeDraft}=useCVDrafts({
    purpose:initialPurpose,outputLang:initialLang,source,template:initialTemplate,paperSize:config.defaultPaperSize,
  });
  const { toast }=useToast();
  const [exportOpen,setExportOpen]=useState(false);
  const [templatesOpen,setTemplatesOpen]=useState(false);
  const [mobileTab,setMobileTab]=useState('edit');
  const [generating,setGenerating]=useState(false);
  const readiness=useMemo(()=>activeDraft?validateDraft(activeDraft,config):null,[activeDraft,config]);
  const enabledPurposes=getEnabledPurposeIds(config);
  const enabledTemplateIds=getEnabledTemplateIds(config);
  const intro=getCVBuilderIntro(config,initialLang);

  if(!activeDraft||!readiness){
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">{cvText(initialLang,'Loading your CV drafts…')}</div>;
  }

  const updateMeta=(key:'name'|'purpose'|'template'|'paperSize'|'outputLang',value:any)=>{
    updateActive(draft=>({...draft,[key]:value}));
  };

  const focusIssue=(issue:CVIssue)=>{
    setExportOpen(false);
    setMobileTab('edit');
    window.setTimeout(()=>{
      const target=document.getElementById(issue.anchorId||`cv-section-${issue.section}`);
      if(!target) return;
      const details=target.closest('details') as HTMLDetailsElement|null;
      if(details&&!details.open) details.open=true;
      window.setTimeout(()=>{
        target.scrollIntoView({behavior:'smooth',block:'center'});
        if('focus' in target && typeof (target as HTMLElement).focus==='function') (target as HTMLElement).focus({preventScroll:true});
        target.classList.add('cv-field-flash');
        window.setTimeout(()=>target.classList.remove('cv-field-flash'),1600);
      },80);
    },80);
  };

  const downloadPdf=async()=>{
    if(!readiness.canExport) return;
    setGenerating(true);
    try{
      const response=await fetch('/api/cv-builder/pdf',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({draft:activeDraft}),
      });
      if(!response.ok){
        const error=await response.json().catch(()=>({}));
        throw new Error(error?.error||'PDF generation failed.');
      }
      const blob=await response.blob();
      const href=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=href;
      a.download=`${cleanFilename(displayDraftName(activeDraft,'CV'))}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(()=>URL.revokeObjectURL(href),1000);
      setExportOpen(false);
      toast({title:cvText(initialLang,'PDF downloaded'),description:cvText(initialLang,'Your CV PDF was generated successfully.')});
    }catch(error){
      toast({title:cvText(initialLang,'PDF generation failed'),description:error instanceof Error?error.message:cvText(initialLang,'Please try again.')});
    }finally{
      setGenerating(false);
    }
  };

  const template=CV_TEMPLATE_BY_ID[activeDraft.template];

  return (
    <div className="mx-auto max-w-[1500px] px-3 sm:px-5 lg:px-8" data-clarity-mask="true">
      <div className="mb-5 rounded-2xl border bg-card/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="size-5 text-primary" />
              <h1 className="text-xl font-bold sm:text-2xl">{intro.title}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700">
                <Save className="size-3.5" /> {saveLabel(status,initialLang)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{intro.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={()=>{
              const purpose=config.purposes[activeDraft.purpose].enabled?activeDraft.purpose:config.defaultPurpose;
              createNewDraft(purpose,activeDraft.outputLang,undefined,{template:config.defaultTemplates[purpose],paperSize:config.defaultPaperSize});
            }}><FilePlus2 className="size-4" />{cvText(initialLang,'New CV')}</Button>
            <Button type="button" variant="outline" onClick={()=>duplicateActive()}><Copy className="size-4" />{cvText(initialLang,'Duplicate')}</Button>
            {config.features.pdfDownload ? <Button type="button" onClick={()=>setExportOpen(true)}><Download className="size-4" />{cvText(initialLang,'Review & download')}</Button> : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="draft-select">{cvText(initialLang,'Saved CV')}</label>
            <select id="draft-select" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={activeDraft.id} onChange={e=>switchDraft(e.target.value)}>
              {drafts.map(draft=><option key={draft.id} value={draft.id}>{displayDraftName(draft,'Untitled CV')}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-name">{cvText(initialLang,'CV name')}</label>
            <input id="cv-name" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={activeDraft.name} onChange={e=>updateMeta('name',e.target.value)} placeholder={cvText(initialLang,'e.g. Software internship CV')} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-purpose">{cvText(initialLang,'Purpose')}</label>
            <select id="cv-purpose" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={activeDraft.purpose} onChange={e=>updateMeta('purpose',e.target.value as CVPurpose)}>
              {(enabledPurposes.includes('professional') || activeDraft.purpose === 'professional') ? <option value="professional">{cvText(initialLang,'Job / Professional')}</option> : null}
              {(enabledPurposes.includes('student') || activeDraft.purpose === 'student') ? <option value="student">{cvText(initialLang,'Student / Internship')}</option> : null}
              {(enabledPurposes.includes('scholarship') || activeDraft.purpose === 'scholarship') ? <option value="scholarship">{cvText(initialLang,'Scholarship / Academic')}</option> : null}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{cvText(initialLang,'Template')}</label>
            <Button id="cv-template-button" type="button" variant="outline" className="h-10 w-full justify-between px-3 font-normal" onClick={()=>setTemplatesOpen(true)}>
              <span className="truncate">{cvText(initialLang,template.name)}</span><LayoutTemplate className="size-4 shrink-0" />
            </Button>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-language">{cvText(initialLang,'CV language')}</label>
            <select id="cv-language" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={activeDraft.outputLang} onChange={e=>updateMeta('outputLang',e.target.value as CVOutputLang)}>
              <option value="en">English</option><option value="fa">فارسی</option><option value="ps">پښتو</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cv-paper">{cvText(initialLang,'Paper size')}</label>
            <select id="cv-paper" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={activeDraft.paperSize} onChange={e=>updateMeta('paperSize',e.target.value as PaperSize)}>
              <option value="a4">A4</option><option value="letter">US Letter</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <span>{cvText(initialLang,'Content completion')}: <strong>{readiness.completion}%</strong></span>
          <span className={readiness.errorCount?'text-destructive':readiness.warningCount?'text-amber-700':'text-emerald-700'}>
            {cvText(initialLang,'CV health')}: <strong>{readiness.errorCount?`${readiness.errorCount} ${cvText(initialLang,readiness.errorCount===1?'error':'errors')}`:readiness.warningCount?`${readiness.warningCount} ${cvText(initialLang,readiness.warningCount===1?'suggestion':'suggestions')}`:cvText(initialLang,'Ready')}</strong>
          </span>
        </div>

        {source?.opportunityTitle?(
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
            {cvText(initialLang,'Building this CV for:')} <strong>{source.opportunityTitle}</strong>
            {source.returnTo?<a href={source.returnTo} className="ms-2 font-medium text-primary hover:underline">{cvText(initialLang,'Return to opportunity')}</a>:null}
          </div>
        ):null}
      </div>

      <Tabs value={mobileTab} onValueChange={setMobileTab} className="lg:hidden">
        <TabsList className="mb-4 grid h-11 w-full grid-cols-2"><TabsTrigger value="edit">{cvText(initialLang,'Edit')}</TabsTrigger><TabsTrigger value="preview">{cvText(initialLang,'Preview')}</TabsTrigger></TabsList>
        <TabsContent value="edit"><CVForm draft={activeDraft} onChange={updateActive} uiLang={initialLang} config={config} /></TabsContent>
        <TabsContent value="preview"><div className="overflow-x-auto rounded-xl bg-slate-200/70 p-2 dark:bg-slate-950/50"><div className="min-w-[700px]"><CVPreview draft={activeDraft} config={config} /></div></div></TabsContent>
      </Tabs>

      <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(620px,1.05fr)]">
        <div className="min-w-0"><CVForm draft={activeDraft} onChange={updateActive} uiLang={initialLang} config={config} /></div>
        <div className="min-w-0"><div className="sticky top-4"><div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>{cvText(initialLang,'Live preview')}</span><span>{readiness.errorCount} {cvText(initialLang,'blocking issues')}</span></div><CVPreview draft={activeDraft} config={config} /></div></div>
      </div>

      <div className="mt-5 flex flex-wrap justify-between gap-3 rounded-2xl border bg-card p-4">
        <div className="text-sm text-muted-foreground">{config.features.pdfDownload ? cvText(initialLang,'Drafts are saved locally in your browser. PDF generation sends the validated draft only to the ARIA HUB renderer and does not store it.') : cvText(initialLang,'Draft data is stored locally in your browser. Cloud sync is not enabled until ARIA HUB has end-user authentication wired to these drafts.')}</div>
        <Button type="button" variant="destructive" onClick={()=>removeDraft(activeDraft.id)} disabled={drafts.length===1&&!activeDraft.data.personal.fullName}><Trash2 className="size-4" />{cvText(initialLang,'Delete this CV')}</Button>
      </div>

      <TemplateGallery
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        selected={activeDraft.template}
        purpose={activeDraft.purpose}
        appearance={activeDraft.appearance}
        uiLang={initialLang}
        enabledTemplateIds={enabledTemplateIds}
        allowPhoto={config.features.allowPhoto}
        allowAccentCustomization={config.features.allowAccentCustomization}
        allowDensityCustomization={config.features.allowDensityCustomization}
        onSelect={(templateId:TemplateType)=>updateActive(draft=>({...draft,template:templateId}))}
        onAppearanceChange={appearance=>updateActive(draft=>({...draft,appearance}))}
      />

      <ExportModal
        isOpen={exportOpen}
        onOpenChange={setExportOpen}
        draft={activeDraft}
        readiness={readiness}
        onConfirm={downloadPdf}
        onNavigateToIssue={focusIssue}
        uiLang={initialLang}
        generating={generating}
        config={config}
      />
    </div>
  );
}
