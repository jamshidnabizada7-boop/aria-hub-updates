import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentAdmin, logAction } from '@/lib/admin-auth';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { classifyApplyUrl, normalizeApplyUrl } from '@/lib/apply';

// Model registry: maps model key → prisma delegate + editable fields
const MODELS: Record<string, { delegate: any; fields: string[]; label: string; statusOptions?: string[] }> = {
  service: { label: 'Services', delegate: db.service, fields: ['title', 'titleI18n', 'slug', 'excerpt', 'excerptI18n', 'description', 'descriptionI18n', 'icon', 'image', 'gallery', 'video', 'price', 'featured', 'status', 'sort', 'categoryId', 'seoTitle', 'seoDescription'], statusOptions: ['published', 'draft', 'archived'] },
  visa: { label: 'Visas', delegate: db.visa, fields: ['country', 'countryI18n', 'countryCode', 'visaType', 'visaTypeI18n', 'slug', 'duration', 'processingTime', 'fee', 'requirements', 'requirementsI18n', 'documents', 'documentsI18n', 'eligibility', 'eligibilityI18n', 'applicationProcess', 'applicationProcessI18n', 'embassyDetails', 'faqs', 'gallery', 'image', 'featured', 'status', 'sort', 'description', 'descriptionI18n', 'seoTitle', 'seoDescription'], statusOptions: ['published', 'draft', 'archived'] },
  opportunity: { label: 'Opportunities', delegate: db.opportunity, fields: ['title', 'titleI18n', 'slug', 'organization', 'country', 'deadline', 'description', 'descriptionI18n', 'eligibility', 'eligibilityI18n', 'benefits', 'benefitsI18n', 'website', 'applyUrl', 'image', 'attachments', 'featured', 'status', 'sort', 'categoryId', 'seoTitle', 'seoDescription', 'seoTitleI18n', 'seoDescriptionI18n', 'seoKeywords', 'seoKeywordsI18n', 'ogTitle', 'ogTitleI18n', 'ogDescription', 'ogDescriptionI18n', 'canonicalUrl', 'aiSummary', 'aiSummaryI18n', 'responsibilities', 'responsibilitiesI18n', 'requirements', 'requirementsI18n', 'guidelines', 'guidelinesI18n', 'tags', 'tagsI18n', 'jobType', 'jobTypeI18n', 'salary', 'salaryI18n', 'educationReq', 'educationReqI18n', 'experience', 'experienceI18n', 'logoUrl', 'publishedDate', 'sourceName', 'sourceUrl', 'originalUrl', 'contentHash', 'importStatus', 'translationStatus', 'language', 'extractedData'], statusOptions: ['published', 'draft', 'expired', 'archived'] },
  news: { label: 'News', delegate: db.news, fields: ['title', 'titleI18n', 'slug', 'excerpt', 'excerptI18n', 'content', 'contentI18n', 'image', 'author', 'tags', 'featured', 'status', 'publishedAt', 'categoryId', 'seoTitle', 'seoDescription'], statusOptions: ['published', 'draft', 'archived'] },
  page: { label: 'Pages', delegate: db.page, fields: ['title', 'titleI18n', 'slug', 'content', 'contentI18n', 'status', 'seoTitle', 'seoDescription'], statusOptions: ['published', 'draft', 'archived'] },
  testimonial: { label: 'Testimonials', delegate: db.testimonial, fields: ['name', 'nameI18n', 'role', 'roleI18n', 'company', 'companyI18n', 'avatar', 'rating', 'content', 'contentI18n', 'featured', 'status', 'order'], statusOptions: ['published', 'draft', 'archived'] },
  partner: { label: 'Partners', delegate: db.partner, fields: ['name', 'logo', 'website', 'status', 'order'], statusOptions: ['active', 'inactive'] },
  counter: { label: 'Counters', delegate: db.counter, fields: ['label', 'labelI18n', 'value', 'suffix', 'suffixI18n', 'icon', 'order'] },
  faq: { label: 'FAQs', delegate: db.faq, fields: ['question', 'questionI18n', 'answer', 'answerI18n', 'category', 'order', 'status'], statusOptions: ['published', 'draft', 'archived'] },
  galleryItem: { label: 'Gallery', delegate: db.galleryItem, fields: ['title', 'type', 'url', 'thumbnail', 'caption', 'category', 'albumId', 'order'] },
  paymentMethod: { label: 'Payments', delegate: db.paymentMethod, fields: ['name', 'slug', 'logo', 'qrCode', 'accountNumber', 'iban', 'accountTitle', 'description', 'instructions', 'status', 'order'], statusOptions: ['active', 'inactive'] },
  socialLink: { label: 'Social Links', delegate: db.socialLink, fields: ['platform', 'label', 'url', 'icon', 'color', 'enabled', 'order'] },
  footerLink: { label: 'Footer Links', delegate: db.footerLink, fields: ['column', 'label', 'labelI18n', 'url', 'order'] },
  whyChooseUsFeature: { label: 'Why Choose Us', delegate: db.whyChooseUsFeature, fields: ['key', 'title', 'titleI18n', 'description', 'descriptionI18n', 'icon', 'color', 'glow', 'order', 'enabled'] },
  department: { label: 'Departments', delegate: db.department, fields: ['name', 'email', 'phone', 'description', 'order'] },
  branch: { label: 'Branches', delegate: db.branch, fields: ['name', 'address', 'phone', 'email', 'hours', 'isMain', 'mapEmbed', 'order'] },
  processStep: { label: 'Process Steps', delegate: db.processStep, fields: ['title', 'titleI18n', 'description', 'descriptionI18n', 'icon', 'order', 'status'], statusOptions: ['published', 'draft', 'archived'] },
  pricingPackage: { label: 'Pricing', delegate: db.pricingPackage, fields: ['name', 'nameI18n', 'slug', 'price', 'period', 'description', 'descriptionI18n', 'features', 'featuresI18n', 'icon', 'featured', 'badge', 'ctaLabel', 'ctaUrl', 'order', 'status'], statusOptions: ['published', 'draft', 'archived'] },
  teamMember: { label: 'Team', delegate: db.teamMember, fields: ['name', 'nameI18n', 'role', 'roleI18n', 'bio', 'bioI18n', 'photo', 'email', 'linkedin', 'twitter', 'order', 'featured', 'status'], statusOptions: ['published', 'draft', 'archived'] },
  comparisonRow: { label: 'Comparison', delegate: db.comparisonRow, fields: ['feature', 'ariaValue', 'othersValue', 'order', 'status'], statusOptions: ['published', 'draft', 'archived'] },
  ctaBanner: { label: 'CTA Banners', delegate: db.ctaBanner, fields: ['title', 'titleI18n', 'subtitle', 'subtitleI18n', 'buttonText', 'buttonTextI18n', 'buttonUrl', 'secondaryText', 'accent', 'order', 'status'], statusOptions: ['published', 'draft', 'archived'] },
  // menuItem: `key`/pageSlug intentionally NOT editable here — section keys drive the homepage layout.
  menuItem: { label: 'Menu Items', delegate: db.menuItem, fields: ['label', 'labelI18n', 'url', 'parentId', 'icon', 'order', 'visible', 'openInNewTab'] },
  documentCategory: { label: 'Document Categories', delegate: db.documentCategory, fields: ['name', 'nameI18n', 'slug', 'description', 'descriptionI18n', 'icon', 'order'] },
  documentTemplate: { label: 'Document Templates', delegate: db.documentTemplate, fields: ['title', 'slug', 'excerpt', 'content', 'status', 'isPremium', 'categoryId', 'requiredFields', 'writingTips', 'commonMistakes'], statusOptions: ['published', 'draft', 'archived'] },
  section: { label: 'Sections', delegate: db.section, fields: ['key', 'title', 'subtitle', 'enabled', 'order'] },
  language: { label: 'Languages', delegate: db.language, fields: ['code', 'name', 'nativeName', 'direction', 'enabled', 'isDefault', 'flag', 'order', 'translations'] },
  serviceCategory: { label: 'Service Categories', delegate: db.serviceCategory, fields: ['name', 'slug', 'icon', 'description', 'order'] },
  opportunityCategory: { label: 'Opportunity Categories', delegate: db.opportunityCategory, fields: ['name', 'nameI18n', 'slug', 'icon', 'order'] },
  newsCategory: { label: 'News Categories', delegate: db.newsCategory, fields: ['name', 'slug'] },
  advertisement: { label: 'Advertisements', delegate: db.advertisement, fields: ['company', 'title', 'description', 'image', 'video', 'website', 'package', 'startDate', 'endDate', 'status', 'order'], statusOptions: ['pending', 'approved', 'rejected', 'expired'] },
  interviewCategory: { label: 'Interview Categories', delegate: db.interviewCategory, fields: ['name', 'nameI18n', 'slug', 'icon', 'description', 'descriptionI18n', 'order'] },
  interviewQuestion: { label: 'Interview Questions', delegate: db.interviewQuestion, fields: ['question', 'questionI18n', 'categoryId', 'difficulty', 'filters', 'sampleAnswer', 'sampleAnswerI18n', 'strongExample', 'strongExampleI18n', 'weakExample', 'weakExampleI18n', 'tips', 'tipsI18n', 'commonMistakes', 'commonMistakesI18n', 'followUpQuestions', 'followUpQuestionsI18n', 'expectedDuration', 'status', 'featured', 'order'], statusOptions: ['published', 'draft'] },
  interviewExperience: { label: 'Interview Experiences', delegate: db.interviewExperience, fields: ['studentName', 'studentNameI18n', 'scholarshipName', 'university', 'country', 'degree', 'content', 'contentI18n', 'rating', 'status'], statusOptions: ['pending', 'published', 'rejected'] },
  visaCountry: { label: 'Visa Countries', delegate: db.visaCountry, fields: ['name', 'nameI18n', 'code', 'processingTime', 'costEstimate', 'embassyInfo', 'embassyInfoI18n', 'successRate', 'guideContent', 'status', 'order'], statusOptions: ['published', 'draft'] },
  visaCategory: { label: 'Visa Categories', delegate: db.visaCategory, fields: ['name', 'nameI18n', 'slug', 'icon', 'description', 'descriptionI18n', 'order'] },
  visaQuestion: { label: 'Visa Questions', delegate: db.visaQuestion, fields: ['question', 'questionI18n', 'countryId', 'categoryId', 'difficulty', 'bestAnswer', 'bestAnswerI18n', 'wrongAnswer', 'wrongAnswerI18n', 'aiExplanation', 'aiExplanationI18n', 'confidenceTips', 'confidenceTipsI18n', 'followUpQuestions', 'followUpQuestionsI18n', 'status', 'featured', 'order'], statusOptions: ['published', 'draft'] },
  visaDocument: { label: 'Visa Documents', delegate: db.visaDocument, fields: ['name', 'nameI18n', 'description', 'descriptionI18n', 'isRequired', 'countryId', 'categoryId', 'order'] },
  visaExperience: { label: 'Visa Experiences', delegate: db.visaExperience, fields: ['studentName', 'studentNameI18n', 'countryId', 'status', 'content', 'contentI18n', 'rating', 'publishedStatus'], statusOptions: ['approved', 'rejected'] },
  visaRejection: { label: 'Visa Rejection Reasons', delegate: db.visaRejection, fields: ['code', 'section', 'title', 'titleI18n', 'description', 'descriptionI18n', 'mitigation', 'mitigationI18n', 'icon', 'order', 'status'], statusOptions: ['published', 'draft'] },
  successStory: { label: 'Success Stories', delegate: db.successStory, fields: ['title', 'titleI18n', 'storyType', 'country', 'program', 'visaType', 'year', 'content', 'contentI18n', 'authorAlias', 'contactEmail', 'featured', 'likes', 'status'], statusOptions: ['pending', 'published', 'rejected'] },
  alertSubscriber: { label: 'Alert Subscribers', delegate: db.alertSubscriber, fields: ['email', 'lang', 'categorySlug', 'frequency', 'status', 'lastDigestAt'], statusOptions: ['pending', 'active', 'unsubscribed'] },
  // ─── R21-c completeness additions ───
  galleryAlbum: { label: 'Gallery Albums', delegate: db.galleryAlbum, fields: ['title', 'slug', 'description', 'coverImage', 'order'] },
  contactMessage: { label: 'Contact Messages', delegate: db.contactMessage, fields: ['name', 'email', 'phone', 'subject', 'message', 'department', 'status'], statusOptions: ['new', 'read', 'replied', 'archived'] },
  subscriber: { label: 'Email Subscribers', delegate: db.subscriber, fields: ['email', 'name', 'status'], statusOptions: ['active', 'unsubscribed'] },
  templateComment: { label: 'Template Comments', delegate: db.templateComment, fields: ['content', 'templateId', 'userId', 'status'], statusOptions: ['approved', 'pending', 'rejected'] },
  templateRating: { label: 'Template Ratings', delegate: db.templateRating, fields: ['score', 'templateId', 'userId'] },
  templateBookmark: { label: 'Template Bookmarks', delegate: db.templateBookmark, fields: ['templateId', 'userId'] },
  importSource: { label: 'Import Sources', delegate: db.importSource, fields: ['name', 'type', 'scraperKey', 'baseUrl', 'enabled', 'autoPublish', 'scheduleMinutes', 'defaultCategory', 'config', 'lastRunAt', 'lastRunStatus'] },
  importRun: { label: 'Import Runs', delegate: db.importRun, fields: ['sourceId', 'status', 'found', 'imported', 'updated', 'skipped', 'duplicates', 'failed', 'processingMs', 'triggeredBy', 'errors'], statusOptions: ['running', 'ok', 'error', 'partial', 'stopped'] },
  interviewSession: { label: 'Interview Sessions', delegate: db.interviewSession, fields: ['userId', 'mode', 'status', 'score', 'duration'], statusOptions: ['in_progress', 'completed', 'abandoned'] },
  socialIdea: { label: 'Post Ideas', delegate: db.socialIdea, fields: ['kind', 'text', 'textI18n', 'note', 'noteI18n', 'active', 'sortOrder'] },
};

/** Prisma-schema facts per crud key: required scalars without a DB default, and DateTime columns. */
const SCHEMA_INFO: Record<string, { required: string[]; dates: string[] }> = (() => {
  const info: Record<string, { required: string[]; dates: string[] }> = {};
  for (const m of Prisma.dmmf.datamodel.models) {
    const key = m.name.charAt(0).toLowerCase() + m.name.slice(1);
    info[key] = {
      required: m.fields.filter((f: any) => f.kind === 'scalar' && f.isRequired && !f.hasDefaultValue && !f.isUpdatedAt).map((f) => f.name),
      dates: m.fields.filter((f: any) => f.kind === 'scalar' && f.type === 'DateTime').map((f) => f.name),
    };
  }
  return info;
})();

/** Editable FK fields whose values may arrive as a human-readable name instead of an id. */
const RELATION_BY_FIELD: Record<string, { delegate: any }> = {
  'news.categoryId': { delegate: db.newsCategory },
  'service.categoryId': { delegate: db.serviceCategory },
  'opportunity.categoryId': { delegate: db.opportunityCategory },
  'interviewQuestion.categoryId': { delegate: db.interviewCategory },
  'visaQuestion.categoryId': { delegate: db.visaCategory },
  'visaDocument.categoryId': { delegate: db.visaCategory },
  'documentTemplate.categoryId': { delegate: db.documentCategory },
  'visaQuestion.countryId': { delegate: db.visaCountry },
  'visaDocument.countryId': { delegate: db.visaCountry },
};

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Fill a missing/empty slug from the title, falling back to a short random id
 * for non-Latin titles (same pattern the news importer uses, e.g. news-1be0e8c663e4).
 * On update, an ABSENT slug means "keep the existing one" — only a cleared
 * (empty-string) slug is regenerated.
 */
function fillSlug(model: string, data: any, isCreate: boolean): void {
  if (!MODELS[model].fields.includes('slug')) return;
  if (typeof data.slug === 'string' && data.slug.trim()) return;
  if (!isCreate && data.slug === undefined) return;
  if (data.slug !== undefined && typeof data.slug !== 'string') return;
  data.slug = slugify(String(data.title ?? '')) || `${model}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Normalize user-entered dates to ISO. Returns the offending field name, or null. */
function normalizeDates(model: string, data: any): string | null {
  for (const f of SCHEMA_INFO[model]?.dates ?? []) {
    const v = data[f];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'string') {
      if (isRequiredField(model, f)) return f;
      delete data[f];
      continue;
    }
    const d = new Date(v);
    if (isNaN(d.getTime())) {
      if (isRequiredField(model, f)) return f;
      delete data[f];
    } else {
      data[f] = d.toISOString();
    }
  }
  return null;
}

/** Resolve name-like values in relation fields to real ids. Returns an error string, or null. */
async function resolveRelations(model: string, data: any): Promise<string | null> {
  for (const [key, spec] of Object.entries(RELATION_BY_FIELD)) {
    const [relModel, field] = key.split('.');
    if (relModel !== model) continue;
    const v = data[field];
    if (typeof v !== 'string' || !v.trim()) continue;
    const value = v.trim();
    const byId = await spec.delegate.findUnique({ where: { id: value } });
    if (byId) continue;
    const byName = await spec.delegate.findFirst({ where: { name: { equals: value, mode: 'insensitive' } } });
    if (byName) {
      data[field] = byName.id;
    } else {
      return `"${value}" is not a valid ${key.endsWith('countryId') ? 'country' : 'category'} — pick one from the list.`;
    }
  }
  return null;
}

/** Pull the first actionable argument message out of a Prisma validation error. */
function firstValidationMessage(message: string): string {
  const line = String(message)
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^(Argument|Unknown argument|Unknown field|Invalid value|Missing required|Unable to)/i.test(l) || /argument `/.test(l));
  return line ? line.replace(/^`+|`+$/g, '') : '';
}

/** Map Prisma errors to clean HTTP responses without leaking schema details. */
function handleError(e: any) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'A record with this unique value already exists.' }, { status: 409 });
    if (e.code === 'P2025') return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    if (e.code === 'P2003') return NextResponse.json({ error: 'This record is referenced by other records and cannot be modified this way.' }, { status: 409 });
  }
  if (e instanceof Prisma.PrismaClientValidationError) {
    console.error('[crud] validation error:', e.message);
    return NextResponse.json({ error: firstValidationMessage(e.message) || 'Invalid data — check the highlighted fields.' }, { status: 400 });
  }
  console.error('[crud] error:', e);
  return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
}

/** Check if a field is required (not nullable) for a given model */
function isRequiredField(model: string, field: string): boolean {
  // Define required fields for each model
  const requiredFields: Record<string, string[]> = {
    service: ['title', 'slug', 'excerpt', 'description', 'status', 'sort'],
    visa: ['country', 'visaType', 'slug', 'status', 'sort'],
    opportunity: ['title', 'slug', 'description', 'status', 'sort'],
    news: ['title', 'slug', 'excerpt', 'content', 'status', 'publishedAt'],
    testimonial: ['name', 'rating', 'content', 'status', 'order'],
    partner: ['name', 'status', 'order'],
    counter: ['label', 'value', 'order'],
    faq: ['question', 'answer', 'order', 'status'],
    galleryItem: ['title', 'type', 'url', 'order'],
    paymentMethod: ['name', 'slug', 'status', 'order'],
    socialLink: ['platform', 'label', 'url', 'enabled', 'order'],
    footerLink: ['column', 'label', 'url', 'order'],
    department: ['name', 'order'],
    branch: ['name', 'address', 'isMain', 'order'],
    processStep: ['title', 'description', 'order', 'status'],
    pricingPackage: ['name', 'slug', 'price', 'period', 'ctaLabel', 'ctaUrl', 'order', 'status'],
    teamMember: ['name', 'role', 'order', 'featured', 'status'],
    comparisonRow: ['feature', 'ariaValue', 'othersValue', 'order', 'status'],
    ctaBanner: ['title', 'buttonText', 'buttonUrl', 'accent', 'order', 'status'],
    menuItem: ['label', 'order', 'visible', 'openInNewTab'],
    documentCategory: ['name', 'slug', 'order'],
    documentTemplate: ['title', 'slug', 'status'],
    page: ['title', 'slug', 'content', 'status'],
    section: ['key', 'title', 'enabled', 'order'],
    language: ['code', 'name', 'nativeName', 'direction', 'enabled', 'isDefault', 'order'],
    serviceCategory: ['name', 'slug', 'order'],
    opportunityCategory: ['name', 'slug', 'order'],
    newsCategory: ['name', 'slug'],
    advertisement: ['company', 'title', 'description', 'package', 'startDate', 'endDate', 'status', 'order'],
    interviewCategory: ['name', 'slug'],
    interviewQuestion: ['question', 'status', 'order'],
    interviewExperience: ['content', 'status'],
    visaCountry: ['name', 'code', 'status', 'order'],
    visaCategory: ['name', 'slug'],
    visaQuestion: ['question', 'status', 'order'],
    visaDocument: ['name'],
    visaExperience: ['content', 'rating'],
    visaRejection: ['section', 'title', 'status', 'order'],
    successStory: ['title', 'storyType', 'country', 'year', 'content', 'status'],
    alertSubscriber: ['email', 'lang', 'frequency', 'status'],
    // R21-c completeness additions
    galleryAlbum: ['title', 'slug', 'order'],
    contactMessage: ['name', 'email', 'message', 'status'],
    subscriber: ['email', 'status'],
    templateComment: ['content', 'templateId', 'status'],
    templateRating: ['score', 'templateId', 'userId'],
    templateBookmark: [],
    importSource: ['name', 'type', 'scraperKey', 'baseUrl', 'scheduleMinutes'],
    importRun: ['sourceId', 'status'],
    interviewSession: ['mode', 'status'],
    socialIdea: ['kind', 'text'],
  };

  return requiredFields[model]?.includes(field) || false;
}

/** Validate i18n fields contain only valid language codes */
function validateI18nFields(data: any): { valid: boolean; error?: string } {
  const validLangs = ['en', 'fa', 'ps'];

  for (const key of Object.keys(data)) {
    if (key.endsWith('I18n') && data[key]) {
      // Skip if it's an empty string, null, or undefined
      if (data[key] === '' || data[key] === null || data[key] === undefined) {
        continue;
      }

      // If it's a string, try to parse it as JSON
      let obj = data[key];
      if (typeof data[key] === 'string') {
        try {
          obj = JSON.parse(data[key]);
        } catch {
          // If it's not valid JSON and not empty, it's an error
          if (data[key].trim() !== '') {
            return { valid: false, error: `${key} must be an object with language codes` };
          }
          continue;
        }
      }

      // Check if it's an object (not an array)
      if (typeof obj !== 'object' || Array.isArray(obj)) {
        return { valid: false, error: `${key} must be an object with language codes` };
      }

      // If it's an empty object, that's fine - skip validation
      if (Object.keys(obj).length === 0) {
        continue;
      }

      // Validate language codes
      const langs = Object.keys(obj);
      const invalidLangs = langs.filter(l => !validLangs.includes(l));

      if (invalidLangs.length > 0) {
        return {
          valid: false,
          error: `Invalid language codes in ${key}: ${invalidLangs.join(', ')}. Valid codes are: en, fa, ps`
        };
      }
    }
  }

  return { valid: true };
}

/** Clean i18n fields - remove empty strings, parse JSON, remove empty language values */
function cleanI18nFields(data: any): void {
  for (const key of Object.keys(data)) {
    if (key.endsWith('I18n') && data[key] !== undefined) {
      // If it's an empty string or whitespace, set to null
      if (typeof data[key] === 'string' && data[key].trim() === '') {
        data[key] = null;
        continue;
      }

      // If it's a string that looks like JSON, try to parse it
      if (typeof data[key] === 'string') {
        try {
          data[key] = JSON.parse(data[key]);
        } catch {
          // If it can't be parsed, leave it as is for validation to catch
          continue;
        }
      }

      // Clean empty strings from within i18n objects
      if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
        const cleaned: Record<string, any> = {};
        let hasContent = false;

        for (const lang of Object.keys(data[key])) {
          const value = data[key][lang];
          // Only keep non-empty string values or non-empty arrays
          if (typeof value === 'string' && value.trim() !== '') {
            cleaned[lang] = value;
            hasContent = true;
          } else if (Array.isArray(value) && value.length > 0) {
            cleaned[lang] = value;
            hasContent = true;
          }
        }

        // If no content after cleaning, set to null; otherwise use cleaned object
        data[key] = hasContent ? cleaned : null;
      }

      // If it's an empty object, set to null
      if (typeof data[key] === 'object' && !Array.isArray(data[key]) && data[key] !== null && Object.keys(data[key]).length === 0) {
        data[key] = null;
      }
    }
  }
}

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const model = req.nextUrl.searchParams.get('model');
  if (!model || !MODELS[model]) {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
  }

  const { delegate, fields } = MODELS[model];
  const include: any = {};
  if (['service', 'opportunity', 'news', 'interviewQuestion', 'visaQuestion', 'visaDocument'].includes(model)) include.category = true;
  if (['visaQuestion', 'visaDocument', 'visaExperience'].includes(model)) include.country = true;

  const sortField = fields.includes('order') ? 'order' : fields.includes('sort') ? 'sort' : 'createdAt';
  // Feed-like models: newest first (sort/order fields are all 0 there, which
  // made page 1 look like an arbitrary subset — "where are my new imports?").
  const feedModels = ['opportunity', 'news', 'successStory', 'contactMessage', 'importRun'];
  const orderBy: Record<string, 'asc' | 'desc'> = feedModels.includes(model)
    ? { createdAt: 'desc' }
    : { [sortField]: 'asc' };
  // Pagination: default 100 rows, max 10000
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') || '1', 10));
  const pageSize = Math.min(10000, Math.max(1, parseInt(req.nextUrl.searchParams.get('pageSize') || '100', 10)));
  const search = req.nextUrl.searchParams.get('search')?.trim();
  const category = req.nextUrl.searchParams.get('category')?.trim();
  const status = req.nextUrl.searchParams.get('status')?.trim();
  const source = req.nextUrl.searchParams.get('source')?.trim();
  const exactId = req.nextUrl.searchParams.get('id')?.trim();

  const where: any = {};

  // Server-side status/source filters — the UI used to filter client-side
  // over the current page only, which produced empty pages and wrong totals.
  if (model === 'opportunity') {
    if (exactId) where.id = exactId;
    if (status && status !== 'all' && fields.includes('status')) where.status = status;
    if (source && source !== 'all' && fields.includes('sourceName')) where.sourceName = source;
  }

  if (model === 'opportunity' && category && category !== 'all') {
    // Category FAMILIES: the UI labels are broad, the DB slugs are granular.
    // jobs → job + ngo-job + government-job + remote-job
    // scholarships → scholarship + fellowship
    if (category === 'scholarship') {
      where.OR = [
        { category: { slug: { in: ['scholarship', 'fellowship'] } } },
        { jobType: { in: ['scholarship', 'fellowship', 'grant'] } },
        { sourceName: { contains: 'scholarships.af' } },
      ];
    } else if (category === 'job') {
      where.OR = [
        { category: { slug: { in: ['job', 'ngo-job', 'government-job', 'remote-job'] } } },
        { jobType: { in: ['job', 'Full Time', 'Part Time', 'consultancy'] } },
        { sourceName: { contains: 'acbar' } },
        { sourceName: { contains: 'wazifaha' } },
        { sourceName: { contains: 'jobs.af' } },
      ];
    } else {
      where.category = { slug: category };
    }
  }

  if (search) {
    const searchConditions: any[] = [];
    const ci = { contains: search, mode: 'insensitive' as const };
    if (fields.includes('title')) searchConditions.push({ title: ci });
    if (fields.includes('name')) searchConditions.push({ name: ci });
    if (fields.includes('organization')) searchConditions.push({ organization: ci });
    if (fields.includes('email')) searchConditions.push({ email: ci });
    if (fields.includes('country')) searchConditions.push({ country: ci });
    if (fields.includes('slug')) searchConditions.push({ slug: ci });
    if (fields.includes('sourceName')) searchConditions.push({ sourceName: ci });

    if (searchConditions.length > 0) {
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }
  }

  try {
    const [items, total] = await Promise.all([
      delegate.findMany({
        where: Object.keys(where).length ? where : undefined,
        orderBy,
        include: Object.keys(include).length ? include : undefined,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      delegate.count({ where: Object.keys(where).length ? where : undefined }),
    ]);
    // Distinct scrape sources for the opportunity source filter dropdown.
    let sources: string[] | undefined;
    if (model === 'opportunity') {
      const srcRows = await db.opportunity.findMany({
        where: { sourceName: { not: null } },
        select: { sourceName: true },
        distinct: ['sourceName'],
        orderBy: { sourceName: 'asc' },
      });
      sources = srcRows.map((r) => r.sourceName).filter((v): v is string => Boolean(v));
    }

    return NextResponse.json({
      items,
      fields: MODELS[model].fields,
      label: MODELS[model].label,
      statusOptions: MODELS[model].statusOptions,
      sources,
      total,
      page,
      pageSize,
    });
  } catch (e: any) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let model: string, data: any;
  try {
    const body = await req.json();
    model = body.model;
    data = body.data;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!model || !MODELS[model]) return NextResponse.json({ error: 'Invalid model' }, { status: 400 });

  // Clean i18n fields first
  cleanI18nFields(data);

  // Validate i18n fields
  const validation = validateI18nFields(data);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { delegate, fields } = MODELS[model];

  const clean: any = {};
  for (const f of fields) {
    if (data[f] !== undefined) clean[f] = data[f];
  }

  // Slug: derive from title; a non-Latin title falls back to a short random id.
  fillSlug(model, clean, true);

  // Convert empty strings to null ONLY for optional fields
  for (const f of fields) {
    if (clean[f] === '' && !isRequiredField(model, f)) {
      clean[f] = null;
    }
    // Remove empty strings for required fields (let validation handle it)
    if (clean[f] === '' && isRequiredField(model, f)) {
      delete clean[f];
    }
  }

  const dateErr = normalizeDates(model, clean);
  if (dateErr) {
    return NextResponse.json({ error: `${dateErr} must be a valid date (e.g. 2026-09-29).` }, { status: 400 });
  }

  // Create-time guard: fields the schema requires and that carry no DB default.
  const missing = (SCHEMA_INFO[model]?.required ?? []).filter((f) => clean[f] === undefined || clean[f] === null || clean[f] === '');
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
  }

  const relErr = await resolveRelations(model, clean);
  if (relErr) {
    return NextResponse.json({ error: relErr }, { status: 400 });
  }

  if (model === 'opportunity') {
    clean.applyUrl = normalizeApplyUrl(clean.applyUrl);
    clean.applyUrlType = classifyApplyUrl(clean.applyUrl, clean.sourceUrl, clean.originalUrl);
  }

  // Enforce single default language
  if (model === 'language' && clean.isDefault === true) {
    await db.language.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  try {
    const item = await delegate.create({ data: clean });
    await logAction({ userId: admin.id, action: 'create', entity: model, entityId: item.id, req });
    try {
      revalidatePath('/', 'layout');
      if (model === 'opportunity' && item.slug) {
        for (const lang of ['en', 'fa', 'ps']) revalidatePath(`/${lang}/opportunities/${item.slug}`);
      }
    } catch (e) { console.error('[crud] revalidate error:', e); }
    return NextResponse.json({ success: true, item });
  } catch (e: any) {
    return handleError(e);
  }
}

export async function PUT(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let model: string, id: string, data: any;
  try {
    const body = await req.json();
    model = body.model;
    id = body.id;
    data = body.data ?? body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!model || !MODELS[model] || !id) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });

  // Clean i18n fields first
  cleanI18nFields(data);

  // Validate i18n fields
  const validation = validateI18nFields(data);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { delegate, fields } = MODELS[model];

  const clean: any = {};
  for (const f of fields) {
    if (data[f] !== undefined) clean[f] = data[f];
  }

  // Slug: derive from title; a non-Latin title falls back to a short random id.
  fillSlug(model, clean, false);

  // Convert empty strings to null ONLY for optional fields
  for (const f of fields) {
    if (clean[f] === '' && !isRequiredField(model, f)) {
      clean[f] = null;
    }
    // Remove empty strings for required fields (let validation handle it)
    if (clean[f] === '' && isRequiredField(model, f)) {
      delete clean[f];
    }
  }

  const dateErr = normalizeDates(model, clean);
  if (dateErr) {
    return NextResponse.json({ error: `${dateErr} must be a valid date (e.g. 2026-09-29).` }, { status: 400 });
  }

  const relErr = await resolveRelations(model, clean);
  if (relErr) {
    return NextResponse.json({ error: relErr }, { status: 400 });
  }

  if (model === 'opportunity' && ['applyUrl', 'sourceUrl', 'originalUrl'].some((field) => field in clean)) {
    const previous = await db.opportunity.findUnique({ where: { id }, select: { applyUrl: true, sourceUrl: true, originalUrl: true } });
    if (!previous) return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    if (clean.applyUrl !== undefined) clean.applyUrl = normalizeApplyUrl(clean.applyUrl);
    clean.applyUrlType = classifyApplyUrl(
      clean.applyUrl === undefined ? previous.applyUrl : clean.applyUrl,
      clean.sourceUrl === undefined ? previous.sourceUrl : clean.sourceUrl,
      clean.originalUrl === undefined ? previous.originalUrl : clean.originalUrl,
    );
  }

  if (model === 'language' && clean.isDefault === true) {
    await db.language.updateMany({ where: { isDefault: true, NOT: { id } }, data: { isDefault: false } });
  }

  try {
    const item = await delegate.update({ where: { id }, data: clean });
    await logAction({ userId: admin.id, action: 'update', entity: model, entityId: id, req });
    try {
      revalidatePath('/', 'layout');
      if (model === 'opportunity' && item.slug) {
        for (const lang of ['en', 'fa', 'ps']) revalidatePath(`/${lang}/opportunities/${item.slug}`);
      }
    } catch (e) { console.error('[crud] revalidate error:', e); }
    return NextResponse.json({ success: true, item });
  } catch (e: any) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const model = req.nextUrl.searchParams.get('model');
  const idParam = req.nextUrl.searchParams.get('id');
  if (!model || !MODELS[model] || !idParam) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
  const { delegate } = MODELS[model];

  const ids = idParam.split(',');

  try {
    if (ids.length > 1) {
      await delegate.deleteMany({ where: { id: { in: ids } } });
      await logAction({ userId: admin.id, action: 'delete_many', entity: model, entityId: 'bulk', req });
    } else {
      await delegate.delete({ where: { id: ids[0] } });
      await logAction({ userId: admin.id, action: 'delete', entity: model, entityId: ids[0], req });
    }
    try { revalidatePath('/', 'layout'); } catch (e) { console.error('[crud] revalidate error:', e); }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return handleError(e);
  }
}

export { MODELS };
