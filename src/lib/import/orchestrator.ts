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

import type { PrismaClient, Prisma, ImportRunStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { getScraper } from './registry';
import { computeHash, findExisting } from './dedupe';
import { downloadFeaturedImage, downloadLogo } from './images';
import { runAIPipeline, ensureUniqueSlug, makeSlug } from '@/lib/ai/pipeline';
import { ReliefWebPendingError } from './scrapers/reliefweb';
import { isExpiredListingDeadline, sanitizeError, slugify } from './utils';
import { buildLocationRows, resolveCountry } from '@/lib/geo/location-rows';
import { classifyApplyUrl, isRealApplyLink, shouldHealApplyLink } from '@/lib/apply';
import type { RawListing, SourceHandle } from './types';
import { resolveImportedOpportunityStatus } from './publication-policy';
import { preserveAdminFields } from './preserve-admin-fields';
import { PRIMARY_OPPORTUNITY_KEYS } from '@/lib/automation/import-selection';
import { resolveCrossSource, mergeIntoCanonical, extractVacancyNumber } from './canonical-resolver';
import { ensureSourceObservation, parseSourcePublishedAt, resolveSourceRole } from './source-observations';
import { resolveApplyDestination } from '@/lib/apply-resolver';
import { resolveOrganization } from '@/lib/organizations/resolve';

/** True when this source has ever produced imported/updated opportunities. */
async function hasEverImported(sourceId: string): Promise<boolean> {
  const marker = await db.importRun.findFirst({
    where: { sourceId, imported: { gt: 0 } },
    select: { id: true },
  });
  return Boolean(marker);
}

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
  /** Bounded serverless run: recent list pages, unseen listings first, no inline AI calls. */
  bounded?: boolean;
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
  /** New listings discovered but not attempted before the time budget ended. */
  remainingNew?: number;
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
  const { sourceId = null, type = null, triggeredBy = 'manual', force = false, bounded = false } = opts;
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
    return await runOneSource(db, source, triggeredBy, force, bounded);
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
  bounded: boolean,
): Promise<RunSummary> {
  const startedAt = Date.now();
  const handle = toHandle(source);
  const streamPrimary = bounded && PRIMARY_OPPORTUNITY_KEYS.has(source.scraperKey);
  if (bounded) {
    handle.config.maxPages = streamPrimary ? 10 : Math.min(Number(handle.config.maxPages) || 5, 5);
    handle.config.recentOnly = true;
  }
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
    const GLOBAL_TIMEOUT = bounded ? 35_000 : parseInt(process.env.IMPORT_GLOBAL_TIMEOUT_MS || '45000', 10);
    scraper.deadline = startedAt + GLOBAL_TIMEOUT;

    let remainingNew = 0;
    const knownForRecheck: RawListing[] = [];
    const processBatch = async (listings: RawListing[]) => {
      counters.found += listings.length;
      // Query URL existence in one batch so the newest unseen cards get the
      // remaining serverless budget before daily checks of known records.
      const knownUrls = new Set<string>();
      if (bounded) {
        const urls = [...new Set(listings.map((item) => item.sourceUrl).filter(Boolean))];
        for (let i = 0; i < urls.length; i += 250) {
          const known = await db.opportunity.findMany({
            where: { sourceUrl: { in: urls.slice(i, i + 250) } },
            select: { sourceUrl: true },
          });
          for (const row of known) if (row.sourceUrl) knownUrls.add(row.sourceUrl);
        }
      }
      const unseen = listings.filter((item) => !knownUrls.has(item.sourceUrl));
      const known = listings.filter((item) => knownUrls.has(item.sourceUrl));
      if (streamPrimary) knownForRecheck.push(...known);
      const ordered = bounded ? (streamPrimary ? unseen : [...unseen, ...known]) : listings;
      if (bounded) remainingNew += unseen.length;

      for (const listing of ordered) {
        if (Date.now() - startedAt > GLOBAL_TIMEOUT) {
          console.warn(`[import] Approaching function timeout (${GLOBAL_TIMEOUT}ms). Saving partial run.`);
          break;
        }
        if (bounded && !knownUrls.has(listing.sourceUrl)) remainingNew--;
        try {
          await processListing(db, scraper, listing, source, categories, knownSlugs, counters, force, errors, bounded);
        } catch (e) {
          counters.failed++;
          errors.push({ url: listing.sourceUrl, message: sanitizeError(e), ts: new Date().toISOString() });
        }
      }
    };

    if (streamPrimary) {
      // Process page one before requesting page two. Previously five list-page
      // requests could consume the entire 35-second budget, importing zero.
      let pagesSeen = 0;
      let lastHadNext = false;
      let reachedPageCap = false;
      for await (const page of scraper.scrapePages()) {
        pagesSeen++;
        lastHadNext = Boolean(page.nextPage);
        await processBatch(page.listings);
        if (pagesSeen >= Number(handle.config.maxPages)) {
          reachedPageCap = true;
          break;
        }
        if (Date.now() >= scraper.deadline) {
          break;
        }
      }
      // A next-page link left unvisited (including after a fetch error) keeps
      // the source in the retry queue. Reaching the configured recent-page cap
      // does not: older archive pages should not cause endless fast retries.
      if (lastHadNext && !reachedPageCap) remainingNew = Math.max(1, remainingNew);
      // Recheck existing details only after the recent-page crawl found no
      // unattempted opportunities. This keeps old cards from blocking new ones.
      if (remainingNew === 0) {
        for (const listing of knownForRecheck) {
          if (Date.now() - startedAt > GLOBAL_TIMEOUT) break;
          try {
            await processListing(db, scraper, listing, source, categories, knownSlugs, counters, force, errors, bounded);
          } catch (e) {
            counters.failed++;
            errors.push({ url: listing.sourceUrl, message: sanitizeError(e), ts: new Date().toISOString() });
          }
        }
      }
    } else {
      await processBatch(await scraper.scrapeAll());
    }

    // Source-health gate: a historically productive source that suddenly
    // finds ZERO listings (selector drift, bot-protection challenge, soft
    // blocks) must never report a clean 'ok' — mark it degraded so the admin
    // panel and the run history surface the anomaly instead of hiding it.
    let status: ImportRunStatus =
      counters.failed === 0 ? 'ok' : (counters.imported + counters.updated > 0 ? 'partial' : 'error');
    if (remainingNew > 0 && status === 'ok') status = 'partial';
    if (counters.found === 0 && status === 'ok' && (bounded || await hasEverImported(source.id))) {
      status = 'error'; // ImportRunStatus has no 'degraded' — error + message below
      errors.push({
        url: source.baseUrl,
        message: 'DEGRADED: 0 listings found for a source that imported rows before — check selectors / bot-protection',
        ts: new Date().toISOString(),
      });
    }
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
        lastRunStats: JSON.stringify({ ...counters, remainingNew }),
      },
    });

    return { runId: run.id, status, processingMs, remainingNew, ...counters };
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
  bounded: boolean,
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
  if (!allowExpired && isExpiredListingDeadline(listing.deadline)) {
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

  // Canonical organization link — only when the organization is ALREADY
  // canonicalized; creating organizations is a deliberate Phase 2/admin
  // decision, never an import side effect.
  let organizationId: string | null = null;
  let organizationDomains: unknown = null;
  if (listing.organization?.trim()) {
    try {
      const org = await resolveOrganization(db, listing.organization, { createIfMissing: false });
      organizationId = org?.organization?.id ?? null;
      organizationDomains = org?.organization?.officialDomains ?? null;
    } catch { /* organization resolution must never break an import */ }
  }

  const incomingRole = resolveSourceRole({ sourceName: source.name, scraperKey: source.scraperKey });

  // Cross-source canonical resolution (Phase 4): when NO same-source match
  // exists, check whether a DIFFERENT source already carries this vacancy.
  // High confidence → attach an observation to the canonical row instead of
  // creating a duplicate; medium confidence → create, but record the candidate
  // on the observation for the Discovery Inbox. dedupe.ts is untouched.
  let crossReview: { candidateId: string; confidence: number; reasons: string[] } | null = null;
  if (dedupe.action === 'create' && listing.organization?.trim()) {
    try {
      const cross = await resolveCrossSource(db, listing, {
        sourceId: source.id, sourceName: source.name, scraperKey: source.scraperKey, incomingRole,
      });
      if (cross.decision === 'merge' && cross.candidate) {
        const merged = await mergeIntoCanonical(db, listing, {
          sourceId: source.id, sourceName: source.name, scraperKey: source.scraperKey, incomingRole,
        }, cross.candidate.opportunityId, {
          applyUrl: listing.applyUrl || null,
          deadline: safeDate(listing.deadline),
          organizationId,
          contentHash: preHash,
        });
        counters.duplicates++;
        counters.skipped++;
        console.log(`[import] canonical merge: "${listing.title}" from ${source.name} → opportunity ${cross.candidate.opportunityId} (confidence ${cross.confidence}; promoted: ${merged.promoted.join(', ') || 'none'})`);
        return;
      }
      if (cross.decision === 'review' && cross.candidate) {
        crossReview = { candidateId: cross.candidate.opportunityId, confidence: cross.confidence, reasons: cross.reasons };
      }
    } catch (e) {
      console.warn('[import] cross-source resolution failed (continuing):', (e as Error).message);
    }
  }

  // The content hash excludes application links. A feed can add an explicit
  // Apply anchor without changing article text, so heal a fallback before the
  // unchanged-content fast paths below return. Preserve existing real links.
  if (dedupe.action === 'update' && listing.applyUrl &&
      isRealApplyLink(classifyApplyUrl(listing.applyUrl, listing.sourceUrl, listing.originalUrl))) {
    const current = await db.opportunity.findUnique({
      where: { id: dedupe.existing.id },
      select: { applyUrl: true, sourceUrl: true, originalUrl: true },
    });
    if (current && shouldHealApplyLink(
      current.applyUrl, current.sourceUrl, current.originalUrl,
      listing.applyUrl, listing.sourceUrl, listing.originalUrl,
    )) {
      await db.opportunity.update({
        where: { id: dedupe.existing.id },
        data: { applyUrl: listing.applyUrl, applyUrlType: classifyApplyUrl(listing.applyUrl, listing.sourceUrl, listing.originalUrl) },
      });
    }
  }

  // Structured facts are excluded from the article hash. Fill only missing
  // fields from explicit source evidence, even when a recent or unchanged
  // article takes a fast path below. Never replace an admin-populated value.
  const healMissingFacts = async () => {
    if (dedupe.action !== 'update') return;
    const current = await db.opportunity.findUnique({
      where: { id: dedupe.existing.id },
      select: { eligibility: true, requirements: true, educationReq: true, experience: true,
        benefits: true, guidelines: true, responsibilities: true, salary: true,
        country: true, categoryId: true, extractedData: true },
    });
    if (current) {
      const data: Record<string, string> = {};
      for (const field of ['eligibility', 'requirements', 'educationReq', 'experience', 'benefits', 'guidelines', 'responsibilities', 'salary'] as const) {
        if (!current[field] && listing[field]?.trim()) data[field] = listing[field]!.trim();
      }
      const country = resolveCountry(listing);
      if (!current.country && country) data.country = country;
      const categoryId = resolveCategory([], listing.category, listing.jobType, source.defaultCategory, categories);
      if (!current.categoryId && categoryId) data.categoryId = categoryId;
      const incomingFacts = listing.extractedData || {};
      const currentFacts = current.extractedData && typeof current.extractedData === 'object' && !Array.isArray(current.extractedData)
        ? current.extractedData as Record<string, unknown> : {};
      const addedFacts = Object.fromEntries(Object.entries(incomingFacts).filter(([key, value]) =>
        value != null && value !== '' && (currentFacts[key] == null || currentFacts[key] === '' ||
          (Array.isArray(currentFacts[key]) && currentFacts[key].length === 0))));
      if (Object.keys(addedFacts).length) {
        await db.opportunity.update({ where: { id: dedupe.existing.id }, data: {
          ...data, extractedData: { ...currentFacts, ...addedFacts },
        } });
      } else if (Object.keys(data).length) {
        await db.opportunity.update({ where: { id: dedupe.existing.id }, data });
      }
    }
  };
  await healMissingFacts();

  // Fast path: this row was fully detail-checked less than a day ago and the
  // list-page content is unchanged — skip the detail re-fetch. The daily
  // recheck below is what catches source-side edits (deadline extensions…).
  if (dedupe.action === 'update' && !force) {
    const last = dedupe.existing.lastChecked?.getTime() ?? 0;
    if (Date.now() - last < DETAIL_RECHECK_MS) {
      counters.skipped++;
      return;
    }
  }

  // Fetch detail page now that we know we need to create/update it.
  // source.config is a raw JSON string from the DB; parse it before property access.
  let parsedConfig: Record<string, unknown> = {};
  try { parsedConfig = source.config ? JSON.parse(source.config) : {}; } catch { /* ignore */ }
  // O4AF's legacy production config disabled detail fetch, but its list cards
  // contain no article body. Fetching details is required to import valid rows.
  // Jobs.af detail facts now come from its public JSON endpoint, including
  // submissionEmail/submissionLink, so bounded runs must fetch them too.
  if (scraper && typeof scraper.parseDetail === 'function' &&
      (parsedConfig?.detailFetch !== false || source.scraperKey === 'o4af')) {
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

  // Detail pages often expose the application address outside the feed card.
  // Heal it before the unchanged-content guard: applyUrl is not in the hash.
  if (dedupe.action === 'update' && listing.applyUrl &&
      isRealApplyLink(classifyApplyUrl(listing.applyUrl, listing.sourceUrl, listing.originalUrl))) {
    const current = await db.opportunity.findUnique({
      where: { id: dedupe.existing.id },
      select: { applyUrl: true, sourceUrl: true, originalUrl: true },
    });
    if (current && shouldHealApplyLink(
      current.applyUrl, current.sourceUrl, current.originalUrl,
      listing.applyUrl, listing.sourceUrl, listing.originalUrl,
    )) {
      await db.opportunity.update({
        where: { id: dedupe.existing.id },
        data: { applyUrl: listing.applyUrl, applyUrlType: classifyApplyUrl(listing.applyUrl, listing.sourceUrl, listing.originalUrl) },
      });
    }
  }

  // ── CONTENT QUALITY GUARDS (all sources) ─────────────────────────────────
  await healMissingFacts();
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
    if (isExpiredListingDeadline(listing.deadline)) {
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
  const pipeline = await runAIPipeline(listing, { db, knownCategorySlugs: knownSlugs }, (listing.sourceLanguage as 'en' | 'fa' | 'ps') || 'en', { skipEnrichment: bounded });

  // Resolve category
  const categoryId = resolveCategory(pipeline.categorySlugs, listing.category, listing.jobType, source.defaultCategory, categories);

  // Common import-tracking fields
  let applyUrl = (pipeline.data.applyUrl as string | null) || listing.applyUrl || null;

  // Apply Destination Resolver V2 (Phase 5): role/domain-aware classification
  // of the chosen candidate. Official sources linking to their own /apply/
  // path classify as direct_application; aggregator same-host links stay
  // fallbacks. Evidence + confidence are persisted for audit and for the
  // later verification workflow (applyVerifiedAt is set only by checks).
  const applyResolution = resolveApplyDestination({
    applyUrl,
    sourceUrl: listing.sourceUrl,
    originalUrl: listing.originalUrl || null,
    sourceRole: incomingRole,
    organizationDomains,
  });

  const finalCountry = resolveCountry(listing);
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
    country: finalCountry, // NEVER listing.location — locations go to OpportunityLocation rows
    deadline: safeDate(listing.deadline),
    organization: listing.organization || null,
    website: listing.website || null,
    applyUrl,
    applyUrlType: applyResolution.applyUrlType,
    applyUrlEvidence: applyResolution.evidence,
    applyConfidence: applyResolution.confidence,
    image: featured.path,
    logoUrl: logo.path || null,
    publishedDate: listing.publishedDate || null,  // String field in schema, no conversion needed
    canonicalUrl: listing.sourceUrl,
    extractedData: listing.extractedData || {},
  };

  // Structured location rows — delete + recreate on every (re)import so
  // source-side location changes propagate.
  const locationRows = buildLocationRows(listing);
  let createdId: string | null = null;

  if (dedupe.action === 'update') {
    // Update existing while preserving its moderation/publication lifecycle.
    // A source with autoPublish=false must never demote a record that an admin
    // or trusted source already published.
    const existing = await db.opportunity.findUnique({
      where: { id: dedupe.existing.id },
      select: { slug: true, title: true, titleI18n: true, organization: true,
        country: true, deadline: true, description: true, descriptionI18n: true,
        responsibilities: true, responsibilitiesI18n: true, requirements: true,
        requirementsI18n: true, guidelines: true, guidelinesI18n: true,
        eligibility: true, eligibilityI18n: true, benefits: true, benefitsI18n: true,
        salary: true, salaryI18n: true, educationReq: true, educationReqI18n: true,
        experience: true, experienceI18n: true, categoryId: true, image: true,
        seoTitle: true, seoDescription: true, seoTitleI18n: true, seoDescriptionI18n: true,
        ogTitle: true, ogDescription: true, ogTitleI18n: true, ogDescriptionI18n: true,
        extractedData: true, extractedDataI18n: true,
        applyUrl: true, sourceUrl: true, originalUrl: true,
        applyUrlEvidence: true, applyConfidence: true,
        organizationId: true },
    });
    // A later import with only a source-article fallback must not erase an
    // application destination or country that an administrator verified.
    if (existing && isRealApplyLink(classifyApplyUrl(existing.applyUrl, existing.sourceUrl, existing.originalUrl))) {
      applyUrl = existing.applyUrl;
      importFields.applyUrl = existing.applyUrl;
      importFields.applyUrlType = classifyApplyUrl(existing.applyUrl, existing.sourceUrl, existing.originalUrl);
      // keep the recorded provenance of a preserved destination
      importFields.applyUrlEvidence = existing.applyUrlEvidence ?? importFields.applyUrlEvidence;
      importFields.applyConfidence = existing.applyConfidence ?? importFields.applyConfidence;
    }
    if (existing?.country && !finalCountry) importFields.country = existing.country;
    const hasAdminEdit = source.scraperKey === 'jobsaf' && !!existing && Boolean(await db.auditLog.findFirst({
      where: { entity: 'opportunity', entityId: dedupe.existing.id, action: 'update' },
      select: { id: true },
    }));
    let newSlug = existing?.slug || slugBase;
    if (existing && !hasAdminEdit && slugify(listing.title) !== slugify(existing.title)) {
      newSlug = await ensureUniqueSlug(db, slugBase, dedupe.existing.id);
    }
    const sourceData = { ...pipeline.data, ...importFields, ...(categoryId ? { categoryId } : {}) };
    const updateData = hasAdminEdit && existing
      ? preserveAdminFields(sourceData, existing as Record<string, unknown>)
      : sourceData;
    await db.opportunity.update({
      where: { id: dedupe.existing.id },
      data: {
        ...updateData,
        slug: newSlug,
        ...(existing && !existing.organizationId && organizationId ? { organizationId } : {}),
        // Omit status from the UPDATE, including any AI-produced value.
        // Rewriting a previously read status could undo a concurrent admin edit.
        status: undefined,
        importStatus: 'updated',
        locations: {
          deleteMany: {},
          create: locationRows,
        },
      },
    });
    counters.updated++;
  } else {
    // Create new
    const slug = await ensureUniqueSlug(db, slugBase);
    const created = await db.opportunity.create({
      data: {
        ...pipeline.data,
        ...importFields,
        status: resolveImportedOpportunityStatus({
          autoPublish: source.autoPublish,
          deadline: importFields.deadline,
        }),
        slug,
        sort: 0,
        categoryId,
        organizationId,
        locations: { create: locationRows },
      } as unknown as Prisma.OpportunityUncheckedCreateInput,
    });
    createdId = created.id;
    counters.imported++;
  }

  // Chunked translation engine — plans every source field into staged chunks
  // and works Persian (then Pashto) within a small import-time budget.
  // Whatever the budget does not finish stays queued for the background tick;
  // public fa/ps fields are only ever written by an atomic 100% commit.
  const targetId = dedupe.action === 'update' ? dedupe.existing.id : createdId;

  // Source observation (Phase 3/4): record WHERE this sighting happened, on
  // both the create and the update path. A review-band cross-source candidate
  // rides along in rawData for the Discovery Inbox.
  if (targetId) {
    try {
      await ensureSourceObservation(db, {
        opportunityId: targetId,
        sourceName: source.name,
        sourceRole: resolveSourceRole({ sourceName: source.name, scraperKey: source.scraperKey }),
        sourceUrl: listing.sourceUrl ?? null,
        importSourceId: source.id,
        organizationId,
        sourcePublishedAt: parseSourcePublishedAt(listing.publishedDate ?? null),
        contentHash: hash,
        vacancyNumber: extractVacancyNumber(listing),
        observedApplyUrl: applyUrl,
        observedDeadline: importFields.deadline,
        rawData: crossReview ? { matchReview: crossReview } : undefined,
        seenAt: new Date(),
      });
    } catch (e) {
      console.warn('[import] source observation failed (continuing):', (e as Error).message);
    }
  }

  if (targetId && !bounded) {
    try {
      const { processOpportunityNow } = await import('@/lib/ai/translate-engine');
      await processOpportunityNow(targetId, 90_000);
    } catch (e) {
      // Translation is best-effort at import time — the queue owns the rest.
      console.warn('[import] translation engine pass failed:', (e as Error).message);
    }
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
