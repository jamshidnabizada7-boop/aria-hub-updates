'use client';

import React from 'react';
import { ExternalLink, Mail, MapPin, Phone } from 'lucide-react';
import type { CVDraft, CVOutputLang, TemplateType } from '../types';
import { formatMonth, safeExternalUrl } from '../lib/cv-utils';

interface Props {
  draft: CVDraft;
}

const copy: Record<CVOutputLang, Record<string, string>> = {
  en: {
    summary: 'Professional Summary', experience: 'Experience', education: 'Education', projects: 'Projects',
    skills: 'Skills', languages: 'Languages', certifications: 'Certifications', awards: 'Awards & Honors',
    volunteering: 'Volunteering & Leadership', research: 'Research', publications: 'Publications', references: 'References',
    current: 'Present', beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert',
    basic: 'Basic', fluent: 'Fluent', native: 'Native', link: 'Link', empty: 'Start adding your details to preview your CV.',
  },
  fa: {
    summary: 'خلاصه حرفه‌ای', experience: 'تجربه کاری', education: 'تحصیلات', projects: 'پروژه‌ها',
    skills: 'مهارت‌ها', languages: 'زبان‌ها', certifications: 'گواهینامه‌ها', awards: 'جوایز و افتخارات',
    volunteering: 'فعالیت داوطلبانه و رهبری', research: 'پژوهش', publications: 'انتشارات', references: 'معرف‌ها',
    current: 'اکنون', beginner: 'مبتدی', intermediate: 'متوسط', expert: 'ماهر',
    basic: 'ابتدایی', fluent: 'روان', native: 'زبان مادری', link: 'لینک', empty: 'برای دیدن پیش‌نمایش، اطلاعات CV خود را وارد کنید.',
  },
  ps: {
    summary: 'مسلکي لنډیز', experience: 'کاري تجربه', education: 'زده کړې', projects: 'پروژې',
    skills: 'مهارتونه', languages: 'ژبې', certifications: 'سندونه', awards: 'جایزې او ویاړونه',
    volunteering: 'رضاکارانه کار او مشري', research: 'څېړنه', publications: 'خپرونې', references: 'مراجع',
    current: 'اوس', beginner: 'پیل کونکی', intermediate: 'منځنی', expert: 'ماهر',
    basic: 'بنسټیز', fluent: 'روان', native: 'مورنۍ ژبه', link: 'لینک', empty: 'د CV د مخکتنې لپاره خپل معلومات ولیکئ.',
  },
};

function TextBlock({ value }: { value: string }) {
  if (!value.trim()) return null;
  return <div className="whitespace-pre-line leading-relaxed">{value}</div>;
}

function DateRange({ start, end, current, lang }: { start: string; end: string; current?: boolean; lang: CVOutputLang }) {
  if (!start && !end && !current) return null;
  return (
    <span className="whitespace-nowrap text-[0.9em] text-slate-500">
      {start ? formatMonth(start, lang) : ''}{start && (end || current) ? ' – ' : ''}{current ? copy[lang].current : end ? formatMonth(end, lang) : ''}
    </span>
  );
}

function LinkText({ href, label }: { href: string; label: string }) {
  const safe = safeExternalUrl(href);
  if (!safe) return null;
  return <a href={safe} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all underline decoration-slate-300 underline-offset-2"><ExternalLink className="size-3" />{label}</a>;
}

function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`cv-section break-inside-avoid ${className}`}>
      <h2 className="mb-2 border-b border-slate-300 pb-1 text-[12px] font-bold uppercase tracking-[0.12em] text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function Header({ draft, compact = false, showPhoto = false }: { draft: CVDraft; compact?: boolean; showPhoto?: boolean }) {
  const p = draft.data.personal;
  return (
    <header className={`flex gap-4 ${compact ? 'items-start' : 'items-center'}`}>
      {showPhoto && p.picture ? <img src={p.picture} alt="" aria-hidden="true" className="size-20 shrink-0 rounded-full object-cover" /> : null}
      <div className="min-w-0 flex-1">
        <h1 className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold leading-tight tracking-tight text-slate-950`}>{p.fullName || 'Your Name'}</h1>
        {p.headline ? <p className="mt-1 text-sm font-medium text-slate-600">{p.headline}</p> : null}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-600">
          {p.email ? <span dir="ltr" className="inline-flex items-center gap-1"><Mail className="size-3" />{p.email}</span> : null}
          {p.phone ? <span dir="ltr" className="inline-flex items-center gap-1"><Phone className="size-3" />{p.phone}</span> : null}
          {p.location ? <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{p.location}</span> : null}
          {draft.data.socialLinks.map((link) => <LinkText key={link.id} href={link.url} label={link.platform || copy[draft.outputLang].link} />)}
        </div>
      </div>
    </header>
  );
}

function CoreSections({ draft }: { draft: CVDraft }) {
  const d = draft.data;
  const lang = draft.outputLang;
  const c = copy[lang];

  return (
    <>
      {d.personal.summary ? <Section title={c.summary}><TextBlock value={d.personal.summary} /></Section> : null}

      {d.experience.length ? (
        <Section title={c.experience}>
          <div className="space-y-3">
            {d.experience.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="font-bold text-slate-900">{item.role || item.company}</h3>
                  <DateRange start={item.startDate} end={item.endDate} current={item.isCurrent} lang={lang} />
                </div>
                <p className="text-[10px] font-medium text-slate-600">{item.company}{item.location ? ` • ${item.location}` : ''}</p>
                {item.description ? <div className="mt-1"><TextBlock value={item.description} /></div> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {d.education.length ? (
        <Section title={c.education}>
          <div className="space-y-3">
            {d.education.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="font-bold text-slate-900">{item.degree || item.institution}</h3>
                  <DateRange start={item.startDate} end={item.endDate} current={item.isCurrent} lang={lang} />
                </div>
                <p className="text-[10px] font-medium text-slate-600">{item.institution}{item.location ? ` • ${item.location}` : ''}</p>
                {item.description ? <div className="mt-1"><TextBlock value={item.description} /></div> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {d.projects.length ? (
        <Section title={c.projects}>
          <div className="space-y-3">
            {d.projects.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-bold text-slate-900">{item.name}</h3>
                  <DateRange start={item.startDate} end={item.endDate} lang={lang} />
                </div>
                {(item.role || item.technologies) ? <p className="text-[10px] text-slate-600">{[item.role, item.technologies].filter(Boolean).join(' • ')}</p> : null}
                {item.description ? <div className="mt-1"><TextBlock value={item.description} /></div> : null}
                {item.link ? <div className="mt-1 text-[10px]"><LinkText href={item.link} label={c.link} /></div> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {d.volunteering.length ? (
        <Section title={c.volunteering}>
          <div className="space-y-3">
            {d.volunteering.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-bold">{item.role || item.organization}</h3>
                  <DateRange start={item.startDate} end={item.endDate} current={item.isCurrent} lang={lang} />
                </div>
                <p className="text-[10px] text-slate-600">{item.organization}</p>
                {item.description ? <TextBlock value={item.description} /> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {d.research.length ? (
        <Section title={c.research}>
          <div className="space-y-3">
            {d.research.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-bold">{item.title}</h3>
                  <DateRange start={item.startDate} end={item.endDate} current={item.isCurrent} lang={lang} />
                </div>
                <p className="text-[10px] text-slate-600">{item.organization}</p>
                {item.description ? <TextBlock value={item.description} /> : null}
                {item.link ? <div className="mt-1 text-[10px]"><LinkText href={item.link} label={c.link} /></div> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {d.publications.length ? (
        <Section title={c.publications}>
          <div className="space-y-2">
            {d.publications.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-bold">{item.title}</h3>
                  {item.date ? <span className="text-[10px] text-slate-500">{formatMonth(item.date, lang)}</span> : null}
                </div>
                <p className="text-[10px] text-slate-600">{item.publisher}</p>
                {item.description ? <TextBlock value={item.description} /> : null}
                {item.link ? <div className="mt-1 text-[10px]"><LinkText href={item.link} label={c.link} /></div> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {d.awards.length ? (
        <Section title={c.awards}>
          <div className="space-y-2">
            {d.awards.map((item) => (
              <div key={item.id} className="break-inside-avoid">
                <div className="flex flex-wrap justify-between gap-3"><strong>{item.title}</strong>{item.date ? <span className="text-[10px] text-slate-500">{formatMonth(item.date, lang)}</span> : null}</div>
                <p className="text-[10px] text-slate-600">{item.issuer}</p>
                {item.description ? <TextBlock value={item.description} /> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}

function CompactSections({ draft }: { draft: CVDraft }) {
  const d = draft.data;
  const c = copy[draft.outputLang];
  return (
    <>
      {d.skills.length ? <Section title={c.skills}><p>{d.skills.filter((x) => x.name).map((x) => `${x.name} (${c[x.level]})`).join(' • ')}</p></Section> : null}
      {d.languages.length ? <Section title={c.languages}><p>{d.languages.filter((x) => x.name).map((x) => `${x.name} (${c[x.proficiency]})`).join(' • ')}</p></Section> : null}
      {d.certifications.length ? (
        <Section title={c.certifications}>
          <div className="space-y-1.5">{d.certifications.map((x) => <div key={x.id}><strong>{x.name}</strong>{x.issuer ? ` — ${x.issuer}` : ''}{x.date ? ` (${formatMonth(x.date, draft.outputLang)})` : ''}</div>)}</div>
        </Section>
      ) : null}
      {d.references.length ? (
        <Section title={c.references}>
          <div className="space-y-2">{d.references.map((x) => <div key={x.id}><strong>{x.name}</strong>{x.role ? ` — ${x.role}` : ''}{x.organization ? `, ${x.organization}` : ''}<div dir="ltr" className="text-[10px] text-slate-600">{[x.email, x.phone].filter(Boolean).join(' • ')}</div></div>)}</div>
        </Section>
      ) : null}
    </>
  );
}

function AtsTemplate({ draft }: { draft: CVDraft }) {
  return (
    <div className="space-y-4">
      <Header draft={draft} compact />
      <CoreSections draft={draft} />
      <CompactSections draft={draft} />
    </div>
  );
}

function ModernTemplate({ draft }: { draft: CVDraft }) {
  const c = copy[draft.outputLang];
  const d = draft.data;
  return (
    <div>
      <div className="rounded-xl bg-slate-900 p-6 text-white print:rounded-none">
        <Header draft={draft} showPhoto />
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_180px] print:grid-cols-[minmax(0,1fr)_170px]">
        <div className="space-y-4"><CoreSections draft={draft} /></div>
        <aside className="space-y-4">
          {d.skills.length ? <Section title={c.skills}><div className="space-y-1">{d.skills.filter((x) => x.name).map((x) => <div key={x.id}><strong>{x.name}</strong><div className="text-[9px] text-slate-500">{c[x.level]}</div></div>)}</div></Section> : null}
          {d.languages.length ? <Section title={c.languages}><div className="space-y-1">{d.languages.filter((x) => x.name).map((x) => <div key={x.id}>{x.name} <span className="text-slate-500">— {c[x.proficiency]}</span></div>)}</div></Section> : null}
          {d.certifications.length ? <Section title={c.certifications}><div className="space-y-2">{d.certifications.map((x) => <div key={x.id}><strong>{x.name}</strong><div className="text-[9px] text-slate-500">{x.issuer}</div></div>)}</div></Section> : null}
        </aside>
      </div>
    </div>
  );
}

function AcademicTemplate({ draft }: { draft: CVDraft }) {
  return (
    <div className="space-y-5 font-serif">
      <div className="text-center"><Header draft={draft} /></div>
      <CoreSections draft={draft} />
      <CompactSections draft={draft} />
    </div>
  );
}

export function CVPreview({ draft }: Props) {
  const dir = draft.outputLang === 'en' ? 'ltr' : 'rtl';
  const isEmpty = !draft.data.personal.fullName && !draft.data.personal.email && !draft.data.personal.phone &&
    !draft.data.personal.summary && !draft.data.experience.length && !draft.data.education.length &&
    !draft.data.projects.length && !draft.data.skills.length && !draft.data.languages.length &&
    !draft.data.certifications.length && !draft.data.awards.length && !draft.data.volunteering.length &&
    !draft.data.research.length && !draft.data.publications.length && !draft.data.references.length;

  const Template: React.ComponentType<{ draft: CVDraft }> =
    draft.template === 'modern' ? ModernTemplate : draft.template === 'academic' ? AcademicTemplate : AtsTemplate;

  return (
    <div
      id="cv-print-sheet"
      data-cv-paper={draft.paperSize}
      lang={draft.outputLang}
      dir={dir}
      className={`cv-print-sheet relative mx-auto w-full overflow-hidden bg-white text-slate-800 shadow-2xl print:shadow-none ${
        draft.paperSize === 'letter' ? 'cv-paper-letter' : 'cv-paper-a4'
      }`}
    >
      {isEmpty ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-white/90 p-8 text-center text-sm text-slate-400 print:hidden">
          {copy[draft.outputLang].empty}
        </div>
      ) : null}
      <div className="p-8 text-[11px] leading-relaxed sm:p-10 print:p-0">
        <Template draft={draft} />
      </div>
    </div>
  );
}
