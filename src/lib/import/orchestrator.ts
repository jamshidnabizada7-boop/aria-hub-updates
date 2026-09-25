/**
 * Import Orchestrator — the core engine.
 *
 * runImport({ sourceId|null, triggeredBy }) creates an ImportRun record,
 * scrapes the source(s), and for each listing:
 *   1. dedupe (skip / update / create)
 *   2. download + optimize images
 *   3. AI pipeline (rewrite → SEO → categorize → translate)
 *   4. resolve category
 *   5. generate unique slug
 *   6. upsert Opportunity with all base + i18n fields
 *
 * Robustness:
 *   - Each listing is wrapped in try/catch — one failure never aborts the run.
 *   - Per-listing writes (no transaction — see dedupe.ts for the race story).
 *   - Sequential detail fetches with crawl-delay (handled in BaseScraper).
 *   - Sanitized errors recorded in ImportRun.errors for the admin log viewer.
 */

import type { PrismaClient, Prisma, OpportunityStatus } from '@prisma/client';
import { resolveImportedOpportunityStatus } from './publication-policy';
import { db } from '@/lib/db';
import { getScraper } from './registry';
import { computeHash, findExisting } from './dedupe';
import { downloadFeaturedImage, downloadLogo } from './images';
import { runAIPipeline, ensureUniqueSlug, makeSlug } from '@/lib/ai/pipeline';
import { ReliefWebPendingError } from './scrapers/reliefweb';
import { sanitizeError, slugify } from './utils';
import type { RawListing, SourceHandle } from './types';

/** Safely convert a date string (ISO or parseable) to a Date object, or null. */
function safeDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Titles that indicate the scraped page was a bot-protection challenge, not
 * a real opportunity (Cloudflare "One moment, please...Loader" etc.).
 */
const CHALLENGE_TITLE_RE =
  /^(one moment, please|just a moment|attention required|verifying (you|that)|enable javascript|checking your browser|loader)/i;

/** Error message pattern meaning the detail page does not exist (soft-404). */
const SOFT_404_RE = /soft-404|page not found/i;

/** How often a known listing gets its detail page re-fetched for drift checks. */
const DETAIL_RECHECK_MS = 24 * 60 * 60 * 1000;

/**
 * Description texts that mean content extraction failed and grabbed a label
 * value ("All", "International", "Afghan Nationals") instead of the article.
 */
const JUNK_DESC_RE = /^(all|international|afghan nationals|male|female|none|n\/?a|sponsored links?)$/i;

export interface RunImportOptions {
  sourceId?: string | null;
  type?: string | null;
  triggeredBy?: string;
  force?: boolean;
}

export interface RunSummary {
  runId: string;
  status: string;
  found: number;
  imported: number;
  updated: number;
  skipped: number;
  duplicates: number;
  failed: number;
  processingMs: number;
  error?: string;
}

/** Module-level guard: prevent overlapping runs of the same source. */
const inFlight = new Set<string>();

/** Convert a Prisma ImportSource row into a SourceHandle for scrapers. */
function toHandle(s: { id: string; name: string; type: string; scraperKey: string; baseUrl: string; config: string | null; defaultCategory: string | null }): SourceHandle {
  let config: Record<string, unknown> = {};
  try { config = s.config ? JSON.parse(s.config) : {}; } catch { /* ignore */ }
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    scraperKey: s.scraperKey,
    baseUrl: s.baseUrl,
    defaultCategory: s.defaultCategory,
    config,
  };
}

/**
 * Run the import pipeline for a single source.
 *
 * If `sourceId` is given, that specific source is scraped.
 * If `sourceId` is null, the **least-recently-run** enabled source is picked
 * automatically. This avoids running ALL sources sequentially in a single
 * HTTP request, which was causing 504 timeouts (3 sources × 45s each > 60s
 * Vercel limit).
 *
 * To cycle through all sources, call this endpoint repeatedly (e.g. from a
 * cron trigger or the admin UI "Run All" button that fires one request per
 * source).
 */
export async function runImport(opts: RunImportOptions = {}): Promise<RunSummary> {
  const { sourceId = null, type = null, triggeredBy = 'manual', force = false } = opts;
  const startedAt = Date.now();

  let source: any;

  if (sourceId) {
    // Explicit source
    source = await db.importSource.findUnique({ where: { id: sourceId } });
    if (!source) throw new Error(`Import source "${sourceId}" not found.`);
  } else {
    // Auto-pick: the enabled source that was run least recently (or never)
    const where: Prisma.ImportSourceWhereInput = { enabled: true };
    if (type) where.type = type;

    source = await db.importSource.findFirst({
      where,
      orderBy: [
        { lastRunAt: { sort: 'asc', nulls: 'first' } },  // never-run sources first
      ],
    });
    if (!source) throw new Error('No enabled import sources found.');
  }

  // Guard against concurrent runs of the same source
  if (inFlight.has(source.id)) {
    return {
      runId: '',
      status: 'skipped',
      found: 0, imported: 0, updated: 0, skipped: 0, duplicates: 0, failed: 0,
      processingMs: Date.now() - startedAt,
    };
  }

  inFlight.add(source.id);
  try {
    // News sources (type='news', scraperKey='rssNews') go through the
    // dedicated RSS → News pipeline — they never create Opportunity rows.
    if (source.type === 'news') {
      const { runNewsImport } = await import('./news-import');
      return await runNewsImport({ sourceId: source.id, triggeredBy });
    }
    return await runOneSource(db, source, triggeredBy, force);
  } finally {
    inFlight.delete(source.id);
  }
}

/** Run the pipeline for a single source. */
async function runOneSource(
  db: PrismaClient,
  source: { id: string; name: string; type: string; scraperKey: string; baseUrl: string; config: string | null; defaultCategory: string | null; autoPublish: boolean },
  triggeredBy: string,
  force: boolean,
): Promise<RunSummary> {
  const startedAt = Date.now();
  const handle = toHandle(source);
  const scraper = getScraper(handle);
  const run = await db.importRun.create({
    data: { sourceId: source.id, status: 'running', triggeredBy },
  });

  const counters = { found: 0, imported: 0, updated: 0, skipped: 0, duplicates: 0, failed: 0 };
  const errors: Array<{ url: string; message: string; ts: string }> = [];

  // Known category slugs for AI categorization
  const categories = await db.opportunityCategory.findMany({ select: { id: true, slug: true, name: true } });
  const knownSlugs = categories.map((c) => c.slug);

  try {
    if (!scraper) throw new Error(`No scraper registered for key "${source.scraperKey}"`);

    // Deadline so serverless hosts (Vercel ~60s) don't kill the function mid-run.
    // Long-running hosts (sandbox / cron workers) set IMPORT_GLOBAL_TIMEOUT_MS.
    const GLOBAL_TIMEOUT = parseInt(process.env.IMPORT_GLOBAL_TIMEOUT_MS || '45000', 10);
    scraper.deadline = startedAt + GLOBAL_TIMEOUT;

    // 1. Scrape
    const listings = await scraper.scrapeAll();
    counters.found = listings.length;

    // 2. Process each listing
    for (const listing of listings) {
      if (Date.now() - startedAt > GLOBAL_TIMEOUT) {
        console.warn(`[import] Approaching function timeout (${GLOBAL_TIMEOUT}ms). Saving partial run.`);
        break;
      }
      try {
        await processListing(db, scraper, listing, source, categories, knownSlugs, counters, force, errors);
      } catch (e) {
        counters.failed++;
        errors.push({ url: listing.sourceUrl, message: sanitizeError(e), ts: new Date().toISOString() });
      }
    }

    const status = counters.failed === 0 ? 'ok' : (counters.imported + counters.updated > 0 ? 'partial' : 'error');
    const processingMs = Date.now() - startedAt;

    await db.importRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        found: counters.found,
        imported: counters.imported,
        updated: counters.updated,
        skipped: counters.skipped,
        duplicates: counters.duplicates,
        failed: counters.failed,
        processingMs,
        errors: errors.length ? JSON.stringify(errors) : null,
      },
    });

    await db.importSource.update({
      where: { id: source.id },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: status,
        lastRunStats: JSON.stringify(counters),
      },
    });

    return { runId: run.id, status, processingMs, ...counters };
  } catch (e) {
    // Fatal error for this source
    const processingMs = Date.now() - startedAt;
    errors.push({ url: source.baseUrl, message: sanitizeError(e), ts: new Date().toISOString() });

    // GRACEFUL PENDING: sources waiting on an external approval (e.g. the
    // ReliefWeb appname) are not pipeline failures — mark them "pending"
    // with a clear message in lastRunStats instead of an error.
    if (e instanceof ReliefWebPendingError) {
      await db.importRun.update({
        where: { id: run.id },
        data: {
          status: 'stopped',
          finishedAt: new Date(),
          processingMs,
          errors: JSON.stringify(errors),
        },
      });
      await db.importSource.update({
        where: { id: source.id },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: 'pending',
          lastRunStats: JSON.stringify({ ...counters, message: sanitizeError(e) }),
        },
      });
      return { runId: run.id, status: 'pending', processingMs, ...counters };
    }

    await db.importRun.update({
      where: { id: run.id },
      data: {
        status: 'error',
        finishedAt: new Date(),
        found: counters.found,
        imported: counters.imported,
        updated: counters.updated,
        skipped: counters.skipped,
        duplicates: counters.duplicates,
        failed: counters.failed + 1,
        processingMs,
        errors: JSON.stringify(errors),
      },
    });
    await db.importSource.update({
      where: { id: source.id },
      data: { lastRunAt: new Date(), lastRunStatus: 'error', lastRunStats: JSON.stringify({ ...counters, message: sanitizeError(e) }) },
    });
    return { runId: run.id, status: 'error', processingMs, ...counters, failed: counters.failed + 1 };
  }
}

/** Process a single listing: dedupe → images → AI → upsert. */
async function processListing(
  db: PrismaClient,
  scraper: any,
  listing: RawListing,
  source: { id: string; name: string; type: string; scraperKey: string; baseUrl: string; config: string | null; defaultCategory: string | null; autoPublish: boolean },
  categories: Array<{ id: string; slug: string; name: string }>,
  knownSlugs: string[],
  counters: { found: number; imported: number; updated: number; skipped: number; duplicates: number; failed: number },
  force: boolean,
  errors: Array<{ url: string; message: string; ts: string }>,
): Promise<void> {
  // Bot-challenge guard: when a source is behind Cloudflare, the "detail
  // page" sometimes IS the challenge page and the scraper stores its title
  // ("One moment, please...Loader", "Just a moment...", "Attention
  // Required!"). Never persist those as opportunities.
  if (CHALLENGE_TITLE_RE.test(listing.title || '')) {
    counters.skipped++;
    return;
  }

  // EXPIRED GUARD — the platform only shows fresh opportunities. If the
  // listing already carries a deadline in the past, skip it before doing any
  // detail fetching / AI work. Sources can opt out via config.allowExpired.
  let allowExpired = false;
  try {
    const cfg = source.config ? (JSON.parse(source.config) as Record<string, unknown>) : {};
    allowExpired = cfg.allowExpired === true;
  } catch { /* ignore */ }
  const earlyDeadline = safeDate(listing.deadline);
  if (!allowExpired && earlyDeadline && earlyDeadline.getTime() < Date.now()) {
    counters.skipped++;
    return;
  }

  // Pre-enrichment hash — used only for the cross-URL exact-duplicate lookup.
  const preHash = await computeHash(listing);

  // Dedupe
  const dedupe = await findExisting(db, listing, preHash);
  if (dedupe.action === 'skip') {
    // True content-hash duplicate — identical content already exists.
    // Count as both skipped (no work done) and duplicate (content collision).
    counters.skipped++;
    counters.duplicates++;
    return;
  }

  // Fast path: this row was fully detail-checked less than a day ago and the
  // list-page content is unchanged — skip the detail re-fetch. The daily
  // recheck below is what catches source-side edits (deadline extensions…).
  if (dedupe.action === 'update' && !force) {
    const last = dedupe.existing.lastChecked?.getTime() ?? 0;
    if (Date.now() - last < DETAIL_RECHECK_MS) {
      counters.skipped++;
      await db.opportunity.update({
        where: { id: dedupe.existing.id },
        data: { lastChecked: new Date() },
      });
      return;
    }
  }

  // Fetch detail page now that we know we need to create/update it.
  // source.config is a raw JSON string from the DB; parse it before property access.
  let parsedConfig: Record<string, unknown> = {};
  try { parsedConfig = source.config ? JSON.parse(source.config) : {}; } catch { /* ignore */ }
  if (scraper && typeof scraper.parseDetail === 'function' && parsedConfig?.detailFetch !== false) {
    try {
      const enriched = await scraper.parseDetail(listing);
      Object.assign(listing, enriched);
    } catch (e) {
      const msg = sanitizeError(e);
      console.error(`[import] detail failed (${listing.sourceUrl}):`, msg);
      // Soft-404: the detail page does not exist (site serves styled 404s).
      // Persisting the bare sitemap listing would create a junk row — skip.
      if (SOFT_404_RE.test(msg)) {
        counters.skipped++;
        errors.push({ url: listing.sourceUrl, message: `skipped: ${msg}`, ts: new Date().toISOString() });
        return;
      }
    }
  }

  // ── CONTENT QUALITY GUARDS (all sources) ─────────────────────────────────
  // 1. Never persist a URL as the title (sitemap fallback that survived
  //    detail enrichment).
  if (/^https?:\/\//i.test(listing.title || '')) {
    counters.skipped++;
    errors.push({ url: listing.sourceUrl, message: 'skipped: title is a URL (detail enrichment failed)', ts: new Date().toISOString() });
    return;
  }
  // 2. Never persist a label value ("All", "International", …) or an
  //    empty stub as the entire description.
  const descText = (listing.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (JUNK_DESC_RE.test(descText) || descText.length < 30) {
    counters.skipped++;
    errors.push({ url: listing.sourceUrl, message: `skipped: junk/thin description (${descText.length} chars)`, ts: new Date().toISOString() });
    return;
  }

  // Second EXPIRED GUARD after detail enrichment — detail pages often reveal
  // a deadline the listing page didn't have. Anything already past is skipped
  // here too (before images/AI), so the database never gains expired rows.
  if (!allowExpired) {
    const lateDeadline = safeDate(listing.deadline);
    if (lateDeadline && lateDeadline.getTime() < Date.now()) {
      counters.skipped++;
      return;
    }
  }

  // Post-enrichment content hash — computed AFTER the detail page filled in
  // the real deadline/description, so source-side edits actually register as
  // changes (the old pre-enrichment hash never saw detail-page updates).
  const hash = await computeHash(listing);

  // Daily recheck verdict: fully re-fetched and still identical → just
  // refresh lastChecked (NOT a duplicate — the same known record, unchanged).
  if (dedupe.action === 'update' && !force && dedupe.existing.contentHash === hash) {
    counters.skipped++;
    await db.opportunity.update({
      where: { id: dedupe.existing.id },
      data: { lastChecked: new Date() },
    });
    return;
  }

  // Images
  const slugBase = makeSlug(listing.title);
  const featured = await downloadFeaturedImage(listing.imageUrl, source.scraperKey, slugBase);
  const logo = await downloadLogo(listing.logoUrl, source.scraperKey, `${slugBase}-logo`);

  // AI pipeline (rewrite → SEO → categorize → translate)
  const pipeline = await runAIPipeline(listing, { db, knownCategorySlugs: knownSlugs }, (listing.sourceLanguage as 'en' | 'fa' | 'ps') || 'en');

  // Resolve category
  const categoryId = resolveCategory(pipeline.categorySlugs, listing.category, listing.jobType, source.defaultCategory, categories);

  // Common import-tracking fields
  const importFields = {
    sourceName: source.name,
    sourceUrl: listing.sourceUrl,
    originalUrl: listing.originalUrl || listing.sourceUrl,
    importedAt: new Date(),
    lastChecked: new Date(),
    contentHash: hash,
    importStatus: dedupe.action === 'update' ? 'updated' : 'imported',
    translationStatus: pipeline.translationStatus,
    language: listing.sourceLanguage || 'en',
    jobType: listing.jobType || source.type,
    salary: listing.salary || null,
    educationReq: listing.educationReq || null,
    experience: listing.experience || null,
    country: listing.country || listing.location || null,
    deadline: safeDate(listing.deadline),
    organization: listing.organization || null,
    website: listing.website || null,
    applyUrl: listing.applyUrl || null,
    image: featured.path,
    logoUrl: logo.path || null,
    publishedDate: listing.publishedDate || null,  // String field in schema, no conversion needed
    canonicalUrl: listing.sourceUrl,
    extractedData: listing.extractedData || {},
  };

  if (dedupe.action === 'update') {
    // Update existing (preserve id, slug unless title changed)
    const existing = await db.opportunity.findUnique({
      where: { id: dedupe.existing.id },
      select: { slug: true, title: true, status: true },
    });
    let newSlug = existing?.slug || slugBase;
    if (existing && slugify(listing.title) !== slugify(existing.title)) {
      newSlug = await ensureUniqueSlug(db, slugBase, dedupe.existing.id);
    }
    await db.opportunity.update({
      where: { id: dedupe.existing.id },
      data: {
        ...pipeline.data,
        ...importFields,
        status: resolveImportedOpportunityStatus(existing?.status, source.autoPublish),
        ...(categoryId ? { categoryId } : {}),
        slug: newSlug,
        importStatus: 'updated',
      },
    });
    counters.updated++;
  } else {
    // Create new
    const slug = await ensureUniqueSlug(db, slugBase);
    await db.opportunity.create({
      data: {
        ...pipeline.data,
        ...importFields,
        status: resolveImportedOpportunityStatus(null, source.autoPublish),
        slug,
        sort: 0,
        categoryId,
      } as unknown as Prisma.OpportunityUncheckedCreateInput,
    });
    counters.imported++;
  }
}

/** Resolve a category ID from AI suggestions, source hints, or default. */
function resolveCategory(
  aiSlugs: string[],
  sourceCategory: string | null | undefined,
  jobType: string | null | undefined,
  defaultSlug: string | null | undefined,
  categories: Array<{ id: string; slug: string; name: string }>,
): string | null {
  const candidates = [...aiSlugs];
  if (sourceCategory) candidates.push(slugify(sourceCategory));
  if (jobType) candidates.push(slugify(jobType));
  if (defaultSlug) candidates.push(defaultSlug);

  for (const c of candidates) {
    if (!c) continue;
    const match = categories.find((cat) => 
      cat.slug === c || 
      cat.name.toLowerCase() === c.toLowerCase() ||
      cat.slug === `${c}s` || // check plural
      `${cat.slug}s` === c    // check singular
    );
    if (match) return match.id;
  }
  // Fallback: match default slug only
  if (defaultSlug) {
    const match = categories.find((cat) => cat.slug === defaultSlug);
    if (match) return match.id;
  }
  return null;
}
