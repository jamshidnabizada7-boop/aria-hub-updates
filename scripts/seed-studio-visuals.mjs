/** Seed StudioVisual rows from the downloaded public/studio-visuals files. */
import { PrismaClient } from '@prisma/client';
const CATS = { scientist: 'Scientists', statue: 'Statues & Monuments', column: 'Landmarks', flag: 'Flags', cap: 'Education', book: 'Education', lamp: 'Objects', laptop: 'Objects' };
const LABELS = {
  'scientist-einstein': 'Albert Einstein', 'scientist-tesla': 'Nikola Tesla', 'scientist-curie': 'Marie Curie',
  'statue-thinker': 'The Thinker', 'statue-david': 'Michelangelo David', 'statue-greek': 'Venus de Milo',
  'statue-liberty': 'Statue of Liberty', 'column-greek': 'The Parthenon',
  'flag-usa': 'USA Flag', 'flag-germany': 'Germany Flag', 'flag-turkey': 'Turkey Flag', 'flag-romania': 'Romania Flag',
  'cap-graduation': 'Graduation Cap', 'book-stack': 'Books', 'lamp-hanging': 'Hanging Lamp', 'laptop-work': 'Laptop',
};
const db = new PrismaClient({ datasources: { db: { url: process.env.TARGET_URL } } });
const base = process.env.SITE_ORIGIN || 'https://www.myariahub.com';
for (const f of (await import('node:fs')).readdirSync('public/studio-visuals')) {
  if (!/\.(jpg|jpeg|png|webp)$/i.test(f)) continue;
  const key = f.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  const category = CATS[key.split('-')[0]] ?? 'General';
  const label = LABELS[key] ?? key;
  const url = `${base}/studio-visuals/${f}`;
  const existing = await db.studioVisual.findFirst({ where: { url } });
  if (existing) await db.studioVisual.update({ where: { id: existing.id }, data: { label, category } });
  else await db.studioVisual.create({ data: { url, label, category, order: 0 } });
}
const n = await db.studioVisual.count();
console.log('StudioVisual rows:', n);
await db.$disconnect();
