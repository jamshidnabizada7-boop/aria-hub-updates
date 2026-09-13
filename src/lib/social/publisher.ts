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
import { join } from 'node:path';
import os from 'node:os';
import { db } from '@/lib/db';
import { buildDailyPlan, type PlanPost } from '@/lib/social/plan';
import { buildCaption, type CaptionInput } from '@/lib/social/captions';
import { publishToPlatform } from '@/lib/social/channels';
import type { Lang, PostTemplate, PosterSize } from '@/lib/social/brand';
import { translate } from '@/lib/i18n';

// Afghanistan Time = UTC+4:30 (no DST).
const AFT_OFFSET_MIN = 270;
export const DEFAULT_SLOTS_AFT = ['08:00', '12:30', '20:00'];

const PUBLIC_DIR = join(process.cwd(), 'public', 'generated-posts');
const PUBLIC_BASE = 'https://www.myariahub.com/generated-posts';

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

  await db.socialPostQueue.createMany({ data: rows });
  await patchState({ lastQueueBuildDate: todayUtc });
  return { created: rows.length };
}

// ── 2. renderer (playwright screenshots the CODE template) ──────────────────
const CHROME_CANDIDATES = [
  '/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell',
  '/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
];

async function renderQueueImage(baseUrl: string, props: CanvasProps): Promise<{ file: string; publicUrl: string } | null> {
  const exe = CHROME_CANDIDATES.find((p) => existsSync(p));
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
  await db.socialPostQueue.update({ where: { id }, data: { status: 'rendering' } });
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

export async function publishDueQueue(limit = 2): Promise<{ published: number; failed: number }> {
  const state = await getState();
  if (state.autoPublish === false) return { published: 0, failed: 0 };
  const channels = await db.publishChannel.findMany({ where: { enabled: true } });
  if (channels.length === 0) return { published: 0, failed: 0 };

  const due = await db.socialPostQueue.findMany({
    where: { status: { in: ['ready', 'failed'] }, scheduledFor: { lte: new Date() }, attempts: { lt: 3 } },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  });

  let published = 0;
  let failed = 0;
  for (const row of due) {
    const caption = composeCaption(row.captionJson, state.captionLangs?.length ? state.captionLangs : ['fa', 'ps', 'en']);
    const images = (row.imagePaths ?? {}) as { square?: string; local?: string };
    const results: Record<string, { ok: boolean; error?: string }> = {};
    let anyOk = false;
    for (const ch of channels) {
      const creds = (ch.credentials ?? {}) as Record<string, unknown>;
      const r = await publishToPlatform(ch.platform, creds, {
        caption,
        imageUrl: images.square ?? null,
        imagePath: images.local ?? null,
        link: 'https://www.myariahub.com',
      });
      results[ch.platform] = r;
      if (r.ok) {
        anyOk = true;
        await db.publishChannel.update({
          where: { id: ch.id },
          data: { lastStatus: 'ok', lastError: null, lastPublishedAt: new Date() },
        });
      } else {
        await db.publishChannel.update({
          where: { id: ch.id },
          data: { lastStatus: 'error', lastError: r.error ?? 'unknown' },
        });
      }
    }
    const done = anyOk;
    await db.socialPostQueue.update({
      where: { id: row.id },
      data: {
        status: done ? (Object.values(results).every((r) => r.ok) ? 'published' : 'partial') : 'failed',
        results,
        attempts: { increment: 1 },
        error: done ? null : Object.values(results).map((r) => r.error).filter(Boolean).join(' | ').slice(0, 500) || 'all channels failed',
        publishedAt: done ? new Date() : null,
      },
    });
    if (done) published++; else failed++;
  }
  return { published, failed };
}
