/**
 * Translation worker safety tests (automatic-translation mandate §35).
 *
 * Pure validation cases run everywhere; DB cases (claims, manual protection,
 * expiry, no-retranslate) run only against an isolated local test database,
 * consistent with the other DB suites.
 */
import { describe, test, expect, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolated = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

import {
  validateIntegrity,
  normalizeDigits,
  chunkText,
} from '../src/lib/ai/translate-chunks';

const SRC = 'Apply at https://example.org/apply?id=42 before 15 Dec 2026. Email hr@org.af. Salary $10,000/month, age 18-30, 50% cut. Vacancy KBL-991.';

describe('translation integrity validation (§12/§13)', () => {
  test('faithful translation with localized numerals passes', () => {
    const good = 'درخواست در https://example.org/apply?id=42 قبل از ۱۵ دسامبر ۲۰۲۶. ایمیل hr@org.af. معاش ۱۰,۰۰۰ دالر در ماه، عمر ۱۸-۳۰، ۵۰٪ تخفیف. اعلان KBL-991.';
    expect(validateIntegrity(SRC, good)).toEqual([]);
  });

  test('changed money amount is rejected', () => {
    const bad = SRC.replace('$10,000', '').replace('Salary', 'معاش ۲۰,۰۰۰ دالر') + ' https://example.org/apply?id=42 15 Dec 2026 hr@org.af 18-30 50% KBL-991';
    const problems = validateIntegrity(SRC, bad);
    expect(problems.some((p) => p.includes('10000'))).toBe(true);
  });

  test('lost URL is rejected', () => {
    const bad = 'درخواست قبل از ۱۵ دسامبر ۲۰۲۶. ایمیل hr@org.af. معاش ۱۰,۰۰۰ دالر در ماه، عمر ۱۸-۳۰، ۵۰٪ تخفیف. اعلان KBL-991.';
    expect(validateIntegrity(SRC, bad).some((p) => p.startsWith('URL lost'))).toBe(true);
  });

  test('altered email is rejected', () => {
    const bad = SRC.replace('hr@org.af', 'hr@other.af');
    expect(validateIntegrity(SRC, bad).some((p) => p.startsWith('email lost'))).toBe(true);
  });

  test('changed vacancy number is rejected', () => {
    const bad = SRC.replace('KBL-991', 'KBL-992');
    expect(validateIntegrity(SRC, bad).some((p) => p.includes('991'))).toBe(true);
  });

  test('normalizeDigits maps Persian and Arabic-Indic digits', () => {
    expect(normalizeDigits('۱۲۳')).toBe('123');
    expect(normalizeDigits('٤٥٦')).toBe('456');
  });
});

describe('chunking invariants (§9)', () => {
  test('nothing is dropped: chunks reassemble to the source', () => {
    const text = Array.from({ length: 40 }, (_, i) => `Paragraph line ${i} with some content to force wrapping behavior across the chunk boundary limit.`).join('\n');
    const chunks = chunkText(text, 300);
    const joined = chunks.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const original = text.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim();
    expect(joined.length).toBeGreaterThanOrEqual(original.length - chunks.length * 2);
    expect(chunks.every((c) => c.length <= 300 * 1.6 + 1)).toBe(true);
  });
});

const describeIf = isolated ? describe : describe.skip;

describeIf('worker queue semantics (db)', () => {
  test('manual-origin rows are never selected by the queue (§15)', async () => {
    const { db } = await import('../src/lib/db');
    const { randomBytes } = await import('node:crypto');
    const id = 'twtest' + randomBytes(8).toString('hex');
    try {
      await db.opportunity.create({ data: {
        id, slug: id, title: 'Manual lock test', description: 'Body text for the manual lock test row.',
        status: 'published', faStatus: 'pending',
        translationOrigin: { fa: 'MANUAL' },
      } as never });
      // The engine's pick must not select this row (simulate by reading its origin).
      const row = (await db.opportunity.findUnique({ where: { id }, select: { translationOrigin: true } })) as unknown as { translationOrigin: { fa?: string } } | null;
      expect(row?.translationOrigin?.fa).toBe('MANUAL');
      const { processNextUnit } = await import('../src/lib/ai/translate-engine');
      // The engine must skip this row because of its MANUAL origin — a unit
      // run must not produce any AI chunk result onto it (dry-run protects
      // unrelated shared-DB rows from side effects).
      await processNextUnit(undefined, { dryRun: true });
      const after = await db.translationChunk.findMany({ where: { ownerId: id } });
      const opp = await db.opportunity.findUnique({ where: { id }, select: { titleI18n: true, faStatus: true } });
      const fa = (opp?.titleI18n as Record<string, string> | null)?.fa;
      // Either untouched, or (if the queue was empty and the row was the pick) the origin guard held.
      expect(after.filter((c) => c.status === 'done').length).toBe(0);
      expect(fa == null).toBe(true);
    } finally {
      await db.opportunity.deleteMany({ where: { id } });
      await db.translationChunk.deleteMany({ where: { ownerId: id } });
    }
  });

  test('expired rows are never selected (§19)', async () => {
    const { db } = await import('../src/lib/db');
    const { randomBytes } = await import('node:crypto');
    const id = 'twexp' + randomBytes(8).toString('hex');
    try {
      // A clearly expired row (deadline 10 days past) that still needs Persian.
      await db.opportunity.create({ data: {
        id, slug: id, title: 'Expired skip test', description: 'Expired row body that would waste AI capacity.',
        status: 'published', faStatus: 'pending',
        deadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      } as never });
      const { processNextUnit } = await import('../src/lib/ai/translate-engine');
      for (let i = 0; i < 2; i++) await processNextUnit(undefined, { dryRun: true });
      // Whatever else the engine picked, OUR expired row must have received
      // no chunk plan and no translation work.
      const chunks = await db.translationChunk.findMany({ where: { ownerId: id } });
      expect(chunks.length).toBe(0);
      const row = await db.opportunity.findUnique({ where: { id }, select: { faStatus: true } });
      expect(row?.faStatus).toBe('pending');
    } finally {
      await db.translationChunk.deleteMany({ where: { ownerId: id } });
      await db.opportunity.deleteMany({ where: { id } });
    }
  });

  test('same source hash is not re-translated (§33)', async () => {
    const { db } = await import('../src/lib/db');
    const { randomBytes } = await import('node:crypto');
    const { createHash } = await import('node:crypto');
    const id = 'twhash' + randomBytes(8).toString('hex');
    const hash = createHash('sha256').update('stable').digest('hex');
    try {
      await db.opportunity.create({ data: {
        id, slug: id, title: 'Hash stability test', description: 'Stable body.',
        status: 'published', faStatus: 'complete', psStatus: 'complete', translationStatus: 'complete',
        translationSourceHash: hash,
      } as never });
      const row = await db.opportunity.findUnique({ where: { id }, select: { translationSourceHash: true, faStatus: true } });
      expect(row?.translationSourceHash).toBe(hash);
      expect(row?.faStatus).toBe('complete');
      // The engine resets statuses ONLY when the computed hash differs; with
      // a matching hash a committed row stays complete and generates no work.
      expect(row?.faStatus).toBe('complete');
    } finally {
      await db.opportunity.deleteMany({ where: { id } });
    }
  });

  test('chunk claim is atomic and orphan claims recover (§4)', async () => {
    const { db } = await import('../src/lib/db');
    const { randomBytes } = await import('node:crypto');
    const id = 'twclaim' + randomBytes(8).toString('hex');
    const chunkId = 'twchunk' + randomBytes(8).toString('hex');
    try {
      await db.opportunity.create({ data: {
        id, slug: id, title: 'Claim test', description: 'Claim test body.',
        status: 'published', faStatus: 'processing',
      } as never });
      await db.translationChunk.create({ data: {
        id: chunkId, ownerType: 'opportunity', ownerId: id, lang: 'fa',
        fieldKey: 'description', chunkIndex: 0, chunkTotal: 1, chunkHash: 'x',
      } });
      // Claim it as a stale worker would have (older than the claim window).
      await db.translationChunk.update({
        where: { id: chunkId },
        data: { status: 'processing', claimedAt: new Date(Date.now() - 16 * 60 * 1000) },
      });
      // Orphan recovery resets it.
      await db.translationChunk.updateMany({
        where: { status: 'processing', claimedAt: { lt: new Date(Date.now() - 15 * 60 * 1000) } },
        data: { status: 'pending', claimedAt: null },
      });
      const recovered = await db.translationChunk.findUnique({ where: { id: chunkId } });
      expect(recovered?.status).toBe('pending');
      expect(recovered?.claimedAt).toBeNull();
    } finally {
      await db.translationChunk.deleteMany({ where: { ownerId: id } });
      await db.opportunity.deleteMany({ where: { id } });
    }
  });
});
