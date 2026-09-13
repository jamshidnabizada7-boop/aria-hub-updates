/**
 * R27 — Comprehensive junk repair for scraped content.
 *
 * Complements scripts/fix-junk-opportunities.mjs (R26.4, which repaired only
 * BASE title/description/organization). This script heals every remaining
 * contaminated DISPLAY field and the few thin/junk rows that survived:
 *
 *   Pass 1  URL-contaminated display fields (25+ rows, all Scholarships.af):
 *           pre-R26.4 rows kept `titleI18n.{en,fa,ps}`, `descriptionI18n`,
 *           `aiSummary`, `seoTitle`, `ogTitle`, `seoDescription`,
 *           `ogDescription` (+ i18n twins) holding the bare sitemap URL.
 *           getLocalizedContent() prefers i18n.en → the URL beat the clean
 *           base title on cards, detail pages and meta tags.
 *           FIX: rebuild every container from the CLEAN base fields; drop
 *           URL-only values in any language; keep genuine fa/ps text;
 *           translationStatus → 'pending' (automation tick re-translates).
 *
 *   Pass 2  Thin/junk descriptions (desc == title, stripped < 200 chars,
 *           non-Jobs.af, non-manual): re-fetch sourceUrl via curl and
 *           re-extract the LONGEST .jobsearch-description / article block
 *           (mirrors the fixed scraper). Delete ONLY on confirmed soft-404.
 *
 *   Pass 3  News: remove rows whose content is a bare "Source: … URL" stub
 *           with no excerpt (nothing to display).
 *
 * Idempotent — safe to re-run. Usage:
 *   bun scripts/r27-repair-junk.mjs [--dry-run] [--limit=N]
 *
 * NOTE: always pass an explicit DATABASE_URL — the shell exports a stale
 * sqlite scaffold URL that would override .env otherwise.
 */
import { execFileSync } from 'node:child_process';
import * as cheerio from 'cheerio';

const DB_URL = process.env.REPAIR_DB_URL || 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** A value that is essentially a bare URL (tags stripped) = scraped junk. */
function isBareUrl(v) {
  if (typeof v !== 'string') return false;
  const s = v.replace(/<[^>]+>/g, ' ').trim();
  return s.length > 0 && /^https?:\/\/\S+$/i.test(s);
}

/** Human title from a URL slug: "…/daad-scholarship-mide-htw-berlin/" → "Daad Scholarship Mide Htw Berlin". */
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

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ').trim();
}

function buildSummary(description, max = 220) {
  const s = stripHtml(description);
  if (!s || /^https?:\/\/\S+$/i.test(s)) return '';
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

function fetchViaCurl(url, timeoutMs = 25000) {
  const fetchOnce = () => {
    try {
      return execFileSync('curl', [
        '-sL', '--compressed', '--max-time', String(Math.ceil(timeoutMs / 1000)),
        '-H', `User-Agent: ${UA}`,
        '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        '-H', 'Accept-Language: en-US,en;q=0.9',
        url,
      ], { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024, timeout: timeoutMs + 5000 });
    } catch { return null; }
  };
  // The site intermittently serves an Imunify360 interstitial / styled 404
  // between real responses — retry up to 3× with a pause.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const html = fetchOnce();
    if (html && !/One moment, please|Just a moment|Attention Required/i.test(html.slice(0, 4000))) {
      return html;
    }
    if (attempt < 3) execFileSync('sleep', ['4']);
  }
  return null;
}

/** Longest real content block on a scholarships.af detail page (chars). */
function extractDetail($, ) {
  let best = null, bestLen = -1;
  const scan = (sel) => $(sel).each(function () {
    const el = $(this).clone();
    el.find('script, ins.adsbygoogle, .code-block, .code-block-label').remove();
    const len = el.text().trim().length;
    if (len > bestLen) { bestLen = len; best = el; }
  });
  scan('.jobsearch-description');
  scan('.text-content, .entry-content, .post-content');
  return best && bestLen >= 150 ? best.html().trim() : null;
}

async function main() {
  const pg = (await import('pg')).default;
  const client = new pg.Client({ connectionString: DB_URL, connectionTimeoutMillis: 8000, statement_timeout: 60000 });
  await client.connect();
  console.log(`[r27] connected${DRY_RUN ? ' — DRY RUN' : ''}`);

  // ── Pass 1: URL-contaminated display fields ─────────────────────────────
  const { rows: candidates } = await client.query(`
    SELECT id, slug, title, description, "titleI18n", "descriptionI18n",
           "aiSummary", "aiSummaryI18n", "seoTitle", "seoDescription",
           "ogTitle", "ogDescription", "seoTitleI18n", "seoDescriptionI18n",
           "ogTitleI18n", "ogDescriptionI18n", "sourceName", "sourceUrl"
    FROM "Opportunity"
    WHERE "seoTitle" ~ '^https?://' OR "ogTitle" ~ '^https?://'
       OR "aiSummary" ~ '^https?://' OR "seoDescription" ~ '^https?://'
       OR "ogDescription" ~ '^https?://'
       OR "titleI18n"::text ~ 'https?:'
       OR "descriptionI18n"::text ~ 'https?:'
       OR "aiSummaryI18n"::text ~ 'https?:'
    ${LIMIT ? `LIMIT ${LIMIT}` : ''}
  `);

  let scrubbed = 0;
  for (const row of candidates) {
    // Precise per-value check — URLs INSIDE real text are legitimate.
    const tI = row.titleI18n || {}, dI = row.descriptionI18n || {}, aI = row.aiSummaryI18n || {};
    const contaminated =
      isBareUrl(row.seoTitle) || isBareUrl(row.ogTitle) || isBareUrl(row.aiSummary) ||
      isBareUrl(row.seoDescription) || isBareUrl(row.ogDescription) ||
      isBareUrl(tI.en) || isBareUrl(tI.fa) || isBareUrl(tI.ps) ||
      isBareUrl(dI.en) || isBareUrl(dI.fa) || isBareUrl(dI.ps) ||
      isBareUrl(aI.en) || isBareUrl(aI.fa) || isBareUrl(aI.ps);
    if (!contaminated) continue;

    // Base fields are the source of truth (R26.4 repaired them).
    let title = (row.title || '').trim();
    if (!title || /^https?:\/\//i.test(title)) {
      title = prettifySlug(row.sourceUrl || '') || title;
    }
    if (!title) { console.log(`[r27] skip (no clean title) ${row.slug}`); continue; }
    const description = row.description || '';
    const summary = buildSummary(description) || title;

    /** Keep genuine translations; drop bare-URL values. */
    const keep = (obj) => {
      const out = {};
      for (const lang of ['fa', 'ps']) {
        const v = obj?.[lang];
        if (typeof v === 'string' && v.trim() && !isBareUrl(v)) out[lang] = v.trim();
      }
      return out;
    };
    const titleI18n = { en: title, ...keep(tI) };
    const descI18n = { en: description, ...keep(dI) };
    const sumI18n = { en: summary, ...keep(aI) };
    const sum155 = (lang) => (sumI18n[lang] || '').slice(0, 155);
    const seoDescI18n = {};
    for (const lang of Object.keys(sumI18n)) seoDescI18n[lang] = sum155(lang);

    console.log(`[r27] pass1 scrub: ${row.slug}\n      title → "${title.slice(0, 70)}" (kept fa=${!!titleI18n.fa} ps=${!!titleI18n.ps})`);
    if (!DRY_RUN) {
      await client.query(`
        UPDATE "Opportunity" SET
          "titleI18n" = $2::jsonb, "descriptionI18n" = $3::jsonb,
          "aiSummary" = $4, "aiSummaryI18n" = $5::jsonb,
          "seoTitle" = $6, "ogTitle" = $6,
          "seoDescription" = $7, "ogDescription" = $7,
          "seoTitleI18n" = $8::jsonb, "ogTitleI18n" = $8::jsonb,
          "seoDescriptionI18n" = $9::jsonb, "ogDescriptionI18n" = $9::jsonb,
          "translationStatus" = 'pending', "updatedAt" = now()
        WHERE id = $1
      `, [row.id, JSON.stringify(titleI18n), JSON.stringify(descI18n),
          summary, JSON.stringify(sumI18n), title, summary.slice(0, 155),
          JSON.stringify(titleI18n), JSON.stringify(seoDescI18n)]);
    }
    scrubbed++;
  }
  console.log(`[r27] pass1: ${scrubbed} rows scrubbed (of ${candidates.length} candidates)`);

  // ── Pass 2: thin/junk descriptions → re-scrape ──────────────────────────
  const { rows: thin } = await client.query(`
    SELECT id, slug, title, description, "sourceName", "sourceUrl"
    FROM "Opportunity"
    WHERE "sourceName" = 'Scholarships.af'
      AND ( btrim(regexp_replace(description, '<[^>]+>', ' ', 'g')) = btrim(title)
            OR length(regexp_replace(description, '<[^>]+>', ' ', 'g')) < 200 )
    ${LIMIT ? `LIMIT ${LIMIT}` : ''}
  `);
  let rescraped = 0, deleted = 0, pass2failed = 0;
  for (const row of thin) {
    const html = fetchViaCurl(row.sourceUrl);
    if (!html) { console.log(`[r27] pass2 fetch-fail (kept for retry): ${row.slug}`); pass2failed++; continue; }
    const $ = cheerio.load(html);
    const pageTitle = $('title').text().trim();
    if (/page not found|404/i.test(pageTitle)) {
      console.log(`[r27] pass2 soft-404 → DELETE: ${row.slug}`);
      if (!DRY_RUN) await client.query(`DELETE FROM "Opportunity" WHERE id = $1`, [row.id]);
      deleted++; continue;
    }
    const detailHtml = extractDetail($);
    if (!detailHtml) { console.log(`[r27] pass2 no-detail-body (kept): ${row.slug}`); pass2failed++; continue; }
    const newText = stripHtml(detailHtml);
    const summary = buildSummary(detailHtml) || row.title;
    console.log(`[r27] pass2 re-scrape: ${row.slug} → ${newText.length} chars`);
    if (!DRY_RUN) {
      await client.query(`
        UPDATE "Opportunity" SET
          description = $2, "descriptionI18n" = $3::jsonb,
          "aiSummary" = $4, "aiSummaryI18n" = $5::jsonb,
          "seoDescription" = $6, "ogDescription" = $6,
          "seoDescriptionI18n" = $7::jsonb, "ogDescriptionI18n" = $7::jsonb,
          "translationStatus" = 'pending', "updatedAt" = now()
        WHERE id = $1
      `, [row.id, detailHtml, JSON.stringify({ en: detailHtml }),
          summary, JSON.stringify({ en: summary }), summary.slice(0, 155),
          JSON.stringify({ en: summary.slice(0, 155) })]);
    }
    rescraped++;
  }
  console.log(`[r27] pass2: ${rescraped} re-scraped, ${deleted} deleted (soft-404), ${pass2failed} kept-for-retry (of ${thin.length})`);

  // ── Pass 3: news stub rows ───────────────────────────────────────────────
  const { rows: stubs } = await client.query(`
    SELECT id, slug, title, excerpt, content FROM "News"
    WHERE (excerpt IS NULL OR btrim(excerpt) = '')
      AND length(regexp_replace(content, '<[^>]+>', ' ', 'g')) < 200
  `);
  let newsDeleted = 0;
  for (const row of stubs) {
    const text = stripHtml(row.content);
    if (/^source:/i.test(text) && /^https?:\/\/\S+$/i.test(text.replace(/^source:\s*[^—-]+[—-]\s*/i, '').trim())) {
      console.log(`[r27] pass3 news stub → DELETE: ${row.slug} ("${row.title.slice(0, 50)}")`);
      if (!DRY_RUN) await client.query(`DELETE FROM "News" WHERE id = $1`, [row.id]);
      newsDeleted++;
    } else {
      console.log(`[r27] pass3 news kept (has body): ${row.slug}`);
    }
  }
  console.log(`[r27] pass3: ${newsDeleted} news rows deleted (of ${stubs.length})`);

  console.log(`[r27] DONE — scrubbed=${scrubbed} rescraped=${rescraped} deleted=${deleted} newsDeleted=${newsDeleted}${DRY_RUN ? ' (DRY RUN — nothing written)' : ''}`);
  await client.end();
}

main().catch((e) => { console.error('[r27] FAILED:', e); process.exit(1); });
