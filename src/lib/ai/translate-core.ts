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
import { db } from '@/lib/db';
import { getProviderSlots, chatWithFailover } from '@/lib/ai/failover';
import { Prisma } from '@prisma/client';
type JsonValue = Prisma.JsonValue;

const PrismaAnyNull = Prisma.DbNull;

const SYMBOL_RE = /^[\s\d.,+%~×x°–—\-/$€£#&*'"()[\]]+$/u;
const isSymbol = (s: string) => s.length <= 12 && SYMBOL_RE.test(s) && /[\d+%+]/.test(s);

const SYSTEM_PROMPT = `You are a professional translator for ARIA HUB, an Afghan opportunities portal (jobs, scholarships, visas, interviews).
Translate the given English fields into TWO languages:
- "fa": Farsi/Persian (فارسی فارسی)
- "ps": Pashto (پښتو)
Rules:
- Natural, fluent, concise, professional tone for an Afghan audience. Correct RTL script.
- Keep URLs, emails, phone numbers, dates' numerals, org/brand names (UNICEF, IELTS, TOEFL, Chevening), and technical terms as-is.
- If a field contains simple HTML or markdown, translate the text and PRESERVE the tags/structure exactly.
- Never invent facts. If a value is a proper noun with no sensible translation, transliterate naturally.
- Respond ONLY with strict JSON: {"<fieldKey>": {"fa": "<translation>", "ps": "<translation>"}} — no markdown fences, no commentary.`;

function parseJsonLoose(raw: string): Record<string, { fa?: string; ps?: string }> | null {
  if (!raw) return null;
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

/** Translate one batch of fields {key: enText} → {key: {fa, ps}}. Throws on 429. */
async function translateFields(fields: Record<string, string>): Promise<Record<string, { fa: string; ps: string }> | null> {
  const slots = await getProviderSlots();
  if (!slots.length) throw new Error('no ai provider configured');
  const prompt = `Translate these fields to fa (Farsi/Persian) and ps (Pashto).\nReturn JSON: {"<fieldKey>":{"fa":"…","ps":"…"}}.\n\n${JSON.stringify(fields, null, 1)}`;
  const { text: raw, provider: servedBy } = await chatWithFailover(slots, SYSTEM_PROMPT, prompt);
  console.log(`[translate] served by: ${servedBy}`);
  const parsed = parseJsonLoose(raw);
  if (!parsed) return null;
  const out: Record<string, { fa: string; ps: string }> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (v && typeof v === 'object' && typeof v.fa === 'string' && typeof v.ps === 'string' && v.fa.trim() && v.ps.trim()) {
      out[k] = { fa: v.fa.trim(), ps: v.ps.trim() };
    }
  }
  return Object.keys(out).length ? out : null;
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
