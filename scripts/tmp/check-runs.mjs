import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const runs = await db.importRun.findMany({ orderBy: { startedAt: 'desc' }, take: 5, include: { source: { select: { name: true } } } });
for (const r of runs) console.log(r.startedAt.toISOString(), '|', r.source?.name, '|', r.status, '| found', r.found, 'imp', r.imported, 'skip', r.skipped, 'dup', r.duplicates, 'fail', r.failed, '|', (r.errors||'').slice(0,80));
console.log('news total:', await db.news.count());
await db.$disconnect();
