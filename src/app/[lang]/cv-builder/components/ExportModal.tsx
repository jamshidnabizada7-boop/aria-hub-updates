'use client';

import { AlertCircle, CheckCircle2, Download, Info, Loader2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CVDraft, CVIssue, CVOutputLang, CVReadiness } from '../types';
import { CV_TEMPLATE_BY_ID } from '../lib/cv-templates';
import { cvText } from '../lib/cv-copy';

export function ExportModal({
  isOpen,onOpenChange,draft,readiness,onConfirm,onNavigateToIssue,uiLang,generating,
}:{
  isOpen:boolean;
  onOpenChange:(open:boolean)=>void;
  draft:CVDraft;
  readiness:CVReadiness;
  onConfirm:()=>void;
  onNavigateToIssue:(issue:CVIssue)=>void;
  uiLang:CVOutputLang;
  generating:boolean;
}) {
  const c=(text:string)=>cvText(uiLang,text);
  const errors=readiness.issues.filter(x=>x.severity==='error');
  const warnings=readiness.issues.filter(x=>x.severity==='warning');
  const info=readiness.issues.filter(x=>x.severity==='info');
  const message=(key:string)=>c(({
    'issues.fullNameRequired':'Add your full name.','issues.contactRequired':'Add at least one contact method: email or phone.',
    'issues.emailInvalid':'Enter a valid email address.','issues.headlineMissing':'A professional headline helps readers understand your profile quickly.',
    'issues.summaryMissing':'A short summary can make the CV easier to scan.','issues.summaryLong':'Your summary is long; aim for roughly 40–100 focused words.',
    'issues.contentRequired':'Add at least one substantive section such as education, experience, projects, research, or awards.',
    'issues.urlInvalid':'Enter a complete http:// or https:// URL.','issues.dateOrderInvalid':'End date cannot be earlier than start date.',
    'issues.achievementMissing':'Add achievements or responsibilities to strengthen this experience.','issues.tooManySkills':'Consider reducing your skills list to the most relevant items.',
    'issues.duplicateSkills':'Your skills list contains duplicates.','issues.visualTemplateAts':'This visual template is less conservative than an ATS-focused template.',
    'issues.atsPhoto':'Some ATS-focused applications prefer a CV without a photo.',
  } as Record<string,string>)[key]||key);

  const IssueList=({items,color}:{items:CVIssue[];color:'red'|'amber'|'blue'})=>(
    <ul className="space-y-2">
      {items.map(issue=>(
        <li key={issue.id} className="flex items-start justify-between gap-3 rounded-lg bg-background/70 p-2.5 text-sm">
          <div className="min-w-0">
            <div className="font-medium">{issue.itemLabel || c(issue.section==='document'?'CV settings':issue.section)}</div>
            <div className="text-muted-foreground">{message(issue.messageKey)}</div>
          </div>
          {issue.anchorId?<Button type="button" variant="ghost" size="sm" className={color==='red'?'text-destructive':color==='amber'?'text-amber-700':'text-primary'} onClick={()=>onNavigateToIssue(issue)}>{c('Fix')} →</Button>:null}
        </li>
      ))}
    </ul>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{c('Ready to download?')}</DialogTitle>
          <DialogDescription>{c('Review CV health before generating the final PDF. The PDF renderer does not store your draft.')}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-3 text-center text-sm sm:grid-cols-4">
          <div><div className="font-bold">{readiness.completion}%</div><div className="text-xs text-muted-foreground">{c('Content complete')}</div></div>
          <div><div className={`font-bold ${readiness.errorCount?'text-destructive':readiness.warningCount?'text-amber-700':'text-emerald-700'}`}>{readiness.errorCount?c('Needs attention'):c('Ready')}</div><div className="text-xs text-muted-foreground">{c('CV health')}</div></div>
          <div><div className="font-bold uppercase">{draft.paperSize}</div><div className="text-xs text-muted-foreground">{c('Paper')}</div></div>
          <div><div className="font-bold">{c(CV_TEMPLATE_BY_ID[draft.template].name)}</div><div className="text-xs text-muted-foreground">{c('Template')}</div></div>
        </div>

        {errors.length?(
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <div className="mb-2 flex items-center gap-2 font-semibold text-destructive"><AlertCircle className="size-4" />{c('Fix before download')} · {errors.length}</div>
            <IssueList items={errors} color="red" />
          </div>
        ):(
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div><strong>{c('Your CV is ready.')}</strong> {c('No blocking validation errors were found.')}</div>
          </div>
        )}

        {warnings.length?(
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="mb-2 flex items-center gap-2 font-semibold"><TriangleAlert className="size-4 text-amber-600" />{c('Quality suggestions')} · {warnings.length}</div>
            <IssueList items={warnings} color="amber" />
          </div>
        ):null}

        {info.length?(
          <div className="rounded-xl border p-3">
            <div className="mb-2 flex items-center gap-2 font-semibold"><Info className="size-4 text-primary" />{c('ATS notes')}</div>
            <IssueList items={info} color="blue" />
          </div>
        ):null}

        <div className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
          {c('When you click Download PDF, this draft is sent only to ARIA HUB’s PDF renderer, converted to a PDF, returned immediately, and not stored by this feature.')}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={()=>onOpenChange(false)}>{c('Back to editing')}</Button>
          <Button type="button" onClick={onConfirm} disabled={!readiness.canExport||generating}>
            {generating?<Loader2 className="size-4 animate-spin" />:<Download className="size-4" />}
            {generating?c('Generating PDF…'):c('Download PDF')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
