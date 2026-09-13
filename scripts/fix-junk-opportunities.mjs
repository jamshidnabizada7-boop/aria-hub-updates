/**
 * Repair garbage Opportunity rows produced by the broken Scholarships.af
 * detail scraper (pre-fix):
 *   - title = the source URL (sitemap fallback that survived enrichment)
 *   - description = "<p>All</p>" / "<p>International</p>" (ads/services wrapper
 *     won over the real article)
 *   - organization = a SIDEBAR card's company (page-wide selector theft)
 *
 * Strategy (mirrors the FIXED src/lib/import/scrapers/scholarships-af.ts):
 *   1. SELECT rows failing quality checks (URL title / junk or thin description).
 *   2. Re-fetch each row's sourceUrl through curl (browser fingerprint — the
 *      site is behind Imunify360/Cloudflare) and re-extract:
 *      title (og:title → <title> → slug prettify), longest .jobsearch-description,
 *      org scoped to the detail body + Host Institution key detail.
 *   3. UPDATE the row (re-slug when the title changed; reset aiSummary +
 *      aiSummaryI18n when they were junk so the automation tick re-translates).
 *   4. DELETE the row when the page is a soft-404 / dead link.
 *
 * Usage: node scripts/fix-junk-opportunities.mjs [--dry-run] [--limit=N]
 * DB:    postgresql://postgres@127.0.0.1:5433/ariahub (explicit — shell
 *        DATABASE_URL env would override .env with the sqlite scaffold URL)
 */
import { execFileSync } from 'node:child_process';
import * as cheerio from 'cheerio';

const DB_URL = 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const JUNK_RE = /^(all|international|afghan nationals|male|female|none|n\/?a|sponsored links?)$/i;

let pg;
async function main() {
  pg = (await import('pg')).default;
  const client = new pg.Client({ connectionString: DB_URL, connectionTimeoutMillis: 8000, statement_timeout: 30000 });
  await client.connect();

  // 1. Find junk rows (any source; today all of them are Scholarships.af)
  const { rows } = await client.query(`
    SELECT id, slug, title, "organization", description, "aiSummary",
           "sourceUrl", "sourceName"
    FROM "Opportunity"
    WHERE title LIKE 'http%'
       OR regexp_replace(description, '<[^>]+>', ' ', 'g') ~ '^\\s*(All|International|Afghan Nationals|Male|Female|None|N/A|Sponsored links?)\\s*$'
       OR length(regexp_replace(description, '<[^>]+>', ' ', 'g')) < 30
    ORDER BY "importedAt" DESC NULLS LAST
    ${LIMIT ? `LIMIT ${LIMIT}` : ''}
  `);
  console.log(`[fix] found ${rows.length} junk rows${DRY_RUN ? ' (DRY RUN)' : ''}`);

  let fixed = 0, deleted = 0, failed = 0, skipped = 0;
  for (const row of rows) {
    try {
      const html = fetchViaCurl(row.sourceUrl);
      if (!html) {
        // Transient block / rate limit / network error — LEAVE the row for a
        // later run. Deleting on an unconfirmed fetch would lose live posts.
        console.log(`[fix] ⏭ skip (fetch failed, kept for retry) ${row.slug}`);
        skipped++;
        continue;
      }

      const $ = cheerio.load(html);
      const rawTitle = $('title').text().trim();
      const is404 = /page not found|404|not found/i.test(rawTitle) || /(^|\s)HTTP \d{3}(\s|$)/.test(rawTitle);
      const hasDetailBody = $('.careerfy-jobdetail-content').length > 0;

      // longest description element
      let descHtml = '', descText = '', descLen = -1;
      $('.jobsearch-description').each(function () {
        const t = $(this).text().trim();
        if (t.length > descLen) { descLen = t.length; descHtml = $.html($(this)); descText = t; }
      });
      if (descLen < 150) {
        $('.text-content, .entry-content, .post-content').each(function () {
          const t = $(this).text().trim();
          if (t.length > descLen) { descLen = t.length; descHtml = $.html($(this)); descText = t; }
        });
      }

      if (is404 || (!hasDetailBody && descLen < 150)) {
        await removeRow(client, row, is404 ? `soft-404 (${rawTitle.slice(0, 60)})` : 'no real content on page');
        deleted++;
        continue;
      }

      // Title: og:title → <title> → slug prettify (strip site suffix everywhere)
      const stripSuffix = (t) => (t || '').replace(/\s*[-–—]\s*Scholarships\.af\s*$/i, '').trim();
      let newTitle = stripSuffix(($('meta[property="og:title"]').attr('content') || '').trim());
      if (!newTitle) newTitle = stripSuffix(rawTitle);
      if (!newTitle || /^https?:\/\//i.test(newTitle)) {
        newTitle = prettifySlug(row.sourceUrl) || newTitle;
      }
      if (!newTitle) newTitle = row.title; // give up, keep old

      // Org: scoped to detail body only; fall back to Host Institution key detail
      let newOrg = null;
      const scopedOrg = $('.careerfy-jobdetail-content .careerfy-company-name a').first().text().trim();
      if (scopedOrg) newOrg = scopedOrg.replace(/^@\s*/i, '').trim();
      if (!newOrg) {
        $('li').each(function () {
          if (newOrg) return;
          const strong = $(this).find('strong, b').first().text().trim();
          if (/host institution|organization|funded by/i.test(strong)) {
            const v = $(this).text().replace(strong, '').replace(/^[:\s]+/, '').trim();
            if (v && v.length < 120) newOrg = v;
          }
        });
      }

      if (DRY_RUN) {
        console.log(`[dry] ${row.slug}\n   title: ${JSON.stringify(row.title).slice(0, 70)} → ${JSON.stringify(newTitle).slice(0, 70)}\n   desc: ${descText.length} chars | org: ${JSON.stringify(newOrg)}`);
        fixed++;
        continue;
      }

      // Clean description html: drop scripts/ads wrappers
      const $$ = cheerio.load(`<div id="root">${descHtml}</div>`);
      $$('#root script, #root ins.adsbygoogle, #root .code-block').remove();
      const cleanDesc = $$('#root').html() || descHtml;

      // aiSummary: reset when junk/too short so the tick re-translates
      const oldSummary = (row.aiSummary || '').trim();
      const summaryJunk = !oldSummary || oldSummary.length < 30 || JUNK_RE.test(oldSummary);
      const newSummary = summaryJunk ? descText.replace(/\s+/g, ' ').slice(0, 220) : oldSummary;

      const titleChanged = newTitle !== row.title;
      const updates = {
        title: newTitle,
        description: cleanDesc,
        organization: newOrg, // null = "unknown" (better than a stolen sidebar org)
        aiSummary: newSummary,
        aiSummaryI18n: summaryJunk ? null : undefined,
        eligibilityI18n: undefined, // eligibility may also have been junk; tick refills
      };
      const setSql = [];
      const vals = [];
      if (titleChanged) {
        const newSlug = await uniqueSlug(client, slugify(newTitle), row.id);
        setSql.push('slug = $' + (vals.push(newSlug)));
      }
      setSql.push('title = $' + (vals.push(updates.title)));
      setSql.push('description = $' + (vals.push(updates.description)));
      setSql.push('"organization" = $' + (vals.push(updates.organization)));
      setSql.push('"aiSummary" = $' + (vals.push(updates.aiSummary)));
      setSql.push('"aiSummaryI18n" = NULL');
      setSql.push('"updatedAt" = NOW()');
      await client.query(`UPDATE "Opportunity" SET ${setSql.join(', ')} WHERE id = $${vals.push(row.id)}`, vals);
      console.log(`[fix] ✓ ${titleChanged ? `(reslug) ` : ''}${row.slug} → desc ${descText.length} chars, org ${JSON.stringify(newOrg)}`);
      fixed++;
    } catch (e) {
      console.error(`[fix] ✗ ${row.slug}: ${e.message}`);
      failed++;
    }
    await sleep(1200); // respect the source
  }

  console.log(`\n[fix] DONE — fixed: ${fixed}, deleted: ${deleted}, skipped(retry): ${skipped}, failed: ${failed} (of ${rows.length})`);
  await client.end();
  process.exit(0);
}

async function removeRow(client, row, reason) {
  if (DRY_RUN) { console.log(`[dry] DELETE ${row.slug} (${reason})`); return; }
  await client.query(`DELETE FROM "Opportunity" WHERE id = $1`, [row.id]);
  console.log(`[fix] 🗑 deleted ${row.slug} — ${reason}`);
}

function fetchViaCurl(url, redirects = 0) {
  if (redirects > 5) return null;
  try {
    const out = execFileSync('curl', [
      '-sL', '--compressed', '--max-time', '30',
      '-A', UA,
      '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      '-H', 'Accept-Language: en-US,en;q=0.9',
      '-w', '\n__HTTP_CODE__%{http_code}',
      url,
    ], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
    const m = out.match(/\n__HTTP_CODE__(\d+)$/);
    const code = m ? parseInt(m[1], 10) : 0;
    const body = out.replace(/\n__HTTP_CODE__\d+$/, '');
    if (code !== 200) return null;
    if (/just a moment|one moment, please|challenge/i.test(body.slice(0, 3000))) return null;
    return body;
  } catch {
    return null;
  }
}

function prettifySlug(url) {
  try {
    const path = new URL(url).pathname;
    const slug = path.split('/').filter(Boolean).pop() || '';
    const words = slug.replace(/\.html?$/i, '').split('-').filter(Boolean)
      .map((w) => (/\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)));
    const title = words.join(' ').trim();
    return title.length >= 8 ? title : null;
  } catch { return null; }
}

function slugify(s) {
  return (s || '').toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'opportunity';
}

async function uniqueSlug(client, base, excludeId) {
  let candidate = base, i = 2;
  while (true) {
    const { rows } = await client.query(`SELECT 1 FROM "Opportunity" WHERE slug = $1 AND id <> $2 LIMIT 1`, [candidate, excludeId]);
    if (rows.length === 0) return candidate;
    candidate = `${base}-${i++}`;
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

main().catch((e) => { console.error('[fix] FAILED:', e); process.exit(1); });
