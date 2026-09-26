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
      // Use an actual public record: the navigation also contains /saved.
      const response = await page.request.get(BASE + '/api/opportunities/list?limit=1');
      expect(response.ok()).toBe(true);
      const data = await response.json();
      const item = (data.items ?? data.opportunities ?? data.data)?.[0];
      expect(item?.slug).toBeTruthy();
      const detailLink = page.locator('a[href="/en/opportunities/' + item.slug + '"]').first();
      await detailLink.waitFor({ timeout: 30000 });
      await detailLink.click();
      await page.waitForURL('**/en/opportunities/' + item.slug, { timeout: 30000 });
      const h1 = await page.locator('h1').innerText();
      expect(h1).toContain(item.titleI18n?.en || item.title);
      expect(await page.locator('html').getAttribute('lang')).toBe('en');
      expect(await page.locator('html').getAttribute('dir')).toBe('ltr');
    } finally {
      await browser.close();
    }
  }, 120000);
});
