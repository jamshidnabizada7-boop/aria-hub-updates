// Shared types for ARIA HUB site data

export interface SiteSettings {
  id: string;
  siteName: string;
  siteNameI18n?: Record<string, string> | null;
  tagline: string;
  taglineI18n?: Record<string, string> | null;
  description: string;
  descriptionI18n?: Record<string, string> | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  appleIconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  addressI18n?: Record<string, string> | null;
  currency: string;
  timezone: string;
  dateFormat: string;
  maintenanceMode: boolean;
  gaId: string | null;
  fbPixelId: string | null;
  customScripts: string | null;
  mapEmbed: string | null;
  socialPosition: string;
  socialHideOnScroll: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  enabled: boolean;
  isDefault: boolean;
  flag: string | null;
  order: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface MenuItem {
  id: string;
  label: string;
  labelI18n?: Record<string, string> | null;
  url: string | null;
  parentId: string | null;
  icon: string | null;
  order: number;
  visible: boolean;
  openInNewTab: boolean;
  children: MenuItem[];
}

export interface Section {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  enabled: boolean;
  order: number;
  config: string | null;
}

export interface ServiceCategory { id: string; name: string; slug: string; icon: string | null; description: string | null; order: number; }
export interface Service { 
  id: string; title: string; slug: string; excerpt: string; description: string; 
  icon: string | null; image: string | null; gallery: string | null; video: string | null; 
  price: string | null; featured: boolean; status: string; sort: number; 
  categoryId: string | null; category?: ServiceCategory | null;
  // i18n fields
  titleI18n?: Record<string, string> | null;
  excerptI18n?: Record<string, string> | null;
  descriptionI18n?: Record<string, string> | null;
}

export interface Visa { 
  id: string; country: string; countryCode: string | null; visaType: string; slug: string; 
  duration: string | null; processingTime: string | null; fee: string | null; 
  requirements: string | null; documents: string | null; eligibility: string | null; 
  applicationProcess: string | null; embassyDetails: string | null; image: string | null; 
  featured: boolean; status: string; sort: number; description: string | null;
  // i18n fields
  countryI18n?: Record<string, string> | null;
  visaTypeI18n?: Record<string, string> | null;
  eligibilityI18n?: Record<string, string> | null;
  applicationProcessI18n?: Record<string, string> | null;
  descriptionI18n?: Record<string, string> | null;
  requirementsI18n?: Record<string, any[]> | null;
  documentsI18n?: Record<string, any[]> | null;
}

export interface OpportunityCategory { id: string; name: string; slug: string; icon: string | null; order: number; nameI18n?: Record<string, string> | null; }
export interface Opportunity {
  id: string; title: string; slug: string; organization: string | null; country: string | null;
  deadline: string | null; description: string; eligibility: string | null; benefits: string | null;
  website: string | null; applyUrl: string | null; image: string | null; featured: boolean;
  status: string; sort: number; categoryId: string | null; category?: OpportunityCategory | null;
  // i18n fields
  titleI18n?: Record<string, string> | null;
  descriptionI18n?: Record<string, string> | null;
  eligibilityI18n?: Record<string, string> | null;
  benefitsI18n?: Record<string, string> | null;
  // ── automated import tracking ──
  sourceName?: string | null;
  sourceUrl?: string | null;
  originalUrl?: string | null;
  importedAt?: string | null;
  lastChecked?: string | null;
  contentHash?: string | null;
  aiSummary?: string | null;
  aiSummaryI18n?: Record<string, string> | null;
  jobType?: string | null;
  jobTypeI18n?: Record<string, string> | null;
  salary?: string | null;
  salaryI18n?: Record<string, string> | null;
  educationReq?: string | null;
  educationReqI18n?: Record<string, string> | null;
  experience?: string | null;
  experienceI18n?: Record<string, string> | null;
  responsibilities?: string | null;
  responsibilitiesI18n?: Record<string, string> | null;
  requirements?: string | null;
  requirementsI18n?: Record<string, string> | null;
  guidelines?: string | null;
  guidelinesI18n?: Record<string, string> | null;
  tags?: string | null;
  tagsI18n?: Record<string, string[]> | null;
  seoTitleI18n?: Record<string, string> | null;
  seoDescriptionI18n?: Record<string, string> | null;
  seoKeywords?: string | null;
  seoKeywordsI18n?: Record<string, string[]> | null;
  ogTitle?: string | null;
  ogTitleI18n?: Record<string, string> | null;
  ogDescription?: string | null;
  ogDescriptionI18n?: Record<string, string> | null;
  canonicalUrl?: string | null;
  importStatus?: string | null;
  translationStatus?: string | null;
  language?: string | null;
  logoUrl?: string | null;
  publishedDate?: string | null;
  attachments?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  extractedData?: Record<string, any> | null;
  extractedDataI18n?: Record<string, any> | null;
}

// ── Automated import sources ──
export interface ImportSource {
  id: string;
  name: string;
  type: string; // job | scholarship
  scraperKey: string;
  baseUrl: string;
  enabled: boolean;
  autoPublish: boolean;
  scheduleMinutes: number;
  defaultCategory: string | null;
  config: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunStats: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImportRun {
  id: string;
  sourceId: string;
  source?: ImportSource | null;
  startedAt: string;
  finishedAt: string | null;
  status: string; // running | ok | error | partial | stopped
  found: number;
  imported: number;
  updated: number;
  skipped: number;
  duplicates: number;
  failed: number;
  processingMs: number;
  errors: string | null; // JSON array
  triggeredBy: string | null;
  createdAt: string;
}

export interface GalleryItem { id: string; title: string; type: string; url: string; thumbnail: string | null; caption: string | null; category: string | null; order: number; }
export interface PaymentMethod { id: string; name: string; slug: string; logo: string | null; qrCode: string | null; accountNumber: string | null; iban: string | null; accountTitle: string | null; description: string | null; instructions: string | null; status: string; order: number; }
export interface Testimonial { 
  id: string; name: string; role: string | null; company: string | null; avatar: string | null; 
  rating: number; content: string; featured: boolean; status: string; order: number;
  // i18n fields
  nameI18n?: Record<string, string> | null;
  roleI18n?: Record<string, string> | null;
  companyI18n?: Record<string, string> | null;
  contentI18n?: Record<string, string> | null;
}
export interface Partner { id: string; name: string; logo: string | null; website: string | null; order: number; status: string; }
export interface Counter { id: string; label: string; value: number; suffix: string | null; icon: string | null; order: number; }
export interface Faq { 
  id: string; question: string; answer: string; category: string | null; order: number; status: string;
  // i18n fields
  questionI18n?: Record<string, string> | null;
  answerI18n?: Record<string, string> | null;
}
export interface NewsCategory { id: string; name: string; slug: string; }
export interface News { 
  id: string; title: string; slug: string; excerpt: string; content: string; image: string | null; 
  author: string | null; tags: string | null; featured: boolean; status: string; publishedAt: string; 
  categoryId: string | null; category?: NewsCategory | null;
  // i18n fields
  titleI18n?: Record<string, string> | null;
  excerptI18n?: Record<string, string> | null;
  contentI18n?: Record<string, string> | null;
}
export interface SocialLink { id: string; platform: string; label?: string; url: string; icon: string | null; color?: string | null; enabled?: boolean; order: number; createdAt?: any; updatedAt?: any; }
export interface FooterLink { 
  id: string; column: string; label: string; url: string; order: number;
  labelI18n?: Record<string, string> | null;
  category?: string;
  createdAt?: any; updatedAt?: any;
}
export interface Department { id: string; name: string; nameI18n?: Record<string, string> | null; email: string | null; phone: string | null; description: string | null; order: number; createdAt?: any; updatedAt?: any; }
export interface Branch { id: string; name: string; address: string; phone: string | null; email: string | null; hours: string | null; isMain: boolean; mapEmbed: string | null; mapUrl?: string | null; order: number; createdAt?: any; updatedAt?: any; }
export interface WhyChooseUsFeature {
  id: string;
  key?: string | null;
  title: string;
  titleI18n?: Record<string, string> | null;
  description: string;
  descriptionI18n?: Record<string, string> | null;
  icon: string;
  color: string;
  glow: string;
  order: number;
  enabled: boolean;
}
export interface ProcessStep { 
  id: string; title: string; description: string; icon: string | null; order: number; status: string;
  // i18n fields
  titleI18n?: Record<string, string> | null;
  descriptionI18n?: Record<string, string> | null;
}
export interface PricingPackage { 
  id: string; name: string; slug: string; price: string; period: string; description: string | null; 
  features: string | null; icon: string | null; featured: boolean; badge: string | null; 
  ctaLabel: string; ctaUrl: string; order: number; status: string;
  // i18n fields
  nameI18n?: Record<string, string> | null;
  descriptionI18n?: Record<string, string> | null;
  featuresI18n?: Record<string, any[]> | null;
}
export interface TeamMember { 
  id: string; name: string; role: string; bio: string | null; photo: string | null; 
  email: string | null; linkedin: string | null; twitter: string | null; 
  order: number; featured: boolean; status: string;
  // i18n fields
  nameI18n?: Record<string, string> | null;
  roleI18n?: Record<string, string> | null;
  bioI18n?: Record<string, string> | null;
}
export interface ComparisonRow { id: string; feature: string; ariaValue: string; othersValue: string; order: number; status: string; featureI18n?: Record<string, string> | null; ariaValueI18n?: Record<string, string> | null; othersValueI18n?: Record<string, string> | null; }
export interface CtaBanner { 
  id: string; title: string; subtitle: string | null; buttonText: string; buttonUrl: string; 
  secondaryText: string | null; accent: string; order: number; status: string;
  // i18n fields
  titleI18n?: Record<string, string> | null;
  subtitleI18n?: Record<string, string> | null;
  buttonTextI18n?: Record<string, string> | null;
}

export interface SiteData {
  settings: SiteSettings | null;
  languages: Language[];
  sections: Section[];
  menu: MenuItem[];
  serviceCategories: ServiceCategory[];
  services: Service[];
  visas: Visa[];
  opportunityCategories: OpportunityCategory[];
  opportunities: Opportunity[];
  gallery: GalleryItem[];
  paymentMethods: PaymentMethod[];
  testimonials: Testimonial[];
  partners: Partner[];
  counters: Counter[];
  faqs: Faq[];
  news: News[];
  socialLinks: SocialLink[];
  footer: Record<string, FooterLink[]>;
  departments: Department[];
  branches: Branch[];
  processSteps: ProcessStep[];
  pricingPackages: PricingPackage[];
  teamMembers: TeamMember[];
  comparisonRows: ComparisonRow[];
  ctaBanners: CtaBanner[];
  whyFeatures: WhyChooseUsFeature[];
}
