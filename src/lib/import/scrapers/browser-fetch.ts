/**
 * Headless-browser fetch transport for the import pipeline.
 *
 * Some sources defeat every plain-HTTP transport:
 *  - acbar.org serves an Imunify360 JS interstitial even to curl with a full
 *    browser header fingerprint (verified 2026-09-13) — the challenge only
 *    clears when its JavaScript actually runs and sets a clearance cookie.
 *  - jobs.af detail pages are a client-rendered shell over plain HTTP; the
 *    full job fact sheet only exists after hydration.
 *
 * This module drives the locally installed Chrome/Edge through
 * playwright-core (no bundled browser download) and exposes two primitives:
 *
 *   renderHtml(url, opts)  → rendered DOM string after JS has run
 *   getCookieHeader(url)   → "name=value; …" header captured after clearance
 *
 * A single browser + persistent context is shared for the life of the
 * process so clearance cookies survive across pages (one challenge per run,
 * not per request). Every function resolves to `null` on failure — callers
 * fall back to their plain-HTTP paths; nothing here ever throws.
 */

import { existsSync } from 'node:fs';
import type { Browser, BrowserContext } from 'playwright-core';

/** Real-Chrome UA override so headless mode is not announced to the page. */
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const EXE_CANDIDATES: string[] = [
  process.env.CHROME_PATH || '',
  process.env.BROWSER_PATH || '',
  // Windows — Chrome then Edge
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  // Linux (import sandbox paths match src/lib/social/publisher.ts)
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
].filter(Boolean);

export interface RenderOptions {
  /** Keep polling until page HTML contains this substring (challenge pages self-reload). */
  untilSubstring?: string;
  /** Wait for this CSS selector as a faster alternative to untilSubstring. */
  waitSelector?: string;
  /** Overall budget for the whole render (default 30s). */
  timeoutMs?: number;
  /** Extra settle time after the condition is met (default 500ms). */
  settleMs?: number;
}

let browserPromise: Promise<{ browser: Browser; context: BrowserContext } | null> | null = null;

/** Locate a usable Chrome/Edge executable (env override → common paths). */
export function resolveExecutable(): string | null {
  return EXE_CANDIDATES.find((p) => existsSync(p)) || null;
}

async function getBrowser(): Promise<{ browser: Browser; context: BrowserContext } | null> {
  if (!browserPromise) {
    browserPromise = (async () => {
      const exe = resolveExecutable();
      if (!exe) return null;
      try {
        const { chromium } = await import('playwright-core');
        const isWindows = process.platform === 'win32';
        const browser = await chromium.launch({
          executablePath: exe,
          headless: true,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-gpu',
            ...(isWindows ? [] : ['--no-sandbox', '--disable-dev-shm-usage']),
          ],
        });
        const context = await browser.newContext({
          userAgent: DESKTOP_UA,
          viewport: { width: 1366, height: 900 },
          locale: 'en-US',
        });
        context.setDefaultTimeout(20000);
        return { browser, context };
      } catch {
        return null;
      }
    })();
  }
  return browserPromise;
}

/** Render `url` in the shared browser and return the final HTML, or null. */
export async function renderHtml(url: string, opts: RenderOptions = {}): Promise<string | null> {
  const runtime = await getBrowser();
  if (!runtime) return null;
  const { context } = runtime;
  const budget = opts.timeoutMs ?? 30000;
  const deadline = Date.now() + budget;

  let page: import('playwright-core').Page | null = null;
  try {
    page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.min(budget, 20000) });

    let html = await page.content();
    // Poll instead of waitForSelector: the page may reload itself (Imunify360
    // does setTimeout(reload, 5000)) and selector waits don't survive that.
    const hasCondition = Boolean(opts.untilSubstring || opts.waitSelector);
    while (hasCondition && Date.now() < deadline) {
      if (opts.untilSubstring && html.includes(opts.untilSubstring)) break;
      if (opts.waitSelector) {
        try {
          if (await page.$(opts.waitSelector)) break;
        } catch {
          /* detached during reload — keep polling */
        }
      }
      await new Promise((r) => setTimeout(r, 1000));
      try {
        html = await page.content();
      } catch {
        break;
      }
    }

    if (opts.settleMs) await new Promise((r) => setTimeout(r, opts.settleMs));
    html = await page.content();
    return html || null;
  } catch {
    return null;
  } finally {
    try {
      await page?.close();
    } catch {
      /* noop */
    }
  }
}

/**
 * Render `url` once and return the context's cookies for its origin as a
 * Cookie-header string. Subsequent plain-HTTP fetches can reuse it while the
 * clearance stays valid; call again if a challenge reappears.
 */
export async function getCookieHeader(url: string, opts: RenderOptions = {}): Promise<string | null> {
  const runtime = await getBrowser();
  if (!runtime) return null;
  const html = await renderHtml(url, opts);
  if (!html) return null;
  try {
    const { context } = runtime;
    const origin = new URL(url).origin;
    const cookies = await context.cookies(origin);
    if (!cookies.length) return null;
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  } catch {
    return null;
  }
}

/** Test whether a browser is available without paying the launch cost twice. */
export async function isBrowserFetchAvailable(): Promise<boolean> {
  return (await getBrowser()) !== null;
}

/** Shut the shared browser down (best-effort; safe to call repeatedly). */
export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const runtime = await browserPromise;
  browserPromise = null;
  try {
    await runtime?.browser.close();
  } catch {
    /* noop */
  }
}

// Best-effort cleanup so a lingering chrome.exe doesn't outlive the process.
for (const sig of ['exit', 'SIGINT', 'SIGTERM'] as const) {
  try {
    process.on(sig, () => {
      void closeBrowser();
    });
  } catch {
    /* non-node runtime without process events — ignore */
  }
}

// ─── Persistent profile (login-gated sources) ────────────────────────────────
// Some sources (jobs.af) hide listing details behind a login. A persistent
// browser profile lets a ONE-TIME manual login (scripts/jobsaf-login.ts)
// unlock detail pages for every later automated run — the session cookie
// survives process restarts because it lives on disk in the profile dir.

import { join } from 'node:path';

const PROFILE_DIR = process.env.BROWSER_PROFILE_DIR || join(process.cwd(), '.browser-profile');

let persistentContextPromise: Promise<BrowserContext | null> | null = null;

async function getPersistentContext(): Promise<BrowserContext | null> {
  if (!persistentContextPromise) {
    persistentContextPromise = (async () => {
      const exe = resolveExecutable();
      if (!exe) return null;
      try {
        const { chromium } = await import('playwright-core');
        const isWindows = process.platform === 'win32';
        const context = await chromium.launchPersistentContext(PROFILE_DIR, {
          executablePath: exe,
          headless: true,
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-gpu',
            ...(isWindows ? [] : ['--no-sandbox', '--disable-dev-shm-usage']),
          ],
          userAgent: DESKTOP_UA,
          viewport: { width: 1366, height: 900 },
          locale: 'en-US',
        });
        return context;
      } catch {
        return null;
      }
    })();
  }
  return persistentContextPromise;
}

/** Render `url` in the persistent (possibly logged-in) profile. */
export async function renderHtmlPersistent(url: string, opts: RenderOptions = {}): Promise<string | null> {
  const context = await getPersistentContext();
  if (!context) return null;
  const budget = opts.timeoutMs ?? 30000;
  const deadline = Date.now() + budget;

  let page: import('playwright-core').Page | null = null;
  try {
    page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.min(budget, 20000) });
    let html = await page.content();
    const hasCondition = Boolean(opts.untilSubstring || opts.waitSelector);
    while (hasCondition && Date.now() < deadline) {
      if (opts.untilSubstring && html.includes(opts.untilSubstring)) break;
      if (opts.waitSelector) {
        try {
          if (await page.$(opts.waitSelector)) break;
        } catch {
          /* detached — keep polling */
        }
      }
      await new Promise((r) => setTimeout(r, 1000));
      try {
        html = await page.content();
      } catch {
        break;
      }
    }
    if (opts.settleMs) await new Promise((r) => setTimeout(r, opts.settleMs));
    html = await page.content();
    return html || null;
  } catch {
    return null;
  } finally {
    try {
      await page?.close();
    } catch {
      /* noop */
    }
  }
}

/** Path of the persistent profile directory (for the login helper script). */
export function getProfileDir(): string {
  return PROFILE_DIR;
}

/** True when a persistent profile exists (assume it may hold a login). */
export function hasPersistentProfile(): boolean {
  try {
    return existsSync(join(PROFILE_DIR, 'Default'));
  } catch {
    return false;
  }
}
