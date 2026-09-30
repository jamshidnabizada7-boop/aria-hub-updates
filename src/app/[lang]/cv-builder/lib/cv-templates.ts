import type { CVPurpose, TemplateCategory, TemplateType } from '../types';

export interface CVTemplateDefinition {
  id: TemplateType;
  name: string;
  category: TemplateCategory;
  description: string;
  bestFor: string;
  supportsPhoto: boolean;
  atsFocused: boolean;
}

export const CV_TEMPLATES: CVTemplateDefinition[] = [
  { id: 'ats-simple', name: 'ATS Simple', category: 'ats', description: 'Clean single-column layout with conservative typography and no decorative sidebar.', bestFor: 'Most online job applications', supportsPhoto: false, atsFocused: true },
  { id: 'ats-compact', name: 'ATS Compact', category: 'ats', description: 'Dense single-column structure for experienced candidates with more content.', bestFor: 'Information-heavy professional CVs', supportsPhoto: false, atsFocused: true },
  { id: 'modern-sidebar', name: 'Modern Sidebar', category: 'professional', description: 'Strong identity header with a dedicated skills and language sidebar.', bestFor: 'General professional applications', supportsPhoto: true, atsFocused: false },
  { id: 'executive', name: 'Executive', category: 'professional', description: 'Corporate hierarchy, strong section rules and date-aligned career history.', bestFor: 'Experienced professionals and managers', supportsPhoto: true, atsFocused: false },
  { id: 'minimal-elegant', name: 'Minimal Elegant', category: 'professional', description: 'Editorial whitespace, understated typography and a centered identity block.', bestFor: 'Consulting, communications and design-adjacent roles', supportsPhoto: true, atsFocused: false },
  { id: 'tech-profile', name: 'Tech Profile', category: 'student', description: 'Projects and technical skills are promoted ahead of traditional work history.', bestFor: 'Software, data and technical internships', supportsPhoto: true, atsFocused: false },
  { id: 'academic-research', name: 'Academic Research', category: 'academic', description: 'Research-first academic structure emphasizing education, publications and scholarship.', bestFor: 'Research, Masters and PhD applications', supportsPhoto: false, atsFocused: false },
  { id: 'scholarship-profile', name: 'Scholarship Profile', category: 'academic', description: 'Balanced academic profile emphasizing education, awards, leadership and languages.', bestFor: 'Scholarships and fellowships', supportsPhoto: true, atsFocused: false },
  { id: 'chronological-classic', name: 'Chronological Classic', category: 'professional', description: 'Traditional reverse-chronological format with clear roles, employers and dates.', bestFor: 'Career progression and established work history', supportsPhoto: false, atsFocused: true },
  { id: 'skills-first', name: 'Skills First', category: 'professional', description: 'Highlights transferable skills and projects before employment history.', bestFor: 'Career changers and applicants with employment gaps', supportsPhoto: false, atsFocused: false },
  { id: 'european-classic', name: 'European Classic', category: 'professional', description: 'Structured European-style CV with prominent personal details and qualifications.', bestFor: 'European programs and international applications', supportsPhoto: true, atsFocused: false },
];

export const CV_TEMPLATE_BY_ID = Object.fromEntries(CV_TEMPLATES.map((template) => [template.id, template])) as Record<TemplateType, CVTemplateDefinition>;

export const DEFAULT_TEMPLATE_BY_PURPOSE: Record<CVPurpose, TemplateType> = {
  professional: 'ats-simple',
  student: 'tech-profile',
  scholarship: 'academic-research',
};

export const RECOMMENDED_TEMPLATES_BY_PURPOSE: Record<CVPurpose, TemplateType[]> = {
  professional: ['ats-simple', 'chronological-classic', 'modern-sidebar'],
  student: ['tech-profile', 'ats-simple', 'skills-first'],
  scholarship: ['academic-research', 'scholarship-profile', 'european-classic'],
};
