/**
 * translate-core — server-side, rate-limit-aware fa/ps translation for the
 * automation pipeline. Same translation contract as
 * scripts/translate-fill-all.mjs (which remains the bulk/offline tool), but
 * processes ONE row per call so the pipeline tick can drain the backlog in
 * small, quota-friendly batches ("1 hour, 1 day, 2 days — as long as it takes").
 *
 * Priority order: Opportunity (newest first) → News → then other tables.
 * On 429 the caller records a backoff window in AutomationState and skips.
 */
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { getProviderSlots, chatWithFailover } from '@/lib/ai/failover';
import { Prisma } from '@prisma/client';
type JsonValue = Prisma.JsonValue;

const PrismaAnyNull = Prisma.DbNull;

const SYMBOL_RE = /^[\s\d.,+%~×x°–—\-/$€£#&*'"()[\]]+$/u;
const isSymbol = (s: string) => s.length <= 12 && SYMBOL_RE.test(s) && /[\d+%+]/.test(s);

const LANG_SYSTEM: Record<'fa' | 'ps', string> = {
  fa:
    'You are the Persian translation engine for ARIA HUB. Translate all supplied opportunity content fully into natural professional Persian. ' +
    'Never summarize, shorten, skip, merge away, or invent content. Preserve paragraph and list order. ' +
    'Keep URLs, emails, phone numbers, organization and brand names when appropriate, technical abbreviations, and ASCII numbers exactly as written. ' +
    'Return only the translation, with no commentary.',
  ps:
    'You are the Pashto translation engine for ARIA HUB. Translate all supplied opportunity content fully into natural professional Pashto. ' +
    'Never summarize, shorten, skip, merge away, or invent content. Preserve paragraph and list order. ' +
    'Keep URLs, emails, phone numbers, organization and brand names when appropriate, technical abbreviations, and ASCII numbers exactly as written. ' +
    'Return only the translation, with no commentary.',
};

const CHUNK_SIZE = Math.max(900, Math.min(3500, Number(process.env.TRANSLATION_CHUNK_CHARS || 2200) || 2200));
const MAX_CALLS_PER_TICK = Math.max(1, Math.min(6, Number(process.env.TRANSLATION_MAX_CALLS_PER_TICK || 4) || 4));

type TargetLang = 'fa' | 'ps';
type TranslationStage = {
  version: 1;
  sourceHash: string;
  fields: Record<string, string>;
  chunks: Record<string, { sourceHash: string; parts: string[] }>;
};

function stripHtmlPreservingBreaks(value: string): string {
  return (value || '')
    .replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/tr)\s*\/?>/gi, '\n')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function chunkText(text: string): string[] {
  const clean = stripHtmlPreservingBreaks(text);
  if (!clean) return [];
  if (clean.length <= CHUNK_SIZE) return [clean];
  const out: string[] = [];
  let rest = clean;
  while (rest.length > CHUNK_SIZE) {
    let cut = rest.lastIndexOf('\n\n', CHUNK_SIZE);
    if (cut < CHUNK_SIZE * 0.45) cut = rest.lastIndexOf('\n', CHUNK_SIZE);
    if (cut < CHUNK_SIZE * 0.45) cut = rest.lastIndexOf('. ', CHUNK_SIZE);
    if (cut < CHUNK_SIZE * 0.45) cut = rest.lastIndexOf(' ', CHUNK_SIZE);
    if (cut < CHUNK_SIZE * 0.45) cut = CHUNK_SIZE;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out.filter(Boolean);
}

function protectedTokens(text: string): string[] {
  const values = new Set<string>();
  for (const m of text.matchAll(/https?:\/\/[^\s<>"')]+/gi)) values.add(m[0]);
  for (const m of text.matchAll(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi)) values.add(m[0]);
  for (const m of text.matchAll(/\b\d[\d,./:%+\-]*\b/g)) values.add(m[0]);
  return [...values];
}

function validTranslation(source: string, translated: string): boolean {
  const out = translated.trim();
  if (!out) return false;
  if (source.length >= 250 && out.length < source.length * 0.38) return false;
  if (source.length >= 120 && !/[\u0600-\u06FF]/.test(out)) return false;
  for (const token of protectedTokens(source)) if (!out.includes(token)) return false;
  if (/^(i['’]?m sorry|sorry,? i|as an ai|i cannot|i can'?t)/i.test(out)) return false;
  return true;
}

function isRateLimitError(message: string): boolean {
  return /\b429\b|rate.?limit|quota|too many|cooling down/i.test(message);
}

async function translateChunk(source: string, lang: TargetLang): Promise<string> {
  const slots = await getProviderSlots();
  if (!slots.length) throw new Error('no ai provider configured');
  let last = '';
  let rateLimited = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await chatWithFailover(
        slots,
        LANG_SYSTEM[lang],
        'Translate this content completely and preserve every detail and protected token exactly.\n\n' + source,
      );
      const text = result.text.trim();
      if (validTranslation(source, text)) return text;
      last = 'translation validation failed';
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
      if (isRateLimitError(last)) rateLimited = true;
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1500 : 5000));
  }
  const err = new Error(last || 'translation failed') as Error & { rateLimited?: boolean };
  err.rateLimited = rateLimited;
  throw err;
}

function sourceHash(fields: Record<string, string>): string {
  const stable = Object.keys(fields).sort().map((key) => key + '\u0000' + fields[key]).join('\u0001');
  return createHash('sha256').update(stable).digest('hex');
}

function emptyStage(hash: string): TranslationStage {
  return { version: 1, sourceHash: hash, fields: {}, chunks: {} };
}

function parseStage(raw: unknown, hash: string): TranslationStage {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyStage(hash);
  const v = raw as Partial<TranslationStage>;
  if (v.version !== 1 || v.sourceHash !== hash) return emptyStage(hash);
  return {
    version: 1,
    sourceHash: hash,
    fields: v.fields && typeof v.fields === 'object' ? { ...v.fields } : {},
    chunks: v.chunks && typeof v.chunks === 'object' ? { ...v.chunks } : {},
  };
}

function retryDelay(attempts: number, rateLimited: boolean): number {
  const base = rateLimited ? 5 * 60_000 : 2 * 60_000;
  return Math.min(6 * 60 * 60_000, base * Math.pow(2, Math.min(6, Math.max(0, attempts - 1))));
}

const FIELD_DEFS = [
  ['title', 'titleI18n'],
  ['description', 'descriptionI18n'],
  ['eligibility', 'eligibilityI18n'],
  ['benefits', 'benefitsI18n'],
  ['responsibilities', 'responsibilitiesI18n'],
  ['requirements', 'requirementsI18n'],
  ['guidelines', 'guidelinesI18n'],
  ['jobType', 'jobTypeI18n'],
  ['salary', 'salaryI18n'],
  ['educationReq', 'educationReqI18n'],
  ['experience', 'experienceI18n'],
  ['aiSummary', 'aiSummaryI18n'],
] as const;

function sourceFields(row: Record<string, unknown>): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [base] of FIELD_DEFS) {
    const raw = row[base];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const cleaned = stripHtmlPreservingBreaks(raw);
    if (cleaned) fields[base] = cleaned;
  }
  return fields;
}

async function saveStage(
  opportunityId: string,
  lang: TargetLang,
  hash: string,
  stage: TranslationStage,
  status: 'processing' | 'failed',
  attempts: number,
  lastError: string | null,
  nextAttemptAt: Date | null,
): Promise<void> {
  await db.opportunityTranslationProgress.upsert({
    where: { opportunityId_lang: { opportunityId, lang } },
    create: {
      opportunityId,
      lang,
      status,
      sourceHash: hash,
      fieldProgress: stage as unknown as Prisma.InputJsonValue,
      attempts,
      lastError,
      nextAttemptAt,
    },
    update: {
      status,
      sourceHash: hash,
      fieldProgress: stage as unknown as Prisma.InputJsonValue,
      attempts,
      lastError,
      nextAttemptAt,
      completedAt: null,
    },
  });
}

function mergeLang(existing: unknown, en: string, lang: TargetLang, translated: string): Prisma.InputJsonValue {
  const current =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  if (!current.en && en) current.en = en;
  current[lang] = translated;
  return current as Prisma.InputJsonValue;
}

async function commitLanguage(
  row: Record<string, any>,
  lang: TargetLang,
  fields: Record<string, string>,
  stage: TranslationStage,
  hash: string,
): Promise<void> {
  const update: Record<string, unknown> = {};
  for (const [base, i18nField] of FIELD_DEFS) {
    if (!fields[base]) continue;
    const translated = stage.fields[base];
    if (!translated) throw new Error('translation stage incomplete for ' + base);
    update[i18nField] = mergeLang(row[i18nField], fields[base], lang, translated);
  }

  const translatedTitle = stage.fields.title;
  const translatedSummary = stage.fields.aiSummary || stage.fields.description;
  if (translatedTitle) {
    update.seoTitleI18n = mergeLang(row.seoTitleI18n, fields.title || row.title || '', lang, translatedTitle);
    update.ogTitleI18n = mergeLang(row.ogTitleI18n, fields.title || row.title || '', lang, translatedTitle);
  }
  if (translatedSummary) {
    const seoDesc = translatedSummary.length > 158
      ? translatedSummary.slice(0, 155).trimEnd() + '…'
      : translatedSummary;
    const en = fields.aiSummary || fields.description || '';
    update.seoDescriptionI18n = mergeLang(row.seoDescriptionI18n, en, lang, seoDesc);
    update.ogDescriptionI18n = mergeLang(row.ogDescriptionI18n, en, lang, seoDesc);
  }

  await db.$transaction(async (tx) => {
    await tx.opportunity.update({
      where: { id: row.id },
      data: {
        ...(update as Prisma.OpportunityUpdateInput),
        translationStatus: lang === 'fa' ? 'persian_complete' : 'complete',
      },
    });
    await tx.opportunityTranslationProgress.upsert({
      where: { opportunityId_lang: { opportunityId: row.id, lang } },
      create: {
        opportunityId: row.id,
        lang,
        status: 'complete',
        sourceHash: hash,
        fieldProgress: stage as unknown as Prisma.InputJsonValue,
        attempts: 0,
        nextAttemptAt: null,
        lastError: null,
        completedAt: new Date(),
      },
      update: {
        status: 'complete',
        sourceHash: hash,
        fieldProgress: stage as unknown as Prisma.InputJsonValue,
        attempts: 0,
        nextAttemptAt: null,
        lastError: null,
        completedAt: new Date(),
      },
    });
  });
}

export interface TranslateBatchResult {
  processed: number;
  failed: number;
  rateLimited: boolean;
}

/**
 * Process up to `batch` rows starting from the highest-priority untranslated
 * content. Returns whether a 429 was hit (caller sets backoff).
 */
async function pendingCount(lang: TargetLang): Promise<number> {
  if (lang === 'fa') {
    return db.opportunity.count({
      where: {
        status: { not: 'archived' },
        translationProgress: { none: { lang: 'fa', status: 'complete' } },
      },
    });
  }
  return db.opportunity.count({
    where: {
      status: { not: 'archived' },
      AND: [
        { translationProgress: { some: { lang: 'fa', status: 'complete' } } },
        { translationProgress: { none: { lang: 'ps', status: 'complete' } } },
      ],
    },
  });
}

async function findCandidate(lang: TargetLang): Promise<Record<string, any> | null> {
  const now = new Date();
  const rows = await db.opportunity.findMany({
    where:
      lang === 'fa'
        ? {
            status: { not: 'archived' },
            translationProgress: { none: { lang: 'fa', status: 'complete' } },
          }
        : {
            status: { not: 'archived' },
            AND: [
              { translationProgress: { some: { lang: 'fa', status: 'complete' } } },
              { translationProgress: { none: { lang: 'ps', status: 'complete' } } },
            ],
          },
    orderBy: [
      { deadline: { sort: 'asc', nulls: 'last' } },
      { createdAt: 'desc' },
    ],
    take: 50,
    include: {
      translationProgress: { where: { lang }, take: 1 },
    },
  });

  for (const row of rows) {
    const progress = row.translationProgress[0];
    if (progress?.nextAttemptAt && progress.nextAttemptAt > now) continue;
    return row as unknown as Record<string, any>;
  }
  return null;
}

async function workOnOpportunity(
  row: Record<string, any>,
  lang: TargetLang,
): Promise<{ completed: boolean; failed: boolean; rateLimited: boolean }> {
  const fields = sourceFields(row);
  const hash = sourceHash(fields);
  const progress = row.translationProgress[0];
  const attempts = progress?.attempts ?? 0;
  const stage = parseStage(progress?.fieldProgress, hash);
  let calls = 0;

  try {
    for (const [field] of FIELD_DEFS) {
      const source = fields[field];
      if (!source || stage.fields[field]) continue;

      const chunks = chunkText(source);
      const chunkHash = createHash('sha256').update(source).digest('hex');
      const previous = stage.chunks[field];
      const checkpoint =
        previous && previous.sourceHash === chunkHash
          ? previous
          : { sourceHash: chunkHash, parts: [] as string[] };

      while (checkpoint.parts.length < chunks.length && calls < MAX_CALLS_PER_TICK) {
        const index = checkpoint.parts.length;
        checkpoint.parts.push(await translateChunk(chunks[index], lang));
        calls++;
        stage.chunks[field] = checkpoint;
        await saveStage(row.id, lang, hash, stage, 'processing', attempts, null, null);
      }

      if (checkpoint.parts.length === chunks.length) {
        const joined = checkpoint.parts.join('\n\n').trim();
        if (!joined) throw new Error('translated field assembled empty: ' + field);
        stage.fields[field] = joined;
        delete stage.chunks[field];
        await saveStage(row.id, lang, hash, stage, 'processing', attempts, null, null);
      }

      if (calls >= MAX_CALLS_PER_TICK) {
        return { completed: false, failed: false, rateLimited: false };
      }
    }

    const missing = Object.keys(fields).filter((field) => !stage.fields[field]);
    if (missing.length) return { completed: false, failed: false, rateLimited: false };

    await commitLanguage(row, lang, fields, stage, hash);
    return { completed: true, failed: false, rateLimited: false };
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
    const rateLimited =
      Boolean((error as Error & { rateLimited?: boolean })?.rateLimited) ||
      isRateLimitError(message);
    const nextAttempts = attempts + 1;
    await saveStage(
      row.id,
      lang,
      hash,
      stage,
      'failed',
      nextAttempts,
      message,
      new Date(Date.now() + retryDelay(nextAttempts, rateLimited)),
    );
    return { completed: false, failed: true, rateLimited };
  }
}

/**
 * Do one bounded, resumable unit of opportunity translation work.
 * Persian has global priority; Pashto cannot start until every non-archived
 * opportunity has a complete Persian progress row.
 */
export async function translateNextBatch(_batch = 3): Promise<TranslateBatchResult> {
  const faRemaining = await pendingCount('fa');
  const lang: TargetLang = faRemaining > 0 ? 'fa' : 'ps';
  const candidate = await findCandidate(lang);
  if (!candidate) return { processed: 0, failed: 0, rateLimited: false };

  const result = await workOnOpportunity(candidate, lang);
  return {
    processed: result.completed || !result.failed ? 1 : 0,
    failed: result.failed ? 1 : 0,
    rateLimited: result.rateLimited,
  };
}
