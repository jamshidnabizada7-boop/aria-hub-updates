'use client';

import { useMemo, useState } from 'react';
import { Check, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CVAppearance, CVOutputLang, CVPurpose, TemplateCategory, TemplateType } from '../types';
import { CV_TEMPLATES, CV_TEMPLATE_BY_ID, RECOMMENDED_TEMPLATES_BY_PURPOSE } from '../lib/cv-templates';
import { cvText } from '../lib/cv-copy';

function Miniature({ id }: { id: TemplateType }) {
  const side = ['modern-sidebar','tech-profile','scholarship-profile'].includes(id);
  const centered = ['minimal-elegant','academic-research','scholarship-profile'].includes(id);
  const dark = ['modern-sidebar','tech-profile'].includes(id);
  const compact = id === 'ats-compact';
  return (
    <div className="aspect-[0.72] overflow-hidden rounded-lg border bg-white p-2 shadow-sm">
      <div className={`mb-2 h-5 rounded-sm ${dark ? 'bg-slate-900' : 'bg-slate-200'} ${centered ? 'mx-auto w-2/3' : 'w-full'}`} />
      {side ? (
        <div className="grid h-[calc(100%-1.75rem)] grid-cols-[1fr_32%] gap-1.5">
          <div className="space-y-1.5">{Array.from({length:compact?7:5}).map((_,i)=><div key={i} className="h-2 rounded bg-slate-200" />)}</div>
          <div className="space-y-1.5 rounded bg-slate-100 p-1">{Array.from({length:6}).map((_,i)=><div key={i} className="h-1.5 rounded bg-slate-300" />)}</div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {Array.from({length:compact?10:7}).map((_,i)=><div key={i} className={`h-2 rounded ${i%3===0?'bg-slate-300':'bg-slate-200'} ${centered&&i%3===0?'mx-auto w-3/4':'w-full'}`} />)}
        </div>
      )}
    </div>
  );
}

export function TemplateGallery({
  open, onOpenChange, selected, purpose, appearance, uiLang, onSelect, onAppearanceChange,
}: {
  open:boolean;
  onOpenChange:(open:boolean)=>void;
  selected:TemplateType;
  purpose:CVPurpose;
  appearance:CVAppearance;
  uiLang:CVOutputLang;
  onSelect:(template:TemplateType)=>void;
  onAppearanceChange:(appearance:CVAppearance)=>void;
}) {
  const c=(text:string)=>cvText(uiLang,text);
  const [filter,setFilter]=useState<'all'|TemplateCategory>('all');
  const recommended=new Set(RECOMMENDED_TEMPLATES_BY_PURPOSE[purpose]);
  const list=useMemo(()=>filter==='all'?CV_TEMPLATES:CV_TEMPLATES.filter(x=>x.category===filter),[filter]);
  const current=CV_TEMPLATE_BY_ID[selected];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LayoutTemplate className="size-5" />{c('Choose a template')}</DialogTitle>
          <DialogDescription>{c('Choose a layout that matches your application. Purpose and template remain separate, so changing purpose will not overwrite your chosen design.')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {(['all','ats','professional','student','academic'] as const).map(value=>(
            <Button key={value} type="button" size="sm" variant={filter===value?'default':'outline'} onClick={()=>setFilter(value)}>
              {c(value==='all'?'All':value==='ats'?'ATS':value==='professional'?'Professional':value==='student'?'Student':'Academic')}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.map(template=>{
            const isSelected=selected===template.id;
            return (
              <button
                key={template.id}
                type="button"
                onClick={()=>onSelect(template.id)}
                className={`group rounded-xl border p-3 text-start transition hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected?'border-primary bg-primary/5 ring-1 ring-primary':''}`}
              >
                <Miniature id={template.id} />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{c(template.name)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{c(template.bestFor)}</div>
                    <p className="mt-2 line-clamp-3 text-[11px] leading-4 text-muted-foreground">{c(template.description)}</p>
                  </div>
                  {isSelected?<Check className="size-4 shrink-0 text-primary" />:null}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {template.atsFocused?<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">ATS</span>:null}
                  {recommended.has(template.id)?<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{c('Recommended')}</span>:null}
                  {isSelected?<span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-white">{c('Selected')}</span>:null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border bg-muted/25 p-4">
          <div className="mb-3 font-semibold">{c('Customize')} · {c(current.name)}</div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{c('Accent')}</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50" disabled={current.atsFocused} value={appearance.accent} onChange={e=>onAppearanceChange({...appearance,accent:e.target.value as CVAppearance['accent']})}>
                <option value="navy">{c('Navy')}</option><option value="blue">{c('Blue')}</option><option value="emerald">{c('Emerald')}</option><option value="burgundy">{c('Burgundy')}</option><option value="neutral">{c('Neutral')}</option>
              </select>
              {current.atsFocused ? <p className="text-[11px] text-muted-foreground">{c('ATS templates keep conservative neutral styling.')}</p> : null}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{c('Density')}</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={appearance.density} onChange={e=>onAppearanceChange({...appearance,density:e.target.value as CVAppearance['density']})}>
                <option value="comfortable">{c('Comfortable')}</option><option value="compact">{c('Compact')}</option>
              </select>
            </div>
            <label className={`flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm ${current.supportsPhoto?'':'opacity-50'}`}>
              <input type="checkbox" checked={appearance.showPhoto&&current.supportsPhoto} disabled={!current.supportsPhoto} onChange={e=>onAppearanceChange({...appearance,showPhoto:e.target.checked})} />
              {c('Show photo')}
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
