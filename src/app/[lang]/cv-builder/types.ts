export const CV_SCHEMA_VERSION = 4 as const;

export type CVPurpose = 'professional' | 'student' | 'scholarship';
export type TemplateType =
  | 'ats-simple'
  | 'ats-compact'
  | 'modern-sidebar'
  | 'executive'
  | 'minimal-elegant'
  | 'tech-profile'
  | 'academic-research'
  | 'scholarship-profile';
export type TemplateCategory = 'ats' | 'professional' | 'student' | 'academic';
export type PaperSize = 'a4' | 'letter';
export type CVOutputLang = 'en' | 'fa' | 'ps';
export type SaveStatus = 'loading' | 'saving' | 'saved' | 'error';
export type Gender = '' | 'male' | 'female' | 'other';
export type SkillLevel = 'beginner' | 'intermediate' | 'expert';
export type LanguageProficiency = 'basic' | 'intermediate' | 'fluent' | 'native';
export type CVAccent = 'navy' | 'blue' | 'emerald' | 'burgundy' | 'neutral';
export type CVDensity = 'comfortable' | 'compact';

export type CVSectionKey =
  | 'personal'
  | 'summary'
  | 'experience'
  | 'education'
  | 'projects'
  | 'skills'
  | 'languages'
  | 'certifications'
  | 'awards'
  | 'volunteering'
  | 'research'
  | 'publications'
  | 'references';

export interface PersonalInfo {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  gender: Gender;
  picture: string;
}
export interface SocialLink { id: string; platform: string; url: string; }
export interface Education { id: string; degree: string; institution: string; location: string; startDate: string; endDate: string; isCurrent: boolean; description: string; }
export interface Experience { id: string; role: string; company: string; location: string; startDate: string; endDate: string; isCurrent: boolean; description: string; }
export interface Skill { id: string; name: string; level: SkillLevel; }
export interface Language { id: string; name: string; proficiency: LanguageProficiency; }
export interface Certification { id: string; name: string; issuer: string; date: string; credentialUrl: string; }
export interface Project { id: string; name: string; role: string; startDate: string; endDate: string; description: string; link: string; technologies: string; }
export interface Reference { id: string; name: string; role: string; organization: string; email: string; phone: string; }
export interface Award { id: string; title: string; issuer: string; date: string; description: string; }
export interface Volunteering { id: string; role: string; organization: string; startDate: string; endDate: string; isCurrent: boolean; description: string; }
export interface Research { id: string; title: string; organization: string; startDate: string; endDate: string; isCurrent: boolean; description: string; link: string; }
export interface Publication { id: string; title: string; publisher: string; date: string; description: string; link: string; }

export interface CVData {
  personal: PersonalInfo;
  socialLinks: SocialLink[];
  education: Education[];
  experience: Experience[];
  skills: Skill[];
  languages: Language[];
  certifications: Certification[];
  projects: Project[];
  references: Reference[];
  awards: Award[];
  volunteering: Volunteering[];
  research: Research[];
  publications: Publication[];
}

export interface CVSourceContext {
  opportunitySlug?: string;
  opportunityTitle?: string;
  returnTo?: string;
}

export interface CVAppearance {
  accent: CVAccent;
  density: CVDensity;
  showPhoto: boolean;
}

export interface CVDraft {
  schemaVersion: typeof CV_SCHEMA_VERSION;
  id: string;
  name: string;
  purpose: CVPurpose;
  template: TemplateType;
  paperSize: PaperSize;
  outputLang: CVOutputLang;
  appearance: CVAppearance;
  data: CVData;
  source?: CVSourceContext;
  createdAt: string;
  updatedAt: string;
}

export type CVIssueSeverity = 'error' | 'warning' | 'info';

export interface CVIssue {
  id: string;
  severity: CVIssueSeverity;
  section: CVSectionKey | 'document';
  messageKey: string;
  field?: string;
  itemId?: string;
  itemLabel?: string;
  anchorId?: string;
}

export interface CVReadiness {
  completion: number;
  canExport: boolean;
  issues: CVIssue[];
  health: 'good' | 'attention' | 'blocked';
  errorCount: number;
  warningCount: number;
  infoCount: number;
}
