// Test the exact Prisma filter used by translate-core
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable' } } });
const { Prisma } = await import('@prisma/client');
const rows = await db.opportunity.findMany({
  where: {
    status: 'published',
    OR: [
      { titleI18n: { equals: Prisma.DbNull } },
      { titleI18n: { path: ['fa'], equals: Prisma.DbNull } },
      { NOT: { titleI18n: { path: ['fa'], string_contains: '' } } },
    ],
  },
  orderBy: { createdAt: 'desc' },
  take: 5,
  select: { id: true, title: true },
});
console.log('filter selects:', rows.length, 'rows');
for (const r of rows) console.log(' -', r.title.slice(0, 50));
await db.$disconnect();
