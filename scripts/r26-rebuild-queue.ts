import { db } from '../src/lib/db';
await db.socialPostQueue.deleteMany({});
const { patchState, buildTodaysQueue } = await import('../src/lib/social/publisher');
await patchState({ lastQueueBuildDate: null });
const r = await buildTodaysQueue();
console.log('rebuilt:', JSON.stringify(r));
const row = await db.socialPostQueue.findFirst({ where: { templateType: 'spotlight' } });
console.log('spotlight has posterData:', !!(row?.contentJson as Record<string, unknown>)?.posterData);
process.exit(0);
