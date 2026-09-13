/**
 * R23 — dry-run/report of the news relevance engine over the News table.
 * Usage:
 *   DATABASE_URL=... bun run scripts/r23-news-relevance.ts            # report only
 *   DATABASE_URL=... bun run scripts/r23-news-relevance.ts --delete   # delete off-topic scraped rows
 *   DATABASE_URL=... bun run scripts/r23-news-relevance.ts --source "Neon" --delete
 *
 * Only rows whose `author` belongs to a scraped news outlet are ever deleted
 * (editorial content is untouched).
 */
import { PrismaClient } from '@prisma/client';
import { classifyNewsRelevance, relevanceReason } from '../src/lib/import/news-relevance';

const SCRAPED_AUTHORS = ['ToloNews', 'Ariana News', 'Amu TV News', 'Etilaat Roz News'];

async function main() {
  const args = process.argv.slice(2);
  const doDelete = args.includes('--delete');
  const db = new PrismaClient();

  const news = await db.news.findMany({
    select: { id: true, slug: true, title: true, excerpt: true, author: true, status: true },
    orderBy: { publishedAt: 'desc' },
  });

  const keep: typeof news = [];
  const drop: Array<{ row: (typeof news)[number]; reason: string }> = [];

  for (const row of news) {
    let summary = row.excerpt || '';
    try {
      const tags = row.excerpt ? [] : [];
      void tags;
    } catch { /* noop */ }
    const v = classifyNewsRelevance({ title: row.title, summary });
    if (v.relevant) keep.push(row);
    else drop.push({ row, reason: relevanceReason(v) });
  }

  console.log(`TOTAL=${news.length} KEEP=${keep.length} DROP=${drop.length}\n`);
  console.log('--- WOULD DROP (scraped ✗ / editorial ⛔ protected) ---');
  for (const { row, reason } of drop) {
    const scraped = SCRAPED_AUTHORS.includes(row.author || '');
    console.log(`${scraped ? '✗' : '⛔'} [${row.author}] ${reason} :: ${row.title.slice(0, 90)}`);
  }
  console.log('\n--- KEEP ---');
  for (const row of keep) console.log(`✓ [${row.author}] ${row.title.slice(0, 90)}`);

  if (doDelete) {
    const ids = drop.filter((d) => SCRAPED_AUTHORS.includes(d.row.author || '')).map((d) => d.row.id);
    const res = await db.news.deleteMany({ where: { id: { in: ids } } });
    console.log(`\nDELETED ${res.count} off-topic scraped news rows.`);
  }

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
