/**
 * Social auto-publisher — turns the deterministic daily plan into a scheduled
 * queue of ready-to-post items and publishes them at Afghanistan peak hours.
 *
 * Flow (per pipeline tick):
 *   1. buildTodaysQueue()  — once per UTC day: plan (per lang) → SocialPostQueue rows
 *  2. renderDue()          — playwright screenshots the CODE template (brand pattern)
 *  3. publishDue()         — posts to every enabled PublishChannel, records results
 *
 * All times are stored UTC; slots are defined in AFT (UTC+4:30).
 */
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// Linux fallback paths kept for the original sandbox host.
const CHROME_CANDIDATES = [
  '/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell',
  '/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
];
import { join } from 'node:path';
import os from 'node:os';
import { db } from '@/lib/db';
import { buildDailyPlan, type PlanPost } from '@/lib/social/plan';
import { buildCaption, type CaptionInput } from '@/lib/social/captions';
import { publishToPlatform } from '@/lib/social/channels';
import { notifyAdmin } from '@/lib/social/notify';
import { decryptCredentials } from '@/lib/social/credentials';
import { resolveExecutable } from '@/lib/import/scrapers/browser-fetch';
import type { Lang, PostTemplate, PosterSize } from '@/lib/social/brand';
import { translate } from '@/lib/i18n';

// Afghanistan Time = UTC+4:30 (no DST).
const AFT_OFFSET_MIN = 270;
export const DEFAULT_SLOTS_AFT = ['08:00', '12:30', '20:00'];

const PUBLIC_DIR = join(process.cwd(), 'public', 'generated-posts');
const PUBLIC_BASE = `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myariahub.com').replace(/\/$/, '')}/generated-posts`;

/** Per-platform caption budget — blocks are dropped whole, never cut mid-line. */
const CAPTION_LIMITS: Record<string, number> = { telegram: 1000, facebook: 4500, x: 270, instagram: 2100 };
const PUBLISH_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;
const RENDER_CLAIM_TIMEOUT_MS = 15 * 60 * 1000;

// ── time helpers ─────────────────────────────────────────────────────────────
/** UTC Date for "today's" AFT slot, e.g. '20:00' AFT. */
export function aftSlotToUtc(slotHm: string, dayShift = 0): Date {
  const [h, m] = slotHm.split(':').map((x) => parseInt(x, 10));
  const now = new Date();
  const aftNow = new Date(now.getTime() + AFT_OFFSET_MIN * 60000);
  const aftMidnightUtc = Date.UTC(aftNow.getUTCFullYear(), aftNow.getUTCMonth(), aftNow.getUTCDate()) - AFT_OFFSET_MIN * 60000;
  return new Date(aftMidnightUtc + dayShift * 86400000 + h * 3600000 + m * 60000);
}

type AutomationStateShape = {
  publishTimes?: string[];
  captionLangs?: Lang[];
  translateBatch?: number;
  autoImport?: boolean;
  autoPublish?: boolean;
  translateBackoffUntil?: string | null;
  lastQueueBuildDate?: string | null;
  tickRunning?: boolean;
};

export async function getState(): Promise<AutomationStateShape> {
  const row = await db.automationState.findUnique({ where: { id: 'singleton' } });
  return ((row?.state ?? {}) as AutomationStateShape) || {};
}

export async function patchState(patch: Partial<AutomationStateShape>): Promise<AutomationStateShape> {
  const current = await getState();
  const next = { ...current, ...patch };
  await db.automationState.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', state: next as unknown as object },
    update: { state: next as unknown as object },
  });
  return next;
}

// ── canvas props from a plan post (mirrors the studio preview exactly) ───────
type CanvasProps = Record<string, unknown>;

function daysLeftOf(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
}

function deadlineText(iso: string | null, lang: Lang): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-AF' : lang === 'ps' ? 'ps-AF' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function buildCanvasProps(post: PlanPost, lang: Lang, size: PosterSize): CanvasProps {
  const tr = (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
  const base: CanvasProps = {
    template: post.template,
    lang,
    size,
    title: post.title,
    note: post.meta,
  };
  switch (post.template) {
    case 'deadline':
      return { ...base, deadlineDate: post.opp?.deadline ?? null, note: post.meta };
    case 'tip':
      return { ...base, seriesNo: post.seriesNo ?? 1 };
    case 'quote':
      return base;
    case 'promo':
      return {
        ...base,
        checklist: [tr('social.post.promoCheck1'), tr('social.post.promoCheck2'), tr('social.post.promoCheck3')],
      };
    case 'news':
      return { ...base, newsDate: post.news?.publishedAt ?? null };
    case 'stat':
      return { ...base, stat: { value: post.stat?.value ?? '', label: tr(post.stat?.labelKey || 'social.post.statLiveOpps') } };
    case 'story':
      return { ...base, person: { name: post.story?.title ?? '', meta: post.meta ?? '' } };
    case 'spotlight':
    default: {
      // Spotlight uses the rich OpportunityPoster — precompute its PosterData
      // so the server-side renderer needs no DB access.
      const opp = post.opp;
      return {
        ...base,
        posterData: opp
          ? {
              slug: opp.slug,
              title: opp.title,
              titleI18n: opp.titleI18n ?? null,
              organization: opp.organization,
              country: opp.country,
              deadline: opp.deadline,
              featured: Boolean(opp.featured),
              salary: opp.salary,
              salaryI18n: opp.salaryI18n ?? null,
              category: opp.category ? { name: opp.category.name, nameI18n: opp.category.nameI18n ?? null } : null,
            }
          : null,
      };
    }
  }
}

function captionInputOf(post: PlanPost, lang: Lang): CaptionInput {
  return {
    template: post.template,
    lang,
    title: post.title,
    note: post.meta,
    org: post.opp?.organization ?? undefined,
    country: post.opp?.country ?? undefined,
    deadlineText: deadlineText(post.opp?.deadline ?? null, lang),
    slug: post.opp?.slug,
    daysLeft: daysLeftOf(post.opp?.deadline ?? null),
    seriesNo: post.seriesNo,
    statValue: post.stat?.value,
    statLabel: post.stat ? translate(lang, post.stat.labelKey) : undefined,
    personName: post.story?.title,
    personMeta: post.meta,
  };
}

// ── 1. queue builder ─────────────────────────────────────────────────────────
export async function buildTodaysQueue(): Promise<{ created: number }> {
  const state = await getState();
  const todayUtc = new Date().toISOString().slice(0, 10);
  if (state.lastQueueBuildDate === todayUtc) return { created: 0 };

  const slots = state.publishTimes?.length ? state.publishTimes : DEFAULT_SLOTS_AFT;
  const captionLangs: Lang[] = state.captionLangs?.length ? state.captionLangs : ['fa', 'ps', 'en'];

  // Deterministic plan — same order in every language (zip by index).
  const plans = await Promise.all((['fa', 'ps', 'en'] as Lang[]).map((l) => buildDailyPlan(l)));
  const base = plans[0];
  if (!base || base.posts.length === 0) return { created: 0 };

  const rows: {
    scheduledFor: Date; templateType: string; contentRef: string | null;
    contentJson: object; captionJson: object;
  }[] = [];

  base.posts.forEach((post, idx) => {
    const slot = slots[idx % slots.length];
    // Today's slots that already passed stay today (publish tick picks them up
    // immediately); future ones wait. Rows for the whole day are created at once.
    const scheduledFor = aftSlotToUtc(slot);
    const captions: Record<string, string> = {};
    (['fa', 'ps', 'en'] as Lang[]).forEach((l, li) => {
      const p = plans[li]?.posts[idx];
      if (p) captions[l] = p.caption;
    });
    // primary canvas language: first captionLang (fa default)
    const primary: Lang = captionLangs[0] ?? 'fa';
    const primaryIdx = (['fa', 'ps', 'en'] as Lang[]).indexOf(primary);
    const primaryPost = plans[primaryIdx]?.posts[idx] ?? post;
    const ref = post.opp?.slug ?? post.news?.slug ?? post.idea?.id ?? post.story?.id ?? post.stat?.labelKey ?? null;
    rows.push({
      scheduledFor,
      templateType: post.template,
      contentRef: ref,
      contentJson: buildCanvasProps(primaryPost, primary, 'square'),
      captionJson: captions,
    });
  });

  // skipDuplicates + the (contentRef, scheduledFor) unique index make the
  // build idempotent even if two ticks race past the daily cursor check.
  const res = await db.socialPostQueue.createMany({ data: rows, skipDuplicates: true });
  await patchState({ lastQueueBuildDate: todayUtc });
  void res;
  return { created: rows.length };
}

// ── 2. renderer (playwright screenshots the CODE template) ──────────────────
async function renderQueueImage(baseUrl: string, props: CanvasProps): Promise<{ file: string; publicUrl: string } | null> {
  // Shared resolver: env CHROME_PATH → Windows Chrome/Edge → Linux sandbox
  // paths (was hard-coded to one machine's /home/z cache — rendering silently
  // returned null everywhere else, killing the whole Instagram flow).
  const exe = resolveExecutable() ?? CHROME_CANDIDATES.find((p) => existsSync(p)) ?? null;
  if (!exe) return null;
  let browser: import('playwright-core').Browser | null = null;
  try {
    const { chromium } = await import('playwright-core');
    await mkdir(PUBLIC_DIR, { recursive: true });
    browser = await chromium.launch({
      executablePath: exe,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage({ viewport: { width: 1180, height: 1500 } });
    const qs = encodeURIComponent(JSON.stringify(props));
    await page.goto(`${baseUrl}/fa/studio-render?p=${qs}`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForSelector('[data-studio-canvas="1"]', { timeout: 15000 });
    const el = await page.$('[data-studio-canvas="1"]');
    if (!el) throw new Error('canvas element not found');
    const file = `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    await el.screenshot({ path: join(PUBLIC_DIR, file) });
    return { file, publicUrl: `${PUBLIC_BASE}/${file}` };
  } catch {
    return null;
  } finally {
    try { await browser?.close(); } catch { /* noop */ }
  }
}

// ── 3. publish flow ──────────────────────────────────────────────────────────
export async function renderDueQueue(baseUrl: string, limit = 2): Promise<{ rendered: number }> {
  // Stale-render sweep: a process that died mid-render leaves rows in
  // 'rendering' forever (they were never publishable from that state).
  // Rendering touches no external API, so resetting to pending is safe.
  await db.socialPostQueue.updateMany({
    where: { status: 'rendering', claimedAt: { lt: new Date(Date.now() - RENDER_CLAIM_TIMEOUT_MS) } },
    data: { status: 'pending', claimedAt: null },
  }).catch(() => undefined);
  const rows = await db.socialPostQueue.findMany({
    where: { status: 'pending', scheduledFor: { lte: new Date(Date.now() + 3600000) } },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  });
  let rendered = 0;
  for (const row of rows) {
    const ok = await renderOneQueueRow(row.id, baseUrl);
    if (ok) rendered++;
  }
  return { rendered };
}

/** Render (or re-render) ONE queue row's image and mark it ready. */
export async function renderOneQueueRow(id: string, baseUrl = 'http://127.0.0.1:3000'): Promise<boolean> {
  const row = await db.socialPostQueue.findUnique({ where: { id } });
  if (!row) return false;
  // Re-check memory right before launching chrome — a compile wave may have
  // started between the tick's gate and this call.
  if (Math.floor(os.freemem() / 1024 / 1024) < 1200) return false;
  await db.socialPostQueue.update({ where: { id }, data: { status: 'rendering', claimedAt: new Date() } });
  const img = await renderQueueImage(baseUrl, row.contentJson as CanvasProps);
  await db.socialPostQueue.update({
    where: { id },
    data: {
      status: 'ready',
      imageStatus: img ? 'ready' : 'failed',
      ...(img ? { imagePaths: { square: img.publicUrl, local: join(PUBLIC_DIR, img.file) } } : {}),
    },
  });
  return Boolean(img);
}

export function composeCaption(captions: unknown, langs: Lang[]): string {
  const c = (captions ?? {}) as Record<string, string>;
  return langs.map((l) => c[l]).filter(Boolean).join('\n\n');
}

/**
 * Compose a caption that fits a platform's limit by dropping whole language
 * blocks — never slicing mid-line. Every block carries its own 🔗 link and
 * hashtags, so any surviving block is a complete, usable caption. The old
 * `.slice(0, N)` cut mid-hashtag and could chop the link off entirely.
 */
export function composeCaptionWithLimit(captions: unknown, langs: Lang[], maxLen: number): string {
  const full = composeCaption(captions, langs);
  if (full.length <= maxLen) return full;
  const blocks = full.split('\n\n').map((b) => b.trim()).filter(Boolean);
  let out = '';
  for (const block of blocks) {
    const candidate = out ? `${out}\n\n${block}` : block;
    if (candidate.length > maxLen) break;
    out = candidate;
  }
  return out || full.slice(0, maxLen);
}

/** Pull the deep link out of a composed caption (every block embeds 🔗 URL). */
export function deepLinkOf(caption: string): string | null {
  return caption.match(/🔗\s*(\S+)/)?.[1] ?? null;
}

export async function publishDueQueue(limit = 2): Promise<{ published: number; failed: number }> {
  const state = await getState();
  if (state.autoPublish === false) return { published: 0, failed: 0 };
  const channels = await db.publishChannel.findMany({ where: { enabled: true } });
  if (channels.length === 0) return { published: 0, failed: 0 };

  // Stale-claim sweep: a worker that died between claiming and recording left
  // the row in 'publishing' forever. The platform call MAY have gone out —
  // fail the row (never silently re-queue → duplicate) and tell the admin.
  const stale = await db.socialPostQueue.updateMany({
    where: { status: 'publishing', claimedAt: { lt: new Date(Date.now() - PUBLISH_CLAIM_TIMEOUT_MS) } },
    data: { status: 'failed', claimedAt: null, error: 'publish claim timed out — check channel posts for an accidental duplicate before retrying', attempts: { increment: 1 } },
  }).catch(() => null);
  if (stale?.count) {
    void notifyAdmin('Publish claim timeout', [
      `${stale.count} queue row(s) were stuck in 'publishing' and are now marked failed.`,
      'Before retrying them by hand, check the channels for posts that may have gone out anyway.',
    ]);
  }

  const due = await db.socialPostQueue.findMany({
    // 'partial' rows are retried per-channel (channels already ok are skipped
    // below), so they are due again — they used to be frozen forever.
    where: { status: { in: ['ready', 'failed', 'partial'] }, scheduledFor: { lte: new Date() }, attempts: { lt: 3 } },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  });

  let published = 0;
  let failed = 0;
  for (const row of due) {
    const langs = state.captionLangs?.length ? state.captionLangs : (['fa', 'ps', 'en'] as Lang[]);
    const images = (row.imagePaths ?? {}) as { square?: string; local?: string };

    // Claim the row with a compare-and-swap: only the worker that flips the
    // status owns it. Two ticks (scheduler + cron backstop) used to both
    // select the same row and double-post it to every channel.
    const claim = await db.socialPostQueue.updateMany({
      where: { id: row.id, status: { in: ['ready', 'failed', 'partial'] } },
      data: { status: 'publishing', claimedAt: new Date() },
    });
    if (claim.count === 0) continue; // another worker claimed it first

    const prevResults = (row.results ?? {}) as Record<string, { ok?: boolean; error?: string }>;
    const results: Record<string, { ok: boolean; error?: string; downgraded?: string }> = {};
    const external: Record<string, { id: string | null; permalink: string | null }> = {};
    let anyOk = false;
    let tokenExpiredChannel: string | null = null;

    for (const ch of channels) {
      // Per-channel retry: channels that already succeeded in an earlier run
      // must NOT be posted to again (that's how partial rows froze/duplicated).
      if (prevResults[ch.platform]?.ok) {
        results[ch.platform] = { ok: true };
        anyOk = true;
        continue;
      }
      const caption = composeCaptionWithLimit(row.captionJson, langs, CAPTION_LIMITS[ch.platform] ?? 2200);
      const creds = decryptCredentials(ch.credentials);
      const r = await publishToPlatform(ch.platform, creds, {
        caption,
        imageUrl: images.square ?? null,
        imagePath: images.local ?? null,
        link: deepLinkOf(caption) || (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myariahub.com'),
      });
      results[ch.platform] = { ok: r.ok, ...(r.error ? { error: r.error } : {}), ...(r.downgraded ? { downgraded: r.downgraded } : {}) };
      if (r.ok) {
        anyOk = true;
        external[ch.platform] = { id: r.id ?? null, permalink: r.permalink ?? null };
        await db.publishChannel.update({
          where: { id: ch.id },
          data: { lastStatus: 'ok', lastError: null, lastPublishedAt: new Date() },
        });
      } else if (r.tokenExpired) {
        // Dead token: disable the channel and alert — retrying for days is noise.
        tokenExpiredChannel = ch.platform;
        await db.publishChannel.update({
          where: { id: ch.id },
          data: { lastStatus: 'error', lastError: r.error ?? 'token expired', enabled: false },
        });
      } else {
        await db.publishChannel.update({
          where: { id: ch.id },
          data: { lastStatus: 'error', lastError: r.error ?? 'unknown' },
        });
        if (r.rateLimited) break; // platform-wide throttle — skip its remaining posts this run
      }
    }

    // Merge over previous results so a partially-succeeded row keeps its wins.
    const merged: Record<string, { ok: boolean; error?: string; downgraded?: string }> = { ...prevResults };
    for (const [k, v] of Object.entries(results)) merged[k] = v;
    const mergedList = Object.values(merged);
    const allOk = mergedList.length > 0 && mergedList.every((r) => r.ok);
    const status = allOk ? 'published' : anyOk ? 'partial' : 'failed';

    await db.socialPostQueue.update({
      where: { id: row.id },
      data: {
        status,
        results: merged,
        externalIds: Object.keys(external).length ? { ...((row.externalIds ?? {}) as object), ...external } : (row.externalIds ?? undefined),
        attempts: { increment: 1 },
        claimedAt: null,
        error: allOk ? null : mergedList.map((r) => r.error).filter(Boolean).join(' | ').slice(0, 500) || 'channels pending or failed',
        publishedAt: allOk ? (row.publishedAt ?? new Date()) : row.publishedAt ?? null,
      },
    });
    if (allOk) published++; else failed++;

    // One-shot admin alert when a row exhausts its retries or a token died.
    if ((status !== 'published' && row.attempts + 1 >= 3 && !row.notifiedAt) || tokenExpiredChannel) {
      const sent = await notifyAdmin(
        tokenExpiredChannel ? `Publishing paused: ${tokenExpiredChannel} token rejected` : `Post failed after ${row.attempts + 1} attempts`,
        [
          tokenExpiredChannel
            ? `The ${tokenExpiredChannel} channel's credentials were rejected (error 190/expired). It has been disabled — reauthorize it in Admin → Automation.`
            : `Queue row ${row.id} (${row.templateType} / ${row.contentRef ?? 'no ref'}) failed on all remaining channels.`,
          ...(tokenExpiredChannel ? [] : [Object.values(results).map((r) => r.error).filter(Boolean).join(' | ').slice(0, 400) || 'no error detail']),
        ],
      );
      if (sent || !tokenExpiredChannel) {
        await db.socialPostQueue.update({ where: { id: row.id }, data: { notifiedAt: new Date() } }).catch(() => undefined);
      }
    }
  }
  return { published, failed };
}
