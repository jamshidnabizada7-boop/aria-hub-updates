/**
 * CLI test harness for the NEW R21-a import sources.
 *
 *   bun run scripts/test-new-scrapers.ts
 *   (or: npx tsx scripts/test-new-scrapers.ts)
 *
 * Part A — direct scraper smoke tests (NO DB writes), maxPages=1:
 *   • wpApi × OpportunityDesk / Mladiinfo / ScholarshipRoar
 *   • jobsaf (homepage RSC flight payload)
 *   • reliefweb (expected: graceful "pending appname" — 403 without approval)
 * Part B — END-TO-END imports through the real pipelines:
 *   • OpportunityDesk → runImport() → Opportunity rows as DRAFTS
 *   • Ariana News     → runNewsImport() → News rows (autoPublish=true)
 * Part C — DB + public-site verification:
 *   • row counts by status/source, sample rows
 *   • confirms drafts are NOT on the public homepage (status='draft' is
 *     excluded by the public queries) and that nothing else changed.
 *
 * Leaves all imported rows in the DB on purpose (proof of pipeline; admin
 * can clean up from the admin panel).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));

// ── env bootstrap (same pattern as run-import.ts) ───────────────────────────
function resolveDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL || '';
  if (envUrl.startsWith('postgres')) return envUrl;
  try {
    const raw = readFileSync(join(here, '..', '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (v.startsWith('postgres')) return v;
    }
  } catch { /* fallthrough */ }
  throw new Error('No PostgreSQL DATABASE_URL found');
}
process.env.DATABASE_URL = resolveDatabaseUrl();
process.env.IMPORT_GLOBAL_TIMEOUT_MS = process.env.IMPORT_GLOBAL_TIMEOUT_MS || '600000';
// This harness must be fast and deterministic: run the pipeline in no-AI
// mode (the z-ai endpoint rate-limits under parallel test load). Imported
// rows keep their original English content; the admin "Fix Translations"
// loop handles i18n later, exactly like any other draft import.
process.env.AI_PROVIDER = 'none';

import type { SourceHandle } from '../src/lib/import/types';

function handle(partial: Partial<SourceHandle>): SourceHandle {
  return {
    id: 'test-source',
    name: partial.name || 'Test Source',
    type: partial.type || 'scholarship',
    scraperKey: partial.scraperKey || 'wpApi',
    baseUrl: partial.baseUrl || '',
    config: partial.config || {},
    defaultCategory: partial.defaultCategory ?? null,
  };
}

function printSamples(label: string, listings: Array<{ title: string; sourceUrl: string }>, n = 2): void {
  console.log(`\n── ${label}: ${listings.length} listings found`);
  for (const l of listings.slice(0, n)) {
    console.log(`   • ${l.title.slice(0, 90)}`);
    console.log(`     ${l.sourceUrl}`);
  }
}

/** Run one smoke test; a source failing (e.g. Cloudflare challenge) must not
 *  kill the whole harness — report and continue. */
async function smoke(label: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (e) {
    console.log(`\n── ${label}: FAILED — ${(e instanceof Error ? e.message : String(e)).slice(0, 160)}`);
    return false;
  }
}

async function partA(): Promise<void> {
  console.log('\n════════ PART A — direct scraper smoke tests (no DB writes) ════════');

  // 1. wpApi × OpportunityDesk
  const { WpApiScraper } = await import('../src/lib/import/scrapers/wp-api');
  const od = new WpApiScraper(handle({
    name: 'Opportunity Desk',
    type: 'scholarship',
    baseUrl: 'https://opportunitydesk.org',
    config: {
      apiBase: 'https://opportunitydesk.org/wp-json/wp/v2/posts',
      perPage: 10, maxPages: 1, defaultDeadlineDays: 45, autoDetectType: true,
      categoryInclude: ['Scholarships', 'Fellowships', 'Grants', 'Competitions', 'Awards', 'Trainings', 'Conferences'],
    },
  }));
  await smoke('wpApi × OpportunityDesk (category-filtered)', async () => {
    const odListings = await od.scrapeAll();
    printSamples('wpApi × OpportunityDesk (category-filtered)', odListings);
  });

  // 2. wpApi × Mladiinfo
  const mladi = new WpApiScraper(handle({
    name: 'Mladiinfo',
    type: 'scholarship',
    baseUrl: 'https://mladiinfo.eu',
    config: { apiBase: 'https://mladiinfo.eu/wp-json/wp/v2/posts', perPage: 10, maxPages: 1, defaultDeadlineDays: 60, autoDetectType: true },
  }));
  await smoke('wpApi × Mladiinfo', async () => {
    printSamples('wpApi × Mladiinfo', await mladi.scrapeAll());
  });

  // 3. wpApi × ScholarshipRoar
  const roar = new WpApiScraper(handle({
    name: 'Scholarship Roar',
    type: 'scholarship',
    baseUrl: 'https://scholarshiproar.com',
    config: { apiBase: 'https://scholarshiproar.com/wp-json/wp/v2/posts', perPage: 10, maxPages: 1, defaultDeadlineDays: 60, autoDetectType: true },
  }));
  await smoke('wpApi × ScholarshipRoar', async () => {
    printSamples('wpApi × ScholarshipRoar', await roar.scrapeAll());
  });

  // 4. jobsaf
  const { JobsAfScraper } = await import('../src/lib/import/scrapers/jobs-af');
  const jobsaf = new JobsAfScraper(handle({
    name: 'Jobs.af', type: 'job', baseUrl: 'https://www.jobs.af',
    config: { maxPages: 1, detailFetch: false }, // detailFetch off for the smoke test (client-rendered pages)
  }));
  await smoke('jobsaf (homepage flight payload)', async () => {
    printSamples('jobsaf (homepage flight payload)', await jobsaf.scrapeAll());
  });

  // 5. reliefweb — expect the graceful pending error (no approved appname yet)
  const { ReliefWebScraper, ReliefWebPendingError } = await import('../src/lib/import/scrapers/reliefweb');
  const rw = new ReliefWebScraper(handle({
    name: 'ReliefWeb Jobs', type: 'job', baseUrl: 'https://reliefweb.int',
    config: { reliefwebAppname: '', limit: 50, country: 'Afghanistan' },
  }));
  try {
    const rwListings = await rw.scrapeAll();
    printSamples('reliefweb', rwListings);
  } catch (e) {
    if (e instanceof ReliefWebPendingError) {
      console.log('\n── reliefweb: GRACEFUL PENDING (as designed) ✓');
      console.log(`   message: ${e.message.slice(0, 140)}`);
    } else {
      throw e;
    }
  }

  // 6. reliefweb WITH an appname — verify the real API call path + 403 parse
  const rw2 = new ReliefWebScraper(handle({
    name: 'ReliefWeb Jobs', type: 'job', baseUrl: 'https://reliefweb.int',
    config: { reliefwebAppname: 'ariahub-unapproved-probe', limit: 5, country: 'Afghanistan' },
  }));
  try {
    const rwListings = await rw2.scrapeAll();
    printSamples('reliefweb (unapproved appname probe)', rwListings);
  } catch (e) {
    if (e instanceof ReliefWebPendingError) {
      console.log('── reliefweb w/ appname: API 403 parsed → pending ✓');
    } else {
      throw e;
    }
  }
}

async function partB(): Promise<void> {
  console.log('\n════════ PART B — end-to-end imports into the DB ════════');
  const { db } = await import('../src/lib/db');
  const { runImport } = await import('../src/lib/import/orchestrator');
  const { runNewsImport } = await import('../src/lib/import/news-import');

  // ── OpportunityDesk → Opportunity drafts ──
  const od = await db.importSource.findUniqueOrThrow({ where: { name: 'Opportunity Desk' } });
  const oppBefore = await db.opportunity.count({ where: { sourceName: 'Opportunity Desk' } });
  console.log(`\n── Opportunity Desk: opportunities before = ${oppBefore}`);
  const oppSummary = await runImport({ sourceId: od.id, triggeredBy: 'r21a-test', force: true });
  const oppAfter = await db.opportunity.count({ where: { sourceName: 'Opportunity Desk' } });
  console.log(`   runImport → ${JSON.stringify(oppSummary)}`);
  console.log(`   opportunities after = ${oppAfter} (new: ${oppAfter - oppBefore})`);

  // ── Ariana News → News rows ──
  const ariana = await db.importSource.findUniqueOrThrow({ where: { name: 'Ariana News' } });
  const newsBefore = await db.news.count({ where: { author: 'Ariana News' } });
  console.log(`\n── Ariana News: news rows before = ${newsBefore}`);
  const newsSummary = await runNewsImport({ sourceId: ariana.id, triggeredBy: 'r21a-test' });
  const newsAfter = await db.news.count({ where: { author: 'Ariana News' } });
  console.log(`   runNewsImport → ${JSON.stringify(newsSummary)}`);
  console.log(`   news rows after = ${newsAfter} (new: ${newsAfter - newsBefore})`);

  // Re-run Ariana to prove dedupe (everything should be duplicates now).
  const rerun = await runNewsImport({ sourceId: ariana.id, triggeredBy: 'r21a-test-dedupe' });
  console.log(`   re-run (dedupe proof) → imported=${rerun.imported}, duplicates=${rerun.duplicates}`);
}

async function partC(): Promise<void> {
  console.log('\n════════ PART C — DB + public-site verification ════════');
  const { db } = await import('../src/lib/db');

  const byStatus = await db.opportunity.groupBy({
    by: ['status'],
    where: { sourceName: 'Opportunity Desk' },
    _count: { _all: true },
  });
  console.log('\nOpportunity Desk rows by status:', byStatus.map((g) => `${g.status}=${g._count._all}`).join(', ') || 'none');

  const sample = await db.opportunity.findMany({
    where: { sourceName: 'Opportunity Desk' },
    orderBy: { createdAt: 'desc' },
    take: 2,
    select: { title: true, slug: true, status: true, jobType: true, deadline: true, sourceUrl: true, importStatus: true },
  });
  console.log('\nSample imported opportunities:');
  for (const s of sample) {
    console.log(`   • [${s.status}] (${s.jobType}) ${s.title.slice(0, 80)}`);
    console.log(`     deadline=${s.deadline?.toISOString().slice(0, 10) ?? '—'} importStatus=${s.importStatus}`);
    console.log(`     ${s.sourceUrl}`);
  }

  const newsSample = await db.news.findMany({
    where: { author: 'Ariana News' },
    orderBy: { publishedAt: 'desc' },
    take: 2,
    select: { title: true, slug: true, status: true, publishedAt: true, image: true, category: { select: { name: true } } },
  });
  console.log('\nSample imported news:');
  for (const n of newsSample) {
    console.log(`   • [${n.status}] (${n.category?.name || 'no category'}) ${n.title.slice(0, 80)}`);
    console.log(`     slug=${n.slug} publishedAt=${n.publishedAt.toISOString()} image=${(n.image || '—').slice(0, 70)}`);
  }

  const cat = await db.newsCategory.findFirst({ where: { slug: 'afghanistan-news' } });
  const catCount = cat ? await db.news.count({ where: { categoryId: cat.id } }) : 0;
  console.log(`\nNewsCategory "${cat?.name}" (slug=${cat?.slug}): ${catCount} posts`);

  // Public-site check: drafts must NOT appear on the public site. The public
  // opportunity queries filter status='published'; verify none of the imported
  // rows are published, and probe the SSR homepage HTML for an imported title.
  const publishedImported = await db.opportunity.count({
    where: { sourceName: 'Opportunity Desk', status: 'published' },
  });
  console.log(`\nDrafts isolation: published rows from Opportunity Desk = ${publishedImported} (must be 0)`);
  if (sample[0] && publishedImported === 0) {
    const probe = sample[0].title.split(' ').slice(0, 4).join(' ');
    try {
      const res = await fetch('http://127.0.0.1:3000/en', { signal: AbortSignal.timeout(30000) });
      const html = await res.text();
      const leaked = html.toLowerCase().includes(probe.toLowerCase());
      console.log(`Public homepage /en probe for "${probe}": ${leaked ? 'LEAKED ✗' : 'not present ✓'}`);
    } catch (e) {
      console.log(`(homepage probe skipped — dev server not reachable: ${e instanceof Error ? e.message : e})`);
    }
  }
}

async function main(): Promise<void> {
  await partA();
  await partB();
  await partC();
  console.log('\n✅ All R21-a scraper tests finished.');
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(async () => {
    const { db } = await import('../src/lib/db');
    await db.$disconnect();
  });
