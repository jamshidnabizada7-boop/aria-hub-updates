/**
 * Browser E2E smoke — home → opportunities list → first detail page.
 *
 * GATED: only runs when E2E=1 (it needs the dev server AND a local Chrome).
 *   E2E=1 bun test tests/e2e-smoke.test.ts
 *
 * Uses the system Chrome via playwright-core (same resolution as the
 * renderers) — no bundled browser download.
 */
import { describe, expect, test } from 'bun:test';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe.skipIf(process.env.E2E !== '1')('browser smoke (E2E=1)', () => {
  test('opportunity list → detail flow renders real content', async () => {
    const { chromium } = await import('playwright-core');
    const { resolveExecutable } = await import('../src/lib/import/scrapers/browser-fetch');
    const exe = resolveExecutable();
    expect(exe).toBeTruthy();

    const browser = await chromium.launch({ executablePath: exe!, headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(`${BASE}/en/opportunities`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('a[href*="/opportunities/"]', { timeout: 30000 });

      const firstLink = await page.$eval('a[href*="/opportunities/"]', (a) => (a as HTMLAnchorElement).href);
      expect(firstLink).toContain('/en/opportunities/');

      await page.goto(firstLink, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const h1 = await page.$eval('h1', (el) => el.textContent?.trim() ?? '');
      expect(h1.length).toBeGreaterThan(3);
      expect(await page.content()).toContain('aria-lang');
    } finally {
      await browser.close();
    }
  }, 120000);
});
