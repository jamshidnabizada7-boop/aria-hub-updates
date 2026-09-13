/**
 * Phase 3 self-test — exercises the publish pipeline's new safety machinery
 * against the LOCAL database with a deliberately invalid Telegram channel
 * (no real API posts). Run: bun run scripts/phase3-selftest.ts
 */
process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';

async function main() {
  const { db } = await import('../src/lib/db');
  const { publishDueQueue, composeCaptionWithLimit, deepLinkOf } = await import('../src/lib/social/publisher');

  // 0. caption helpers
  const caps = { fa: '✨ تست\n\nهمین حالا اقدام کنید\n🔗 https://www.myariahub.com/fa/opportunities/test-slug\n\n#آریاهاب #فرصت', en: '✨ Test en block\n\nAct now\n🔗 https://www.myariahub.com/en/opportunities/test-slug\n\n#ariahub', ps: '✨ پسته بلوک\n🔗 https://www.myariahub.com/ps/opportunities/test-slug\n\n#ariahub' };
  const long = composeCaptionWithLimit(caps, ['fa', 'ps', 'en'], 270);
  console.log('caption limit ok:', long.length <= 270, '| has link:', Boolean(deepLinkOf(long)), '| single block:', !long.includes('Test en block'));

  // 1. invalid telegram channel + due row
  await db.publishChannel.deleteMany({ where: { platform: 'telegram' } });
  await db.socialPostQueue.deleteMany({ where: { contentRef: 'phase3-test' } });
  await db.publishChannel.create({ data: { platform: 'telegram', label: 'telegram', enabled: true, credentials: { botToken: '123456:INVALID', chatId: '@test' } } });
  const row = await db.socialPostQueue.create({ data: {
    scheduledFor: new Date(Date.now() - 60000),
    templateType: 'promo',
    contentRef: 'phase3-test',
    contentJson: { template: 'promo', lang: 'fa', title: 'Phase 3 test' },
    captionJson: caps,
    status: 'ready',
    imageStatus: 'failed',
  } });

  // 2. publish — bad token path (network may block telegram here; either way
  // the row must end failed with the claim released and channel error stored)
  const r = await publishDueQueue(10);
  console.log('publish result:', JSON.stringify(r));
  const after = await db.socialPostQueue.findUniqueOrThrow({ where: { id: row.id } });
  console.log('row:', after.status, '| attempts:', after.attempts, '| claimedAt cleared:', after.claimedAt === null, '| err:', (after.error || '').slice(0, 60));
  const ch = await db.publishChannel.findUniqueOrThrow({ where: { platform: 'telegram' } });
  console.log('channel disabled:', ch.enabled === false, '| lastError:', (ch.lastError || '').slice(0, 55));

  // 3. stale-claim sweep: simulate a worker that died after claiming
  await db.socialPostQueue.update({ where: { id: row.id }, data: { status: 'publishing', claimedAt: new Date(Date.now() - 11 * 60000) } });
  await publishDueQueue();
  const after2 = await db.socialPostQueue.findUniqueOrThrow({ where: { id: row.id } });
  console.log('stale sweep → failed:', after2.status === 'failed', '| attempts:', after2.attempts, '| msg:', (after2.error || '').includes('claim timed out'));

  // 4. claim CAS: second claimer must lose
  await db.socialPostQueue.update({ where: { id: row.id }, data: { status: 'ready' } });
  const c1 = await db.socialPostQueue.updateMany({ where: { id: row.id, status: { in: ['ready', 'failed', 'partial'] } }, data: { status: 'publishing' } });
  const c2 = await db.socialPostQueue.updateMany({ where: { id: row.id, status: { in: ['ready', 'failed', 'partial'] } }, data: { status: 'publishing' } });
  console.log('claim CAS ok:', c1.count === 1 && c2.count === 0);

  // cleanup
  await db.socialPostQueue.delete({ where: { id: row.id } });
  await db.publishChannel.delete({ where: { platform: 'telegram' } });
  console.log('cleaned up ✓');
  process.exit(0);
}

void main();
