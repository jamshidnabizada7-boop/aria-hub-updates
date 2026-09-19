/**
 * News import pipeline — RSS 2.0 feeds → News table (`rssNews` sources).
 *
 * Separate from the Opportunity pipeline: news items go into the `News`
 * model, not `Opportunity`. Sources are ImportSource rows with
 * type='news' and scraperKey='rssNews':
 *
 *   config: {
 *     rssUrl: string,        // feed URL (Ariana https://www.ariananews.af/rss/,
 *                            // ToloNews https://tolonews.com/rss.xml, …)
 *     maxItems?: number,     // per run (default 30)
 *     categoryName?: string, // NewsCategory resolved by name, created if missing
 *     relevanceFilter?: boolean, // default TRUE — keeps only jobs/scholarships/
 *                            // visa/opportunity-relevant items (news-relevance.ts);
 *                            // war/crime/foreign-conflict/sport items are dropped
 *   }
 *
 * Item mapping (checked against the live News/NewsCategory Prisma models):
 *   title            → title
 *   title (slugified, unique-ified) → slug  ← DEDUPE KEY
 *   description      → excerpt (HTML stripped, truncated)
 *   content:encoded or description → content (plain text; the site renders
 *                        News.content with whitespace-pre-line)
 *   enclosure | media:content | first <img> in HTML → image
 *   dc:creator       → author (fallback: source name)
 *   pubDate          → publishedAt
 *   categories       → tags (JSON array string)
 *
 * DEDUPE NOTE: the News model has NO sourceUrl/sourceName column, so runs
 * dedupe on the unique `slug`, which is generated from the item title
 * (hash-suffixed for non-Latin titles). Re-running a feed therefore skips
 * everything it already stored. Provenance is kept by appending a
 * "Source: <outlet> — <link>" line to the content and setting author to
 * the outlet name.
 *
 * Run logging mirrors the orchestrator: one ImportRun row per execution,
 * counters mirrored onto ImportSource.lastRun*.
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { classifyNewsRelevance } from './news-relevance';
import { DEFAULT_USER_AGENT, sanitizeError, sha256, slugify, sleep, stripHtml } from './utils';

/** Minimal surface of the Prisma client used here (keeps types loose). */
type NewsDb = {
  newsCategory: {
    findFirst: (args: Record<string, unknown>) => Promise<{ id: string; slug: string } | null>;
    create: (args: Record<string, unknown>) => Promise<{ id: string; slug: string }>;
  };
  news: {
    findUnique: (args: Record<string, unknown>) => Promise<{ id: string } | null>;
    create: (args: Record<string, unknown>) => Promise<{ id: string }>;
  };
  importRun: {
    create: (args: Record<string, unknown>) => Promise<{ id: string }>;
    update: (args: Record<string, unknown>) => Promise<unknown>;
  };
  importSource: {
    findUnique: (args: Record<string, unknown>) => Promise<NewsSourceRow | null>;
    findFirst: (args: Record<string, unknown>) => Promise<NewsSourceRow | null>;
    update: (args: Record<string, unknown>) => Promise<unknown>;
  };
};

export interface NewsSourceRow {
  id: string;
  name: string;
  type: string;
  scraperKey: string;
  baseUrl: string;
  enabled: boolean;
  autoPublish: boolean;
  config: string | null;
  defaultCategory: string | null;
}

export interface NewsImportOptions {
  /** ImportSource id — omit to auto-pick the least-recently-run news source. */
  sourceId?: string | null;
  triggeredBy?: string;
  /** Prisma client; defaults to the shared singleton. */
  db?: NewsDb;
}

export interface NewsImportSummary {
  runId: string;
  source: string;
  status: string;
  found: number;
  imported: number;
  updated: number;
  skipped: number;
  duplicates: number;
  failed: number;
  /** Items rejected by the topical relevance filter (off-topic for the platform). */
  filteredOut: number;
  processingMs: number;
}

/** Module-level guard: prevent overlapping runs of the same news source. */
const inFlight = new Set<string>();

/** Parsed RSS item. */
interface RssItem {
  title: string;
  link: string;
  pubDate: string | null;
  descriptionHtml: string;
  contentHtml: string;
  imageUrl: string | null;
  creator: string | null;
  categories: string[];
}

// ─── Public entry point ──────────────────────────────────────────────────────

export async function runNewsImport(opts: NewsImportOptions = {}): Promise<NewsImportSummary> {
  const { sourceId = null, triggeredBy = 'manual' } = opts;
  // Lazy import so scripts (and the orchestrator) control env/DATABASE_URL first.
  const db = (opts.db || (await getDb())) as unknown as NewsDb;
  const startedAt = Date.now();

  let source: NewsSourceRow | null;
  if (sourceId) {
    source = await db.importSource.findUnique({ where: { id: sourceId } });
    if (!source) throw new Error(`Import source "${sourceId}" not found.`);
  } else {
    source = await db.importSource.findFirst({
      where: { type: 'news', enabled: true },
      orderBy: [{ lastRunAt: { sort: 'asc', nulls: 'first' } }],
    });
    if (!source) throw new Error('No enabled news import sources found.');
  }

  if (inFlight.has(source.id)) {
    return {
      runId: '', source: source.name, status: 'skipped',
      found: 0, imported: 0, updated: 0, skipped: 0, duplicates: 0, failed: 0,
      filteredOut: 0,
      processingMs: Date.now() - startedAt,
    };
  }
  inFlight.add(source.id);

  const run = await db.importRun.create({ data: { sourceId: source.id, status: 'running', triggeredBy } });
  const counters = { found: 0, imported: 0, updated: 0, skipped: 0, duplicates: 0, failed: 0, filteredOut: 0 };
  const errors: Array<{ url: string; message: string; ts: string }> = [];
  let status = 'ok';

  try {
    const cfg = parseConfig(source.config);
    const rssUrl = cfg.rssUrl || source.baseUrl;
    if (!rssUrl) throw new Error('No rssUrl in source config and baseUrl is empty.');

    // 1. Fetch + parse the feed.
    const xml = await fetchTextWithRetry(rssUrl);
    const items = parseRss(xml).slice(0, Math.max(cfg.maxItems, 1));
    counters.found = items.length;

    // 2. Resolve the news category (create if missing).
    const categoryId = await resolveCategoryId(db, cfg.categoryName || source.defaultCategory);

    // 3. Upsert each item.
    for (const item of items) {
      try {
        // 3a. Topical relevance gate — the platform only carries jobs,
        // scholarships, visas & opportunity news. War/crime/foreign-conflict/
        // sport items are counted and dropped before touching the DB.
        if (cfg.relevanceFilter) {
          const verdict = classifyNewsRelevance({
            title: item.title,
            categories: item.categories,
            summary: stripHtml(buildExcerpt(item)).slice(0, 400),
          });
          if (!verdict.relevant) {
            counters.filteredOut++;
            counters.skipped++;
            continue;
          }
        }
        const slug = await slugForTitle(db, item.title);
        const existing = await db.news.findUnique({ where: { slug } });
        if (existing) {
          counters.skipped++;
          counters.duplicates++;
          continue;
        }
        if (!item.link) {
          counters.skipped++;
          continue;
        }
        await db.news.create({
          data: {
            title: item.title,
            slug,
            excerpt: buildExcerpt(item),
            content: buildContent(item, source.name),
            image: item.imageUrl,
            author: source.name,
            tags: item.categories.length ? JSON.stringify(item.categories.slice(0, 8)) : null,
            featured: false,
            status: source.autoPublish ? 'published' : 'draft',
            publishedAt: parsePubDate(item.pubDate) || new Date(),
            categoryId,
            seoTitle: item.title.slice(0, 180),
            seoDescription: buildExcerpt(item).slice(0, 300),
          },
        });
        counters.imported++;
      } catch (e) {
        counters.failed++;
        errors.push({ url: item.link, message: sanitizeError(e), ts: new Date().toISOString() });
      }
    }

    if (counters.failed > 0) status = counters.imported > 0 ? 'partial' : 'error';
    const processingMs = Date.now() - startedAt;

    await db.importRun.update({
      where: { id: run.id },
      data: {
        status, finishedAt: new Date(), processingMs,
        found: counters.found, imported: counters.imported, updated: counters.updated,
        skipped: counters.skipped, duplicates: counters.duplicates, failed: counters.failed,
        errors: errors.length ? JSON.stringify(errors) : null,
      },
    });
    await db.importSource.update({
      where: { id: source.id },
      data: { lastRunAt: new Date(), lastRunStatus: status, lastRunStats: JSON.stringify(counters) },
    });

    return { runId: run.id, source: source.name, status, processingMs, ...counters };
  } catch (e) {
    // Fatal error (feed unreachable etc.) — record and rethrow a clean message.
    const processingMs = Date.now() - startedAt;
    errors.push({ url: source.baseUrl, message: sanitizeError(e), ts: new Date().toISOString() });
    await db.importRun.update({
      where: { id: run.id },
      data: {
        status: 'error', finishedAt: new Date(), processingMs,
        found: counters.found, imported: counters.imported, failed: counters.failed + 1,
        errors: JSON.stringify(errors),
      },
    }).catch(() => {});
    await db.importSource.update({
      where: { id: source.id },
      data: {
        lastRunAt: new Date(), lastRunStatus: 'error',
        lastRunStats: JSON.stringify({ ...counters, failed: counters.failed + 1, message: sanitizeError(e) }),
      },
    }).catch(() => {});
    throw e;
  } finally {
    inFlight.delete(source.id);
  }
}

// ─── Config / DB helpers ─────────────────────────────────────────────────────

function parseConfig(raw: string | null): { rssUrl: string; maxItems: number; categoryName: string | null; relevanceFilter: boolean } {
  let cfg: Record<string, unknown> = {};
  try {
    cfg = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch { /* malformed config → defaults */ }
  return {
    rssUrl: typeof cfg.rssUrl === 'string' ? cfg.rssUrl : '',
    maxItems: Math.min(Math.max(Number(cfg.maxItems) || 30, 1), 100),
    categoryName: typeof cfg.categoryName === 'string' && cfg.categoryName.trim() ? cfg.categoryName.trim() : null,
    // Topical filter defaults ON: only jobs/scholarships/visa-relevant news.
    relevanceFilter: cfg.relevanceFilter !== false,
  };
}

async function getDb(): Promise<NewsDb> {
  const mod = await import('@/lib/db');
  return mod.db as unknown as NewsDb;
}

/** Find-or-create a NewsCategory by name (slug-ified). Returns null without a name. */
async function resolveCategoryId(db: NewsDb, categoryName: string | null): Promise<string | null> {
  if (!categoryName) return null;
  const slug = slugify(categoryName, 60);
  const existing = await db.newsCategory.findFirst({
    where: { OR: [{ slug }, { name: { equals: categoryName, mode: 'insensitive' } }] },
  });
  if (existing) return existing.id;
  const created = await db.newsCategory.create({
    data: { name: categoryName, slug, nameI18n: { en: categoryName } },
  });
  return created.id;
}

/**
 * Slug from the item title. Non-Latin titles (Farsi/Pashto news) slugify to
 * the generic fallback, so they get a hash-based unique slug instead.
 */
async function slugForTitle(db: NewsDb, title: string): Promise<string> {
  let slug = slugify(title, 80);
  if (slug === 'opportunity' || slug === 'news' || !slug) {
    const h = await sha256(title);
    slug = `news-${h.slice(0, 12)}`;
  }
  return slug;
}

// ─── Content builders ────────────────────────────────────────────────────────

/** Strip the WordPress "The post … first appeared on …" boilerplate. */
function stripFeedBoilerplate(html: string): string {
  return (html || '')
    .replace(/<p[^>]*>\s*The post\s[\s\S]*?first appeared on\s[\s\S]*?<\/p>\s*$/gi, '')
    .replace(/<p[^>]*>\s*The post\s[\s\S]*?<\/p>\s*$/gi, '');
}

function buildExcerpt(item: RssItem): string {
  const base = stripHtml(stripFeedBoilerplate(item.contentHtml || item.descriptionHtml || ''));
  const oneLine = base.replace(/\s+/g, ' ').trim();
  return oneLine.length > 300 ? `${oneLine.slice(0, 300)}…` : oneLine;
}

/** Plain-text body + provenance line (News renders whitespace-pre-line). */
function buildContent(item: RssItem, sourceName: string): string {
  const html = item.contentHtml || item.descriptionHtml || '';
  const text = stripHtml(stripFeedBoilerplate(html)).trim();
  const attribution = `Source: ${sourceName} — ${item.link}`;
  return text ? `${text}\n\n${attribution}` : attribution;
}

function parsePubDate(input: string | null): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

// ─── RSS fetching + parsing (no new deps — cheerio parses XML) ──────────────

async function fetchTextWithRetry(url: string, retries = 2): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': DEFAULT_USER_AGENT, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
        signal: controller.signal,
        redirect: 'follow', // e.g. ariananews.af/rss/ → /feed/
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const body = await res.text();
      await sleep(400);
      return body;
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(700 * Math.pow(2, attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`RSS fetch failed for ${url}: ${sanitizeError(lastErr)}`);
}

/**
 * Parse an RSS 2.0 (Atom-tolerant) feed into items.
 *
 * cheerio's xmlMode gives us a proper XML DOM (CDATA decoded, entities
 * resolved) without new dependencies. Namespaced tags (content:encoded,
 * dc:creator, media:content) are matched by local tagName because CSS
 * selectors treat the colon awkwardly.
 */
export function parseRss(xml: string): RssItem[] {
  const $: CheerioAPI = cheerio.load(xml, { xmlMode: true });

  /** Lower-cased tag name of a node ('content:encoded', 'media:content', …). */
  const tagName = (node: unknown): string => {
    const t = node as { tagName?: string; name?: string } | null;
    return ((t?.tagName || t?.name || '') as string).toLowerCase();
  };
  /** Decoded text of a child element, matching namespaced names too. */
  const childText = ($item: ReturnType<typeof $>, name: string): string => {
    const child = $item.children().toArray().find((c) => tagName(c) === name.toLowerCase());
    return child ? $item.children().filter((i, c) => tagName(c) === name.toLowerCase()).text().trim() : '';
  };
  /** Attribute of a namespaced child (media:content[url], enclosure[url]). */
  const childAttr = ($item: ReturnType<typeof $>, name: string, attr: string): string | null => {
    const child = $item.children().toArray().find((c) => tagName(c) === name.toLowerCase());
    return child ? $(child).attr(attr) || null : null;
  };
  /** First <img src="…"> found in an HTML string (already entity-decoded). */
  const firstImgSrc = (html: string): string | null => {
    if (!html) return null;
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return m?.[1] || null;
  };

  const items: RssItem[] = [];
  $('item').each((_, el) => {
    const $item = $(el);
    const title = childText($item, 'title');
    const link = childText($item, 'link') || childAttr($item, 'link', 'href') || childAttr($item, 'atom:link', 'href') || '';
    if (!title || !link) return;

    // CDATA/escaped HTML arrives entity-decoded via .text() — keep it raw so
    // image extraction and boilerplate stripping can work on the markup.
    const descriptionHtml = $item.children().toArray().find((c) => tagName(c) === 'description')
      ? $item.children('description').text() : '';
    const contentHtml = childText($item, 'content:encoded');

    // Image: enclosure → media:content/thumbnail → first <img> in the HTML.
    const imageUrl =
      childAttr($item, 'enclosure', 'url') ||
      childAttr($item, 'media:content', 'url') ||
      childAttr($item, 'media:thumbnail', 'url') ||
      firstImgSrc(contentHtml) ||
      firstImgSrc(descriptionHtml) ||
      null;

    const categories = $item.children().toArray()
      .filter((c) => tagName(c) === 'category')
      .map((c) => $(c).text().trim())
      .filter(Boolean);

    items.push({
      title,
      link: link.trim(),
      pubDate: childText($item, 'pubDate') || childText($item, 'dc:date') || null,
      descriptionHtml,
      contentHtml,
      imageUrl,
      creator: childText($item, 'dc:creator') || null,
      categories,
    });
  });

  return items;
}
