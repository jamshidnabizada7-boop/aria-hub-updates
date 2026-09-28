import type { CVDraft, CVOutputLang, TemplateType } from '../types';
import { formatMonth, safeExternalUrl, safeImageDataUrl } from './cv-utils';
import { CV_TEMPLATE_BY_ID } from './cv-templates';
import { DEFAULT_CV_BUILDER_ADMIN_CONFIG, isCVSectionEnabled, type CVBuilderAdminConfig } from './cv-admin-config';

const copy:Record<CVOutputLang,Record<string,string>>={
  en:{summary:'Professional Summary',experience:'Experience',education:'Education',projects:'Projects',skills:'Skills',languages:'Languages',certifications:'Certifications',awards:'Awards & Honors',volunteering:'Volunteering & Leadership',research:'Research',publications:'Publications',references:'References',current:'Present',beginner:'Beginner',intermediate:'Intermediate',expert:'Expert',basic:'Basic',fluent:'Fluent',native:'Native',link:'Link'},
  fa:{summary:'خلاصه حرفه‌ای',experience:'تجربه کاری',education:'تحصیلات',projects:'پروژه‌ها',skills:'مهارت‌ها',languages:'زبان‌ها',certifications:'گواهینامه‌ها',awards:'جوایز و افتخارات',volunteering:'فعالیت داوطلبانه و رهبری',research:'پژوهش',publications:'انتشارات',references:'معرف‌ها',current:'اکنون',beginner:'مبتدی',intermediate:'متوسط',expert:'ماهر',basic:'ابتدایی',fluent:'روان',native:'زبان مادری',link:'لینک'},
  ps:{summary:'مسلکي لنډیز',experience:'کاري تجربه',education:'زده کړې',projects:'پروژې',skills:'مهارتونه',languages:'ژبې',certifications:'سندونه',awards:'جایزې او ویاړونه',volunteering:'رضاکارانه کار او مشري',research:'څېړنه',publications:'خپرونې',references:'مراجع',current:'اوس',beginner:'پیل کونکی',intermediate:'منځنی',expert:'ماهر',basic:'بنسټیز',fluent:'روان',native:'مورنۍ ژبه',link:'لینک'},
};

const accent:Record<string,string>={navy:'#172554',blue:'#1d4ed8',emerald:'#047857',burgundy:'#881337',neutral:'#334155'};
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch));
const rich=(value:string)=>`<div class="cv-rich">${esc(value).replace(/\n/g,'<br>')}</div>`;
const url=(value:string)=>safeExternalUrl(value);
const link=(href:string,label:string)=>{const safe=url(href);return safe?`<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`:'';};
const image=(value:string)=>{const safe=safeImageDataUrl(value);return safe?`<img class="cv-photo" src="${safe}" alt="">`:'';};

function dateRange(start:string,end:string,current:boolean,lang:CVOutputLang){ if(!start&&!end&&!current)return''; const c=copy[lang]; return `<span class="cv-date">${start?esc(formatMonth(start,lang)):''}${start&&(end||current)?' – ':''}${current?esc(c.current):end?esc(formatMonth(end,lang)):''}</span>`; }
function section(title:string,body:string,key:string){ return body?`<section class="cv-section cv-section-${key}"><h2>${esc(title)}</h2>${body}</section>`:''; }
function entries(items:string[]){const body=items.filter(Boolean).join('');return body?`<div class="cv-entries">${body}</div>`:'';}

function buildParts(draft:CVDraft, config:CVBuilderAdminConfig){
  const d=draft.data,c=copy[draft.outputLang],lang=draft.outputLang;
  const enabled=(key: Parameters<typeof isCVSectionEnabled>[1])=>isCVSectionEnabled(config,key);
  const experience=enabled('experience')?section(c.experience,entries(d.experience.map(x=>`<article class="cv-entry"><div class="cv-entry-head"><h3>${esc(x.role||x.company)}</h3>${dateRange(x.startDate,x.endDate,x.isCurrent,lang)}</div><div class="cv-meta">${esc([x.company,x.location].filter(Boolean).join(' • '))}</div>${x.description?rich(x.description):''}</article>`)),'experience'):'';
  const education=enabled('education')?section(c.education,entries(d.education.map(x=>`<article class="cv-entry"><div class="cv-entry-head"><h3>${esc(x.degree||x.institution)}</h3>${dateRange(x.startDate,x.endDate,x.isCurrent,lang)}</div><div class="cv-meta">${esc([x.institution,x.location].filter(Boolean).join(' • '))}</div>${x.description?rich(x.description):''}</article>`)),'education'):'';
  const projects=enabled('projects')?section(c.projects,entries(d.projects.map(x=>`<article class="cv-entry"><div class="cv-entry-head"><h3>${esc(x.name)}</h3>${dateRange(x.startDate,x.endDate,false,lang)}</div><div class="cv-meta">${esc([x.role,x.technologies].filter(Boolean).join(' • '))}</div>${x.description?rich(x.description):''}${x.link?`<div class="cv-link">${link(x.link,c.link)}</div>`:''}</article>`)),'projects'):'';
  const volunteering=enabled('volunteering')?section(c.volunteering,entries(d.volunteering.map(x=>`<article class="cv-entry"><div class="cv-entry-head"><h3>${esc(x.role||x.organization)}</h3>${dateRange(x.startDate,x.endDate,x.isCurrent,lang)}</div><div class="cv-meta">${esc(x.organization)}</div>${x.description?rich(x.description):''}</article>`)),'volunteering'):'';
  const research=enabled('research')?section(c.research,entries(d.research.map(x=>`<article class="cv-entry"><div class="cv-entry-head"><h3>${esc(x.title)}</h3>${dateRange(x.startDate,x.endDate,x.isCurrent,lang)}</div><div class="cv-meta">${esc(x.organization)}</div>${x.description?rich(x.description):''}${x.link?`<div class="cv-link">${link(x.link,c.link)}</div>`:''}</article>`)),'research'):'';
  const publications=enabled('publications')?section(c.publications,entries(d.publications.map(x=>`<article class="cv-entry"><div class="cv-entry-head"><h3>${esc(x.title)}</h3>${x.date?`<span class="cv-date">${esc(formatMonth(x.date,lang))}</span>`:''}</div><div class="cv-meta">${esc(x.publisher)}</div>${x.description?rich(x.description):''}${x.link?`<div class="cv-link">${link(x.link,c.link)}</div>`:''}</article>`)),'publications'):'';
  const awards=enabled('awards')?section(c.awards,entries(d.awards.map(x=>`<article class="cv-entry"><div class="cv-entry-head"><h3>${esc(x.title)}</h3>${x.date?`<span class="cv-date">${esc(formatMonth(x.date,lang))}</span>`:''}</div><div class="cv-meta">${esc(x.issuer)}</div>${x.description?rich(x.description):''}</article>`)),'awards'):'';
  const skills=enabled('skills')?section(c.skills,d.skills.length?`<div class="cv-tags">${d.skills.filter(x=>x.name).map(x=>`<span><b>${esc(x.name)}</b><small>${esc(c[x.level])}</small></span>`).join('')}</div>`:'','skills'):'';
  const languages=enabled('languages')?section(c.languages,d.languages.length?`<div class="cv-list">${d.languages.filter(x=>x.name).map(x=>`<div><b>${esc(x.name)}</b><span>${esc(c[x.proficiency])}</span></div>`).join('')}</div>`:'','languages'):'';
  const certifications=enabled('certifications')?section(c.certifications,entries(d.certifications.map(x=>`<article class="cv-entry cv-entry-small"><div class="cv-entry-head"><h3>${esc(x.name)}</h3>${x.date?`<span class="cv-date">${esc(formatMonth(x.date,lang))}</span>`:''}</div><div class="cv-meta">${esc(x.issuer)}</div>${x.credentialUrl?`<div class="cv-link">${link(x.credentialUrl,c.link)}</div>`:''}</article>`)),'certifications'):'';
  const references=enabled('references')?section(c.references,entries(d.references.map(x=>`<article class="cv-entry cv-entry-small"><h3>${esc(x.name)}</h3><div class="cv-meta">${esc([x.role,x.organization].filter(Boolean).join(' • '))}</div><div class="cv-contact-line" dir="ltr">${esc([x.email,x.phone].filter(Boolean).join(' • '))}</div></article>`)),'references'):'';
  const summary=enabled('summary')&&d.personal.summary?section(c.summary,rich(d.personal.summary),'summary'):'';
  return {summary,experience,education,projects,volunteering,research,publications,awards,skills,languages,certifications,references};
}

function header(draft:CVDraft,variant:'plain'|'dark'|'center'|'executive'|'tech',config:CVBuilderAdminConfig){
  const p=draft.data.personal,template=CV_TEMPLATE_BY_ID[draft.template],showPhoto=config.features.allowPhoto&&draft.appearance.showPhoto&&template.supportsPhoto&&p.picture;
  const contacts=[p.email?esc(p.email):'',p.phone?esc(p.phone):'',p.location?esc(p.location):''].filter(Boolean);
  const links=draft.data.socialLinks.map(x=>link(x.url,x.platform||'Link')).filter(Boolean);
  return `<header class="cv-header cv-header-${variant}">${showPhoto?image(p.picture):''}<div class="cv-identity"><h1>${esc(p.fullName||'Your Name')}</h1>${p.headline?`<div class="cv-headline">${esc(p.headline)}</div>`:''}<div class="cv-contact">${contacts.map(x=>`<span>${x}</span>`).join('')}${links.map(x=>`<span>${x}</span>`).join('')}</div></div></header>`;
}

function orderedMain(draft:CVDraft,p:any){
  if(draft.purpose==='scholarship') return p.summary+p.education+p.research+p.publications+p.awards+p.projects+p.volunteering+p.experience;
  if(draft.purpose==='student') return p.summary+p.education+p.projects+p.experience+p.volunteering+p.awards+p.research+p.publications;
  return p.summary+p.experience+p.education+p.projects+p.volunteering+p.awards+p.research+p.publications;
}

export function renderCvBody(draft:CVDraft, config:CVBuilderAdminConfig = DEFAULT_CV_BUILDER_ADMIN_CONFIG):string{
  const p=buildParts(draft,config), template=draft.template, dir=draft.outputLang==='en'?'ltr':'rtl';
  const renderedAccent=config.features.allowAccentCustomization?draft.appearance.accent:'navy';
  const renderedDensity=config.features.allowDensityCustomization?draft.appearance.density:'comfortable';
  let body='';
  switch(template){
    case 'ats-simple':
      body=header(draft,'plain',config)+`<main class="cv-main cv-main-single">${orderedMain(draft,p)}${p.skills}${p.languages}${p.certifications}${p.references}</main>`; break;
    case 'ats-compact':
      body=header(draft,'plain',config)+`<main class="cv-main cv-main-compact">${orderedMain(draft,p)}${p.skills}${p.languages}${p.certifications}${p.references}</main>`; break;
    case 'modern-sidebar':
      body=header(draft,'dark',config)+`<div class="cv-layout-sidebar"><main>${orderedMain(draft,p)}</main><aside>${p.skills}${p.languages}${p.certifications}${p.references}</aside></div>`; break;
    case 'executive':
      body=header(draft,'executive',config)+`<div class="cv-executive-rule"></div><main class="cv-main cv-main-executive">${orderedMain(draft,p)}<div class="cv-inline-grid">${p.skills}${p.languages}</div>${p.certifications}${p.references}</main>`; break;
    case 'minimal-elegant':
      body=header(draft,'center',config)+`<main class="cv-main cv-main-minimal">${orderedMain(draft,p)}${p.skills}${p.languages}${p.certifications}${p.references}</main>`; break;
    case 'tech-profile':
      body=header(draft,'tech',config)+`<div class="cv-layout-tech"><main>${p.summary}${p.projects}${p.experience}${p.education}${p.research}${p.publications}${p.volunteering}${p.awards}</main><aside>${p.skills}${p.languages}${p.certifications}${p.references}</aside></div>`; break;
    case 'academic-research':
      body=header(draft,'center',config)+`<main class="cv-main cv-main-academic">${p.summary}${p.education}${p.research}${p.publications}${p.awards}${p.projects}${p.experience}${p.volunteering}${p.skills}${p.languages}${p.certifications}${p.references}</main>`; break;
    case 'scholarship-profile':
      body=header(draft,'center',config)+`<div class="cv-layout-scholarship"><main>${p.summary}${p.education}${p.projects}${p.volunteering}${p.research}${p.publications}${p.experience}</main><aside>${p.awards}${p.languages}${p.skills}${p.certifications}${p.references}</aside></div>`; break;
  }
  return `<div class="cv-document cv-template-${esc(template)} cv-density-${esc(renderedDensity)}" dir="${dir}" lang="${esc(draft.outputLang)}" style="--cv-accent:${accent[renderedAccent]}">${body}</div>`;
}

export const cvRendererCss=`
*{box-sizing:border-box}.cv-document{font-family:Arial,"Vazirmatn",sans-serif;color:#1e293b;background:white;font-size:10.5pt;line-height:1.45;width:100%;overflow:hidden}.cv-document *{min-width:0}.cv-document a{color:inherit;text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere}.cv-header{display:flex;gap:18px;align-items:center;margin-bottom:22px}.cv-identity{flex:1;min-width:0}.cv-header h1{font-size:28pt;line-height:1.05;margin:0;color:#0f172a;overflow-wrap:anywhere}.cv-headline{font-size:11pt;font-weight:600;color:#475569;margin-top:6px;overflow-wrap:anywhere}.cv-contact{display:flex;flex-wrap:wrap;gap:5px 14px;margin-top:9px;font-size:8.5pt;color:#475569}.cv-contact span{overflow-wrap:anywhere}.cv-photo{width:78px;height:78px;border-radius:50%;object-fit:cover;flex:none}.cv-header-dark,.cv-header-tech{background:#0f172a;color:white;padding:24px;border-radius:14px}.cv-header-dark h1,.cv-header-tech h1{color:white}.cv-header-dark .cv-headline,.cv-header-dark .cv-contact,.cv-header-tech .cv-headline,.cv-header-tech .cv-contact{color:#e2e8f0}.cv-header-center{display:block;text-align:center;padding:4px 0 14px}.cv-header-center .cv-photo{display:block;margin:0 auto 12px}.cv-header-center .cv-contact{justify-content:center}.cv-header-executive{border-inline-start:8px solid var(--cv-accent);padding-inline-start:18px}.cv-header-executive h1{font-size:31pt}.cv-executive-rule{height:2px;background:var(--cv-accent);margin:-8px 0 22px}.cv-section{break-inside:auto;margin:0 0 17px;overflow:hidden}.cv-section h2{break-after:avoid-page;page-break-after:avoid;font-size:10pt;text-transform:uppercase;letter-spacing:.11em;color:#0f172a;margin:0 0 8px;padding-bottom:4px;border-bottom:1px solid #cbd5e1;overflow-wrap:anywhere}.cv-entry{margin:0 0 11px;break-inside:avoid;overflow:hidden}.cv-entry:last-child{margin-bottom:0}.cv-entry-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}.cv-entry h3{font-size:10.5pt;margin:0;color:#0f172a;overflow-wrap:anywhere}.cv-date{font-size:8pt;color:#64748b;white-space:nowrap;flex:none}.cv-meta{font-size:8.5pt;color:#64748b;margin:2px 0 4px;overflow-wrap:anywhere}.cv-rich{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;max-width:100%}.cv-link{font-size:8.5pt;margin-top:3px}.cv-tags{display:flex;flex-wrap:wrap;gap:6px}.cv-tags span{display:inline-flex;gap:5px;align-items:center;padding:4px 7px;border:1px solid #cbd5e1;border-radius:6px;max-width:100%;overflow-wrap:anywhere}.cv-tags small{color:#64748b}.cv-list{display:grid;gap:5px}.cv-list>div{display:flex;justify-content:space-between;gap:8px}.cv-list span{color:#64748b}.cv-contact-line{font-size:8.5pt;color:#64748b;overflow-wrap:anywhere}.cv-layout-sidebar,.cv-layout-tech,.cv-layout-scholarship{display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:22px;align-items:start}.cv-layout-sidebar aside,.cv-layout-tech aside,.cv-layout-scholarship aside{background:#f8fafc;padding:14px;border-radius:10px}.cv-layout-sidebar aside .cv-section h2,.cv-layout-tech aside .cv-section h2,.cv-layout-scholarship aside .cv-section h2{color:var(--cv-accent);border-color:#cbd5e1}.cv-main-single{display:block}.cv-main-compact .cv-section{margin-bottom:11px}.cv-main-compact .cv-entry{margin-bottom:7px}.cv-inline-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.cv-main-executive .cv-section h2{color:var(--cv-accent);font-size:10.5pt;border-bottom:2px solid var(--cv-accent)}.cv-template-minimal-elegant{font-family:Georgia,"Vazirmatn",serif;font-size:10.5pt}.cv-template-minimal-elegant .cv-header h1{font-family:Georgia,"Vazirmatn",serif;font-weight:500;font-size:30pt}.cv-template-minimal-elegant .cv-section{margin-bottom:24px}.cv-template-minimal-elegant .cv-section h2{text-align:center;border:0;font-weight:500;color:var(--cv-accent)}.cv-template-tech-profile .cv-section h2{color:var(--cv-accent);border-bottom:2px solid var(--cv-accent)}.cv-template-tech-profile .cv-tags span{background:#eef2ff;border:0}.cv-template-academic-research{font-family:Georgia,"Vazirmatn",serif}.cv-template-academic-research .cv-section h2{text-transform:none;letter-spacing:0;font-size:12pt;color:#111827;border-bottom:1px solid #111827}.cv-template-academic-research .cv-header h1{font-family:Georgia,"Vazirmatn",serif}.cv-template-scholarship-profile .cv-header{border-bottom:4px solid var(--cv-accent);padding-bottom:18px}.cv-template-scholarship-profile .cv-section h2{color:var(--cv-accent)}.cv-template-ats-simple .cv-photo,.cv-template-ats-compact .cv-photo{display:none}.cv-template-ats-simple .cv-section h2,.cv-template-ats-compact .cv-section h2{letter-spacing:.05em}.cv-density-compact{font-size:9.5pt;line-height:1.35}.cv-density-compact .cv-section{margin-bottom:11px}.cv-density-compact .cv-entry{margin-bottom:7px}@media(max-width:720px){.cv-layout-sidebar,.cv-layout-tech,.cv-layout-scholarship{grid-template-columns:minmax(0,1fr) 165px;gap:14px}}@media print{.cv-document{print-color-adjust:exact;-webkit-print-color-adjust:exact}.cv-entry{break-inside:avoid-page}.cv-section{break-inside:auto}}
`;

export function renderCvStandaloneHtml(draft:CVDraft,fontCss='',config:CVBuilderAdminConfig = DEFAULT_CV_BUILDER_ADMIN_CONFIG){
  const size=draft.paperSize==='letter'?'Letter':'A4';
  return `<!doctype html><html lang="${esc(draft.outputLang)}" dir="${draft.outputLang==='en'?'ltr':'rtl'}"><head><meta charset="utf-8"><style>${fontCss}@page{size:${size};margin:12mm}html,body{margin:0;padding:0;background:#fff}${cvRendererCss}</style></head><body>${renderCvBody(draft,config)}</body></html>`;
}
