/**
 * AI Enrichment Pipeline — prepares a RawListing for Prisma upsert.
 *
 * For each scraped listing it produces (with a single LLM call):
 *   1. A medium-length English summary (120-180 words) — readable in ~30s
 *   2. Natural Dari/Persian (fa) + Pashto (ps) translations of title & summary
 *   3. A category suggestion from the known category slugs
 *   4. Deterministic (non-AI) extraction of the EXACT application link:
 *      emails, Google Forms, survey links, explicit apply URLs
 *
 * Fallback behavior: if the AI provider is unavailable or a call fails, the
 * listing is stored in its original language only (previous behavior) so an
 * import never fails because of AI.
 */

import type { PrismaClient } from '@prisma/client';
import { slugify, stripHtml, stripThemeBoilerplate, cleanTitleJunk } from '../import/utils';
import { removeLeadingTitle } from '../content-html';
import { prettifySlug } from '../import/scrapers/scholarships-af';
import type { RawListing } from '../import/types';
import { getAIProvider } from './provider';

/**
 * Last-resort title sanitation: a URL-looking title (sitemap seed that
 * survived every upstream guard) must NEVER reach the DB — it would leak
 * into seoTitle/ogTitle/titleI18n and render "https://…" as the headline.
 * Derive a human title from the source URL's slug instead.
 */
function sanitizeTitle(raw: string | undefined, sourceUrl: string | undefined): string {
  const t = (raw || '').trim();
  if (!t || !/^https?:\/\//i.test(t)) return t;
  const fromSlug = sourceUrl ? prettifySlug(sourceUrl) : null;
  return fromSlug || t;
}

/** The three supported language codes. */
const LANGS = ['en', 'fa', 'ps'] as const;
type Lang = (typeof LANGS)[number];

export interface PipelineOutput {
  /** Prisma data object (base fields + i18n fields). */
  data: Record<string, unknown>;
  /** Category slug suggestions (empty without AI). */
  categorySlugs: string[];
  /** Translation completeness. */
  translationStatus: 'complete' | 'partial' | 'pending';
}

// ─── Deterministic apply-link extraction ─────────────────────────────────────

/** Addresses that belong to the source site itself, not the employer. */
const NON_APPLY_EMAILS = [
  'webinfo@acbar.org',
  'info@acbar.org',
  'acbar.org',
  'wazifaha.org',
  'scholarships.af',
  'o4af.com',
];

const EXPLICIT_APPLY_URL_RE =
  /(?:apply|application|submit)[^\n]{0,80}(https?:\/\/[^\s)"'<>]+)/gi;

/**
 * Extract the best application link from listing text.
 * Priority: scraped applyUrl > email in guidelines > email in description >
 * Google Form / survey link > explicit "apply at URL" in text.
 */
export function extractApplyLink(listing: RawListing): string | null {
  const candidates: string[] = [];
  const guidelines = listing.guidelines || '';
  const description = typeof listing.description === 'string' ? listing.description : '';
  const haystacks = [guidelines, description, listing.requirements || ''];

  // 1. Emails found inside submission guidelines rank first, then anywhere else
  for (const text of haystacks) {
    const emailMatches = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi) || [];
    for (const email of emailMatches) {
      const lower = email.toLowerCase();
      if (NON_APPLY_EMAILS.some((bad) => lower.includes(bad))) continue;
      if (!candidates.includes(`mailto:${email}`)) candidates.push(`mailto:${email}`);
    }
    if (candidates.length) break; // guidelines emails are enough
  }

  // 2. Google Forms / survey links
  for (const text of haystacks) {
    const formMatches =
      text.match(/https?:\/\/(?:forms\.|docs\.google\.com\/forms\/|survey)[^\s)"'<>]+/gi) || [];
    for (const url of formMatches) {
      if (!candidates.includes(url)) candidates.push(url);
    }
  }

  // 3. Explicit "apply at <url>" patterns
  for (const text of haystacks) {
    EXPLICIT_APPLY_URL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EXPLICIT_APPLY_URL_RE.exec(text)) !== null) {
      const url = m[1];
      if (!NON_APPLY_EMAILS.some((bad) => url.toLowerCase().includes(bad)) && !candidates.includes(url)) {
        candidates.push(url);
      }
    }
  }

  // 4. A scraped applyUrl (e.g. Wazifaha's own apply page) — keep as final fallback
  if (listing.applyUrl && !candidates.includes(listing.applyUrl)) {
    candidates.push(listing.applyUrl);
  }

  return candidates[0] || null;
}

// ─── LLM enrichment ──────────────────────────────────────────────────────────

interface Enrichment {
  summary_en: string;
  title_fa: string;
  summary_fa: string;
  title_ps: string;
  summary_ps: string;
  category?: string;
}

const ENRICH_SYSTEM = `You are an editor and translator for ARIA HUB, an Afghan opportunities portal (jobs, scholarships, internships).
Given a scraped job/scholarship posting, respond ONLY with strict JSON:
{
  "summary_en": "<120-180 word summary in English: what the role/program is, the organization, location, top 3 requirements, salary if stated, and how to apply. Skip company boilerplate and legal disclaimers. Plain text, no markdown headings.>",
  "title_fa": "<Dari/Persian translation of the title, natural and fluent, RTL script. Keep org names like UNICEF/WHO transliterated or as-is>",
  "summary_fa": "<Dari/Persian translation of summary_en, natural fluent professional tone, ~120 words, RTL script. Keep URLs, emails, dates, org names, and technical terms (TOEFL, IELTS) as-is>",
  "title_ps": "<Pashto translation of the title, natural and fluent, RTL script>",
  "summary_ps": "<Pashto translation of summary_en, natural fluent professional tone, ~120 words, RTL script. Keep URLs, emails, dates, org names, technical terms as-is>",
  "category": "<one of: jobs, scholarships, internships, competitions, conferences, volunteer, exchange-programs, training>"
}
Rules: never invent facts not present in the posting; if salary/deadline missing, omit them; if the posting is a scholarship use scholarship wording, if a job use job wording.`;

function buildEnrichUserPrompt(listing: RawListing): string {
  const parts: string[] = [];
  parts.push(`TITLE: ${listing.title}`);
  if (listing.organization) parts.push(`ORGANIZATION: ${listing.organization}`);
  if (listing.location) parts.push(`LOCATION: ${listing.location}`);
  if (listing.deadline) parts.push(`DEADLINE: ${listing.deadline}`);
  if (listing.jobType) parts.push(`TYPE: ${listing.jobType}`);
  if (listing.salary) parts.push(`SALARY: ${listing.salary}`);
  if (listing.educationReq) parts.push(`EDUCATION: ${stripHtml(listing.educationReq).slice(0, 300)}`);
  if (listing.experience) parts.push(`EXPERIENCE: ${stripHtml(listing.experience).slice(0, 300)}`);
  const desc = stripHtml(listing.description || '').slice(0, 5000);
  if (desc) parts.push(`DESCRIPTION:\n${desc}`);
  if (listing.requirements) parts.push(`REQUIREMENTS:\n${stripHtml(listing.requirements).slice(0, 1500)}`);
  if (listing.guidelines) parts.push(`SUBMISSION GUIDELINES:\n${stripHtml(listing.guidelines).slice(0, 800)}`);
  return parts.join('\n\n');
}

function parseEnrichment(raw: string): Enrichment | null {
  if (!raw) return null;
  let text = raw.trim();
  // Strip markdown code fences if the model wrapped the JSON
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (parsed && typeof parsed.summary_en === 'string' && parsed.summary_en.length > 40) {
      return parsed as Enrichment;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Pipeline entry point ────────────────────────────────────────────────────

/**
 * Run the pipeline on a listing.
 * `originalLang` is the source language (default 'en').
 */
export async function runAIPipeline(
  listing: RawListing,
  ctx: { db: PrismaClient; knownCategorySlugs: string[] },
  originalLang: Lang = 'en',
): Promise<PipelineOutput> {
  // Clean title once — everything downstream (slugs, i18n, SEO) uses it.
  listing.title = cleanTitleJunk(listing.title) || listing.title;
  // Belt & braces: never let a URL-looking title into seo/og/i18n fields.
  listing.title = sanitizeTitle(listing.title, listing.sourceUrl) || listing.title;

  const plainDescription = stripHtml(listing.description || listing.title || '').trim();
  const shortDesc = plainDescription.substring(0, 155) + (plainDescription.length > 155 ? '...' : '');
  const exactApplyUrl = extractApplyLink(listing);

  // Base data — always present, AI-independent. The stored description is
  // pre-cleaned (theme junk + duplicated leading title removed) so the DB
  // only ever holds display-ready content.
  const cleanedDescription = removeLeadingTitle(
    stripThemeBoilerplate(listing.description || plainDescription || listing.title || 'No description available'),
    listing.title,
  );
  const data: Record<string, unknown> = {
    title: listing.title,
    description: cleanedDescription,
    language: originalLang,
    jobType: listing.jobType || null,
    salary: listing.salary || null,
    educationReq: listing.educationReq || null,
    experience: listing.experience || null,
    extractedData: listing.extractedData || null,
    applyUrl: exactApplyUrl || listing.applyUrl || null,

    seoTitle: listing.title,
    seoDescription: shortDesc,
    ogTitle: listing.title,
    ogDescription: shortDesc,
    aiSummary: shortDesc,
  };

  if (listing.eligibility) data.eligibility = listing.eligibility;
  if (listing.benefits) data.benefits = listing.benefits;
  if (listing.responsibilities) data.responsibilities = listing.responsibilities;
  if (listing.guidelines) data.guidelines = listing.guidelines;
  if (listing.requirements || listing.requiredDocuments) {
    data.requirements = listing.requirements || listing.requiredDocuments;
  }

  // i18n containers start with the original language
  const titleI18n: Record<string, string> = { [originalLang]: listing.title };
  const descriptionI18n: Record<string, string> = { [originalLang]: data.description as string };
  const summaryI18n: Record<string, string> = { [originalLang]: shortDesc };

  // ── AI enrichment (single call) ─────────────────────────────────────────
  let translationStatus: PipelineOutput['translationStatus'] = 'pending';
  let categorySlugs: string[] = [];

  const provider = await getAIProvider();
  if (provider) {
    try {
      const raw = await enrichWithRetry(provider, listing);
      const parsed = parseEnrichment(raw);
      if (parsed) {
        // English summary
        if (parsed.summary_en) {
          data.aiSummary = parsed.summary_en;
          summaryI18n.en = parsed.summary_en;
          if (originalLang !== 'en') summaryI18n[originalLang] = parsed.summary_en;
        }
        // Dari/Persian
        if (parsed.title_fa) titleI18n.fa = parsed.title_fa;
        if (parsed.summary_fa) summaryI18n.fa = parsed.summary_fa;
        // Pashto
        if (parsed.title_ps) titleI18n.ps = parsed.title_ps;
        if (parsed.summary_ps) summaryI18n.ps = parsed.summary_ps;

        // Category suggestion
        if (parsed.category) {
          const suggested = slugify(parsed.category);
          if (ctx.knownCategorySlugs.includes(suggested)) categorySlugs.push(suggested);
        }

        translationStatus =
          titleI18n.fa && summaryI18n.fa && titleI18n.ps && summaryI18n.ps ? 'complete' : 'partial';
      }
    } catch (e) {
      console.warn('[ai-pipeline] enrichment failed, storing original language only:', (e as Error).message);
      translationStatus = 'pending';
    }
  }

  // Fill missing i18n keys with English so the UI fallback chain is consistent
  if (!titleI18n.en) titleI18n.en = listing.title;
  if (!summaryI18n.en) summaryI18n.en = data.aiSummary as string;
  if (!descriptionI18n.en) descriptionI18n.en = data.description as string;

  data.titleI18n = titleI18n;
  data.descriptionI18n = descriptionI18n;
  data.aiSummaryI18n = summaryI18n;

  // SEO fields per language — derive from title/summary (cheap, no extra LLM call)
  const seoTitleI18n: Record<string, string> = { ...titleI18n };
  const seoDescI18n: Record<string, string> = {};
  for (const lang of Object.keys(summaryI18n)) {
    seoDescI18n[lang] = (summaryI18n[lang] as string).slice(0, 155);
  }
  data.seoTitleI18n = seoTitleI18n;
  data.seoDescriptionI18n = seoDescI18n;
  data.ogTitleI18n = { ...seoTitleI18n };
  data.ogDescriptionI18n = { ...seoDescI18n };

  const sectionFields: Array<{ key: string; value?: string | null }> = [
    { key: 'eligibility', value: listing.eligibility },
    { key: 'benefits', value: listing.benefits },
    { key: 'responsibilities', value: listing.responsibilities },
    { key: 'guidelines', value: listing.guidelines },
    { key: 'requirements', value: listing.requirements || listing.requiredDocuments },
    { key: 'jobType', value: listing.jobType },
    { key: 'salary', value: listing.salary },
    { key: 'educationReq', value: listing.educationReq },
    { key: 'experience', value: listing.experience },
  ];

  for (const s of sectionFields) {
    if (s.value) {
      (data as unknown as Record<string, unknown>)[`${s.key}I18n`] = { [originalLang]: s.value };
    }
  }

  // ── Full trilingual bodies — one extra LLM call per NEW listing ─────────
  // Translates description + all sections into Dari/Pashto so users of every
  // language see complete content (not an English body under a localized UI).
  if (provider) {
    try {
      const chat = (system: string, user: string): Promise<string> =>
        typeof (provider as unknown as Record<string, unknown>).chat === 'function'
          ? (provider as unknown as { chat(s: string, u: string): Promise<string> }).chat(system, user)
          : Promise.reject(new Error('no chat'));
      const sections = await translateSections(
        {
          title: listing.title,
          description: cleanedDescription,
          eligibility: listing.eligibility ?? null,
          benefits: listing.benefits ?? null,
          responsibilities: listing.responsibilities ?? null,
          requirements: (listing.requirements || listing.requiredDocuments) ?? null,
          guidelines: listing.guidelines ?? null,
          jobType: listing.jobType ?? null,
          salary: listing.salary ?? null,
          educationReq: listing.educationReq ?? null,
          experience: listing.experience ?? null,
        },
        chat,
      );
      if (sections) {
        mergeSectionTranslations(data, originalLang, sections);
        const descI18n = data.descriptionI18n as Record<string, string>;
        if (descI18n.fa && descI18n.ps) translationStatus = 'complete';
      }
    } catch (e) {
      console.warn('[ai-pipeline] section translation failed (kept original language):', (e as Error).message);
    }
  }

  if (listing.extractedData && typeof listing.extractedData === 'object') {
    data.extractedDataI18n = { [originalLang]: { ...listing.extractedData } };
  }

  return { data, categorySlugs, translationStatus };
}

/** Minimal provider interface needed for enrichment (avoids circular imports). */
interface ChatProvider {
  chat(system: string, user: string): Promise<string>;
}

/** Enrichment with retry + exponential backoff on rate limits. */
async function enrichWithRetry(provider: unknown, listing: RawListing, attempts = 3): Promise<string> {
  let lastErr: unknown;
  for (let a = 0; a < attempts; a++) {
    try {
      return await enrichWithProvider(provider, listing);
    } catch (e) {
      lastErr = e;
      const msg = (e as Error).message || '';
      if (msg.includes('circuit-breaker')) throw e; // breaker open — fail fast
      const is429 = msg.includes('429') || msg.toLowerCase().includes('too many');
      if (is429 && a < attempts - 1) {
        const wait = 15000 * (a + 1); // 15s, 30s
        console.warn(`[ai-pipeline] rate-limited, retrying in ${wait / 1000}s (${a + 2}/${attempts})`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

async function enrichWithProvider(provider: unknown, listing: RawListing): Promise<string> {
  // The ZAIProvider exposes a private chat(); other providers expose
  // rewrite/translate. Normalize: prefer an explicit enrich() if present,
  // else fall back to a raw chat-style call through the ZAI provider shape.
  const p = provider as unknown as Record<string, unknown>;
  if (typeof p.enrich === 'function') {
    return (p as unknown as { enrich(system: string, user: string): Promise<string> }).enrich(
      ENRICH_SYSTEM,
      buildEnrichUserPrompt(listing),
    );
  }
  if (typeof p.chat === 'function') {
    return (p as unknown as ChatProvider).chat(ENRICH_SYSTEM, buildEnrichUserPrompt(listing));
  }
  throw new Error('Provider does not support raw chat enrichment');
}

/** Ensure a slug is unique by appending a suffix if needed. */
export async function ensureUniqueSlug(db: PrismaClient, baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let n = 1;
  while (await db.opportunity.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) } })) {
    n++;
    slug = `${baseSlug}-${n}`;
  }
  return slug;
}

/** Generate a base slug from a title. */
export function makeSlug(title: string): string {
  return slugify(title);
}

// ─── Full-section translation (fa + ps) ──────────────────────────────────────

/** Sections that get fully translated into Dari and Pashto. */
export interface SectionInput {
  title?: string | null;
  description?: string | null;
  eligibility?: string | null;
  benefits?: string | null;
  responsibilities?: string | null;
  requirements?: string | null;
  guidelines?: string | null;
  jobType?: string | null;
  salary?: string | null;
  educationReq?: string | null;
  experience?: string | null;
  excerpt?: string | null;
  content?: string | null;
}

export interface SectionTranslations {
  title_fa?: string;
  title_ps?: string;
  description_fa?: string;
  description_ps?: string;
  eligibility_fa?: string;
  eligibility_ps?: string;
  benefits_fa?: string;
  benefits_ps?: string;
  responsibilities_fa?: string;
  responsibilities_ps?: string;
  requirements_fa?: string;
  requirements_ps?: string;
  guidelines_fa?: string;
  guidelines_ps?: string;
  jobType_fa?: string;
  jobType_ps?: string;
  salary_fa?: string;
  salary_ps?: string;
  educationReq_fa?: string;
  educationReq_ps?: string;
  experience_fa?: string;
  experience_ps?: string;
  excerpt_fa?: string;
  excerpt_ps?: string;
  content_fa?: string;
  content_ps?: string;
}

const SECTION_SYSTEM = `You are a professional translator for ARIA HUB, an Afghan opportunities portal.
Translate job/scholarship announcement sections into natural, professional Dari/Persian (fa) and Pashto (ps).
Respond ONLY with strict JSON — no markdown fences. For EVERY section provided in the input, output both "<section>_fa" and "<section>_ps" keys, preserving the section names exactly.
Rules:
- Translate MEANING faithfully; do not summarize, do not omit lists or details, do not invent facts.
- Mirror the source line structure with "\\n" and "- " bullets.
- Keep URLs, email addresses, numbers, dates, org names (UNICEF, WHO), and technical terms (IELTS, TOEFL, MS Office) exactly as-is.
- Short field values (jobType, salary) get short translations.
- No markdown, no HTML tags in output — plain text only.`;

const CHUNK_SYSTEM = `You are a professional translator for ARIA HUB, an Afghan opportunities portal.
Translate the given announcement excerpt into natural, professional Dari/Persian (fa) and Pashto (ps).
Respond ONLY with strict JSON, no markdown fences: {"fa":"<translation>","ps":"<translation>"}
Rules: translate MEANING faithfully, never summarize or omit details; mirror line structure with \\n and "- " bullets; keep URLs, emails, numbers, dates, org names and technical terms exactly as-is; plain text only.`;

/** Build the user prompt with capped sections to protect the token budget. */
function buildSectionPrompt(sections: SectionInput): string {
  const parts: string[] = [];
  const cap = (s: string | null | undefined, n: number): string =>
    stripHtml(s || '').slice(0, n).trim();
  if (sections.title) parts.push(`title: ${sections.title}`);
  if (sections.eligibility) parts.push(`eligibility:\n${cap(sections.eligibility, 900)}`);
  if (sections.benefits) parts.push(`benefits:\n${cap(sections.benefits, 700)}`);
  if (sections.responsibilities) parts.push(`responsibilities:\n${cap(sections.responsibilities, 900)}`);
  if (sections.requirements) parts.push(`requirements:\n${cap(sections.requirements, 900)}`);
  if (sections.guidelines) parts.push(`guidelines:\n${cap(sections.guidelines, 700)}`);
  if (sections.jobType) parts.push(`jobType: ${cap(sections.jobType, 80)}`);
  if (sections.salary) parts.push(`salary: ${cap(sections.salary, 150)}`);
  if (sections.educationReq) parts.push(`educationReq:\n${cap(sections.educationReq, 500)}`);
  if (sections.experience) parts.push(`experience:\n${cap(sections.experience, 500)}`);
  if (sections.excerpt) parts.push(`excerpt:\n${cap(sections.excerpt, 400)}`);
  return parts.join('\n\n');
}

/**
 * Best-effort JSON recovery for LLM output: strips code fences, then closes
 * unterminated strings/objects so a truncated-but-well-formed-so-far reply
 * can still be used (the tail is dropped, never invented).
 */
function repairJson(raw: string): unknown | null {
  if (!raw) return null;
  let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const start = text.indexOf('{');
  if (start === -1) return null;
  text = text.slice(start);
  const end = text.lastIndexOf('}');
  if (end !== -1) {
    try { return JSON.parse(text.slice(0, end + 1)); } catch { /* repair below */ }
  }
  // Walk and close open constructs
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  for (const ch of text) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { if (inString) escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }
  let repaired = text;
  if (inString) repaired += '"';
  while (stack.length) repaired += stack.pop() === '{' ? '}' : ']';
  try { return JSON.parse(repaired); } catch { return null; }
}

function parseSectionTranslations(raw: string): SectionTranslations | null {
  const parsed = repairJson(raw);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as SectionTranslations;
  }
  return null;
}

/** Split text into translation chunks on paragraph/line boundaries. */
function chunkText(text: string, maxLen = 900): string[] {
  const clean = stripHtml(text).replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length <= maxLen) return clean ? [clean] : [];
  const chunks: string[] = [];
  let current = '';
  for (const para of clean.split('\n')) {
    if ((current + '\n' + para).trim().length > maxLen && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? `${current}\n${para}` : para;
    }
    // Single oversized line — hard split
    while (current.length > maxLen * 1.6) {
      const cut = current.lastIndexOf(' ', maxLen);
      chunks.push(current.slice(0, cut > 0 ? cut : maxLen).trim());
      current = current.slice(cut > 0 ? cut : maxLen).trim();
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function translateChunkPair(
  chunk: string,
  chat: (system: string, user: string) => Promise<string>,
): Promise<{ fa: string; ps: string } | null> {
  const raw = await chat(CHUNK_SYSTEM, chunk);
  const parsed = repairJson(raw) as { fa?: string; ps?: string } | null;
  if (parsed && typeof parsed.fa === 'string' && typeof parsed.ps === 'string' && (parsed.fa.trim() || parsed.ps.trim())) {
    return { fa: parsed.fa.trim(), ps: parsed.ps.trim() };
  }
  return null;
}

/**
 * Translate all content sections of a record into Dari (fa) + Pashto (ps).
 * Short sections go in one bounded JSON call; long descriptions are split
 * into ~900-char chunks translated separately (no truncation failures).
 * Returns null only if nothing at all could be translated.
 */
export async function translateSections(
  sections: SectionInput,
  chat: (system: string, user: string) => Promise<string>,
): Promise<SectionTranslations | null> {
  const out: SectionTranslations = {};

  // 1. Title (cheap, own call — it also anchors terminology for the rest)
  if (sections.title?.trim()) {
    try {
      const parsed = parseSectionTranslations(
        await chat(
          'Translate the announcement title into Dari/Persian (fa) and Pashto (ps). Respond ONLY with strict JSON, no fences: {"title_fa":"...","title_ps":"..."}',
          sections.title,
        ),
      );
      if (parsed?.title_fa) out.title_fa = parsed.title_fa;
      if (parsed?.title_ps) out.title_ps = parsed.title_ps;
    } catch { /* title is optional */ }
  }

  // 2. Small sections in one bounded JSON call
  const smallPrompt = buildSectionPrompt({ ...sections, description: null, content: null, title: null });
  if (smallPrompt.trim()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const parsed = parseSectionTranslations(await chat(SECTION_SYSTEM, smallPrompt));
        if (parsed) {
          Object.assign(out, parsed);
          break;
        }
        break; // unparseable — don't burn quota on the same prompt
      } catch (e) {
        const msg = (e as Error).message || '';
        if (msg.includes('circuit-breaker')) break; // breaker open — no point retrying/sleeping
        const is429 = msg.includes('429') || msg.toLowerCase().includes('too many');
        if (!is429 || attempt === 1) break;
        await new Promise((r) => setTimeout(r, 15000));
      }
    }
  }

  // 3. Description — chunked (bounded output per call, JSON-repaired)
  if (sections.description?.trim()) {
    const chunks = chunkText(sections.description);
    const faParts: string[] = [];
    const psParts: string[] = [];
    for (const chunk of chunks) {
      let done = false;
      for (let attempt = 0; attempt < 3 && !done; attempt++) {
        try {
          const pair = await translateChunkPair(chunk, chat);
          if (pair) {
            if (pair.fa) faParts.push(pair.fa);
            if (pair.ps) psParts.push(pair.ps);
            done = true;
          } else break; // unparseable chunk — skip it
        } catch (e) {
          const msg = (e as Error).message || '';
          if (msg.includes('circuit-breaker')) break; // breaker open — fail fast
          const is429 = msg.includes('429') || msg.toLowerCase().includes('too many');
          if (!is429) break;
          await new Promise((r) => setTimeout(r, 15000 * (attempt + 1)));
        }
      }
      if (!done) faParts.push(''); psParts.push(''); // keep chunk alignment
    }
    const fa = faParts.filter(Boolean).join('\n\n').trim();
    const ps = psParts.filter(Boolean).join('\n\n').trim();
    if (fa) out.description_fa = fa;
    if (ps) out.description_ps = ps;
  }

  // 4. Content (news articles) — same chunked path as description
  if (sections.content?.trim()) {
    const chunks = chunkText(sections.content);
    const faParts: string[] = [];
    const psParts: string[] = [];
    for (const chunk of chunks) {
      let done = false;
      for (let attempt = 0; attempt < 3 && !done; attempt++) {
        try {
          const pair = await translateChunkPair(chunk, chat);
          if (pair) {
            if (pair.fa) faParts.push(pair.fa);
            if (pair.ps) psParts.push(pair.ps);
            done = true;
          } else break; // unparseable chunk — skip it
        } catch (e) {
          const msg = (e as Error).message || '';
          if (msg.includes('circuit-breaker')) break; // breaker open — fail fast
          const is429 = msg.includes('429') || msg.toLowerCase().includes('too many');
          if (!is429) break;
          await new Promise((r) => setTimeout(r, 15000 * (attempt + 1)));
        }
      }
      if (!done) faParts.push(''); psParts.push(''); // keep chunk alignment
    }
    const fa = faParts.filter(Boolean).join('\n\n').trim();
    const ps = psParts.filter(Boolean).join('\n\n').trim();
    if (fa) out.content_fa = fa;
    if (ps) out.content_ps = ps;
  }

  const hasAnything = Object.values(out).some((v) => typeof v === 'string' && v.trim());
  return hasAnything ? out : null;
}

/**
 * Merge SectionTranslations into an i18n record set (mutates and returns the
 * maps). Only fills values that are still missing, never overwrites.
 */
export function mergeSectionTranslations(
  data: Record<string, unknown>,
  originalLang: string,
  t: SectionTranslations,
): void {
  const fill = (field: string, fa: string | undefined, ps: string | undefined, en?: string): void => {
    if (!fa && !ps) return;
    const key = `${field}I18n`;
    const current = (data[key] as Record<string, string> | null | undefined) || {};
    const next: Record<string, string> = { ...current };
    if (en && !next.en) next.en = en;
    if (originalLang !== 'en' && en && !next[originalLang]) next[originalLang] = en;
    if (fa && !next.fa) next.fa = fa;
    if (ps && !next.ps) next.ps = ps;
    data[key] = next;
  };
  fill('title', t.title_fa, t.title_ps);
  fill('description', t.description_fa, t.description_ps);
  fill('eligibility', t.eligibility_fa, t.eligibility_ps);
  fill('benefits', t.benefits_fa, t.benefits_ps);
  fill('responsibilities', t.responsibilities_fa, t.responsibilities_ps);
  fill('requirements', t.requirements_fa, t.requirements_ps);
  fill('guidelines', t.guidelines_fa, t.guidelines_ps);
  fill('jobType', t.jobType_fa, t.jobType_ps);
  fill('salary', t.salary_fa, t.salary_ps);
  fill('educationReq', t.educationReq_fa, t.educationReq_ps);
  fill('experience', t.experience_fa, t.experience_ps);
}
