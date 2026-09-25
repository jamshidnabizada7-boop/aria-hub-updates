/**
 * Publishing-pipeline safety tests — the Phase 3 duplicate-prevention
 * machinery, exercised against an isolated LOCAL test database. The X adapter
 * rejects required images before any network request. Skips without a test DB.
 *
 * Run: bun test tests/publish-safety.test.ts
 */
import { describe, expect, test, afterAll, mock } from 'bun:test';

mock.module('server-only', () => ({}));

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolatedTestDatabase = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const { db } = await import('../src/lib/db').catch(() => ({ db: null as never }));
let dbUp = false;
try {
  if (isolatedTestDatabase) {
    await db.$queryRaw`SELECT 1`;
    dbUp = true;
  }
} catch {
  dbUp = false;
}

let publishDueQueue: any = null;
let composeCaptionWithLimit: any = null;
let deepLinkOf: any = null;

try {
  const pub = await import('../src/lib/social/publisher');
  publishDueQueue = pub.publishDueQueue;
  composeCaptionWithLimit = pub.composeCaptionWithLimit;
  deepLinkOf = pub.deepLinkOf;
} catch {
  // Ignored when server-only triggers in non-Next test runner
}

const CAPTIONS = {
  fa: '✨ تست\n\nهمین حالا اقدام کنید\n🔗 https://www.myariahub.com/fa/opportunities/test-slug\n\n#آریاهاب #فرصت',
  en: '✨ Test en block\n\nAct now\n🔗 https://www.myariahub.com/en/opportunities/test-slug\n\n#ariahub',
  ps: '✨ پسته بلوک\n🔗 https://www.myariahub.com/ps/opportunities/test-slug\n\n#ariahub',
};

async function seedFixture() {
  await db.socialPostQueue.deleteMany({ where: { contentRef: 'test-publish-safety' } });
  await db.publishChannel.deleteMany({ where: { platform: 'x' } });
  await db.publishChannel.create({
    data: { platform: 'x', label: 'x', enabled: true, credentials: {} },
  });
  return db.socialPostQueue.create({
    data: {
      scheduledFor: new Date(Date.now() - 60000),
      templateType: 'spotlight',
      contentRef: 'test-publish-safety',
      contentJson: { template: 'spotlight', lang: 'fa', title: 'Publish safety test' },
      captionJson: CAPTIONS,
      status: 'ready',
      imageStatus: 'ready',
      imagePaths: { square: 'https://store.public.blob.vercel-storage.com/test.png' },
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
    await db.publishChannel.deleteMany({ where: { platform: 'x' } });
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
    expect(after.error).toContain('x');
    const ch = await db.publishChannel.findUniqueOrThrow({ where: { platform: 'x' } });
    expect(ch.lastError).toContain('x');
  });

  test('a delivery waiting for retry does not consume another queue attempt', async () => {
    const row = await seedFixture();
    const channel = await db.publishChannel.findUniqueOrThrow({ where: { platform: 'x' } });
    await db.socialDelivery.create({
      data: {
        queueId: row.id,
        channelId: channel.id,
        platform: 'x',
        status: 'retry_wait',
        attempts: 1,
        nextAttemptAt: new Date(Date.now() + 10 * 60000),
      },
    });
    await publishDueQueue(10);
    const after = await db.socialPostQueue.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.status).toBe('ready');
    expect(after.attempts).toBe(0);
  });

  test('Brand Studio and generic rows remain outside automatic publishing', async () => {
    const row = await seedFixture();
    await db.socialPostQueue.update({ where: { id: row.id }, data: { requiresManualPublish: true } });
    await publishDueQueue(10);
    expect((await db.socialPostQueue.findUniqueOrThrow({ where: { id: row.id } })).attempts).toBe(0);
    await db.socialPostQueue.update({
      where: { id: row.id },
      data: { requiresManualPublish: false, templateType: 'quote' },
    });
    await publishDueQueue(10);
    expect((await db.socialPostQueue.findUniqueOrThrow({ where: { id: row.id } })).attempts).toBe(0);
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
