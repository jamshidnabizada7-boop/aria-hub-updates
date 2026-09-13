/**
 * Scraper smoke test — instantiates each scraper from its ImportSource DB row
 * and runs a capped crawl (no data is written to the database).
 *
 * Usage:
 *   bun run scripts/scraper-smoke.ts                 # all enabled sources
 *   bun run scripts/scraper-smoke.ts --source=o4af   # one source (scraperKey or name)
 *   bun run scripts/scraper-smoke.ts --pages=1 --details=2
 *
 * Flags:
 *   --source=<key>   limit to one source (scraperKey, e.g. acbar/wazifaha/
 *                    scholarshipsAf/o4af, or a case-insensitive name match)
 *   --pages=<n>      cap maxPages per source (default 2)
 *   --details=<n>    how many listings to enrich via parseDetail (default 2)
 */

import { createDb } from './db-client';
import { getScraper } from '../src/lib/import/registry';
import type { RawListing } from '../src/lib/import/types';

const db = createDb();

// ── CLI flags ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name: string): string | undefined {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : undefined;
}
const onlySource = flag('source');
const pagesCap = parseInt(flag('pages') || '2', 10);
const detailsCap = parseInt(flag('details') || '2', 10);

function preview(listing: RawListing): string {
  const bits = [
    `    title:    ${JSON.stringify(listing.title?.slice(0, 90))}`,
    `    url:      ${listing.sourceUrl}`,
    `    org:      ${JSON.stringify(listing.organization ?? null)}`,
    `    location: ${JSON.stringify(listing.location ?? null)}`,
    `    deadline: ${JSON.stringify(listing.deadline ?? null)}`,
    `    applyUrl: ${JSON.stringify(listing.applyUrl ?? null)}`,
  ];
  if (listing.jobType) bits.push(`    jobType:  ${JSON.stringify(listing.jobType)}`);
  if (listing.category) bits.push(`    category: ${JSON.stringify(listing.category)}`);
  if (listing.publishedDate) bits.push(`    published:${JSON.stringify(listing.publishedDate)}`);
  if (listing.description) {
    bits.push(`    desc len: ${listing.description.length}`);
  }
  if (listing.requirements) bits.push(`    req len:  ${listing.requirements.length}`);
  if (listing.guidelines) bits.push(`    guide len:${listing.guidelines.length}`);
  if (listing.eligibility) bits.push(`    elig len: ${listing.eligibility.length}`);
  if (listing.benefits) bits.push(`    bene len: ${listing.benefits.length}`);
  if (listing.extractedData && Object.keys(listing.extractedData).length) {
    const keys = Object.keys(listing.extractedData).slice(0, 8).join(', ');
    bits.push(`    extracted:[${keys}]`);
  }
  return bits.join('\n');
}

async function smokeOne(row: {
  id: string;
  name: string;
  scraperKey: string;
  baseUrl: string;
  config: string | null;
  defaultCategory: string | null;
  type: string;
}): Promise<boolean> {
  console.log(`\n${'='.repeat(72)}`);
  console.log(`SOURCE: ${row.name} (key=${row.scraperKey})`);
  console.log(`baseUrl: ${row.baseUrl}  config: ${row.config}`);
  console.log('='.repeat(72));

  let config: Record<string, unknown> = {};
  try {
    config = row.config ? JSON.parse(row.config) : {};
  } catch {
    // ignore
  }
  // Cap pages for the smoke run (do not mutate the DB, just the handle).
  config.maxPages = Math.min(typeof config.maxPages === 'number' ? config.maxPages : 10, pagesCap);

  const scraper = getScraper({
    id: row.id,
    name: row.name,
    type: row.type,
    scraperKey: row.scraperKey,
    baseUrl: row.baseUrl,
    defaultCategory: row.defaultCategory,
    config,
  });
  if (!scraper) {
    console.log(`✗ no scraper registered for key "${row.scraperKey}"`);
    return false;
  }

  // 1. Crawl list pages
  let listings: RawListing[] = [];
  try {
    const started = Date.now();
    listings = await scraper.scrapeAll();
    console.log(`✓ scrapeAll: ${listings.length} listings in ${((Date.now() - started) / 1000).toFixed(1)}s (maxPages=${config.maxPages})`);
  } catch (e) {
    console.log(`✗ scrapeAll FAILED: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
  if (listings.length === 0) {
    console.log('✗ 0 listings parsed');
    return false;
  }

  for (const l of listings.slice(0, 2)) {
    console.log('  LIST:');
    console.log(preview(l));
  }

  // 2. Detail enrichment
  const detailTargets = listings.slice(0, detailsCap);
  let detailOk = 0;
  for (const listing of detailTargets) {
    try {
      const enriched = await scraper.parseDetail(listing);
      detailOk++;
      console.log('  DETAIL:');
      console.log(preview(enriched));
    } catch (e) {
      console.log(`  ✗ detail failed for ${listing.sourceUrl}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (detailTargets.length > 0) {
    console.log(`  detail enrich: ${detailOk}/${detailTargets.length} ok`);
  }

  return true;
}

async function main(): Promise<void> {
  const rows = await db.importSource.findMany({ orderBy: { createdAt: 'asc' } });
  const selected = onlySource
    ? rows.filter(
        (r) =>
          r.scraperKey.toLowerCase() === onlySource.toLowerCase() ||
          r.name.toLowerCase().includes(onlySource.toLowerCase()),
      )
    : rows.filter((r) => r.enabled);

  if (selected.length === 0) {
    console.log(`No ImportSource rows matched (--source=${onlySource ?? 'all enabled'}).`);
    return;
  }

  console.log(`Scraper smoke test — ${selected.length} source(s), pages cap=${pagesCap}, details cap=${detailsCap}`);

  const results: Array<{ name: string; ok: boolean }> = [];
  for (const row of selected) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await smokeOne(row);
    results.push({ name: row.name, ok });
  }

  console.log(`\n${'='.repeat(72)}\nSUMMARY`);
  for (const r of results) {
    console.log(`  ${r.ok ? '✓ WORKS' : '✗ FAIL '}  ${r.name}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('[error]', e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
