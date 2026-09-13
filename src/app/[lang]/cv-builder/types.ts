export type TemplateType = 'professional' | 'scholar';

export interface CVData {
  personal: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedIn: string;
    website: string;
    summary: string;
    gender: string;
    picture: string;
  };
  socialLinks: SocialLink[];
  education: Education[];
  experience: Experience[];
  skills: Skill[];
  languages: Language[];
  certifications: Certification[];
  projects: Project[];
  references: Reference[];
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  level: string; // e.g., 'Beginner', 'Intermediate', 'Expert'
}

export interface Language {
  id: string;
  name: string;
  proficiency: string; // e.g., 'Native', 'Fluent', 'Intermediate', 'Beginner'
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  link: string;
}

export interface Reference {
  id: string;
  name: string;
  company: string;
  contact: string;
}
