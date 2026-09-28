import type { CVOutputLang, CVPurpose, CVSectionKey, PaperSize, TemplateType } from '../types';
import { CV_TEMPLATES, DEFAULT_TEMPLATE_BY_PURPOSE } from './cv-templates';

export const CV_BUILDER_SECTION_KEY = 'cvBuilder';

export const CV_PURPOSES: CVPurpose[] = ['professional', 'student', 'scholarship'];
export const CV_SECTION_KEYS: CVSectionKey[] = [
  'personal', 'summary', 'experience', 'education', 'projects', 'skills', 'languages',
  'certifications', 'awards', 'volunteering', 'research', 'publications', 'references',
];

export interface CVBuilderLocalizedIntro {
  title: string;
  description: string;
}

export interface CVBuilderAdminConfig {
  version: 1;
  enabled: boolean;
  intro: Record<CVOutputLang, CVBuilderLocalizedIntro>;
  defaultPurpose: CVPurpose;
  purposes: Record<CVPurpose, { enabled: boolean }>;
  defaultTemplates: Record<CVPurpose, TemplateType>;
  templates: Record<TemplateType, { enabled: boolean; order: number }>;
  defaultPaperSize: PaperSize;
  features: {
    pdfDownload: boolean;
    allowPhoto: boolean;
    allowAccentCustomization: boolean;
    allowDensityCustomization: boolean;
  };
  sections: Record<CVSectionKey, { enabled: boolean }>;
  guidance: {
    summaryMinWords: number;
    summaryMaxWords: number;
    maxSkills: number;
  };
}

const DEFAULT_INTRO: Record<CVOutputLang, CVBuilderLocalizedIntro> = {
  en: {
    title: 'ARIA HUB CV Builder',
    description: 'Build a professional CV with purpose-aware guidance, local autosave, multilingual output, ATS checks, and direct PDF download.',
  },
  fa: {
    title: 'سی‌وی ساز آریا هاب',
    description: 'با راهنمای متناسب با هدف، ذخیره خودکار، خروجی چندزبانه، بررسی ATS و دانلود مستقیم PDF یک سی‌وی حرفه‌ای بسازید.',
  },
  ps: {
    title: 'د آریا هاب سي وي جوړونکی',
    description: 'د موخې له مخې لارښوونې، اتومات خوندي کول، څو ژبیزه پایله، ATS کتنه او مستقیم PDF ډاونلوډ سره مسلکي سي وي جوړه کړئ.',
  },
};

function defaultTemplates(): CVBuilderAdminConfig['templates'] {
  return Object.fromEntries(
    CV_TEMPLATES.map((template, index) => [template.id, { enabled: true, order: index }]),
  ) as CVBuilderAdminConfig['templates'];
}

function defaultSections(): CVBuilderAdminConfig['sections'] {
  return Object.fromEntries(
    CV_SECTION_KEYS.map((section) => [section, { enabled: true }]),
  ) as CVBuilderAdminConfig['sections'];
}

export const DEFAULT_CV_BUILDER_ADMIN_CONFIG: CVBuilderAdminConfig = {
  version: 1,
  enabled: true,
  intro: DEFAULT_INTRO,
  defaultPurpose: 'professional',
  purposes: {
    professional: { enabled: true },
    student: { enabled: true },
    scholarship: { enabled: true },
  },
  defaultTemplates: { ...DEFAULT_TEMPLATE_BY_PURPOSE },
  templates: defaultTemplates(),
  defaultPaperSize: 'a4',
  features: {
    pdfDownload: true,
    allowPhoto: true,
    allowAccentCustomization: true,
    allowDensityCustomization: true,
  },
  sections: defaultSections(),
  guidance: {
    summaryMinWords: 40,
    summaryMaxWords: 100,
    maxSkills: 20,
  },
};

function record(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function text(value: unknown, fallback: string, max = 600): string {
  return typeof value === 'string' ? value.trim().slice(0, max) || fallback : fallback;
}

function integer(value: unknown, fallback: number, min: number, max: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

function validPurpose(value: unknown): value is CVPurpose {
  return value === 'professional' || value === 'student' || value === 'scholarship';
}

function validTemplate(value: unknown): value is TemplateType {
  return CV_TEMPLATES.some((template) => template.id === value);
}

export function normalizeCVBuilderAdminConfig(raw: unknown): CVBuilderAdminConfig {
  const source = record(raw);
  const rawIntro = record(source.intro);
  const intro = Object.fromEntries((['en', 'fa', 'ps'] as CVOutputLang[]).map((lang) => {
    const candidate = record(rawIntro[lang]);
    return [lang, {
      title: text(candidate.title, DEFAULT_INTRO[lang].title, 120),
      description: text(candidate.description, DEFAULT_INTRO[lang].description, 500),
    }];
  })) as CVBuilderAdminConfig['intro'];

  const rawPurposes = record(source.purposes);
  const purposes = Object.fromEntries(CV_PURPOSES.map((purpose) => [
    purpose,
    { enabled: bool(record(rawPurposes[purpose]).enabled, true) },
  ])) as CVBuilderAdminConfig['purposes'];

  if (!CV_PURPOSES.some((purpose) => purposes[purpose].enabled)) {
    purposes.professional.enabled = true;
  }

  const rawTemplates = record(source.templates);
  const templates = Object.fromEntries(CV_TEMPLATES.map((template, index) => {
    const candidate = record(rawTemplates[template.id]);
    return [template.id, {
      enabled: bool(candidate.enabled, true),
      order: integer(candidate.order, index, 0, 99),
    }];
  })) as CVBuilderAdminConfig['templates'];

  if (!CV_TEMPLATES.some((template) => templates[template.id].enabled)) {
    templates['ats-simple'].enabled = true;
  }

  const enabledTemplateIds = CV_TEMPLATES
    .filter((template) => templates[template.id].enabled)
    .sort((a, b) => templates[a.id].order - templates[b.id].order)
    .map((template) => template.id);
  const firstEnabledTemplate = enabledTemplateIds[0] || 'ats-simple';

  const rawDefaults = record(source.defaultTemplates);
  const defaultTemplateFor = (purpose: CVPurpose): TemplateType => {
    const requested = rawDefaults[purpose];
    if (validTemplate(requested) && templates[requested].enabled) return requested;
    const builtIn = DEFAULT_TEMPLATE_BY_PURPOSE[purpose];
    return templates[builtIn].enabled ? builtIn : firstEnabledTemplate;
  };
  const defaultTemplatesByPurpose: Record<CVPurpose, TemplateType> = {
    professional: defaultTemplateFor('professional'),
    student: defaultTemplateFor('student'),
    scholarship: defaultTemplateFor('scholarship'),
  };

  const rawSections = record(source.sections);
  const sections = Object.fromEntries(CV_SECTION_KEYS.map((section) => [
    section,
    { enabled: section === 'personal' ? true : bool(record(rawSections[section]).enabled, true) },
  ])) as CVBuilderAdminConfig['sections'];

  const rawFeatures = record(source.features);
  const rawGuidance = record(source.guidance);
  const summaryMinWords = integer(rawGuidance.summaryMinWords, 40, 10, 150);
  const summaryMaxWords = Math.max(
    summaryMinWords,
    integer(rawGuidance.summaryMaxWords, 100, summaryMinWords, 300),
  );

  let defaultPurpose: CVPurpose = validPurpose(source.defaultPurpose) ? source.defaultPurpose : 'professional';
  if (!purposes[defaultPurpose].enabled) {
    defaultPurpose = CV_PURPOSES.find((purpose) => purposes[purpose].enabled) || 'professional';
  }

  return {
    version: 1,
    enabled: bool(source.enabled, true),
    intro,
    defaultPurpose,
    purposes,
    defaultTemplates: defaultTemplatesByPurpose,
    templates,
    defaultPaperSize: source.defaultPaperSize === 'letter' ? 'letter' : 'a4',
    features: {
      pdfDownload: bool(rawFeatures.pdfDownload, true),
      allowPhoto: bool(rawFeatures.allowPhoto, true),
      allowAccentCustomization: bool(rawFeatures.allowAccentCustomization, true),
      allowDensityCustomization: bool(rawFeatures.allowDensityCustomization, true),
    },
    sections,
    guidance: {
      summaryMinWords,
      summaryMaxWords,
      maxSkills: integer(rawGuidance.maxSkills, 20, 5, 50),
    },
  };
}

export function getEnabledTemplateIds(config: CVBuilderAdminConfig): TemplateType[] {
  return CV_TEMPLATES
    .filter((template) => config.templates[template.id].enabled)
    .sort((a, b) => config.templates[a.id].order - config.templates[b.id].order)
    .map((template) => template.id);
}

export function getEnabledPurposeIds(config: CVBuilderAdminConfig): CVPurpose[] {
  return CV_PURPOSES.filter((purpose) => config.purposes[purpose].enabled);
}

export function isCVSectionEnabled(config: CVBuilderAdminConfig, section: CVSectionKey): boolean {
  return config.sections[section]?.enabled !== false;
}

export function getCVBuilderIntro(config: CVBuilderAdminConfig, lang: CVOutputLang): CVBuilderLocalizedIntro {
  return config.intro[lang] || config.intro.en;
}
