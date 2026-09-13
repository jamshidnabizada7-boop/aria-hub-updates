#!/usr/bin/env node
/**
 * R22 post-scrape pipeline:
 *  1. Publish scraped Opportunity drafts that pass the quality bar:
 *       title ≥ 8 chars & clean, description ≥ 200 chars, sourceUrl valid,
 *       deadline NULL or in the future. Everything else stays a draft for
 *       admin review (importStatus + lastRunStats keep provenance).
 *  2. Flip autoPublish=true on enabled opportunity sources (future runs
 *     publish directly — user wants scraped data visible).
 *  3. Finalize stale 'running' ImportRun rows from killed processes.
 */
import pg from 'pg';
const { Client } = pg;

const url = process.env.R22_DB_URL || 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';
const c = new Client({ connectionString: url });
await c.connect();

// ── 1. QA publish ─────────────────────────────────────────────────────────────
const JUNK_RE = /(one moment, please|just a moment|attention required|&amp;|&#\d+;|&quot;|<p>|<\/p>)/i;

const rows = (await c.query(`
  SELECT id, slug, title, description, "sourceUrl", deadline, status, "sourceName"
  FROM "Opportunity"
  WHERE "sourceName" IS NOT NULL AND status = 'draft'
`)).rows;

let published = 0;
const keptDraft = [];
for (const r of rows) {
  const ok =
    r.title && r.title.length >= 8 && !JUNK_RE.test(r.title) &&
    (r.description || '').replace(/\s+/g, ' ').trim().length >= 200 &&
    /^https?:\/\//.test(r.sourceUrl || '') &&
    (!r.deadline || new Date(r.deadline).getTime() >= Date.now());
  if (ok) {
    await c.query(`UPDATE "Opportunity" SET status='published', "updatedAt"=NOW() WHERE id=$1`, [r.id]);
    published++;
  } else {
    keptDraft.push(`${r.slug} (${r.sourceName})`);
  }
}
console.log(`[publish] ${published} scraped drafts published; ${keptDraft.length} kept as drafts for admin review`);
for (const d of keptDraft.slice(0, 12)) console.log('   draft:', d);

// ── 2. autoPublish flip ───────────────────────────────────────────────────────
const flip = await c.query(`
  UPDATE "ImportSource"
  SET "autoPublish" = true, "updatedAt" = NOW()
  WHERE enabled = true AND type IN ('job','scholarship','fellowship','training')
  RETURNING name`);
console.log(`[autoPublish] enabled for: ${flip.rows.map((r) => r.name).join(', ')}`);

// ── 3. stale runs ────────────────────────────────────────────────────────────
const stale = await c.query(`
  UPDATE "ImportRun" SET status='error',
    errors = COALESCE(errors, '{"run":"process killed mid-run — finalized by r22 pipeline"}')
  WHERE status='running' AND "startedAt" < NOW() - INTERVAL '30 minutes'
  RETURNING id`);
console.log(`[runs] finalized ${stale.rowCount} stale running ImportRun rows`);

// ── summary ──────────────────────────────────────────────────────────────────
const fin = await c.query(`
  SELECT
    (SELECT count(*)::int FROM "Opportunity" WHERE status='published') AS published_opp,
    (SELECT count(*)::int FROM "Opportunity" WHERE status='draft') AS draft_opp,
    (SELECT count(*)::int FROM "Opportunity" WHERE deadline < NOW()) AS expired_opp,
    (SELECT count(*)::int FROM "News" WHERE status='published') AS published_news`);
console.log('[final]', fin.rows[0]);
await c.end();
