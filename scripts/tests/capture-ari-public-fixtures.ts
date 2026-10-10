/** Read-only public content snapshot; never reads credentials or private applicant records. */
import { writeFile } from 'node:fs/promises';
const base = 'https://www.myariahub.com';
const samples = [];
for (const category of ['job', 'scholarship']) {
  const response = await fetch(`${base}/api/opportunities/list?lang=en&category=${category}`);
  if (!response.ok) throw Error(`Public feed ${response.status}`);
  const items = (await response.json()).items || [];
  const first = items.find((row: any) => (!row.deadline || new Date(row.deadline).getTime() > Date.now() + 86400000) && /^[A-Za-z]/.test(row.title)) || items.find((row: any) => !row.deadline || new Date(row.deadline).getTime() > Date.now() + 86400000);
  if (!first || first.status !== 'published') throw Error('A published real listing is required');
  const localized: Record<string, { title: string; summary: string; category: string }> = {};
  for (const lang of ['en', 'fa', 'ps']) {
    const response = await fetch(`${base}/api/opportunities/by-slugs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slugs: [first.slug], lang }) });
    if (!response.ok) throw Error('Public localization fetch failed');
    const row = (await response.json()).items?.[0];
    if (!row) throw Error('Public listing not available');
    localized[lang] = { title: row.title, summary: row.summary || '', category: row.categoryLabel || '' };
  }
  samples.push({ source: `${base}/en/opportunities/${first.slug}`, slug: first.slug, category, organization: first.organization || '', country: first.country || '', deadline: first.deadline || null, applyUrl: first.applyUrl || '', localized });
}
await writeFile('design/ari/public-listing-snapshots.json', JSON.stringify({ capturedAt: new Date().toISOString(), note: 'Public database-backed listing snapshot for non-published design review. Availability and untranslated source titles reflect the feed at capture time.', samples }, null, 2) + '\n');
console.log('Saved public listing samples only; no queue rows or delivery calls.');
