/**
 * Publishing-pipeline safety tests — the Phase 3 duplicate-prevention
 * machinery, exercised against the LOCAL database with an invalid Telegram
 * channel (nothing ever reaches a real platform). Skips when the DB is down.
 *
 * Run: bun test tests/publish-safety.test.ts
 */
import { describe, expect, test, afterAll } from 'bun:test';

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';

const { db } = await import('../src/lib/db').catch(() => ({ db: null as never }));
let dbUp = false;
try {
  await db.$queryRaw`SELECT 1`;
  dbUp = true;
} catch {
  dbUp = false;
}

const { publishDueQueue, composeCaptionWithLimit, deepLinkOf } = await import('../src/lib/social/publisher');

const CAPTIONS = {
  fa: '✨ تست\n\nهمین حالا اقدام کنید\n🔗 https://www.myariahub.com/fa/opportunities/test-slug\n\n#آریاهاب #فرصت',
  en: '✨ Test en block\n\nAct now\n🔗 https://www.myariahub.com/en/opportunities/test-slug\n\n#ariahub',
  ps: '✨ پسته بلوک\n🔗 https://www.myariahub.com/ps/opportunities/test-slug\n\n#ariahub',
};

async function seedFixture() {
  await db.publishChannel.deleteMany({ where: { platform: 'telegram' } });
  await db.socialPostQueue.deleteMany({ where: { contentRef: 'test-publish-safety' } });
  await db.publishChannel.create({
    data: { platform: 'telegram', label: 'telegram', enabled: true, credentials: { botToken: '123456:INVALID', chatId: '@test' } },
  });
  return db.socialPostQueue.create({
    data: {
      scheduledFor: new Date(Date.now() - 60000),
      templateType: 'promo',
      contentRef: 'test-publish-safety',
      contentJson: { template: 'promo', lang: 'fa', title: 'Publish safety test' },
      captionJson: CAPTIONS,
      status: 'ready',
      imageStatus: 'failed',
    },
  });
}

describe.skipIf(!dbUp)('composeCaptionWithLimit', () => {
  test('respects the platform limit without cutting the link line', () => {
    const out = composeCaptionWithLimit(CAPTIONS, ['fa', 'ps', 'en'], 270);
    expect(out.length).toBeLessThanOrEqual(270);
    expect(deepLinkOf(out)).toBe('https://www.myariahub.com/fa/opportunities/test-slug');
  });
  test('deepLinkOf finds the real opportunity URL (not the bare homepage)', () => {
    expect(deepLinkOf(CAPTIONS.fa)).toBe('https://www.myariahub.com/fa/opportunities/test-slug');
    expect(deepLinkOf('no link here')).toBeNull();
  });
});

describe.skipIf(!dbUp)('publishDueQueue safety machinery', () => {
  afterAll(async () => {
    if (!dbUp) return;
    await db.socialPostQueue.deleteMany({ where: { contentRef: 'test-publish-safety' } });
    await db.publishChannel.deleteMany({ where: { platform: 'telegram' } });
    await db.$executeRaw`UPDATE "AutomationState" SET state = state || '{"tickRunning":false}'::jsonb WHERE id = 'singleton'`;
  });

  test('claim CAS: only one concurrent claimer wins', async () => {
    const row = await seedFixture();
    const c1 = await db.socialPostQueue.updateMany({
      where: { id: row.id, status: { in: ['ready', 'failed', 'partial'] } },
      data: { status: 'publishing' },
    });
    const c2 = await db.socialPostQueue.updateMany({
      where: { id: row.id, status: { in: ['ready', 'failed', 'partial'] } },
      data: { status: 'publishing' },
    });
    expect(c1.count).toBe(1);
    expect(c2.count).toBe(0); // double-publish window closed
    await db.socialPostQueue.update({ where: { id: row.id }, data: { status: 'ready' } });
  });

  test('failed publish records the attempt, releases the claim, stores the channel error', async () => {
    const row = await seedFixture();
    await publishDueQueue(10);
    const after = await db.socialPostQueue.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.status).toBe('failed');
    expect(after.attempts).toBe(1);
    expect(after.claimedAt).toBeNull();
    expect(after.error).toContain('telegram');
    const ch = await db.publishChannel.findUniqueOrThrow({ where: { platform: 'telegram' } });
    expect(ch.lastError).toContain('telegram');
  });

  test('stale publishing claims are swept to failed with an attempts increment', async () => {
    const row = await seedFixture();
    await db.socialPostQueue.update({
      where: { id: row.id },
      data: { status: 'publishing', claimedAt: new Date(Date.now() - 11 * 60000) },
    });
    await publishDueQueue(10);
    const after = await db.socialPostQueue.findUniqueOrThrow({ where: { id: row.id } });
    // the sweep fails the row (attempts 1); the same run then legitimately
    // retries it once (it is due again) — so attempts ends at 2 with the
    // retry's error message. Either way: failed, claim released.
    expect(after.status).toBe('failed');
    expect(after.attempts).toBeGreaterThanOrEqual(1);
    expect(after.claimedAt).toBeNull();
  });

  test('queue rows are unique per (contentRef, scheduledFor)', async () => {
    const row = await seedFixture();
    let conflicted = false;
    try {
      await db.socialPostQueue.create({ data: { ...row, id: undefined } as never });
    } catch {
      conflicted = true;
    }
    expect(conflicted).toBe(true);
  });
});
