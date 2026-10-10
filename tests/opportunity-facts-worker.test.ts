import { describe, expect, test } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test';
const url = new URL(process.env.DATABASE_URL);
const isolated = ['localhost', '127.0.0.1'].includes(url.hostname) && /_(test|fresh)$/.test(url.pathname);
if (!isolated && process.env.REQUIRE_TEST_DATABASE === '1') throw new Error('Facts worker tests require an isolated test database');

(isolated ? describe : describe.skip)('facts worker recovery and publication guards', () => {
  async function fixture(action: (id: string) => Promise<void>, overrides: Record<string, unknown> = {}, review = false) {
    const { db } = await import('../src/lib/db');
    const id = `facts-${randomUUID()}`;
    const source = 'Until the final research project is completed';
    const digest = createHash('sha256').update(source).digest('hex');
    try {
      await db.opportunity.create({ data: { id, slug: id, title: 'Fact worker test', description: 'Test description', status: 'published', language: 'en', extractedData: { duration: source }, ...overrides } as never });
      await db.translationChunk.create({ data: { ownerType: review ? 'opportunityFactsReview' : 'opportunityFacts', ownerId: id, lang: 'fa', fieldKey: `duration:${digest}`, chunkIndex: 0, chunkTotal: 1, chunkHash: digest, status: 'done', result: 'تا تکمیل پروژه نهایی پژوهش', completedAt: new Date() } });
      await action(id);
    } finally {
      await db.translationChunk.deleteMany({ where: { ownerId: id } });
      await db.opportunity.deleteMany({ where: { id } });
    }
  }

  test('completed chunks resume their atomic commit without another provider call', async () => {
    const { processOpportunityFactsUnit } = await import('../src/lib/ai/translate-opportunity-facts');
    const { db } = await import('../src/lib/db');
    await fixture(async id => {
      const result = await processOpportunityFactsUnit(undefined, { opportunityId: id });
      expect(result.committed).toBe(true);
      expect(result.processed).toBe(false);
      const row = await db.opportunity.findUniqueOrThrow({ where: { id } });
      expect((row.extractedDataI18n as { fa: { duration: string } }).fa.duration).toBe('تا تکمیل پروژه نهایی پژوهش');
      expect(row.status).toBe('published');
    });
  });

  test('review mode never commits completed chunks', async () => {
    const { processOpportunityFactsUnit } = await import('../src/lib/ai/translate-opportunity-facts');
    const { db } = await import('../src/lib/db');
    await fixture(async id => {
      const result = await processOpportunityFactsUnit(undefined, { opportunityId: id, dryRun: true });
      expect(result.committed).toBe(false);
      expect((await db.opportunity.findUniqueOrThrow({ where: { id } })).extractedDataI18n).toBeNull();
    }, { translationOrigin: { ps: 'MANUAL' } }, true);
  });

  test('manual and expired records are skipped', async () => {
    const { processOpportunityFactsUnit } = await import('../src/lib/ai/translate-opportunity-facts');
    const { db } = await import('../src/lib/db');
    for (const overrides of [{ translationOrigin: { fa: 'MANUAL', ps: 'MANUAL' } }, { deadline: new Date('2000-01-01') }]) {
      await fixture(async id => {
        expect((await processOpportunityFactsUnit(undefined, { opportunityId: id })).skipped).toBe(true);
        expect((await db.opportunity.findUniqueOrThrow({ where: { id } })).extractedDataI18n).toBeNull();
      }, overrides);
    }
  });
});
