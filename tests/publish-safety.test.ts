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

const { db } = await import('../src/lib/db');
let dbUp = false;
try {
  if (isolatedTestDatabase) {
    await db.$queryRaw`SELECT 1`;
    dbUp = true;
  }
} catch {
  dbUp = false;
}

if (process.env.REQUIRE_TEST_DATABASE === '1' && !dbUp) throw new Error('Required isolated test database is unavailable');

let publishDueQueue: any = null;
let composeCaptionWithLimit: any = null;
let deepLinkOf: any = null;

try {
  const pub = await import('../src/lib/social/publisher');
  publishDueQueue = pub.publishDueQueue;
  composeCaptionWithLimit = pub.composeCaptionWithLimit;
  deepLinkOf = pub.deepLinkOf;
} catch {
  throw new Error('Publisher module failed to load');
}

const CAPTIONS = {
  fa: '✨ تست\n\nهمین حالا اقدام کنید\n🔗 https://www.myariahub.com/fa/opportunities/test-slug\n\n#آریاهاب #فرصت',
  en: '✨ Test en block\n\nAct now\n🔗 https://www.myariahub.com/en/opportunities/test-slug\n\n#ariahub',
  ps: '✨ پسته بلوک\n🔗 https://www.myariahub.com/ps/opportunities/test-slug\n\n#ariahub',
};

async function seedFixture() {
  await db.automationState.upsert({ where: { id: 'singleton' }, create: { id: 'singleton', state: { autoPublish: true } }, update: { state: { autoPublish: true } } });
  await db.opportunity.upsert({ where: { slug: 'test-publish-safety' }, create: { slug: 'test-publish-safety', title: 'Test', description: 'Test', status: 'published' }, update: { status: 'published', deadline: null } });
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
    expect(after.status).toBe('blocked');
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


  test('stale claims require review and are never retried automatically', async () => {
    const row = await seedFixture();
    const channel = await db.publishChannel.findUniqueOrThrow({ where: { platform: 'x' } });
    const old = new Date(Date.now() - 11 * 60000);
    await db.socialPostQueue.update({ where: { id: row.id }, data: { status: 'publishing', claimedAt: old } });
    await db.socialDelivery.create({ data: { queueId: row.id, channelId: channel.id, platform: 'x', status: 'publishing', attempts: 1, lastAttemptAt: old } });
    await publishDueQueue(10);
    await publishDueQueue(10);
    const after = await db.socialPostQueue.findUniqueOrThrow({ where: { id: row.id } });
    const delivery = await db.socialDelivery.findFirstOrThrow({ where: { queueId: row.id } });
    expect(after.status).toBe('blocked');
    expect(after.attempts).toBe(0);
    expect(delivery.status).toBe('blocked');
    expect(delivery.attempts).toBe(1);
    expect(delivery.errorCode).toBe('OUTCOME_UNKNOWN');
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

const { publishQueueRow } = await import('../src/lib/social/queue-publishing');
const { saveStudioDesign } = await import('../src/lib/social/studio/persistence');
const { buildTodaysQueue } = await import('../src/lib/social/publisher');
describe.skipIf(!dbUp)('release regression scenarios', () => {
  const originalFetch = globalThis.fetch;

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    await db.socialPostQueue.deleteMany({ where: { OR: [{ contentRef: 'test-publish-safety' }, { contentRef: { startsWith: 'release-plan-' } }] } });
    await db.studioDesign.deleteMany({ where: { contentRef: { contains: 'test-publish-safety' } } });
    await db.publishChannel.deleteMany({ where: { platform: { in: ['x', 'facebook'] } } });
    await db.opportunity.deleteMany({ where: { OR: [{ slug: 'test-publish-safety' }, { slug: { startsWith: 'release-plan-' } }] } });
  });

  test('terminal old deliveries cannot starve a newer due post', async () => {
    const old = await seedFixture();
    const channel = await db.publishChannel.findUniqueOrThrow({ where: { platform: 'x' } });
    await db.socialDelivery.create({ data: { queueId: old.id, channelId: channel.id, platform: 'x', status: 'failed', attempts: 3 } });
    const next = await db.socialPostQueue.create({ data: { ...old, id: undefined, scheduledFor: new Date(Date.now() - 30000) } as never });
    await publishDueQueue(1);
    expect((await db.socialPostQueue.findUniqueOrThrow({ where: { id: old.id } })).attempts).toBe(0);
    expect((await db.socialPostQueue.findUniqueOrThrow({ where: { id: next.id } })).attempts).toBe(1);
  });

  test('manual double-click and forced retries never repost a successful destination', async () => {
    const row = await seedFixture();
    await db.publishChannel.upsert({ where: { platform: 'facebook' }, create: { platform: 'facebook', label: 'test', enabled: true, credentials: { pageId: '123', accessToken: 'test-token' } }, update: { enabled: true } });
    let photos = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/photos')) { photos++; return Response.json({ id: 'photo-1', post_id: 'post-1' }); }
      if (url.includes('permalink')) return Response.json({ permalink: 'https://www.facebook.com/post-1' });
      throw new Error('Unexpected network request');
    }) as typeof fetch;
    try {
      await Promise.all([publishQueueRow(row.id, { manual: true }), publishQueueRow(row.id, { manual: true })]);
      await publishQueueRow(row.id, { manual: true, force: true });
      expect(photos).toBe(1);
      const delivery = await db.socialDelivery.findFirstOrThrow({ where: { queueId: row.id, platform: 'facebook' } });
      expect(delivery.status).toBe('published');
      expect(delivery.attempts).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
      await db.publishChannel.update({ where: { platform: 'facebook' }, data: { enabled: false } });
    }
  });

  test('an archived opportunity is cancelled before an automatic platform call', async () => {
    const row = await seedFixture();
    await db.opportunity.update({ where: { slug: 'test-publish-safety' }, data: { status: 'archived' } });
    await publishDueQueue(1);
    expect((await db.socialPostQueue.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('cancelled');
    expect(await db.socialDelivery.count({ where: { queueId: row.id } })).toBe(0);
  });

  test('overdue posts retain two-minute spacing after a worker restart', async () => {
    const first = await seedFixture();
    const second = await db.socialPostQueue.create({ data: { ...first, id: undefined, scheduledFor: new Date(Date.now() - 30000) } as never });
    await publishDueQueue(10);
    await publishDueQueue(10);
    expect((await db.socialPostQueue.findUniqueOrThrow({ where: { id: first.id } })).attempts).toBe(1);
    expect((await db.socialPostQueue.findUniqueOrThrow({ where: { id: second.id } })).attempts).toBe(0);
  });

  test('saved edits invalidate old media and ensure-row uses the automatic source identity', async () => {
    const row = await seedFixture();
    const forDate = new Date(Date.now() + 270 * 60000).toISOString().slice(0, 10);
    const design = { contentRef: 'spotlight-test-publish-safety', forDate, templateType: 'spotlight', overrides: { title: 'Changed' } };
    const saved = await Promise.all([
      saveStudioDesign(design, { template: 'spotlight', title: 'Changed' }, { en: 'Changed' }, true),
      saveStudioDesign(design, { template: 'spotlight', title: 'Changed' }, { en: 'Changed' }, true),
    ]);
    expect(saved[0].row?.id).toBe(row.id);
    expect(saved[1].row?.id).toBe(row.id);
    expect(await db.socialPostQueue.count({ where: { contentRef: 'test-publish-safety' } })).toBe(1);
    const updated = await db.socialPostQueue.findUniqueOrThrow({ where: { id: row.id } });
    expect(updated.imageStatus).toBe('none');
    expect(updated.imagePaths).toBeNull();
    expect(updated.requiresManualPublish).toBe(true);
  });

  test('priority is applied before limiting a page of newer inventory', async () => {
    await db.opportunity.update({ where: { slug: 'test-publish-safety' }, data: { status: 'archived' } });
    await db.opportunity.createMany({ data: [
      { slug: 'release-plan-urgent', title: 'Older urgent', description: 'Test', status: 'published', createdAt: new Date('2020-01-01'), updatedAt: new Date('2020-01-01'), deadline: new Date(Date.now() + 86400000) },
      { slug: 'release-plan-new', title: 'Newest', description: 'Test', status: 'published' },
    ] });
    try {
      const { buildOpportunityDistributionPlan } = await import('../src/lib/social/opportunity-distribution');
      const plan = await buildOpportunityDistributionPlan('en', { target: 1 });
      expect(plan[0]?.opp?.slug).toBe('release-plan-urgent');
    } finally {
      await db.opportunity.deleteMany({ where: { slug: { in: ['release-plan-urgent', 'release-plan-new'] } } });
    }
  });

  test('concurrent builders schedule 40 unique opportunities across eight staggered windows', async () => {
    await db.socialPostQueue.deleteMany({ where: { contentRef: 'test-publish-safety' } });
    await db.opportunity.update({ where: { slug: 'test-publish-safety' }, data: { status: 'archived' } });
    await db.opportunity.createMany({ data: Array.from({ length: 45 }, (_, i) => ({ slug: 'release-plan-' + i, title: 'Opportunity ' + i, description: 'Test', status: 'published' as const })), skipDuplicates: true });
    await db.automationState.update({ where: { id: 'singleton' }, data: { state: { opportunityDailyTarget: 40, opportunityBatchSize: 5, opportunityBatchTimes: ['08:00','09:00','10:30','13:00','15:30','18:00','20:30','22:00'] } } });
    const result = await Promise.all([buildTodaysQueue(), buildTodaysQueue()]);
    expect(result.reduce((sum, value) => sum + value.created, 0)).toBe(40);
    const rows = await db.socialPostQueue.findMany({ where: { contentRef: { startsWith: 'release-plan-' } }, orderBy: { scheduledFor: 'asc' } });
    expect(new Set(rows.map((r) => r.contentRef)).size).toBe(40);
    expect(new Set(rows.map((r) => r.scheduledFor.toISOString())).size).toBe(40);
    expect(rows[1].scheduledFor.getTime() - rows[0].scheduledFor.getTime()).toBe(120000);
    expect(rows.every((r) => ['spotlight','deadline'].includes(r.templateType))).toBe(true);
  });
});

describe.skipIf(!dbUp)('worker and group release checks', () => {
  test('healthy idle social ticks update one heartbeat without adding run history', async () => {
    const { runSocialTick } = await import('../src/lib/automation/social-tick');
    const before = await db.pipelineRun.count({ where: { kind: 'social_publish' } });
    const first = await runSocialTick('http://127.0.0.1:3100');
    const second = await runSocialTick('http://127.0.0.1:3100');
    expect(first.errors).toEqual([]);
    expect(second.errors).toEqual([]);
    expect(await db.pipelineRun.count({ where: { kind: 'social_publish' } })).toBe(before);
    const heartbeat = await db.automationState.findUniqueOrThrow({ where: { id: 'singleton' } });
    expect((heartbeat.state as Record<string, unknown>).lastSocialTickStatus).toBe('ok');
    expect((heartbeat.state as Record<string, unknown>).socialTickRunning).toBe(false);
  });

  test('automatic group campaigns are idempotent and manual selections stay manual', async () => {
    const { createCampaignForQueueRow, ensureAutoCampaigns } = await import('../src/lib/facebook-group-distribution');
    const row = await db.socialPostQueue.create({ data: { contentRef: 'release-group-test', templateType: 'spotlight', scheduledFor: new Date(), contentJson: {}, captionJson: {}, facebookGroupDistribution: true, facebookGroupMode: 'manual' } });
    const group = await db.facebookGroup.create({ data: { name: 'Release test', url: 'https://www.facebook.com/groups/release-test' } });
    const rule = await db.facebookGroupDistributionRule.create({ data: { name: 'Release test', includeGroupIds: [group.id] } });
    try {
      expect((await ensureAutoCampaigns()).created).toBe(0);
      await Promise.all([createCampaignForQueueRow(row.id), createCampaignForQueueRow(row.id)]);
      expect(await db.facebookGroupCampaign.count({ where: { sourceQueueId: row.id } })).toBe(1);
      expect(await db.facebookGroupDistributionJob.count({ where: { sourceQueueId: row.id, groupId: group.id } })).toBe(1);
    } finally {
      await db.facebookGroupCampaign.deleteMany({ where: { sourceQueueId: row.id } });
      await db.facebookGroup.delete({ where: { id: group.id } });
      await db.facebookGroupDistributionRule.delete({ where: { id: rule.id } });
      await db.socialPostQueue.delete({ where: { id: row.id } });
    }
  });
});
