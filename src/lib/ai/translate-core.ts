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

const OPP_SELECT = {
  id: true, title: true, description: true, slug: true,
  titleI18n: true, descriptionI18n: true,
} as const;

type OppRow = {
  id: string; title: string; description: string; slug: string;
  titleI18n: unknown; descriptionI18n: unknown;
};

function enOf(json: unknown, base: string): string {
  if (json && typeof json === 'object') {
    const en = (json as Record<string, unknown>).en;
    if (typeof en === 'string' && en.trim()) return en;
  }
  return base || '';
}

function hasFa(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  const fa = (json as Record<string, unknown>).fa;
  return typeof fa === 'string' && fa.trim().length > 0;
}
void hasFa; // reserved for stricter completeness checks
function asJsonObject(v: JsonValue | null | undefined): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
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
export async function translateNextBatch(batch = 3): Promise<TranslateBatchResult> {
  let processed = 0;
  let failed = 0;
  let rateLimited = false;

  // 1. Opportunities first — newest published with missing fa title.
  const opps = await db.opportunity.findMany({
    where: {
      status: 'published',
      OR: [
        { titleI18n: { equals: PrismaAnyNull } },
        { titleI18n: { path: ['fa'], equals: PrismaAnyNull } },
        { NOT: { titleI18n: { path: ['fa'], string_contains: '' } } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: batch,
    select: OPP_SELECT,
  });

  for (const opp of opps as OppRow[]) {
    if (processed >= batch) break;
    const title = enOf(opp.titleI18n, opp.title);
    const desc = enOf(opp.descriptionI18n, opp.description).slice(0, 900);
    if (!title) continue;
    const fields: Record<string, string> = { title };
    if (desc && !isSymbol(desc)) fields.description = desc;
    try {
      const got = await translateFields(fields);
      if (got) {
        const titleI18n = { ...(typeof opp.titleI18n === 'object' && opp.titleI18n ? opp.titleI18n as object : { en: opp.title }), ...(got.title ? { fa: got.title.fa, ps: got.title.ps } : {}) };
        const descriptionI18n = got.description
          ? { ...(typeof opp.descriptionI18n === 'object' && opp.descriptionI18n ? opp.descriptionI18n as object : { en: opp.description }), fa: got.description.fa, ps: got.description.ps }
          : (typeof opp.descriptionI18n === 'object' && opp.descriptionI18n ? opp.descriptionI18n as object : undefined);
        await db.opportunity.update({
          where: { id: opp.id },
          data: { titleI18n, ...(descriptionI18n ? { descriptionI18n } : {}) },
        });
        processed++;
      } else {
        failed++;
      }
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e));
      if (msg.includes('429') || msg.toLowerCase().includes('too many')) {
        rateLimited = true;
        break;
      }
      failed++;
    }
  }

  // 2. News (title + excerpt only; long content stays with the offline script).
  if (processed < batch && !rateLimited) {
    const newsRows = await db.news.findMany({
      where: {
        status: 'published',
        OR: [
          { titleI18n: { equals: PrismaAnyNull } },
          { NOT: { titleI18n: { path: ['fa'], string_contains: '' } } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: batch - processed,
      select: { id: true, title: true, excerpt: true, titleI18n: true, excerptI18n: true },
    });
    for (const n of newsRows) {
      const title = enOf(n.titleI18n, n.title);
      if (!title) continue;
      const fields: Record<string, string> = { title };
      const excerpt = enOf(n.excerptI18n, n.excerpt ?? '');
      if (excerpt) fields.excerpt = excerpt.slice(0, 400);
      try {
        const got = await translateFields(fields);
        if (got) {
          await db.news.update({
            where: { id: n.id },
            data: {
              titleI18n: { ...(typeof n.titleI18n === 'object' && n.titleI18n ? n.titleI18n as object : { en: n.title }), ...(got.title ?? {}) },
              ...(got.excerpt
                ? { excerptI18n: { ...(typeof n.excerptI18n === 'object' && n.excerptI18n ? n.excerptI18n as object : { en: excerpt }), fa: got.excerpt.fa, ps: got.excerpt.ps } }
                : {}),
            },
          });
          processed++;
        } else failed++;
      } catch (e) {
        const msg = (e instanceof Error ? e.message : String(e));
        if (msg.includes('429') || msg.toLowerCase().includes('too many')) {
          rateLimited = true;
          break;
        }
        failed++;
      }
    }
  }

  return { processed, failed, rateLimited };
}
