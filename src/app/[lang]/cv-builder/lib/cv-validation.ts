import type { CVDraft, CVIssue, CVReadiness, CVSectionKey } from '../types';
import { safeExternalUrl } from './cv-utils';
import { CV_TEMPLATE_BY_ID } from './cv-templates';

const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function add(issues:CVIssue[],issue:CVIssue){ issues.push(issue); }
function dateIsAfter(start:string,end:string){ return /^\d{4}-\d{2}$/.test(start)&&/^\d{4}-\d{2}$/.test(end)&&start>end; }
function label(...parts:(string|undefined)[]){ return parts.map(x=>x?.trim()).filter(Boolean).join(' — ') || undefined; }

function sectionDone(draft:CVDraft,section:CVSectionKey):boolean{
  const d=draft.data;
  switch(section){
    case 'personal': return Boolean(d.personal.fullName&&(d.personal.email||d.personal.phone));
    case 'summary': return Boolean(d.personal.summary.trim());
    case 'experience': return d.experience.some(x=>Boolean(x.role||x.company));
    case 'education': return d.education.some(x=>Boolean(x.degree||x.institution));
    case 'projects': return d.projects.some(x=>Boolean(x.name));
    case 'skills': return d.skills.some(x=>Boolean(x.name));
    case 'languages': return d.languages.some(x=>Boolean(x.name));
    case 'certifications': return d.certifications.some(x=>Boolean(x.name));
    case 'awards': return d.awards.some(x=>Boolean(x.title));
    case 'volunteering': return d.volunteering.some(x=>Boolean(x.role||x.organization));
    case 'research': return d.research.some(x=>Boolean(x.title));
    case 'publications': return d.publications.some(x=>Boolean(x.title));
    case 'references': return d.references.some(x=>Boolean(x.name));
  }
}

export function getRecommendedSections(draft:CVDraft):CVSectionKey[]{
  if(draft.purpose==='scholarship') return ['personal','summary','education','research','publications','awards','projects','volunteering','skills','languages'];
  if(draft.purpose==='student') return ['personal','summary','education','projects','experience','volunteering','awards','skills','languages'];
  return ['personal','summary','experience','education','projects','skills','languages','certifications'];
}

export function validateDraft(draft:CVDraft):CVReadiness{
  const issues:CVIssue[]=[]; const d=draft.data;
  if(!d.personal.fullName.trim()) add(issues,{id:'full-name-required',severity:'error',section:'personal',messageKey:'issues.fullNameRequired',field:'fullName',anchorId:'cv-full-name'});
  if(!d.personal.email.trim()&&!d.personal.phone.trim()) add(issues,{id:'contact-required',severity:'error',section:'personal',messageKey:'issues.contactRequired',anchorId:'cv-email'});
  if(d.personal.email&&!EMAIL_RE.test(d.personal.email.trim())) add(issues,{id:'email-invalid',severity:'error',section:'personal',messageKey:'issues.emailInvalid',field:'email',anchorId:'cv-email'});
  if(!d.personal.headline.trim()) add(issues,{id:'headline-missing',severity:'warning',section:'personal',messageKey:'issues.headlineMissing',field:'headline',anchorId:'cv-headline'});
  const summaryWords=d.personal.summary.trim().split(/\s+/).filter(Boolean).length;
  if(!summaryWords) add(issues,{id:'summary-missing',severity:'warning',section:'summary',messageKey:'issues.summaryMissing',anchorId:'cv-summary'});
  else if(summaryWords>100) add(issues,{id:'summary-long',severity:'warning',section:'summary',messageKey:'issues.summaryLong',anchorId:'cv-summary'});

  const substantive=d.experience.length||d.education.length||d.projects.length||d.research.length||d.publications.length||d.volunteering.length||d.awards.length;
  if(!substantive) add(issues,{id:'content-required',severity:'error',section:'document',messageKey:'issues.contentRequired',anchorId:'cv-section-education'});

  d.socialLinks.forEach(item=>{ if(item.url&&!safeExternalUrl(item.url)) add(issues,{id:`social-url-${item.id}`,severity:'error',section:'personal',messageKey:'issues.urlInvalid',field:'url',itemId:item.id,itemLabel:item.platform||'Social link',anchorId:`social-url-${item.id}`}); });
  d.projects.forEach(item=>{
    if(item.link&&!safeExternalUrl(item.link)) add(issues,{id:`project-url-${item.id}`,severity:'error',section:'projects',messageKey:'issues.urlInvalid',field:'link',itemId:item.id,itemLabel:item.name||'Project',anchorId:`project-link-${item.id}`});
    if(dateIsAfter(item.startDate,item.endDate)) add(issues,{id:`project-date-${item.id}`,severity:'error',section:'projects',messageKey:'issues.dateOrderInvalid',field:'endDate',itemId:item.id,itemLabel:item.name||'Project',anchorId:`project-end-${item.id}`});
  });
  d.certifications.forEach(item=>{ if(item.credentialUrl&&!safeExternalUrl(item.credentialUrl)) add(issues,{id:`cert-url-${item.id}`,severity:'error',section:'certifications',messageKey:'issues.urlInvalid',field:'credentialUrl',itemId:item.id,itemLabel:item.name||'Certification',anchorId:`cert-url-${item.id}`}); });
  d.research.forEach(item=>{
    if(item.link&&!safeExternalUrl(item.link)) add(issues,{id:`research-url-${item.id}`,severity:'error',section:'research',messageKey:'issues.urlInvalid',field:'link',itemId:item.id,itemLabel:item.title||'Research',anchorId:`research-link-${item.id}`});
    if(!item.isCurrent&&dateIsAfter(item.startDate,item.endDate)) add(issues,{id:`research-date-${item.id}`,severity:'error',section:'research',messageKey:'issues.dateOrderInvalid',field:'endDate',itemId:item.id,itemLabel:item.title||'Research',anchorId:`research-${item.id}-end`});
  });
  d.publications.forEach(item=>{ if(item.link&&!safeExternalUrl(item.link)) add(issues,{id:`publication-url-${item.id}`,severity:'error',section:'publications',messageKey:'issues.urlInvalid',field:'link',itemId:item.id,itemLabel:item.title||'Publication',anchorId:`pub-link-${item.id}`}); });
  d.experience.forEach(item=>{
    if(!item.isCurrent&&dateIsAfter(item.startDate,item.endDate)) add(issues,{id:`experience-date-${item.id}`,severity:'error',section:'experience',messageKey:'issues.dateOrderInvalid',field:'endDate',itemId:item.id,itemLabel:label(item.role,item.company),anchorId:`exp-${item.id}-end`});
    if((item.role||item.company)&&!item.description.trim()) add(issues,{id:`experience-description-${item.id}`,severity:'warning',section:'experience',messageKey:'issues.achievementMissing',field:'description',itemId:item.id,itemLabel:label(item.role,item.company),anchorId:`exp-desc-${item.id}`});
  });
  d.education.forEach(item=>{ if(!item.isCurrent&&dateIsAfter(item.startDate,item.endDate)) add(issues,{id:`education-date-${item.id}`,severity:'error',section:'education',messageKey:'issues.dateOrderInvalid',field:'endDate',itemId:item.id,itemLabel:label(item.degree,item.institution),anchorId:`edu-${item.id}-end`}); });
  d.volunteering.forEach(item=>{ if(!item.isCurrent&&dateIsAfter(item.startDate,item.endDate)) add(issues,{id:`volunteering-date-${item.id}`,severity:'error',section:'volunteering',messageKey:'issues.dateOrderInvalid',field:'endDate',itemId:item.id,itemLabel:label(item.role,item.organization),anchorId:`vol-${item.id}-end`}); });

  if(d.skills.length>20) add(issues,{id:'too-many-skills',severity:'warning',section:'skills',messageKey:'issues.tooManySkills',anchorId:'cv-section-skills'});
  const skills=d.skills.map(x=>x.name.trim().toLowerCase()).filter(Boolean);
  if(new Set(skills).size!==skills.length) add(issues,{id:'duplicate-skills',severity:'warning',section:'skills',messageKey:'issues.duplicateSkills',anchorId:'cv-section-skills'});
  const template=CV_TEMPLATE_BY_ID[draft.template];
  if(!template.atsFocused) add(issues,{id:'visual-template-ats',severity:'info',section:'document',messageKey:'issues.visualTemplateAts',itemLabel:template.name,anchorId:'cv-template-button'});
  if(template.atsFocused&&draft.data.personal.picture&&draft.appearance.showPhoto) add(issues,{id:'ats-photo',severity:'info',section:'personal',messageKey:'issues.atsPhoto',anchorId:'cv-photo'});

  const recommended=getRecommendedSections(draft);
  const completion=Math.round((recommended.filter(section=>sectionDone(draft,section)).length/recommended.length)*100);
  const errorCount=issues.filter(x=>x.severity==='error').length, warningCount=issues.filter(x=>x.severity==='warning').length, infoCount=issues.filter(x=>x.severity==='info').length;
  return { completion, canExport:errorCount===0, issues, errorCount, warningCount, infoCount, health:errorCount?'blocked':warningCount?'attention':'good' };
}
