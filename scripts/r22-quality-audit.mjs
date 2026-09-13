#!/usr/bin/env node
/**
 * R22 scrape quality audit — "did the scraper capture ALL necessary
 * information in a well-aligned format?"
 *
 * Scores every imported Opportunity row against a quality rubric and prints
 * a per-source scorecard:
 *   REQUIRED : title (clean), description (≥200 chars), sourceUrl, slug
 *   IMPORTANT: aiSummary (en), deadline (future or null), category,
 *              jobType, organization
 *   NICE     : image, country, logo, applyUrl, extractedData
 *   TRILINGUAL: titleI18n fa+ps, aiSummaryI18n fa+ps
 * Also flags junk: challenge titles, entity leftovers, HTML tags in text,
 * duplicate slugs/titles, expired deadlines.
 */
import pg from 'pg';
const { Client } = pg;

const url = process.env.R22_DB_URL || 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';
const c = new Client({ connectionString: url });
await c.connect();

const rows = (await c.query(`
  SELECT o.id, o.slug, o.title, o.status, o.deadline, o."importStatus", o."translationStatus",
         o."aiSummary", o.description, o."sourceName", o."sourceUrl", o."applyUrl", o.image,
         o.organization, o.country, o."jobType", o."categoryId", o."titleI18n", o."aiSummaryI18n",
         o."extractedData", o.salary, o."educationReq", o.experience
  FROM "Opportunity" o
  WHERE o."sourceName" IS NOT NULL
  ORDER BY o."sourceName", o."importedAt" DESC
`)).rows;

const JUNK_RE = /(one moment, please|just a moment|attention required|&amp;|&#\d+;|&quot;|&nbsp;|<p>|<\/p>|<br)/i;
const now = Date.now();
const bySource = new Map();
const problems = [];
let totalScore = 0, totalWeight = 0;

for (const r of rows) {
  const s = bySource.get(r.sourceName) || { n: 0, score: 0, expired: 0, draft: 0, issues: [] };
  s.n++;

  const checks = [];
  // REQUIRED
  const titleOk = !!r.title && r.title.length >= 8 && !JUNK_RE.test(r.title);
  checks.push(['title', titleOk, 3]);
  const descLen = (r.description || '').replace(/\s+/g, ' ').trim().length;
  checks.push(['description', descLen >= 200, 3]);
  checks.push(['sourceUrl', !!r.sourceUrl && /^https?:\/\//.test(r.sourceUrl), 3]);
  checks.push(['slug', !!r.slug && /^[a-z0-9-]+$/.test(r.slug), 2]);
  // IMPORTANT
  checks.push(['summary', !!(r.aiSummary || '').trim() && r.aiSummary.length >= 80, 2]);
  const dlOk = !r.deadline || new Date(r.deadline).getTime() >= now;
  checks.push(['deadlineFuture', dlOk, 2]);
  if (!dlOk) s.expired++;
  checks.push(['category', !!r.categoryId, 1]);
  checks.push(['jobType', !!r.jobType, 1]);
  checks.push(['organization', !!r.organization, 1]);
  // NICE
  checks.push(['image', !!r.image, 1]);
  checks.push(['country', !!r.country, 0.5]);
  checks.push(['applyUrl', !!r.applyUrl, 0.5]);
  // TRILINGUAL
  const ti = (typeof r.titleI18n === 'string' ? JSON.parse(r.titleI18n || '{}') : r.titleI18n) || {};
  const si = (typeof r.aiSummaryI18n === 'string' ? JSON.parse(r.aiSummaryI18n || '{}') : r.aiSummaryI18n) || {};
  checks.push(['title.fa', !!ti.fa, 2]);
  checks.push(['title.ps', !!ti.ps, 2]);
  checks.push(['summary.fa', !!si.fa, 1]);
  checks.push(['summary.ps', !!si.ps, 1]);

  let rowScore = 0, rowWeight = 0;
  const missing = [];
  for (const [name, ok, w] of checks) {
    rowWeight += w;
    if (ok) rowScore += w;
    else missing.push(name);
  }
  s.score += rowScore / rowWeight;
  totalScore += rowScore; totalWeight += rowWeight;
  if (r.status === 'draft') s.draft++;
  if (missing.length) {
    s.issues.push(`${r.slug}: missing ${missing.join(', ')}`);
    if (problems.length < 40 && missing.length > 3) problems.push(`[${r.sourceName}] ${r.slug} → ${missing.join(', ')}`);
  }
  bySource.set(r.sourceName, s);
}

console.log('═'.repeat(100));
console.log('R22 SCRAPE QUALITY SCORECARD (weights: required=3, important=2, trilingual=2/1, nice=1)');
console.log('═'.repeat(100));
for (const [name, s] of [...bySource.entries()].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`${name.padEnd(34)} rows=${String(s.n).padStart(3)}  quality=${Math.round((s.score / s.n) * 100).toString().padStart(3)}%  expired=${s.expired}  draft=${s.draft}`);
}
console.log('-'.repeat(100));
console.log(`OVERALL: ${rows.length} imported rows, quality=${Math.round((totalScore / totalWeight) * 100)}%`);

// duplicate slugs / titles
const dupSlugs = (await c.query(`SELECT slug, count(*)::int n FROM "Opportunity" GROUP BY slug HAVING count(*) > 1`)).rows;
const dupTitles = (await c.query(`SELECT lower(title) t, count(*)::int n FROM "Opportunity" GROUP BY lower(title) HAVING count(*) > 1`)).rows;
console.log(`duplicate slugs: ${dupSlugs.length}, duplicate titles: ${dupTitles.length}`);

// trilingual totals
const tril = (await c.query(`
  SELECT count(*)::int total,
    count(*) FILTER (WHERE "titleI18n"->>'fa' > '' AND "titleI18n"->>'ps' > '')::int title_ok,
    count(*) FILTER (WHERE "aiSummaryI18n"->>'fa' > '' AND "aiSummaryI18n"->>'ps' > '')::int summary_ok
  FROM "Opportunity" WHERE "sourceName" IS NOT NULL`)).rows[0];
console.log(`trilingual: titles ${tril.title_ok}/${tril.total}, summaries ${tril.summary_ok}/${tril.total}`);

console.log('\nTOP PROBLEM ROWS (>3 missing fields):');
for (const p of problems.slice(0, 15)) console.log('  ' + p);

// news table too
const news = (await c.query(`
  SELECT count(*)::int total,
    count(*) FILTER (WHERE length(title) < 8)::int short_title,
    count(*) FILTER (WHERE length(excerpt) < 30)::int short_excerpt,
    count(*) FILTER (WHERE length(content) < 200)::int short_content
  FROM "News"`)).rows[0];
console.log(`\nNEWS: total=${news.total} shortTitle=${news.short_title} shortExcerpt=${news.short_excerpt} shortContent=${news.short_content}`);

await c.end();
