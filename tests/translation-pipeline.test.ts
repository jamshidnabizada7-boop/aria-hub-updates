/**
 * Phase 23 — the plan's mandatory translation cases, driven through the REAL
 * chunked engine with a scripted provider (no network):
 *   - translation remains Persian-first (fa before ps, ps gated on fa complete)
 *   - a partial translation NEVER becomes public (atomic per-language commit)
 */
import { describe, test, expect, beforeAll, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

// Scripted provider: Persian for fa prompts, Pashto for ps prompts; throws
// when the script says so (keyed by prompt text marker).
let failFaMarker: string | null = null;
let calls: Array<'fa' | 'ps'> = [];
mock.module('@/lib/ai/failover', () => ({
  chatWithFailover: async (_slots: unknown, system: string, prompt: string) => {
    const lang: 'fa' | 'ps' = system.includes('Persian') ? 'fa' : 'ps';
    calls.push(lang);
    if (lang === 'fa' && failFaMarker && prompt.includes(failFaMarker)) {
      throw new Error('scripted provider outage');
    }
    // strict-JSON reply the parser accepts; length ratio stays sane
    const sourceGuess = prompt.length;
    const filler = lang === 'fa'
      ? 'این بخش از متن شغلی به زبان فارسی ترجمه شده است. '
      : 'دا د کار متن په پښتو ژباړل شوی برخه ده. ';
    let out = '';
    while (out.length < Math.max(40, Math.floor(sourceGuess * 0.5))) out += filler;
    // The engine's integrity gate (§12/§13) rejects translations that drop
    // critical numbers — a realistic translator preserves them, so the script
    // must too.
    const nums = prompt.match(/\$\s?[\d,]+|\d[\d,\.]*\s?%|(?:19|20)\d{2}|\d{2,}/g) || [];
    if (nums.length) out += ` اعداد: ${nums.join(' ')}`;
    return { text: JSON.stringify({ t: out.trim() }) };
  },
  getProviderSlots: () => [{ name: 'scripted', provider: async () => ({ text: '' }) }],
}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { processOpportunityNow } = await import('../src/lib/ai/translate-engine');
const { translationPendingFlags } = await import('../src/lib/translation/pending');
import { Prisma } from '@prisma/client';
const { db } = await import('../src/lib/db');

let dbUp = false;
try {
  if (isolatedTestDatabase) await db.$queryRaw`SELECT 1`;
  dbUp = true;
} catch { dbUp = false; }

const describeIf = (cond: boolean) => (cond ? describe : describe.skip);
const runId = Date.now().toString(36);
const slug = `t23-engine-${runId}`;

describeIf(dbUp)('Persian-first + atomic commit through the real engine (db)', () => {
  let opportunityId = '';

  beforeAll(async () => {
    await db.translationChunk.deleteMany({ where: { ownerId: { startsWith: '' }, ownerType: 'opportunity', lang: { in: ['fa', 'ps'] } } }).catch(() => null);
    await db.opportunity.deleteMany({ where: { slug } });
    // description long enough to split into multiple chunks (CHUNK_SIZE 900)
    const description = Array.from({ length: 30 }, (_, i) =>
      `Paragraph ${i}: We are seeking an experienced programme officer to lead field activities, coordinate with partners, and report on outcomes across several provinces. (marker-${Math.floor(i / 10)})`,
    ).join('\n\n');
    const opp = await db.opportunity.create({
      data: {
        slug, title: `Engine Test Job ${runId}`, description,
        status: 'published', sourceName: 'Acted Vacancies',
        ...translationPendingFlags(),
      },
    });
    opportunityId = opp.id;
  });

  afterAll(async () => {
    await db.translationChunk.deleteMany({ where: { ownerId: opportunityId, ownerType: 'opportunity' } }).catch(() => null);
    await db.opportunity.deleteMany({ where: { slug } }).catch(() => null);
  });

  test('Persian completes first and commits atomically; Pashto follows', async () => {
    failFaMarker = null;
    calls = [];
    await processOpportunityNow(opportunityId, 60_000);

    const after = await db.opportunity.findUnique({ where: { id: opportunityId } });
    // Persian-first: the provider saw fa before ps
    const firstFa = calls.indexOf('fa');
    const firstPs = calls.indexOf('ps');
    expect(firstFa).toBeGreaterThanOrEqual(0);
    expect(firstPs).toBeGreaterThan(firstFa);
    // both languages committed atomically
    expect(after!.faStatus).toBe('complete');
    expect(after!.psStatus).toBe('complete');
    const fa = (after!.titleI18n as any)?.fa ?? (after!.descriptionI18n as any)?.fa;
    expect(typeof fa).toBe('string');
    expect((fa as string).length).toBeGreaterThan(0);
    expect((after!.descriptionI18n as any)?.ps).toBeTruthy();
  });

  test('a failing chunk keeps the language OUT of the public fields (partial never public)', async () => {
    // reset the row to pending
    await db.opportunity.update({ where: { id: opportunityId }, data: { ...translationPendingFlags(), titleI18n: Prisma.JsonNull, descriptionI18n: Prisma.JsonNull } });
    await db.translationChunk.deleteMany({ where: { ownerId: opportunityId, ownerType: 'opportunity' } });
    // the description carries (marker-2) in its third chunk group — fail that chunk
    failFaMarker = 'marker-2';
    calls = [];
    await processOpportunityNow(opportunityId, 45_000);

    const after = await db.opportunity.findUnique({ where: { id: opportunityId } });
    // Persian did NOT complete — the failed chunk parks the language
    expect(after!.faStatus).not.toBe('complete');
    // the public Persian fields were NEVER written (atomic guarantee)
    expect((after!.titleI18n as any)?.fa ?? null).toBeNull();
    expect((after!.descriptionI18n as any)?.fa ?? null).toBeNull();

    // heal the outage → the queue finishes the language atomically
    failFaMarker = null;
    await processOpportunityNow(opportunityId, 60_000);
    const healed = await db.opportunity.findUnique({ where: { id: opportunityId } });
    expect(healed!.faStatus).toBe('complete');
    expect((healed!.descriptionI18n as any)?.fa).toBeTruthy();
  });
});
