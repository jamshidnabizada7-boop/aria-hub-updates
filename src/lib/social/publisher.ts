import { rotatedFamily, rotationCategory } from '@/lib/social/studio/rotation';
import { getLocalizedContent } from '@/lib/i18n-content';
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
import { mkdir, writeFile } from 'node:fs/promises';
import { socialRenderBaseUrl } from '@/lib/automation/auth';
import { existsSync } from 'node:fs';

// Linux fallback paths kept for the original sandbox host. CHROMIUM_PATH lets
// a container/host override (set to /usr/bin/chromium in the deploy image).
const CHROME_CANDIDATES = [
  ...(process.env.CHROMIUM_PATH ? [process.env.CHROMIUM_PATH] : []),
  '/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell',
  '/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
];
import { join } from 'node:path';
import os from 'node:os';
import { db } from '@/lib/db';
import type { PlanPost } from '@/lib/social/plan';
import {
  buildOpportunityDistributionPlan,
  DEFAULT_OPPORTUNITY_BATCH_SIZE,
  DEFAULT_OPPORTUNITY_BATCH_TIMES_AFT,
  DEFAULT_OPPORTUNITY_DAILY_TARGET,
  DEFAULT_OPPORTUNITY_REPEAT_DAYS,
} from '@/lib/social/opportunity-distribution';
import {
  opportunityDistributionCapacity,
  opportunityScheduleForIndex,
} from '@/lib/social/opportunity-distribution-schedule';
import { buildCaption, type CaptionInput } from '@/lib/social/captions';
import { isAllowedStudioMediaUrl } from '@/lib/social/studio/media-url';
import { resolveExecutable } from '@/lib/import/scrapers/browser-fetch';
import type { Lang } from '@/lib/i18n-config';
import type { PostTemplate } from '@/lib/social/brand';
import type { PosterSize } from '@/lib/social/templates';
import { translate } from '@/lib/i18n';

// Afghanistan Time = UTC+4:30 (no DST).
const AFT_OFFSET_MIN = 270;
export const DEFAULT_SLOTS_AFT = ['08:00', '12:30', '20:00'];

const PUBLIC_DIR = join(process.cwd(), 'public', 'generated-posts');
const PUBLIC_BASE = `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myariahub.com').replace(/\/$/, '')}/generated-posts`;

/** Per-platform caption budget — blocks are dropped whole, never cut mid-line. */
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
  studioTheme?: string;
  studioLayout?: string;
  translateBackoffUntil?: string | null;
  lastQueueBuildDate?: string | null;
  tickRunning?: boolean;
  facebookGroupsEnabled?: boolean;
  facebookGroupPaused?: boolean;
  opportunityOnlyAutomation?: boolean;
  opportunityDailyTarget?: number;
  opportunityBatchSize?: number;
  opportunityRepeatDays?: number;
  opportunityBatchTimes?: string[];
};

export async function getState(): Promise<AutomationStateShape> {
  const row = await db.automationState.findUnique({ where: { id: 'singleton' } });
  return ((row?.state ?? {}) as AutomationStateShape) || {};
}

export async function patchState(patch: Partial<AutomationStateShape>): Promise<AutomationStateShape> {
  const json = JSON.stringify(patch);
  await db.$executeRaw`
    INSERT INTO "AutomationState" (id, state, "updatedAt")
    VALUES ('singleton', ${json}::jsonb, now())
    ON CONFLICT (id) DO UPDATE
    SET state = "AutomationState".state || ${json}::jsonb, "updatedAt" = now()`;
  return getState();
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

export function buildCanvasProps(
  post: PlanPost,
  lang: Lang,
  size: PosterSize,
  design?: { themeId?: string; layout?: string },
): CanvasProps {
  const tr = (key: string, params?: Record<string, string | number>) => translate(lang, key, params);
  const base: CanvasProps = {
    template: post.template,
    lang,
    size,
    themeId: design?.themeId,
    layout: design?.layout,
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
  return db.$transaction(async (tx) => {
    // Shared with Studio ensure-row: serialize daily queue creation across the
    // independent worker, legacy tick and manual design requests.
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(742194)');
    const stored = await tx.automationState.findUnique({ where: { id: 'singleton' } });
    const state = (stored?.state ?? {}) as AutomationStateShape;
    const todayAft = new Date(Date.now() + AFT_OFFSET_MIN * 60000).toISOString().slice(0, 10);
    if (state.lastQueueBuildDate === todayAft) return { created: 0 };
    const primary = state.captionLangs?.[0] ?? 'fa';
    const slots = state.opportunityBatchTimes?.length ? state.opportunityBatchTimes : DEFAULT_OPPORTUNITY_BATCH_TIMES_AFT;
    const batchSize = Math.min(10, Math.max(1, state.opportunityBatchSize ?? DEFAULT_OPPORTUNITY_BATCH_SIZE));
    const target = Math.min(state.opportunityDailyTarget ?? DEFAULT_OPPORTUNITY_DAILY_TARGET, opportunityDistributionCapacity(slots, batchSize));
    const posts = await buildOpportunityDistributionPlan(primary, { target, repeatDays: state.opportunityRepeatDays ?? DEFAULT_OPPORTUNITY_REPEAT_DAYS });
    // A morning import can populate an initially empty database later today.
    if (!posts.length) return { created: 0 };
    const designs = await tx.studioDesign.findMany({ where: { forDate: todayAft } });
    const dayStart = new Date(todayAft + 'T00:00:00.000Z');
    dayStart.setUTCMinutes(dayStart.getUTCMinutes() - AFT_OFFSET_MIN);
    const existing = await tx.socialPostQueue.findMany({
      where: { scheduledFor: { gte: dayStart, lt: new Date(dayStart.getTime() + 86400000) } },
      select: { contentRef: true },
    });
    const refs = new Set(existing.map((row) => row.contentRef));
    const rows: { scheduledFor: Date; templateType: string; contentRef: string; contentJson: object; captionJson: object }[] = [];
    const familyOrdinals = { career: 0, scholarship: 0, deadline: 0 };
    for (const [index, post] of posts.entries()) {
      const ref = post.opp?.slug;
      const schedule = opportunityScheduleForIndex(index, slots, batchSize);
      if (!ref || !schedule || refs.has(ref) || refs.has(post.key)) continue;
      const design = designs.find((d) => d.contentRef === ref || d.contentRef === post.key);
      const overrides = (design?.overrides ?? {}) as Record<string, unknown>;
      const captions: Record<string, string> = {};
      const savedCaptions = (design?.captionOverride ?? {}) as Record<string, string>;
      for (const lang of ['fa', 'ps', 'en'] as Lang[]) {
        const title = getLocalizedContent(post.opp!.title, post.opp!.titleI18n as Record<string, string> | null, lang);
        captions[lang] = savedCaptions[lang] || buildCaption(captionInputOf({ ...post, title }, lang));
      }
      const props = buildCanvasProps(post, primary, (design?.size ?? 'square') as PosterSize, {
        themeId: design?.themeId ?? state.studioTheme, layout: design?.layout ?? state.studioLayout,
      });
      if (props.posterData && overrides.title) {
        props.posterData = { ...(props.posterData as object), title: overrides.title, titleI18n: { [primary]: overrides.title } };
      }
      const category = post.opp?.category?.name ?? '';
      const group = rotationCategory(post.template, category);
      const automaticFamily = rotatedFamily(post.template, category, todayAft, group ? familyOrdinals[group]++ : 0);
      rows.push({
        scheduledFor: new Date(aftSlotToUtc(schedule.slot).getTime() + schedule.offsetMinutes * 60000),
        templateType: post.template, contentRef: ref,
        contentJson: {
          ...props, ...(automaticFamily ? { designFamily: automaticFamily } : {}), category, salary: post.opp?.salary, organization: post.opp?.organization, country: post.opp?.country,
          deadlineDate: post.opp?.deadline, ...overrides, template: post.template, sourceSlug: ref,
        },
        captionJson: captions,
      });
    }
    const result = await tx.socialPostQueue.createMany({ data: rows, skipDuplicates: true });
    const patch = JSON.stringify({ lastQueueBuildDate: todayAft });
    await tx.$executeRawUnsafe(
      'INSERT INTO "AutomationState" (id, state, "updatedAt") VALUES (\'singleton\', $1::jsonb, now()) ON CONFLICT (id) DO UPDATE SET state = "AutomationState".state || $1::jsonb, "updatedAt" = now()', patch,
    );
    return { created: result.count };
  }, { timeout: 30000, maxWait: 10000 });
}

// ── 2. renderer (playwright screenshots the CODE template) ──────────────────
async function verifyPublicImageUrl(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(20000), redirect: 'error' });
    const type = head.headers.get('content-type') || '';
    if (head.ok && type.startsWith('image/')) return true;

    const get = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { Range: 'bytes=0-32' },
      signal: AbortSignal.timeout(20000),
      redirect: 'error',
    });
    const getType = get.headers.get('content-type') || '';
    await get.body?.cancel();
    return get.ok && getType.startsWith('image/');
  } catch {
    return false;
  }
}

async function renderQueueImage(baseUrl: string, props: CanvasProps, requireDurableMedia: boolean): Promise<{ file: string; publicUrl: string; localPath: string | null } | null> {
  // Chrome resolution order: env override → known local installs (self-host /
  // workstation) → @sparticuz/chromium (serverless bundle for Vercel). Without
  // the serverless fallback the render step silently returned null on Vercel
  // and every platform fell back to text-only posts.
  let exe = resolveExecutable() ?? CHROME_CANDIDATES.find((p) => existsSync(p)) ?? null;
  let launchArgs = ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
  if (!exe) {
    try {
      const chromium = (await import('@sparticuz/chromium')).default;
      exe = await chromium.executablePath();
      launchArgs = [...chromium.args];
    } catch {
      return null;
    }
  }
  if (!exe) return null;
  let browser: import('playwright-core').Browser | null = null;
  try {
    const { chromium } = await import('playwright-core');
    browser = await chromium.launch({
      executablePath: exe,
      args: launchArgs,
    });
    const vh = props.size === 'story' ? 2100 : props.size === 'portrait' ? 1500 : 1180;
    const page = await browser.newPage({ viewport: { width: 1180, height: vh }, serviceWorkers: 'block' });
    const renderOrigin = new URL(baseUrl).origin;
    await page.route('**/*', async (route) => {
      const requestUrl = route.request().url();
      try {
        const url = new URL(requestUrl);
        if (url.protocol === 'data:' || url.protocol === 'blob:' ||
            url.origin === renderOrigin || isAllowedStudioMediaUrl(requestUrl)) {
          await route.continue();
        } else {
          await route.abort();
        }
      } catch {
        await route.abort();
      }
    });
    const qs = encodeURIComponent(JSON.stringify(props));
    if (process.env.SOCIAL_RENDER_TOKEN) await page.context().addCookies([{ name: 'aria_render', value: process.env.SOCIAL_RENDER_TOKEN, url: renderOrigin, httpOnly: true, sameSite: 'Strict', secure: renderOrigin.startsWith('https:') }]);
    await page.goto(`${baseUrl}/fa/studio-render?p=${qs}`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForSelector('[data-studio-canvas="1"][data-render-ready="1"]', { timeout: 15000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (img) => img.decode()));
    });
    const el = await page.$('[data-studio-canvas="1"]');
    if (!el) throw new Error('canvas element not found');
    // JPEG is compatible with Instagram feed image publishing; Studio's
    // interactive PNG export is unchanged. No temporary file is retained.
    const file = `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const buf = await el.screenshot({ type: 'jpeg', quality: 92 });

    // Prefer durable object storage on EVERY host when configured. A separate
    // worker (for example Oracle VM) must not fabricate a myariahub.com URL for
    // a file that only exists on its local filesystem.
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import('@vercel/blob');
        const blob = await put(`generated-posts/${file}`, buf, { access: 'public', addRandomSuffix: false, contentType: 'image/jpeg', abortSignal: AbortSignal.timeout(30000) });
        if (!(await verifyPublicImageUrl(blob.url))) {
          console.error('[render] blob uploaded but public verification failed:', blob.url);
          return null;
        }
        return { file, publicUrl: blob.url, localPath: null };
      } catch (e) {
        console.error('[render] blob upload failed:', e instanceof Error ? e.message : String(e));
        return null;
      }
    }

    // Opportunity posts always need a durable URL, regardless of host setup.
    // Vercel is ephemeral, and other workers can require this for manual posts.
    if (requireDurableMedia || process.env.VERCEL || process.env.SOCIAL_REQUIRE_DURABLE_MEDIA === '1') {
      console.error('[render] durable media unavailable: BLOB_READ_WRITE_TOKEN is required');
      return null;
    }

    // Persistent/self-hosted deployments may serve files written under public/.
    await mkdir(PUBLIC_DIR, { recursive: true });
    await writeFile(join(PUBLIC_DIR, file), buf);
    return { file, publicUrl: `${PUBLIC_BASE}/${file}`, localPath: join(PUBLIC_DIR, file) };
  } catch (e) {
    console.error('[render] failed:', e instanceof Error ? e.message : String(e));
    return null;
  } finally {
    try { await browser?.close(); } catch { /* noop */ }
  }
}

// ── housekeeping: generated-posts retention ─────────────────────────────────
const POST_RETENTION_DAYS = 30;

/** Delete generated post images older than the retention window. Best-effort. */
export async function cleanupGeneratedPosts(): Promise<number> {
  try {
    const { readdir, unlink } = await import('node:fs/promises');
    const files = await readdir(PUBLIC_DIR);
    const cutoff = Date.now() - POST_RETENTION_DAYS * 86400000;
    let removed = 0;
    for (const f of files) {
      if (!/\.(?:png|jpg)$/.test(f)) continue;
      const path = join(PUBLIC_DIR, f);
      const st = await (await import('node:fs/promises')).stat(path).catch(() => null);
      if (st && st.mtimeMs < cutoff) {
        await unlink(path).catch(() => undefined);
        removed++;
      }
    }
    return removed;
  } catch {
    return 0;
  }
}

// ── 3. publish flow ──────────────────────────────────────────────────────────
export async function renderDueQueue(baseUrl: string, limit = 2): Promise<{ rendered: number; failed: number }> {
  // Stale-render sweep: a process that died mid-render leaves rows in
  // 'rendering' forever (they were never publishable from that state).
  // Rendering touches no external API, so resetting to pending is safe.
  await db.socialPostQueue.updateMany({
    where: { status: 'rendering', claimedAt: { lt: new Date(Date.now() - RENDER_CLAIM_TIMEOUT_MS) } },
    data: { status: 'pending', claimedAt: null },
  }).catch(() => undefined);
  const rows = await db.socialPostQueue.findMany({
    where: {
      status: { in: ['pending', 'failed'] },
      imageStatus: { not: 'ready' },
      renderAttempts: { lt: 3 },
      OR: [{ nextRenderAttemptAt: null }, { nextRenderAttemptAt: { lte: new Date() } }],
      requiresManualPublish: false,
      templateType: { in: ['spotlight', 'deadline'] },
      scheduledFor: { lte: new Date(Date.now() + 3600000) },
    },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  });
  let rendered = 0;
  let failed = 0;
  for (const row of rows) {
    const ok = await renderOneQueueRow(row.id, baseUrl);
    if (ok) rendered++; else failed++;
  }
  return { rendered, failed };
}

/** Render (or re-render) ONE queue row's image and mark it ready.
 *
 * The claim is compare-and-swap just like publishing. This matters now that a
 * persistent social worker can run beside the legacy tick/backstop: only one
 * process may launch Chromium for a given queue row.
 */
export async function renderOneQueueRow(id: string, baseUrl = socialRenderBaseUrl()): Promise<boolean> {
  const row = await db.socialPostQueue.findUnique({ where: { id } });
  if (!row) return false;
  // Re-check memory right before launching chrome — a compile wave may have
  // started between the tick's gate and this call.
  if (!process.env.VERCEL && Math.floor(os.freemem() / 1024 / 1024) < 900) return false;

  const claimAt = new Date();
  const claim = await db.socialPostQueue.updateMany({
    where: {
      id,
      status: { in: ['pending', 'failed'] },
      imageStatus: { not: 'ready' },
    },
    data: { status: 'rendering', claimedAt: claimAt },
  });
  if (claim.count === 0) return false;

  const img = await renderQueueImage(baseUrl, row.contentJson as CanvasProps, ['spotlight', 'deadline'].includes(row.templateType));
  await db.socialPostQueue.updateMany({
    where: { id, status: 'rendering', claimedAt: claimAt },
    data: {
      status: img ? 'ready' : 'failed',
      imageStatus: img ? 'ready' : 'failed',
      claimedAt: null,
      renderAttempts: { increment: 1 },
      nextRenderAttemptAt: img ? null : new Date(Date.now() + 5 * Math.pow(3, row.renderAttempts) * 60000),
      error: img ? null : 'media render/upload failed — opportunity posts will not publish without a durable image',
      ...(img ? { imagePaths: { square: img.publicUrl, ...(img.localPath ? { local: img.localPath } : {}) } } : {}),
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

export { publishDueQueue, publishQueueRow } from '@/lib/social/queue-publishing';
