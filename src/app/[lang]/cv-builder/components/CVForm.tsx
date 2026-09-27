'use client';

import React, { useState } from 'react';
import {
  ArrowDown, ArrowUp, Award, BookOpen, Briefcase, Check, FlaskConical, GraduationCap, Languages as LanguagesIcon,
  Plus, Trash2, Upload, UserRound, Wrench, FolderGit2, HeartHandshake, FileText, UsersRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import type { CVDraft, CVSectionKey } from '../types';
import { getRecommendedSections, validateDraft } from '../lib/cv-validation';
import { makeId, prepareProfileImage } from '../lib/cv-utils';
import { cvText } from '../lib/cv-copy';

interface Props {
  draft: CVDraft;
  onChange: (updater: (draft: CVDraft) => CVDraft) => void;
  uiLang: CVDraft['outputLang'];
}

const sectionMeta: Record<CVSectionKey, { icon: React.ElementType; label: string }> = {
  personal: { icon: UserRound, label: 'Personal information' },
  summary: { icon: FileText, label: 'Professional summary' },
  experience: { icon: Briefcase, label: 'Experience' },
  education: { icon: GraduationCap, label: 'Education' },
  projects: { icon: FolderGit2, label: 'Projects' },
  skills: { icon: Wrench, label: 'Skills' },
  languages: { icon: LanguagesIcon, label: 'Languages' },
  certifications: { icon: Award, label: 'Certifications' },
  awards: { icon: Award, label: 'Awards & honors' },
  volunteering: { icon: HeartHandshake, label: 'Volunteering & leadership' },
  research: { icon: FlaskConical, label: 'Research' },
  publications: { icon: BookOpen, label: 'Publications' },
  references: { icon: UsersRound, label: 'References' },
};

function Field({ id, label, value, onChange, type = 'text', placeholder, dir, required }: {
  id: string; label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; dir?: 'ltr'|'rtl'|'auto'; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}{required ? <span className="text-destructive"> *</span> : null}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={dir} />
    </div>
  );
}

function TextField({ id, label, value, onChange, placeholder, hint }: {
  id: string; label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function MonthRange({ prefix, startDate, endDate, isCurrent, onStart, onEnd, onCurrent, startLabel = 'Start', endLabel = 'End', currentLabel = 'Currently here' }: {
  prefix: string; startDate: string; endDate: string; isCurrent: boolean;
  onStart: (value: string) => void; onEnd: (value: string) => void; onCurrent: (value: boolean) => void;
  startLabel?: string; endLabel?: string; currentLabel?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field id={`${prefix}-start`} label={startLabel} type="month" value={startDate} onChange={onStart} />
      <Field id={`${prefix}-end`} label={endLabel} type="month" value={isCurrent ? '' : endDate} onChange={onEnd} />
      <label className="sm:col-span-2 flex items-center gap-2 text-sm">
        <Checkbox checked={isCurrent} onCheckedChange={(checked) => onCurrent(Boolean(checked))} />
        Currently here
      </label>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, recommended, complete, uiLang }: {
  title: string; icon: React.ElementType; children: React.ReactNode; recommended?: boolean; complete?: boolean; uiLang: CVDraft['outputLang'];
}) {
  const c = (text: string) => cvText(uiLang, text);
  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" /></div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            {recommended ? <p className="text-xs text-muted-foreground">{c('Recommended for this CV purpose')}</p> : null}
          </div>
        </div>
        {complete ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><Check className="size-3.5" /> Added</span> : null}
      </div>
      {children}
    </section>
  );
}

export function CVForm({ draft, onChange, uiLang }: Props) {
  const c = (text: string) => cvText(uiLang, text);
  const { toast } = useToast();
  const [imageBusy, setImageBusy] = useState(false);
  const readiness = validateDraft(draft);
  const recommended = new Set(getRecommendedSections(draft));

  const setData = (updater: (data: CVDraft['data']) => CVDraft['data']) =>
    onChange((current) => ({ ...current, data: updater(current.data) }));

  const setPersonal = (field: keyof CVDraft['data']['personal'], value: string) =>
    setData((data) => ({ ...data, personal: { ...data.personal, [field]: value } }));

  const addItem = (section: keyof CVDraft['data'], item: any) =>
    setData((data) => ({ ...data, [section]: [...(data[section] as any[]), item] } as CVDraft['data']));

  const updateItem = (section: keyof CVDraft['data'], id: string, patch: Record<string, unknown>) =>
    setData((data) => ({ ...data, [section]: (data[section] as any[]).map((item) => item.id === id ? { ...item, ...patch } : item) } as CVDraft['data']));

  const removeItem = (section: keyof CVDraft['data'], id: string, label: string) => {
    const existing = (draft.data[section] as any[]).find((item) => item.id === id);
    setData((data) => ({ ...data, [section]: (data[section] as any[]).filter((item) => item.id !== id) } as CVDraft['data']));
    if (existing) {
      toast({
        title: `${label} removed`,
        action: (
          <ToastAction altText={`Undo removing ${label}`} onClick={() => addItem(section, existing)}>
            Undo
          </ToastAction>
        ),
      });
    }
  };

  const moveItem = (section: keyof CVDraft['data'], id: string, direction: -1 | 1) => {
    setData((data) => {
      const items = [...(data[section] as any[])];
      const index = items.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= items.length) return data;
      [items[index], items[target]] = [items[target], items[index]];
      return { ...data, [section]: items } as CVDraft['data'];
    });
  };

  const ReorderButtons = ({ section, id }: { section: keyof CVDraft['data']; id: string }) => {
    const items = draft.data[section] as any[];
    const index = items.findIndex((item) => item.id === id);
    return (
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" className="size-11" disabled={index <= 0} aria-label={c('Move up')} onClick={() => moveItem(section, id, -1)}>
          <ArrowUp className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-11" disabled={index < 0 || index >= items.length - 1} aria-label={c('Move down')} onClick={() => moveItem(section, id, 1)}>
          <ArrowDown className="size-4" />
        </Button>
      </div>
    );
  };

  const handleImage = async (file?: File) => {
    if (!file) return;
    setImageBusy(true);
    try {
      const image = await prepareProfileImage(file);
      setPersonal('picture', image);
    } catch (error) {
      toast({ title: 'Could not use this image', description: error instanceof Error && error.message === 'image-too-large' ? 'Choose an image smaller than 8 MB.' : 'Choose a valid image file.' });
    } finally {
      setImageBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{c('CV completion')}</span>
          <span>{readiness.completion}%</span>
        </div>
        <Progress value={readiness.completion} />
        <p className="mt-2 text-xs text-muted-foreground">{c('Your draft saves automatically on this device.')}</p>
      </div>

      <SectionCard uiLang={uiLang} title={c('Personal information')} icon={UserRound} recommended complete={Boolean(draft.data.personal.fullName)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="cv-full-name" label={c('Full name')} required value={draft.data.personal.fullName} onChange={(v) => setPersonal('fullName', v)} />
          <Field id="cv-headline" label={c('Professional headline')} value={draft.data.personal.headline} onChange={(v) => setPersonal('headline', v)} placeholder={c('Software Engineering Student | Python & Web Development')} />
          <Field id="cv-email" label={c('Email')} type="email" dir="ltr" value={draft.data.personal.email} onChange={(v) => setPersonal('email', v)} />
          <Field id="cv-phone" label={c('Phone')} type="tel" dir="ltr" value={draft.data.personal.phone} onChange={(v) => setPersonal('phone', v)} />
          <Field id="cv-location" label={c('Location')} value={draft.data.personal.location} onChange={(v) => setPersonal('location', v)} />
          <div className="space-y-1.5">
            <Label htmlFor="cv-gender">{c('Gender')} <span className="text-muted-foreground">{c('(optional)')}</span></Label>
            <select id="cv-gender" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={draft.data.personal.gender} onChange={(e) => setPersonal('gender', e.target.value)}>
              <option value="">{c('Prefer not to include')}</option>
              <option value="male">{c('Male')}</option>
              <option value="female">{c('Female')}</option>
              <option value="other">{c('Other')}</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cv-photo">{c('Profile photo')} <span className="text-muted-foreground">{c('(optional)')}</span></Label>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              {draft.data.personal.picture ? <img src={draft.data.personal.picture} alt="Current profile preview" className="size-14 rounded-full object-cover" /> : null}
              <label htmlFor="cv-photo" className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-accent">
                <Upload className="size-4" /> {imageBusy ? c('Processing…') : draft.data.personal.picture ? c('Replace photo') : c('Choose photo')}
              </label>
              <input id="cv-photo" className="sr-only" type="file" accept="image/*" onChange={(e) => handleImage(e.target.files?.[0])} />
              {draft.data.personal.picture ? <Button type="button" variant="ghost" className="min-h-11" onClick={() => setPersonal('picture', '')}>{c('Remove photo')}</Button> : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{c('Photos are optional. Some employers and scholarship applications prefer CVs without one.')}</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label>{c('Professional and social links')}</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => addItem('socialLinks', { id: makeId('social'), platform: '', url: '' })}><Plus className="size-4" /> {c('Add link')}</Button>
          </div>
          {draft.data.socialLinks.map((link) => (
            <div key={link.id} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <Input aria-label="Link platform" placeholder={c('LinkedIn, GitHub, Portfolio…')} value={link.platform} onChange={(e) => updateItem('socialLinks', link.id, { platform: e.target.value })} />
              <Input aria-label="Link URL" dir="ltr" type="url" placeholder="https://…" value={link.url} onChange={(e) => updateItem('socialLinks', link.id, { url: e.target.value })} />
              <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Remove ${link.platform || 'link'}`} onClick={() => removeItem('socialLinks', link.id, 'Link')}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard uiLang={uiLang} title={c('Professional summary')} icon={FileText} recommended={recommended.has('summary')} complete={Boolean(draft.data.personal.summary)}>
        <TextField id="cv-summary" label={c('Summary')} value={draft.data.personal.summary} onChange={(v) => setPersonal('summary', v)} placeholder={c('In 3–5 lines, explain who you are, your strongest skills, and the value you bring.')} hint={c('Focus on strengths, goals, and evidence. Avoid generic statements that could describe anyone.')} />
      </SectionCard>

      <SectionCard uiLang={uiLang} title={c('Experience')} icon={Briefcase} recommended={recommended.has('experience')} complete={draft.data.experience.length > 0}>
        <div className="space-y-3">
          {draft.data.experience.map((item) => (
            <div key={item.id} className="rounded-xl border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id={`exp-role-${item.id}`} label={c('Role / position')} value={item.role} onChange={(v) => updateItem('experience', item.id, { role: v })} />
                <Field id={`exp-company-${item.id}`} label={c('Organization')} value={item.company} onChange={(v) => updateItem('experience', item.id, { company: v })} />
                <Field id={`exp-location-${item.id}`} label={c('Location')} value={item.location} onChange={(v) => updateItem('experience', item.id, { location: v })} />
                <div />
              </div>
              <div className="mt-3"><MonthRange startLabel={c('Start')} endLabel={c('End')} currentLabel={c('Currently here')} prefix={`exp-${item.id}`} startDate={item.startDate} endDate={item.endDate} isCurrent={item.isCurrent} onStart={(v) => updateItem('experience', item.id, { startDate: v })} onEnd={(v) => updateItem('experience', item.id, { endDate: v })} onCurrent={(v) => updateItem('experience', item.id, { isCurrent: v, endDate: v ? '' : item.endDate })} /></div>
              <div className="mt-3"><TextField id={`exp-desc-${item.id}`} label={c('Achievements and responsibilities')} value={item.description} onChange={(v) => updateItem('experience', item.id, { description: v })} placeholder="• Built…\n• Improved…\n• Led…" hint={c('Prefer achievement-focused bullets: action + task + measurable result when possible.')} /></div>
              <div className="mt-3 flex items-center justify-between gap-2"><ReorderButtons section="experience" id={item.id} /><Button type="button" variant="ghost" className="min-h-11 text-destructive" onClick={() => removeItem('experience', item.id, 'Experience')}><Trash2 className="size-4" /> {c('Remove')}</Button></div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addItem('experience', { id: makeId('exp'), role: '', company: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' })}><Plus className="size-4" /> {c('Add experience')}</Button>
        </div>
      </SectionCard>

      <SectionCard uiLang={uiLang} title={c('Education')} icon={GraduationCap} recommended={recommended.has('education')} complete={draft.data.education.length > 0}>
        <div className="space-y-3">
          {draft.data.education.map((item) => (
            <div key={item.id} className="rounded-xl border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id={`edu-degree-${item.id}`} label={c('Degree / certificate')} value={item.degree} onChange={(v) => updateItem('education', item.id, { degree: v })} />
                <Field id={`edu-school-${item.id}`} label={c('Institution')} value={item.institution} onChange={(v) => updateItem('education', item.id, { institution: v })} />
                <Field id={`edu-location-${item.id}`} label={c('Location')} value={item.location} onChange={(v) => updateItem('education', item.id, { location: v })} />
              </div>
              <div className="mt-3"><MonthRange startLabel={c('Start')} endLabel={c('End')} currentLabel={c('Currently here')} prefix={`edu-${item.id}`} startDate={item.startDate} endDate={item.endDate} isCurrent={item.isCurrent} onStart={(v) => updateItem('education', item.id, { startDate: v })} onEnd={(v) => updateItem('education', item.id, { endDate: v })} onCurrent={(v) => updateItem('education', item.id, { isCurrent: v, endDate: v ? '' : item.endDate })} /></div>
              <div className="mt-3"><TextField id={`edu-desc-${item.id}`} label={c('Details')} value={item.description} onChange={(v) => updateItem('education', item.id, { description: v })} placeholder={c('Relevant coursework, thesis, distinctions, GPA (if useful)…')} /></div>
              <div className="mt-3 flex items-center justify-between gap-2"><ReorderButtons section="education" id={item.id} /><Button type="button" variant="ghost" className="min-h-11 text-destructive" onClick={() => removeItem('education', item.id, 'Education')}><Trash2 className="size-4" /> {c('Remove')}</Button></div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addItem('education', { id: makeId('edu'), degree: '', institution: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' })}><Plus className="size-4" /> {c('Add education')}</Button>
        </div>
      </SectionCard>

      <SectionCard uiLang={uiLang} title={c('Projects')} icon={FolderGit2} recommended={recommended.has('projects')} complete={draft.data.projects.length > 0}>
        <div className="space-y-3">
          {draft.data.projects.map((item) => (
            <div key={item.id} className="rounded-xl border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id={`project-name-${item.id}`} label={c('Project name')} value={item.name} onChange={(v) => updateItem('projects', item.id, { name: v })} />
                <Field id={`project-role-${item.id}`} label={c('Your role')} value={item.role} onChange={(v) => updateItem('projects', item.id, { role: v })} />
                <Field id={`project-tech-${item.id}`} label={c('Technologies / methods')} value={item.technologies} onChange={(v) => updateItem('projects', item.id, { technologies: v })} />
                <Field id={`project-link-${item.id}`} label={c('Project link')} dir="ltr" type="url" value={item.link} onChange={(v) => updateItem('projects', item.id, { link: v })} />
                <Field id={`project-start-${item.id}`} label="Start" type="month" value={item.startDate} onChange={(v) => updateItem('projects', item.id, { startDate: v })} />
                <Field id={`project-end-${item.id}`} label="End" type="month" value={item.endDate} onChange={(v) => updateItem('projects', item.id, { endDate: v })} />
              </div>
              <div className="mt-3"><TextField id={`project-desc-${item.id}`} label={c('What you built / achieved')} value={item.description} onChange={(v) => updateItem('projects', item.id, { description: v })} /></div>
              <div className="mt-3 flex items-center justify-between gap-2"><ReorderButtons section="projects" id={item.id} /><Button type="button" variant="ghost" className="min-h-11 text-destructive" onClick={() => removeItem('projects', item.id, 'Project')}><Trash2 className="size-4" /> {c('Remove')}</Button></div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addItem('projects', { id: makeId('project'), name: '', role: '', technologies: '', startDate: '', endDate: '', description: '', link: '' })}><Plus className="size-4" /> {c('Add project')}</Button>
        </div>
      </SectionCard>

      <SectionCard uiLang={uiLang} title={c('Skills')} icon={Wrench} recommended={recommended.has('skills')} complete={draft.data.skills.length > 0}>
        <div className="space-y-2">
          {draft.data.skills.map((item) => (
            <div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
              <Input aria-label="Skill name" value={item.name} placeholder="Python" onChange={(e) => updateItem('skills', item.id, { name: e.target.value })} />
              <select aria-label={`Level for ${item.name || 'skill'}`} className="h-9 rounded-md border bg-background px-3 text-sm" value={item.level} onChange={(e) => updateItem('skills', item.id, { level: e.target.value })}>
                <option value="beginner">{c('Beginner')}</option><option value="intermediate">{c('Intermediate')}</option><option value="expert">{c('Expert')}</option>
              </select>
              <div className="flex items-center"><ReorderButtons section="skills" id={item.id} /><Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Remove ${item.name || 'skill'}`} onClick={() => removeItem('skills', item.id, 'Skill')}><Trash2 className="size-4" /></Button></div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addItem('skills', { id: makeId('skill'), name: '', level: 'intermediate' })}><Plus className="size-4" /> {c('Add skill')}</Button>
        </div>
      </SectionCard>

      <SectionCard uiLang={uiLang} title={c('Languages')} icon={LanguagesIcon} recommended={recommended.has('languages')} complete={draft.data.languages.length > 0}>
        <div className="space-y-2">
          {draft.data.languages.map((item) => (
            <div key={item.id} className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
              <Input aria-label="Language name" value={item.name} placeholder="English" onChange={(e) => updateItem('languages', item.id, { name: e.target.value })} />
              <select aria-label={`Proficiency for ${item.name || 'language'}`} className="h-9 rounded-md border bg-background px-3 text-sm" value={item.proficiency} onChange={(e) => updateItem('languages', item.id, { proficiency: e.target.value })}>
                <option value="basic">{c('Basic')}</option><option value="intermediate">{c('Intermediate')}</option><option value="fluent">{c('Fluent')}</option><option value="native">{c('Native')}</option>
              </select>
              <div className="flex items-center"><ReorderButtons section="languages" id={item.id} /><Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Remove ${item.name || 'language'}`} onClick={() => removeItem('languages', item.id, 'Language')}><Trash2 className="size-4" /></Button></div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addItem('languages', { id: makeId('language'), name: '', proficiency: 'fluent' })}><Plus className="size-4" /> {c('Add language')}</Button>
        </div>
      </SectionCard>

      <SectionCard uiLang={uiLang} title={c('Certifications')} icon={Award} recommended={recommended.has('certifications')} complete={draft.data.certifications.length > 0}>
        <div className="space-y-3">
          {draft.data.certifications.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
              <Field id={`cert-name-${item.id}`} label={c('Certification')} value={item.name} onChange={(v) => updateItem('certifications', item.id, { name: v })} />
              <Field id={`cert-issuer-${item.id}`} label={c('Issuer')} value={item.issuer} onChange={(v) => updateItem('certifications', item.id, { issuer: v })} />
              <Field id={`cert-date-${item.id}`} label={c('Date')} type="month" value={item.date} onChange={(v) => updateItem('certifications', item.id, { date: v })} />
              <Field id={`cert-url-${item.id}`} label={c('Credential URL')} type="url" dir="ltr" value={item.credentialUrl} onChange={(v) => updateItem('certifications', item.id, { credentialUrl: v })} />
              <div className="sm:col-span-2 flex justify-end"><Button type="button" variant="ghost" className="min-h-11 text-destructive" onClick={() => removeItem('certifications', item.id, 'Certification')}><Trash2 className="size-4" /> {c('Remove')}</Button></div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addItem('certifications', { id: makeId('cert'), name: '', issuer: '', date: '', credentialUrl: '' })}><Plus className="size-4" /> {c('Add certification')}</Button>
        </div>
      </SectionCard>

      <SectionCard uiLang={uiLang} title={c('Awards & honors')} icon={Award} recommended={recommended.has('awards')} complete={draft.data.awards.length > 0}>
        <div className="space-y-3">
          {draft.data.awards.map((item) => (
            <div key={item.id} className="rounded-xl border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id={`award-title-${item.id}`} label={c('Award')} value={item.title} onChange={(v) => updateItem('awards', item.id, { title: v })} />
                <Field id={`award-issuer-${item.id}`} label={c('Issuer')} value={item.issuer} onChange={(v) => updateItem('awards', item.id, { issuer: v })} />
                <Field id={`award-date-${item.id}`} label={c('Date')} type="month" value={item.date} onChange={(v) => updateItem('awards', item.id, { date: v })} />
              </div>
              <div className="mt-3"><TextField id={`award-desc-${item.id}`} label={c('Why it matters')} value={item.description} onChange={(v) => updateItem('awards', item.id, { description: v })} /></div>
              <div className="mt-3 flex items-center justify-between gap-2"><ReorderButtons section="awards" id={item.id} /><Button type="button" variant="ghost" className="min-h-11 text-destructive" onClick={() => removeItem('awards', item.id, 'Award')}><Trash2 className="size-4" /> {c('Remove')}</Button></div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addItem('awards', { id: makeId('award'), title: '', issuer: '', date: '', description: '' })}><Plus className="size-4" /> {c('Add award')}</Button>
        </div>
      </SectionCard>

      <SectionCard uiLang={uiLang} title={c('Volunteering & leadership')} icon={HeartHandshake} recommended={recommended.has('volunteering')} complete={draft.data.volunteering.length > 0}>
        <div className="space-y-3">
          {draft.data.volunteering.map((item) => (
            <div key={item.id} className="rounded-xl border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id={`vol-role-${item.id}`} label={c('Role')} value={item.role} onChange={(v) => updateItem('volunteering', item.id, { role: v })} />
                <Field id={`vol-org-${item.id}`} label={c('Organization')} value={item.organization} onChange={(v) => updateItem('volunteering', item.id, { organization: v })} />
              </div>
              <div className="mt-3"><MonthRange startLabel={c('Start')} endLabel={c('End')} currentLabel={c('Currently here')} prefix={`vol-${item.id}`} startDate={item.startDate} endDate={item.endDate} isCurrent={item.isCurrent} onStart={(v) => updateItem('volunteering', item.id, { startDate: v })} onEnd={(v) => updateItem('volunteering', item.id, { endDate: v })} onCurrent={(v) => updateItem('volunteering', item.id, { isCurrent: v, endDate: v ? '' : item.endDate })} /></div>
              <div className="mt-3"><TextField id={`vol-desc-${item.id}`} label={c('Contribution / impact')} value={item.description} onChange={(v) => updateItem('volunteering', item.id, { description: v })} /></div>
              <div className="mt-3 flex items-center justify-between gap-2"><ReorderButtons section="volunteering" id={item.id} /><Button type="button" variant="ghost" className="min-h-11 text-destructive" onClick={() => removeItem('volunteering', item.id, 'Volunteering entry')}><Trash2 className="size-4" /> {c('Remove')}</Button></div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addItem('volunteering', { id: makeId('vol'), role: '', organization: '', startDate: '', endDate: '', isCurrent: false, description: '' })}><Plus className="size-4" /> {c('Add volunteering')}</Button>
        </div>
      </SectionCard>

      <SectionCard uiLang={uiLang} title={c('Research')} icon={FlaskConical} recommended={recommended.has('research')} complete={draft.data.research.length > 0}>
        <div className="space-y-3">
          {draft.data.research.map((item) => (
            <div key={item.id} className="rounded-xl border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id={`research-title-${item.id}`} label={c('Research title')} value={item.title} onChange={(v) => updateItem('research', item.id, { title: v })} />
                <Field id={`research-org-${item.id}`} label={c('Institution / group')} value={item.organization} onChange={(v) => updateItem('research', item.id, { organization: v })} />
                <Field id={`research-link-${item.id}`} label={c('Link')} type="url" dir="ltr" value={item.link} onChange={(v) => updateItem('research', item.id, { link: v })} />
              </div>
              <div className="mt-3"><MonthRange startLabel={c('Start')} endLabel={c('End')} currentLabel={c('Currently here')} prefix={`research-${item.id}`} startDate={item.startDate} endDate={item.endDate} isCurrent={item.isCurrent} onStart={(v) => updateItem('research', item.id, { startDate: v })} onEnd={(v) => updateItem('research', item.id, { endDate: v })} onCurrent={(v) => updateItem('research', item.id, { isCurrent: v, endDate: v ? '' : item.endDate })} /></div>
              <div className="mt-3"><TextField id={`research-desc-${item.id}`} label={c('Research summary')} value={item.description} onChange={(v) => updateItem('research', item.id, { description: v })} /></div>
              <div className="mt-3 flex items-center justify-between gap-2"><ReorderButtons section="research" id={item.id} /><Button type="button" variant="ghost" className="min-h-11 text-destructive" onClick={() => removeItem('research', item.id, 'Research entry')}><Trash2 className="size-4" /> {c('Remove')}</Button></div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addItem('research', { id: makeId('research'), title: '', organization: '', startDate: '', endDate: '', isCurrent: false, description: '', link: '' })}><Plus className="size-4" /> {c('Add research')}</Button>
        </div>
      </SectionCard>

      <SectionCard uiLang={uiLang} title={c('Publications')} icon={BookOpen} recommended={recommended.has('publications')} complete={draft.data.publications.length > 0}>
        <div className="space-y-3">
          {draft.data.publications.map((item) => (
            <div key={item.id} className="rounded-xl border bg-muted/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id={`pub-title-${item.id}`} label={c('Publication title')} value={item.title} onChange={(v) => updateItem('publications', item.id, { title: v })} />
                <Field id={`pub-publisher-${item.id}`} label={c('Journal / publisher')} value={item.publisher} onChange={(v) => updateItem('publications', item.id, { publisher: v })} />
                <Field id={`pub-date-${item.id}`} label={c('Date')} type="month" value={item.date} onChange={(v) => updateItem('publications', item.id, { date: v })} />
                <Field id={`pub-link-${item.id}`} label={c('Link / DOI')} type="url" dir="ltr" value={item.link} onChange={(v) => updateItem('publications', item.id, { link: v })} />
              </div>
              <div className="mt-3"><TextField id={`pub-desc-${item.id}`} label={c('Description')} value={item.description} onChange={(v) => updateItem('publications', item.id, { description: v })} /></div>
              <div className="mt-3 flex items-center justify-between gap-2"><ReorderButtons section="publications" id={item.id} /><Button type="button" variant="ghost" className="min-h-11 text-destructive" onClick={() => removeItem('publications', item.id, 'Publication')}><Trash2 className="size-4" /> {c('Remove')}</Button></div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addItem('publications', { id: makeId('publication'), title: '', publisher: '', date: '', description: '', link: '' })}><Plus className="size-4" /> {c('Add publication')}</Button>
        </div>
      </SectionCard>

      <SectionCard uiLang={uiLang} title={c('References')} icon={UsersRound} recommended={false} complete={draft.data.references.length > 0}>
        <div className="space-y-3">
          {draft.data.references.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
              <Field id={`ref-name-${item.id}`} label={c('Name')} value={item.name} onChange={(v) => updateItem('references', item.id, { name: v })} />
              <Field id={`ref-role-${item.id}`} label={c('Role / position')} value={item.role} onChange={(v) => updateItem('references', item.id, { role: v })} />
              <Field id={`ref-org-${item.id}`} label={c('Organization')} value={item.organization} onChange={(v) => updateItem('references', item.id, { organization: v })} />
              <Field id={`ref-email-${item.id}`} label={c('Email')} type="email" dir="ltr" value={item.email} onChange={(v) => updateItem('references', item.id, { email: v })} />
              <Field id={`ref-phone-${item.id}`} label={c('Phone')} type="tel" dir="ltr" value={item.phone} onChange={(v) => updateItem('references', item.id, { phone: v })} />
              <div className="flex items-end justify-end"><Button type="button" variant="ghost" className="min-h-11 text-destructive" onClick={() => removeItem('references', item.id, 'Reference')}><Trash2 className="size-4" /> {c('Remove')}</Button></div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => addItem('references', { id: makeId('reference'), name: '', role: '', organization: '', email: '', phone: '' })}><Plus className="size-4" /> {c('Add reference')}</Button>
        </div>
      </SectionCard>
    </div>
  );
}
