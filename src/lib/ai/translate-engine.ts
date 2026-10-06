/**
 * Chunked, atomic, Persian-first translation engine.
 *
 * Replaces the old approach (one capped LLM call per row; failed chunks
 * silently dropped; "complete" declared without proof) with:
 *
 *  1. DETERMINISTIC CHUNKING — every source-present field is split into
 *     ~900-char chunks. NOTHING is ever sliced off and discarded: the whole
 *     source is always translated.
 *  2. STAGED CHUNKS — every chunk lives in TranslationChunk with a source
 *     hash, so a crashed/hung/rate-limited run resumes exactly where it
 *     stopped, and changed sources re-translate automatically.
 *  3. ATOMIC PUBLISH — a language's public i18n fields are committed in ONE
 *     transaction only when 100% of that language's chunks succeeded and
 *     validated. A failed chunk can never vanish from a published
 *     translation; until the language is complete the public site shows the
 *     previous translation or English fallback.
 *  4. PERSIAN-FIRST — Pashto work only starts when faStatus === 'complete'.
 *  5. FREE-LLM ADAPTIVE — single-language single-chunk requests keep outputs
 *     small (fewer truncations); 429s bubble up so callers back off; failed
 *     chunks are retried with a per-chunk attempt cap and a daily automatic
 *     retry reset, so a rate-limited day never permanently loses content.
 */
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { getProviderSlots, chatWithFailover } from '@/lib/ai/failover';
import {
  chunkText, isSymbolic, parseChunkReply, validateTranslation, validateIntegrity,
  FIELD_ORDER, type FieldKey,
} from '@/lib/ai/translate-chunks';
import type { Prisma } from '@prisma/client';

// ─── configuration ───────────────────────────────────────────────────────────

/** Long fields are split into chunks of this size (a chunk SIZE, not a cap). */
const CHUNK_SIZE = 900;
/** Per-chunk retry budget before the chunk is parked as failed. */
const MAX_ATTEMPTS = 8;
/** Parked failed chunks are automatically retried after this long. */
const FAILED_RETRY_MS = 24 * 60 * 60 * 1000;
/** A chunk claimed by a worker for longer than this is orphaned (crashed worker) and re-claimable. */
const CLAIM_STALE_MS = 15 * 60 * 1000;

const isRateLimitMsg = (msg: string): boolean =>
  /\b429\b|rate.?limit|quota|too many requests/i.test(msg);

// ─── manual-translation provenance (audit §15) ──────────────────────────────

type OriginMap = { fa?: string; ps?: string };

async function readOrigin(rowId: string): Promise<OriginMap> {
  const row = (await db.opportunity.findUnique({
    where: { id: rowId },
    select: { translationOrigin: true },
  })) as unknown as { translationOrigin: unknown } | null;
  const o = row?.translationOrigin;
  return o && typeof o === 'object' && !Array.isArray(o) ? (o as OriginMap) : {};
}

/**
 * MANUAL = a human produced the public translation. It is never overwritten
 * by the worker while its source is unchanged. MANUAL_STALE = the source
 * changed underneath a manual translation — re-translation stays halted and
 * the admin queue surfaces it for human refresh.
 */
function isManualOrigin(origin: OriginMap, lang: Lang): boolean {
  const v = origin[lang];
  return v === 'MANUAL' || v === 'MANUAL_STALE';
}

/** Mark a manual translation stale because its source changed materially. */
async function markManualStale(rowId: string, lang: Lang): Promise<void> {
  const origin = await readOrigin(rowId);
  if (origin[lang] !== 'MANUAL') return;
  origin[lang] = 'MANUAL_STALE';
  await db.opportunity.update({
    where: { id: rowId },
    data: { translationOrigin: origin as Prisma.InputJsonValue },
  });
}

// ─── source field extraction ─────────────────────────────────────────────────

type TranslateRow = {
  id: string;
  language: string | null;
  title: string; titleI18n: unknown;
  description: string; descriptionI18n: unknown;
  aiSummary: string | null; aiSummaryI18n: unknown;
  eligibility: string | null; eligibilityI18n: unknown;
  benefits: string | null; benefitsI18n: unknown;
  responsibilities: string | null; responsibilitiesI18n: unknown;
  requirements: string | null; requirementsI18n: unknown;
  guidelines: string | null; guidelinesI18n: unknown;
  jobType: string | null; jobTypeI18n: unknown;
  salary: string | null; salaryI18n: unknown;
  educationReq: string | null; educationReqI18n: unknown;
  experience: string | null; experienceI18n: unknown;
};

const ROW_SELECT = {
  id: true, language: true,
  title: true, titleI18n: true,
  description: true, descriptionI18n: true,
  aiSummary: true, aiSummaryI18n: true,
  eligibility: true, eligibilityI18n: true,
  benefits: true, benefitsI18n: true,
  responsibilities: true, responsibilitiesI18n: true,
  requirements: true, requirementsI18n: true,
  guidelines: true, guidelinesI18n: true,
  jobType: true, jobTypeI18n: true,
  salary: true, salaryI18n: true,
  educationReq: true, educationReqI18n: true,
  experience: true, experienceI18n: true,
} satisfies Prisma.OpportunitySelect;

/** English/base source text of one field (i18n.en wins over the base column). */
function sourceOf(row: TranslateRow, field: FieldKey): string {
  // The public field key is `summary`, while Opportunity stores it as
  // `aiSummary`. Without this mapping the summary silently misses the plan.
  const column = field === 'summary' ? 'aiSummary' : field;
  const base = (row as unknown as Record<string, unknown>)[column];
  const i18n = (row as unknown as Record<string, unknown>)[`${column}I18n`];
  if (i18n && typeof i18n === 'object') {
    const en = (i18n as Record<string, unknown>).en;
    if (typeof en === 'string' && en.trim()) return en;
  }
  return typeof base === 'string' ? base : '';
}

/** "PR-500/month" style values (no letters at all) need no translation. */
// (isSymbolic lives in translate-chunks.ts)

interface FieldPlan {
  field: FieldKey;
  chunks: { index: number; total: number; text: string; hash: string }[];
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/** Chunk every source-present field. Deterministic given the row content. */
function planFields(row: TranslateRow): FieldPlan[] {
  const plans: FieldPlan[] = [];
  for (const field of FIELD_ORDER) {
    const raw = sourceOf(row, field);
    const text = raw.trim();
    if (!text || isSymbolic(text)) continue;
    const chunks = chunkText(text);
    if (!chunks.length) continue;
    plans.push({
      field,
      chunks: chunks.map((c, i) => ({ index: i, total: chunks.length, text: c, hash: sha256(c) })),
    });
  }
  return plans;
}

function sourceHashOf(plans: FieldPlan[]): string {
  return sha256(plans.flatMap((p) => p.chunks.map((c) => `${p.field}:${c.hash}`)).join('|'));
}

// ─── prompts / validation ────────────────────────────────────────────────────

const LANG_SYSTEM: Record<'fa' | 'ps', string> = {
  fa: `You are a professional translator for ARIA HUB, an Afghan opportunities portal (jobs, scholarships, visas, interviews).
Translate the given text into natural, fluent, professional Persian/Farsi (فارسی). Correct RTL script.
Rules:
- Translate MEANING faithfully. NEVER summarize, NEVER omit lists, details or paragraphs. NEVER invent facts.
- Mirror the source line structure ("\\n", "- " bullets).
- Keep URLs, emails, phone numbers, numerals, dates, org/brand names (UNICEF, IELTS, TOEFL, Chevening) and technical terms exactly as-is.
- Respond ONLY with strict JSON — no markdown fences, no commentary: {"t":"<translation>"}`,
  ps: `You are a professional translator for ARIA HUB, an Afghan opportunities portal (jobs, scholarships, visas, interviews).
Translate the given text into natural, fluent, professional Pashto (پښتو). Correct RTL script.
Rules:
- Translate MEANING faithfully. NEVER summarize, NEVER omit lists, details or paragraphs. NEVER invent facts.
- Mirror the source line structure ("\\n", "- " bullets).
- Keep URLs, emails, phone numbers, numerals, dates, org/brand names (UNICEF, IELTS, TOEFL, Chevening) and technical terms exactly as-is.
- Respond ONLY with strict JSON — no markdown fences, no commentary: {"t":"<translation>"}`,
};

// ─── chunk plan sync ─────────────────────────────────────────────────────────

async function syncPlan(rowId: string, lang: 'fa' | 'ps', plans: FieldPlan[]): Promise<void> {
  const existing = await db.translationChunk.findMany({
    where: { ownerType: 'opportunity', ownerId: rowId, lang },
    select: { id: true, fieldKey: true, chunkIndex: true, chunkHash: true, chunkTotal: true },
  });
  const wanted = new Map<string, { hash: string }>();
  for (const p of plans) for (const c of p.chunks) wanted.set(`${p.field}:${c.index}`, { hash: c.hash });

  const staleIds: string[] = [];
  const changed: { id: string; hash: string; total: number }[] = [];
  for (const row of existing) {
    const key = `${row.fieldKey}:${row.chunkIndex}`;
    const w = wanted.get(key);
    const plan = plans.find((p) => p.field === row.fieldKey);
    const chunk = plan?.chunks[row.chunkIndex];
    if (!w) staleIds.push(row.id);
    else if (w.hash !== row.chunkHash || chunk?.total !== row.chunkTotal) {
      if (chunk) changed.push({ id: row.id, hash: w.hash, total: chunk.total });
    }
    wanted.delete(key);
  }

  // Source changed → drop the stale/changed chunk results so they re-translate.
  if (staleIds.length) {
    await db.translationChunk.deleteMany({ where: { id: { in: staleIds } } });
  }
  for (const item of changed) {
    await db.translationChunk.update({
      where: { id: item.id },
      data: { chunkHash: item.hash, chunkTotal: item.total, status: 'pending', result: null, attempts: 0, error: null },
    });
  }
  for (const [key, w] of wanted) {
    const [fieldKey, indexStr] = key.split(':');
    const plan = plans.find((p) => p.field === fieldKey);
    const chunk = plan?.chunks[Number(indexStr)];
    if (!chunk) continue;
    await db.translationChunk.create({
      data: {
        ownerType: 'opportunity', ownerId: rowId, lang, fieldKey,
        chunkIndex: chunk.index, chunkTotal: chunk.total, chunkHash: chunk.hash,
      },
    });
  }
}

// ─── language commit (atomic) ────────────────────────────────────────────────

type Lang = 'fa' | 'ps';

const FIELD_COLUMNS: Record<FieldKey, { base: string; i18n: string }> = {
  title: { base: 'title', i18n: 'titleI18n' },
  description: { base: 'description', i18n: 'descriptionI18n' },
  summary: { base: 'aiSummary', i18n: 'aiSummaryI18n' },
  eligibility: { base: 'eligibility', i18n: 'eligibilityI18n' },
  benefits: { base: 'benefits', i18n: 'benefitsI18n' },
  responsibilities: { base: 'responsibilities', i18n: 'responsibilitiesI18n' },
  requirements: { base: 'requirements', i18n: 'requirementsI18n' },
  guidelines: { base: 'guidelines', i18n: 'guidelinesI18n' },
  jobType: { base: 'jobType', i18n: 'jobTypeI18n' },
  salary: { base: 'salary', i18n: 'salaryI18n' },
  educationReq: { base: 'educationReq', i18n: 'educationReqI18n' },
  experience: { base: 'experience', i18n: 'experienceI18n' },
};

function legacyStatus(fa: string | null, ps: string | null): string {
  if (fa === 'complete' && ps === 'complete') return 'complete';
  if (fa === 'failed' || ps === 'failed') return 'partial';
  if (fa === 'complete' || ps === 'complete') return 'partial';
  return 'pending';
}

/**
 * Commit one language's fully translated chunks to the public i18n fields in
 * a SINGLE transaction. Called only when every chunk of the language is
 * done — a partial result can never reach the public fields.
 */
async function commitLanguage(rowId: string, lang: Lang): Promise<void> {
  const chunks = await db.translationChunk.findMany({
    where: { ownerType: 'opportunity', ownerId: rowId, lang, status: 'done' },
    orderBy: [{ fieldKey: 'asc' }, { chunkIndex: 'asc' }],
    select: { fieldKey: true, chunkIndex: true, chunkTotal: true, result: true },
  });
  const byField = new Map<string, string[]>();
  const totals = new Map<string, number>();
  for (const c of chunks) {
    const list = byField.get(c.fieldKey) || [];
    list[c.chunkIndex] = c.result || '';
    byField.set(c.fieldKey, list);
    totals.set(c.fieldKey, c.chunkTotal);
  }

  const row = await db.opportunity.findUnique({
    where: { id: rowId },
    select: { faStatus: true, psStatus: true },
  });
  const nextFa = lang === 'fa' ? 'complete' : row?.faStatus ?? null;
  const nextPs = lang === 'ps' ? 'complete' : row?.psStatus ?? null;

  const data: Record<string, unknown> = {
    faStatus: nextFa,
    psStatus: nextPs,
    translationStatus: legacyStatus(nextFa, nextPs),
  };

  for (const [field, parts] of byField) {
    // Safety: only commit a field when EVERY chunk of it has a result.
    const total = totals.get(field) || 0;
    if (parts.length < total || parts.slice(0, total).some((p) => !p || !p.trim())) continue;
    const joined = parts.slice(0, total).join('\n\n').trim();
    if (!joined) continue;
    const col = FIELD_COLUMNS[field as FieldKey];
    if (!col) continue;
    const current = await readI18nField(rowId, col.i18n, col.base);
    const next = { ...current, [lang]: joined };
    data[col.i18n] = next;
  }

  await db.$transaction([
    db.opportunity.update({
      where: { id: rowId },
      data: data as Prisma.OpportunityUncheckedUpdateInput,
    }),
  ]);
}

async function readI18nField(
  rowId: string,
  i18nColumn: string,
  baseColumn: string,
): Promise<Record<string, string>> {
  const row = (await db.opportunity.findUnique({
    where: { id: rowId },
    select: { [i18nColumn]: true, [baseColumn]: true },
  })) as unknown as Record<string, unknown> | null;
  if (!row) return {};
  const current = row[i18nColumn];
  const out: Record<string, string> = {};
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    for (const [k, v] of Object.entries(current as Record<string, unknown>)) {
      if (typeof v === 'string') out[k] = v;
    }
  }
  const base = row[baseColumn];
  if (!out.en && typeof base === 'string' && base.trim()) out.en = base;
  return out;
}

// ─── progress / status helpers ───────────────────────────────────────────────

async function writeProgress(rowId: string, lang: Lang): Promise<{ allDone: boolean; anyFailed: boolean; pending: boolean }> {
  const chunks = await db.translationChunk.groupBy({
    by: ['status'],
    where: { ownerType: 'opportunity', ownerId: rowId, lang },
    _count: { _all: true },
  });
  const count = (s: string) => chunks.find((c) => c.status === s)?._count._all ?? 0;
  const total = chunks.reduce((acc, c) => acc + c._count._all, 0);
  const done = count('done');
  const failed = count('failed');
  const progress = {
    done, total, failed,
    attempts: undefined as number | undefined,
    updatedAt: new Date().toISOString(),
  };
  const row = (await db.opportunity.findUnique({
    where: { id: rowId },
    select: { translationProgress: true, faStatus: true, psStatus: true },
  })) as unknown as { translationProgress: unknown; faStatus: string | null; psStatus: string | null } | null;
  const prev = (row?.translationProgress && typeof row.translationProgress === 'object'
    ? (row.translationProgress as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const nextProgress = { ...prev, [lang]: progress };

  let status: string;
  if (done === total && total > 0) status = 'complete';
  else if (failed > 0 && done + failed === total) status = 'failed';
  else status = 'processing';

  const nextFa = lang === 'fa' ? status : row?.faStatus ?? null;
  const nextPs = lang === 'ps' ? status : row?.psStatus ?? null;

  await db.opportunity.update({
    where: { id: rowId },
    data: {
      translationProgress: nextProgress as Prisma.InputJsonValue,
      faStatus: nextFa,
      psStatus: nextPs,
      translationStatus: legacyStatus(nextFa, nextPs),
    },
  });

  return {
    allDone: total > 0 && done === total,
    anyFailed: failed > 0 && done + failed === total,
    pending: done + failed < total,
  };
}

// ─── the processing unit ─────────────────────────────────────────────────────

export interface UnitResult {
  processed: boolean; // a chunk was translated and stored
  committed: boolean; // a language reached 100% and was committed
  rateLimited: boolean;
  skipped: boolean;
}

/**
 * Advance ONE chunk of the highest-priority incomplete language of the
 * highest-priority incomplete row. Persian rows are always processed before
 * any Pashto work starts.
 */
export async function processNextUnit(
  deadlineAt?: number,
  opts?: { dryRun?: boolean },
): Promise<UnitResult> {
  // Daily mercy: parked failed chunks get another chance (free models have
  // bad days; the content must never be lost forever).
  await resetStaleFailures();
  await recoverOrphanClaims();

  const row = await pickNextRow();
  if (!row) return { processed: false, committed: false, rateLimited: false, skipped: true };

  const plans = planFields(row);
  const newHash = sourceHashOf(plans);
  if (!plans.length) {
    // Nothing translatable (e.g. pure symbols) — both languages are
    // trivially complete so the queue moves on instead of spinning.
    await db.opportunity.update({
      where: { id: row.id },
      data: {
        faStatus: 'complete',
        psStatus: 'complete',
        translationStatus: 'complete',
      },
    }).catch(() => undefined);
    return { processed: false, committed: false, rateLimited: false, skipped: true };
  }

  // Source changed since the plan was stored → invalidate both languages
  // (Pashto is re-derived strictly: it may only run after fa completes).
  const sourceChanged = row.translationSourceHash !== newHash;
  const origin = await readOrigin(row.id);
  if (sourceChanged) {
    // A manual translation whose source changed is marked stale for human
    // refresh — the worker never overwrites it with AI output (§15).
    await markManualStale(row.id, 'fa');
    await markManualStale(row.id, 'ps');
    await db.opportunity.update({
      where: { id: row.id },
      data: {
        translationSourceHash: newHash,
        faStatus: 'pending',
        psStatus: 'pending',
      },
    });
  }

  const lang: Lang = sourceChanged ? 'fa' : row.faStatus === 'complete' ? 'ps' : 'fa';
  // MANUAL and MANUAL_STALE rows are NEVER auto-retranslated — a source edit
  // parks them for human refresh (the stale marker was applied above);
  // without this guard the sourceChanged path would overwrite human work.
  if (isManualOrigin(origin, lang)) {
    return { processed: false, committed: false, rateLimited: false, skipped: true };
  }
  await syncPlan(row.id, lang, plans);
  await db.opportunity.update({
    where: { id: row.id },
    data: lang === 'fa' ? { faStatus: 'processing' } : { psStatus: 'processing' },
  }).catch(() => undefined);

  // Next chunk to work on, in field order then chunk order. Chunks claimed
  // by a (crashed) worker for > CLAIM_STALE_MS are re-claimable (§4).
  const next = await db.translationChunk.findFirst({
    where: {
      ownerType: 'opportunity', ownerId: row.id, lang,
      OR: [
        { status: 'pending' },
        { status: 'processing', claimedAt: { lt: new Date(Date.now() - CLAIM_STALE_MS) } },
        { status: 'failed', attempts: { lt: MAX_ATTEMPTS } },
      ],
    },
    orderBy: [{ fieldKey: 'asc' }, { chunkIndex: 'asc' }],
  });

  if (!next) {
    const st = await writeProgress(row.id, lang);
    if (st.allDone) {
      await commitLanguage(row.id, lang);
      return { processed: false, committed: true, rateLimited: false, skipped: false };
    }
    return { processed: false, committed: false, rateLimited: false, skipped: true };
  }

  const plan = plans.find((p) => p.field === next.fieldKey);
  const chunk = plan?.chunks[next.chunkIndex];
  if (!chunk) {
    // Plan drifted (should not happen — syncPlan ran) — re-mark pending.
    await db.translationChunk.update({ where: { id: next.id }, data: { status: 'pending' } });
    return { processed: false, committed: false, rateLimited: false, skipped: true };
  }

  // Atomic claim (§4): only one worker can flip pending → processing.
  const claimed = await db.translationChunk.updateMany({
    where: {
      id: next.id,
      status: { in: ['pending', 'processing'] },
      OR: [{ status: 'pending' }, { claimedAt: null }, { claimedAt: { lt: new Date(Date.now() - CLAIM_STALE_MS) } }],
    },
    data: { status: 'processing', claimedAt: new Date() },
  });
  if (claimed.count === 0) {
    return { processed: false, committed: false, rateLimited: false, skipped: true };
  }

  try {
    const slots = await getProviderSlots();
    if (!slots.length) throw new Error('no ai provider configured');
    const context = plan && plan.chunks.length > 1
      ? `This is part ${next.chunkIndex + 1} of ${next.chunkTotal} of the field "${next.fieldKey}" of an opportunity titled "${sourceOf(row, 'title').slice(0, 120)}". Translate it faithfully and completely.`
      : undefined;
    const prompt = `${context ? `${context}\n\n` : ''}${chunk.text}`;
    const { text: raw, provider } = await chatWithFailover(slots, LANG_SYSTEM[lang], prompt, deadlineAt);
    const translated = parseChunkReply(raw);
    if (!translated || !validateTranslation(chunk.text, translated)) {
      throw new Error('translation failed validation (empty/summary/junk)');
    }
    // Integrity gate (§12/§13): URLs/emails exact, critical numbers intact.
    const integrity = validateIntegrity(chunk.text, translated);
    if (integrity.length) {
      throw new Error(`integrity validation failed: ${integrity.slice(0, 3).join('; ')}`);
    }
    await db.translationChunk.update({
      where: { id: next.id },
      data: {
        status: 'done', result: translated, error: null, claimedAt: null,
        attempts: { increment: 1 },
        provider, model: provider,
        lastAttemptAt: new Date(), completedAt: new Date(),
      },
    });
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 240);
    const rateLimited = isRateLimitMsg(msg);
    await db.translationChunk.update({
      where: { id: next.id },
      data: {
        attempts: { increment: 1 },
        error: msg,
        claimedAt: null,
        status: 'pending',
        lastAttemptAt: new Date(),
        // Parked failures keep status 'failed' so the daily mercy reset owns them.
        ...(attemptsExhausted(next.attempts + 1) ? { status: 'failed' } : {}),
      },
    });
    await writeProgress(row.id, lang);
    if (rateLimited) return { processed: false, committed: false, rateLimited: true, skipped: false };
    return { processed: false, committed: false, rateLimited: false, skipped: false };
  }

  const st = await writeProgress(row.id, lang);
  if (st.allDone) {
    // DRY_RUN (§25): translations are produced and stored in the chunk
    // ledger, but the public i18n fields and completion statuses are left
    // untouched for human review.
    if (opts?.dryRun) return { processed: true, committed: false, rateLimited: false, skipped: false };
    await commitLanguage(row.id, lang);
    await markOrigin(row.id, lang);
    return { processed: true, committed: true, rateLimited: false, skipped: false };
  }
  return { processed: true, committed: false, rateLimited: false, skipped: false };
}

/** Record AI provenance for a committed language (§22). */
async function markOrigin(rowId: string, lang: Lang): Promise<void> {
  const origin = await readOrigin(rowId);
  if (origin[lang] === 'MANUAL') return; // safety — never relabel a manual translation
  origin[lang] = 'AI';
  await db.opportunity.update({
    where: { id: rowId },
    data: { translationOrigin: origin as Prisma.InputJsonValue },
  });
}

/** Orphan recovery: claims older than CLAIM_STALE_MS return to the queue. */
async function recoverOrphanClaims(): Promise<void> {
  await db.translationChunk.updateMany({
    where: { status: 'processing', claimedAt: { lt: new Date(Date.now() - CLAIM_STALE_MS) } },
    data: { status: 'pending', claimedAt: null },
  }).catch(() => undefined);
}

function attemptsExhausted(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS;
}

/** Parked (capped) failed chunks retry automatically after a cool-off day. */
async function resetStaleFailures(): Promise<void> {
  const cutoff = new Date(Date.now() - FAILED_RETRY_MS);
  const stale = await db.translationChunk.findMany({
    where: { status: 'failed', attempts: { gte: MAX_ATTEMPTS }, updatedAt: { lt: cutoff } },
    select: { id: true },
    take: 200,
  });
  if (!stale.length) return;
  await db.translationChunk.updateMany({
    where: { id: { in: stale.map((s) => s.id) } },
    data: { status: 'pending', attempts: 0, error: null },
  });
  // Rows marked failed purely from capped chunks become eligible again.
  await db.opportunity.updateMany({
    where: { faStatus: 'failed' },
    data: { faStatus: 'pending' },
  });
  await db.opportunity.updateMany({
    where: { psStatus: 'failed', faStatus: 'complete' },
    data: { psStatus: 'pending' },
  });
}

/**
 * Priority queue: active/published rows first — deadline-soon before
 * open-ended, newest before older — then drafts. Persian queue strictly
 * before Pashto (a Pashto unit is picked only for rows with
 * faStatus === 'complete').
 */
async function pickNextRow(): Promise<(TranslateRow & { faStatus: string | null; psStatus: string | null; translationSourceHash: string | null }) | null> {
  const now = new Date();
  const base = {
    status: 'published' as const,
    // Expiry guard (§19): never spend AI capacity on clearly expired
    // listings — deadline in the future or open-ended only (3-day grace for
    // timezone skew and rolling closings).
    OR: [{ deadline: null as Date | null }, { deadline: { gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) } }],
  };
  const orderBy = [
    { deadline: { sort: 'asc' as const, nulls: 'last' as const } },
    { createdAt: 'desc' as const },
  ];

  // Manual-translation protection (§15): rows whose public translation was
  // produced/locked by a human (origin MANUAL / MANUAL_STALE) are owned by
  // the manual queue — filtered after fetch (JSON path typing is brittle in
  // Prisma 6; the candidate slice is tiny so this is effectively free).
  type PickRow = TranslateRow & { faStatus: string | null; psStatus: string | null; translationSourceHash: string | null; translationOrigin: unknown };
  const isLocked = (row: PickRow, lang: Lang): boolean => {
    const o = row.translationOrigin;
    const v = o && typeof o === 'object' && !Array.isArray(o) ? (o as OriginMap)[lang] : undefined;
    return v === 'MANUAL' || v === 'MANUAL_STALE';
  };

  // 1. Persian-incomplete published rows.
  const faRows = (await db.opportunity.findMany({
    where: {
      AND: [
        base,
        { OR: [{ faStatus: null }, { faStatus: { in: ['pending', 'processing'] } }] },
      ],
    },
    orderBy,
    take: 5,
    select: { ...ROW_SELECT, faStatus: true, psStatus: true, translationSourceHash: true, translationOrigin: true },
  })) as unknown as PickRow[];
  const faRow = faRows.find((r) => !isLocked(r, 'fa'));
  if (faRow) return faRow;

  // 2. Pashto for Persian-complete rows (Pashto manual lock checked per lang).
  const psRows = (await db.opportunity.findMany({
    where: {
      AND: [
        base,
        { faStatus: 'complete' },
        { OR: [{ psStatus: null }, { psStatus: { in: ['pending', 'processing'] } }] },
      ],
    },
    orderBy,
    take: 5,
    select: { ...ROW_SELECT, faStatus: true, psStatus: true, translationSourceHash: true, translationOrigin: true },
  })) as unknown as PickRow[];
  const psRow = psRows.find((r) => !isLocked(r, 'ps'));
  return psRow ?? null;
}

// ─── batch driver (tick + import-time) ───────────────────────────────────────

export interface BatchResult {
  processed: number;
  committed: number;
  rateLimited: boolean;
  exhausted: boolean; // queue drained
}

/**
 * Process up to `maxUnits` chunks. Stops early on a rate-limit hit — the
 * caller records a backoff window. Small units keep each LLM call short,
 * which suits free models with tight output/timeout limits.
 */
export async function processBatch(
  maxUnits = 3,
  deadlineAt?: number,
  opts?: { dryRun?: boolean },
): Promise<BatchResult> {
  let processed = 0;
  let committed = 0;
  let rateLimited = false;
  for (let i = 0; i < maxUnits; i++) {
    const r = await processNextUnit(deadlineAt, opts);
    if (r.rateLimited) { rateLimited = true; break; }
    if (r.skipped && !r.processed && !r.committed && i === 0) {
      return { processed, committed, rateLimited, exhausted: true };
    }
    if (r.processed) processed++;
    if (r.committed) committed++;
  }
  return { processed, committed, rateLimited, exhausted: false };
}

/**
 * Import-time helper: plan + immediately work a NEW row (Persian first, then
 * Pashto) within a time budget. Whatever does not finish within the budget
 * stays queued for the background tick with the same guarantees.
 */
export async function processOpportunityNow(opportunityId: string, budgetMs = 90_000): Promise<void> {
  const start = Date.now();
  for (let i = 0; i < 500; i++) {
    if (Date.now() - start > budgetMs) return;
    const row = (await db.opportunity.findUnique({
      where: { id: opportunityId },
      select: { ...ROW_SELECT, faStatus: true, psStatus: true, translationSourceHash: true, status: true },
    })) as unknown as (TranslateRow & { faStatus: string | null; psStatus: string | null; translationSourceHash: string | null }) | null;
    if (!row) return;
    const plans = planFields(row);
    if (!plans.length) {
      await db.opportunity.update({
        where: { id: row.id },
        data: { faStatus: 'complete', psStatus: 'complete', translationStatus: 'complete' },
      }).catch(() => undefined);
      return;
    }
    const newHash = sourceHashOf(plans);
    const sourceChanged = row.translationSourceHash !== newHash;
    const origin = await readOrigin(row.id);
    // MANUAL/MANUAL_STALE rows are never auto-retranslated (import lane).
    if (isManualOrigin(origin, 'fa') || isManualOrigin(origin, 'ps')) return;
    if (sourceChanged) {
      await markManualStale(row.id, 'fa');
      await markManualStale(row.id, 'ps');
      await db.opportunity.update({
        where: { id: row.id },
        data: { translationSourceHash: newHash, faStatus: 'pending', psStatus: 'pending' },
      });
    }
    if (!sourceChanged && row.faStatus === 'complete' && row.psStatus === 'complete') return;
    if (!sourceChanged && (row.faStatus === 'failed' || row.psStatus === 'failed')) return; // parked — queue will retry later

    const lang: Lang = sourceChanged ? 'fa' : row.faStatus === 'complete' ? 'ps' : 'fa';
    await syncPlan(row.id, lang, plans);

    const next = await db.translationChunk.findFirst({
      where: {
        ownerType: 'opportunity', ownerId: row.id, lang,
        OR: [{ status: 'pending' }, { status: 'failed', attempts: { lt: MAX_ATTEMPTS } }],
      },
      orderBy: [{ fieldKey: 'asc' }, { chunkIndex: 'asc' }],
    });
    if (!next) {
      const st = await writeProgress(row.id, lang);
      if (st.allDone) await commitLanguage(row.id, lang);
      else return; // parked failures — background retry owns it now
      continue;
    }

    const plan = plans.find((p) => p.field === next.fieldKey);
    const chunk = plan?.chunks[next.chunkIndex];
    if (!chunk) return;

    try {
      const slots = await getProviderSlots();
      if (!slots.length) return;
      const { text: raw, provider } = await chatWithFailover(slots, LANG_SYSTEM[lang], chunk.text);
      const translated = parseChunkReply(raw);
      if (!translated || !validateTranslation(chunk.text, translated)) throw new Error('translation failed validation');
      // Integrity gate (§12/§13) — same rules as the worker path.
      const integrity = validateIntegrity(chunk.text, translated);
      if (integrity.length) throw new Error(`integrity validation failed: ${integrity.slice(0, 3).join('; ')}`);
      await db.translationChunk.update({
        where: { id: next.id },
        data: {
          status: 'done', result: translated, error: null, claimedAt: null,
          attempts: { increment: 1 },
          provider, model: provider,
          lastAttemptAt: new Date(), completedAt: new Date(),
        },
      });
      const st = await writeProgress(row.id, lang);
      if (st.allDone) {
        await commitLanguage(row.id, lang);
        await markOrigin(row.id, lang);
        if (lang === 'fa') continue; // move on to Pashto within the budget
      }
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 240);
      await db.translationChunk.update({
        where: { id: next.id },
        data: {
          attempts: { increment: 1 },
          error: msg,
          claimedAt: null,
          status: 'pending',
          lastAttemptAt: new Date(),
          ...(attemptsExhausted(((await db.translationChunk.findUnique({ where: { id: next.id }, select: { attempts: true } }))?.attempts ?? 0) + 1) ? { status: 'failed' } : {}),
        },
      });
      await writeProgress(row.id, lang);
      if (isRateLimitMsg(msg)) return; // budget for this import is spent
      return;
    }
  }
}

// ─── counters for the admin panel ────────────────────────────────────────────

export interface TranslationCounters {
  faComplete: number;
  faActive: number;
  psComplete: number;
  psWaiting: number;
  failedChunks: number;
  pendingChunks: number;
}

export async function getTranslationCounters(): Promise<TranslationCounters> {
  const [faComplete, faActive, psComplete, psWaiting, failedChunks, pendingChunks] = await Promise.all([
    db.opportunity.count({ where: { status: 'published', faStatus: 'complete' } }),
    db.opportunity.count({ where: { status: 'published' } }),
    db.opportunity.count({ where: { status: 'published', psStatus: 'complete' } }),
    db.opportunity.count({ where: { status: 'published', faStatus: 'complete', psStatus: { not: 'complete' } } }),
    db.translationChunk.count({ where: { status: 'failed' } }),
    db.translationChunk.count({ where: { status: 'pending' } }),
  ]);
  return { faComplete, faActive, psComplete, psWaiting, failedChunks, pendingChunks };
}
