'use client';

import { AlertCircle, CheckCircle2, FileText, Info, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import type { CVDraft, CVOutputLang, CVReadiness } from '../types';
import { cvText } from '../lib/cv-copy';

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  draft: CVDraft;
  readiness: CVReadiness;
  onConfirm: () => void;
  onNavigateToIssue?: (section: string) => void;
  uiLang: CVOutputLang;
}

export function ExportModal({ isOpen, onOpenChange, draft, readiness, onConfirm, onNavigateToIssue, uiLang }: Props) {
  const c = (text: string) => cvText(uiLang, text);
  const errors = readiness.issues.filter((issue) => issue.severity === 'error');
  const warnings = readiness.issues.filter((issue) => issue.severity === 'warning');
  const info = readiness.issues.filter((issue) => issue.severity === 'info');

  const message = (key: string) => c(({
    'issues.fullNameRequired': 'Add your full name.',
    'issues.contactRequired': 'Add at least one contact method: email or phone.',
    'issues.emailInvalid': 'Enter a valid email address.',
    'issues.headlineMissing': 'A professional headline helps readers understand your profile quickly.',
    'issues.summaryMissing': 'A short summary can make the CV easier to scan.',
    'issues.summaryLong': 'Your summary is long; aim for roughly 3–5 focused lines.',
    'issues.contentRequired': 'Add at least one substantive section such as education, experience, projects, research, or awards.',
    'issues.urlInvalid': 'One of your links is invalid or uses an unsupported URL scheme.',
    'issues.dateOrderInvalid': 'A start date occurs after its end date.',
    'issues.achievementMissing': 'An experience entry has no achievements or responsibilities.',
    'issues.tooManySkills': 'Consider reducing your skills list to the most relevant items.',
    'issues.duplicateSkills': 'Your skills list contains duplicates.',
    'issues.visualTemplateAts': 'This visual template is less conservative than the ATS Simple template.',
    'issues.atsPhoto': 'Some ATS-focused applications prefer a CV without a photo.',
  } as Record<string, string>)[key] || key);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="mb-1 grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
          <DialogTitle>{c('Review and export your CV')}</DialogTitle>
          <DialogDescription>
            {c('Your CV stays on this device. ARIA HUB uses the browser print dialog for PDF export, so choose “Save as PDF” after continuing.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl border bg-muted/30 p-3 text-center text-sm">
            <div><div className="font-bold">{readiness.completion}%</div><div className="text-xs text-muted-foreground">{c('Complete')}</div></div>
            <div><div className="font-bold uppercase">{draft.paperSize}</div><div className="text-xs text-muted-foreground">{c('Paper')}</div></div>
            <div><div className="font-bold">{c(draft.template === 'ats' ? 'ATS Simple' : draft.template === 'modern' ? 'Modern' : 'Academic')}</div><div className="text-xs text-muted-foreground">{c('Template')}</div></div>
          </div>

          {errors.length ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
              <div className="mb-2 flex items-center gap-2 font-semibold text-destructive"><AlertCircle className="size-4" /> {c('Fix before export')}</div>
              <ul className="space-y-2 text-sm">
                {errors.map((issue) => (
                  <li key={issue.id}>
                    <button type="button" className="text-start hover:underline" onClick={() => onNavigateToIssue?.(issue.section)}>
                      {message(issue.messageKey)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div><strong>{c('Ready to export.')}</strong> {c('No blocking validation errors were found.')}</div>
            </div>
          )}

          {warnings.length ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="mb-2 flex items-center gap-2 font-semibold"><TriangleAlert className="size-4 text-amber-600" /> {c('Quality suggestions')}</div>
              <ul className="space-y-1.5 text-sm">{warnings.map((issue) => <li key={issue.id}>• {message(issue.messageKey)}</li>)}</ul>
            </div>
          ) : null}

          {info.length ? (
            <div className="rounded-xl border p-3">
              <div className="mb-2 flex items-center gap-2 font-semibold"><Info className="size-4 text-primary" /> {c('ATS notes')}</div>
              <ul className="space-y-1.5 text-sm">{info.map((issue) => <li key={issue.id}>• {message(issue.messageKey)}</li>)}</ul>
            </div>
          ) : null}

          <div className="rounded-xl bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            For the cleanest browser PDF, disable browser headers/footers if your print dialog shows that option. The dedicated CV print layout already controls page size, margins, colors, and website chrome.
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{c('Back to editing')}</Button>
          <Button type="button" onClick={onConfirm} disabled={!readiness.canExport}>{c('Continue to PDF')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
