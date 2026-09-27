import type { CVDraft, CVIssue, CVReadiness, CVSectionKey } from '../types';
import { safeExternalUrl } from './cv-utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function push(issues: CVIssue[], id: string, severity: CVIssue['severity'], section: CVIssue['section'], messageKey: string, field?: string) {
  issues.push({ id, severity, section, messageKey, field });
}

function dateIsAfter(start: string, end: string) {
  return /^\d{4}-\d{2}$/.test(start) && /^\d{4}-\d{2}$/.test(end) && start > end;
}

function sectionDone(draft: CVDraft, section: CVSectionKey): boolean {
  const d = draft.data;
  switch (section) {
    case 'personal': return Boolean(d.personal.fullName && (d.personal.email || d.personal.phone));
    case 'summary': return Boolean(d.personal.summary.trim());
    case 'experience': return d.experience.some((x) => Boolean(x.role || x.company));
    case 'education': return d.education.some((x) => Boolean(x.degree || x.institution));
    case 'projects': return d.projects.some((x) => Boolean(x.name));
    case 'skills': return d.skills.some((x) => Boolean(x.name));
    case 'languages': return d.languages.some((x) => Boolean(x.name));
    case 'certifications': return d.certifications.some((x) => Boolean(x.name));
    case 'awards': return d.awards.some((x) => Boolean(x.title));
    case 'volunteering': return d.volunteering.some((x) => Boolean(x.role || x.organization));
    case 'research': return d.research.some((x) => Boolean(x.title));
    case 'publications': return d.publications.some((x) => Boolean(x.title));
    case 'references': return d.references.some((x) => Boolean(x.name));
  }
}

export function getRecommendedSections(draft: CVDraft): CVSectionKey[] {
  if (draft.purpose === 'scholarship') return ['personal', 'summary', 'education', 'research', 'publications', 'awards', 'projects', 'skills', 'languages'];
  if (draft.purpose === 'student') return ['personal', 'summary', 'education', 'projects', 'experience', 'volunteering', 'awards', 'skills', 'languages'];
  return ['personal', 'summary', 'experience', 'education', 'projects', 'skills', 'languages', 'certifications'];
}

export function validateDraft(draft: CVDraft): CVReadiness {
  const issues: CVIssue[] = [];
  const d = draft.data;

  if (!d.personal.fullName.trim()) push(issues, 'full-name-required', 'error', 'personal', 'issues.fullNameRequired', 'fullName');
  if (!d.personal.email.trim() && !d.personal.phone.trim()) push(issues, 'contact-required', 'error', 'personal', 'issues.contactRequired');
  if (d.personal.email && !EMAIL_RE.test(d.personal.email.trim())) push(issues, 'email-invalid', 'error', 'personal', 'issues.emailInvalid', 'email');
  if (!d.personal.headline.trim()) push(issues, 'headline-missing', 'warning', 'personal', 'issues.headlineMissing', 'headline');

  const summaryWords = d.personal.summary.trim().split(/\s+/).filter(Boolean).length;
  if (!summaryWords) push(issues, 'summary-missing', 'warning', 'summary', 'issues.summaryMissing');
  else if (summaryWords > 120) push(issues, 'summary-long', 'warning', 'summary', 'issues.summaryLong');

  const substantive = d.experience.length || d.education.length || d.projects.length || d.research.length || d.publications.length || d.volunteering.length || d.awards.length;
  if (!substantive) push(issues, 'content-required', 'error', 'document', 'issues.contentRequired');

  d.socialLinks.forEach((link) => {
    if (link.url && !safeExternalUrl(link.url)) push(issues, `social-url-${link.id}`, 'error', 'personal', 'issues.urlInvalid', link.id);
  });
  d.projects.forEach((item) => {
    if (item.link && !safeExternalUrl(item.link)) push(issues, `project-url-${item.id}`, 'error', 'projects', 'issues.urlInvalid', item.id);
    if (dateIsAfter(item.startDate, item.endDate)) push(issues, `project-date-${item.id}`, 'error', 'projects', 'issues.dateOrderInvalid', item.id);
  });
  d.certifications.forEach((item) => {
    if (item.credentialUrl && !safeExternalUrl(item.credentialUrl)) push(issues, `cert-url-${item.id}`, 'error', 'certifications', 'issues.urlInvalid', item.id);
  });
  d.research.forEach((item) => {
    if (item.link && !safeExternalUrl(item.link)) push(issues, `research-url-${item.id}`, 'error', 'research', 'issues.urlInvalid', item.id);
    if (!item.isCurrent && dateIsAfter(item.startDate, item.endDate)) push(issues, `research-date-${item.id}`, 'error', 'research', 'issues.dateOrderInvalid', item.id);
  });
  d.publications.forEach((item) => {
    if (item.link && !safeExternalUrl(item.link)) push(issues, `publication-url-${item.id}`, 'error', 'publications', 'issues.urlInvalid', item.id);
  });
  d.experience.forEach((item) => {
    if (!item.isCurrent && dateIsAfter(item.startDate, item.endDate)) push(issues, `experience-date-${item.id}`, 'error', 'experience', 'issues.dateOrderInvalid', item.id);
    if ((item.role || item.company) && !item.description.trim()) push(issues, `experience-description-${item.id}`, 'warning', 'experience', 'issues.achievementMissing', item.id);
  });
  d.education.forEach((item) => {
    if (!item.isCurrent && dateIsAfter(item.startDate, item.endDate)) push(issues, `education-date-${item.id}`, 'error', 'education', 'issues.dateOrderInvalid', item.id);
  });
  d.volunteering.forEach((item) => {
    if (!item.isCurrent && dateIsAfter(item.startDate, item.endDate)) push(issues, `volunteering-date-${item.id}`, 'error', 'volunteering', 'issues.dateOrderInvalid', item.id);
  });

  if (d.skills.length > 20) push(issues, 'too-many-skills', 'warning', 'skills', 'issues.tooManySkills');
  const skills = d.skills.map((x) => x.name.trim().toLowerCase()).filter(Boolean);
  if (new Set(skills).size !== skills.length) push(issues, 'duplicate-skills', 'warning', 'skills', 'issues.duplicateSkills');
  if (draft.template !== 'ats') push(issues, 'visual-template-ats', 'info', 'document', 'issues.visualTemplateAts');
  if (draft.template === 'ats' && d.personal.picture) push(issues, 'ats-photo', 'info', 'personal', 'issues.atsPhoto');

  const recommended = getRecommendedSections(draft);
  const completion = Math.round((recommended.filter((section) => sectionDone(draft, section)).length / recommended.length) * 100);

  return { completion, canExport: !issues.some((issue) => issue.severity === 'error'), issues };
}
