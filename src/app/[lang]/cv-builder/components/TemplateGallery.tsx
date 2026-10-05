'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CVAppearance, CVOutputLang, CVPurpose, TemplateCategory, TemplateType } from '../types';
import { CV_TEMPLATES, CV_TEMPLATE_BY_ID, RECOMMENDED_TEMPLATES_BY_PURPOSE } from '../lib/cv-templates';
import { cvText } from '../lib/cv-copy';
import { createEmptyData } from '../lib/cv-utils';
import { cvRendererCss, renderCvBody } from '../lib/cv-renderer';
import type { CVDraft } from '../types';

function sampleDraft(id: TemplateType, lang: CVOutputLang): CVDraft {
  const data = createEmptyData();
  data.personal = { ...data.personal,
    fullName: lang === 'fa' ? 'سارا احمدی' : lang === 'ps' ? 'سارا احمدي' : 'Sara Ahmadi',
    headline: lang === 'fa' ? 'مدیر پروژه' : lang === 'ps' ? 'د پروژې مدیر' : 'Project Manager',
    email: 'sara@example.com', phone: '+93 700 000 000', location: 'Kabul',
    summary: lang === 'fa' ? 'متخصص مدیریت پروژه با تجربه در هماهنگی تیم‌ها و اجرای برنامه‌های آموزشی.' : lang === 'ps' ? 'د پروژې مدیر چې د ټیمونو په همغږۍ او د زده کړې پروګرامونو په پلي کولو کې تجربه لري.' : 'Project manager experienced in coordinating teams and delivering measurable education initiatives.',
  };
  data.experience = [
    { id: 'sample-1', role: 'Program Coordinator', company: 'Community Learning Initiative', location: 'Kabul', startDate: '2022-01', endDate: '', isCurrent: true, description: 'Led a cross-functional team and improved program delivery across three districts.' },
    { id: 'sample-2', role: 'Project Assistant', company: 'Education Partners', location: 'Kabul', startDate: '2020-06', endDate: '2021-12', isCurrent: false, description: 'Tracked milestones and supported partner communications.' },
  ];
  data.education = [{ id: 'sample-education', degree: 'Bachelor of Business Administration', institution: 'Kabul University', location: 'Kabul', startDate: '2016-09', endDate: '2020-06', isCurrent: false, description: '' }];
  data.projects = [{ id: 'sample-project', name: 'Digital Learning Access', role: 'Project Lead', startDate: '2023-01', endDate: '2023-09', description: 'Coordinated a learning pilot for 150 students.', link: '', technologies: '' }];
  data.skills = ['Program planning', 'Stakeholder engagement', 'Reporting'].map((name, index) => ({ id: `sample-skill-${index}`, name, level: 'expert' }));
  data.languages = [{ id: 'sample-language', name: 'English', proficiency: 'fluent' }, { id: 'sample-language-2', name: 'Persian (Afghanistan)', proficiency: 'native' }];
  data.awards = [{ id: 'sample-award', title: 'Community Leadership Award', issuer: 'Education Partners', date: '2023-06', description: '' }];
  data.research = [{ id: 'sample-research', title: 'Access to Digital Education', organization: 'Kabul University', startDate: '2019-01', endDate: '2020-05', isCurrent: false, description: 'Study of barriers to online learning.', link: '' }];
  return { schemaVersion: 4, id: 'sample', name: '', purpose: id === 'academic-research' || id === 'scholarship-profile' ? 'scholarship' : id === 'tech-profile' ? 'student' : 'professional', template: id, paperSize: 'a4', outputLang: lang, appearance: { accent: 'navy', density: 'comfortable', showPhoto: false }, data, createdAt: '', updatedAt: '' };
}

function Miniature({ id, lang }: { id: TemplateType; lang: CVOutputLang }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = () => setScale(element.clientWidth / 794);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const html = useMemo(() => renderCvBody(sampleDraft(id, lang)), [id, lang]);
  return (
    <div ref={ref} className="relative aspect-[0.707] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" aria-hidden="true">
      <div className="pointer-events-none absolute left-0 top-0 origin-top-left bg-white p-[42px]" style={{ width: 794, minHeight: 1123, transform: `scale(${scale})` }}>
        <style dangerouslySetInnerHTML={{ __html: cvRendererCss }} />
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

export function TemplateGallery({
  open, onOpenChange, selected, purpose, appearance, uiLang, enabledTemplateIds,
  allowPhoto, allowAccentCustomization, allowDensityCustomization, onSelect, onAppearanceChange,
}: {
  open:boolean;
  onOpenChange:(open:boolean)=>void;
  selected:TemplateType;
  purpose:CVPurpose;
  appearance:CVAppearance;
  uiLang:CVOutputLang;
  enabledTemplateIds:TemplateType[];
  allowPhoto:boolean;
  allowAccentCustomization:boolean;
  allowDensityCustomization:boolean;
  onSelect:(template:TemplateType)=>void;
  onAppearanceChange:(appearance:CVAppearance)=>void;
}) {
  const c=(text:string)=>cvText(uiLang,text);
  const [filter,setFilter]=useState<'all'|TemplateCategory>('all');
  const recommended=new Set(RECOMMENDED_TEMPLATES_BY_PURPOSE[purpose]);
  const list=useMemo(()=>{
    const allowed=new Set(enabledTemplateIds);
    const visible=CV_TEMPLATES.filter((template)=>allowed.has(template.id)||template.id===selected);
    return filter==='all'?visible:visible.filter((template)=>template.category===filter);
  },[enabledTemplateIds,filter,selected]);
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map(template=>{
            const isSelected=selected===template.id;
            const isDisabled=!enabledTemplateIds.includes(template.id);
            return (
              <button
                key={template.id}
                type="button"
                onClick={()=>{ if(!isDisabled) onSelect(template.id); }}
                disabled={isDisabled}
                aria-pressed={isSelected}
                className={`group rounded-xl border p-3 text-start transition hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${isSelected?'border-primary bg-primary/5 ring-1 ring-primary':''}`}
              >
                <Miniature id={template.id} lang={uiLang} />
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
                  {isDisabled?<span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700">{c('Admin disabled')}</span>:null}
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
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50" disabled={current.atsFocused||!allowAccentCustomization} value={appearance.accent} onChange={e=>onAppearanceChange({...appearance,accent:e.target.value as CVAppearance['accent']})}>
                <option value="navy">{c('Navy')}</option><option value="blue">{c('Blue')}</option><option value="emerald">{c('Emerald')}</option><option value="burgundy">{c('Burgundy')}</option><option value="neutral">{c('Neutral')}</option>
              </select>
              {current.atsFocused ? <p className="text-[11px] text-muted-foreground">{c('ATS templates keep conservative neutral styling.')}</p> : !allowAccentCustomization ? <p className="text-[11px] text-muted-foreground">{c('Disabled by ARIA HUB admin.')}</p> : null}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{c('Density')}</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50" disabled={!allowDensityCustomization} value={appearance.density} onChange={e=>onAppearanceChange({...appearance,density:e.target.value as CVAppearance['density']})}>
                <option value="comfortable">{c('Comfortable')}</option><option value="compact">{c('Compact')}</option>
              </select>
            </div>
            <label className={`flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm ${current.supportsPhoto&&allowPhoto?'':'opacity-50'}`}>
              <input type="checkbox" checked={appearance.showPhoto&&current.supportsPhoto&&allowPhoto} disabled={!current.supportsPhoto||!allowPhoto} onChange={e=>onAppearanceChange({...appearance,showPhoto:e.target.checked})} />
              {c('Show photo')}
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
