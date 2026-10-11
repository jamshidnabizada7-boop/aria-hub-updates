import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
const url = new URL(process.env.DATABASE_URL || '');
if (process.env.REQUIRE_TEST_DATABASE !== '1' || !['127.0.0.1', 'localhost'].includes(url.hostname) || !url.pathname.endsWith('_test')) throw Error('Isolated localhost test database required');
const db = new PrismaClient();
const snapshot = JSON.parse(await readFile('design/ari/public-listing-snapshots.json', 'utf8'));
for (const row of snapshot.samples) {
  const category = await db.opportunityCategory.upsert({ where: { slug: row.category }, update: {}, create: { slug: row.category, name: row.localized.en.category, nameI18n: Object.fromEntries(Object.entries(row.localized).map(([lang, data]: any) => [lang, data.category])) } });
  await db.opportunity.upsert({ where: { slug: row.slug }, update: {}, create: {
    slug: row.slug, title: row.localized.en.title, titleI18n: Object.fromEntries(Object.entries(row.localized).map(([lang, data]: any) => [lang, data.title])),
    organization: row.organization, country: row.country, deadline: row.deadline ? new Date(row.deadline) : null,
    applyUrl: row.applyUrl || row.source, sourceUrl: row.source, status: 'published', categoryId: category.id,
    description: row.localized.en.summary, descriptionI18n: Object.fromEntries(Object.entries(row.localized).map(([lang, data]: any) => [lang, data.summary])),
  } });
}
await db.section.upsert({ where: { key: 'hero' }, update: { enabled: true }, create: { key: 'hero', title: 'Hero', enabled: true } });
await db.siteSetting.upsert({ where: { id: 'ari-candidate-settings' }, update: {}, create: { id: 'ari-candidate-settings', siteName: 'ARIA HUB', logoUrl: '/images/logo-mark.png', socialPosition: 'right' } });
await db.socialLink.createMany({ data: [{ platform: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/93700876806', order: 0, color: '#16a34a' }, { platform: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61573687093269', order: 1 }], skipDuplicates: true });
await db.$disconnect();
console.log('Seeded public listing copies into isolated QA database; no publishing queues.');
