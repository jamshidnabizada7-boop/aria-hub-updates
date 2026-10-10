/** Disposable candidate browser; localhost only, fresh profile, public listing copies, zero deliveries. */
import { chromium } from 'playwright-core';
import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { ARI_COPY, ariLinks } from '../../src/lib/ari';

const base = process.env.ARI_QA_ORIGIN || 'http://127.0.0.1:3106';
const dbUrl = new URL(process.env.DATABASE_URL || '');
if (base !== 'http://127.0.0.1:3106' || process.env.REQUIRE_TEST_DATABASE !== '1' || !['127.0.0.1', 'localhost'].includes(dbUrl.hostname) || !dbUrl.pathname.endsWith('_test')) throw Error('Isolated candidate only');
const output = process.env.ARI_QA_OUTPUT || '/tmp/ari-review';
await mkdir(output, { recursive: true });
const snapshot = JSON.parse(await readFile('design/ari/public-listing-snapshots.json', 'utf8'));
const db = new PrismaClient();
const beforeQueue = await db.socialPostQueue.count();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
let checks = 0;
const check = (condition: unknown, message: string) => { checks++; if (!condition) throw Error(message); };
const readyImages = async (page: any) => page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all(Array.from(document.images, async img => { if (img.complete) { try { await img.decode(); } catch {} } }));
});
try {
  for (const lang of ['en', 'fa', 'ps'] as const) for (const width of [320, 390, 1440]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: width === 320 ? 'reduce' : 'no-preference' });
    // Block all external requests, including analytics and delivery endpoints.
    await context.route('**/*', route => new URL(route.request().url()).origin === base || /^(data|blob):/.test(route.request().url()) ? route.continue() : route.abort());
    await context.addInitScript(({ theme }) => { localStorage.setItem('aria-cookie-consent', 'essential'); localStorage.setItem('theme', theme); }, { theme });
    const page = await context.newPage();
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(`${base}/${lang}`, { waitUntil: 'networkidle' });
    check(response?.ok(), `Home ${lang} ${width} ${theme}`);
    check(await page.locator('[data-ari-tip="home"]').count() === 1, 'One home tip');
    const launcher = page.getByRole('button', { name: ARI_COPY[lang].open, exact: true });
    await launcher.waitFor({ state: 'visible' });
    check(await page.locator('[data-ari-dock]').count() === 1, 'One coordinated dock');
    const dom = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir, overflow: document.documentElement.scrollWidth - window.innerWidth }));
    check(dom.lang === lang && dom.dir === (lang === 'en' ? 'ltr' : 'rtl'), 'Localized direction');
    check(dom.overflow <= 2, 'No home horizontal overflow');
    if (width === 320) check(await launcher.locator('.ari-float').evaluate(el => getComputedStyle(el).animationName) === 'none', 'Reduced motion');
    await launcher.focus(); await page.keyboard.press('Enter');
    const panel = page.locator('#ari-guide-panel'); await panel.waitFor({ state: 'visible' });
    await page.waitForTimeout(300);
    check(await panel.isVisible(), 'Guide stays open without observing itself as an obstruction');
    const bounds = await panel.boundingBox();
    check(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1, 'Panel contained at narrow width');
    for (const action of ariLinks(lang)) check(await panel.locator(`a[href="${action.href}"]`).count() === 1, 'Valid localized action ' + action.href);
    await readyImages(page);
    await page.screenshot({ path: `${output}/${lang}-${width}-${theme}-guide.png` });
    await page.keyboard.press('Escape');
    await panel.waitFor({ state: 'detached' });
    check(await panel.count() === 0, 'Escape closes guide');
    await page.waitForFunction(label => document.activeElement?.getAttribute('aria-label') === label, ARI_COPY[lang].open, { timeout: 3000 });
    check(await launcher.evaluate(el => el === document.activeElement), 'Focus returned');
    await launcher.click(); await page.getByRole('button', { name: ARI_COPY[lang].hide, exact: true }).click();
    await launcher.waitFor({ state: 'detached' });
    check(await launcher.count() === 0, 'Hide removes launcher');
    await page.reload({ waitUntil: 'networkidle' }); check(await launcher.count() === 0, 'Hidden preference survives reload');
    await page.getByRole('button', { name: ARI_COPY[lang].restore, exact: true }).click(); await launcher.waitFor({ state: 'visible' });
    await page.evaluate(() => { const dialog = document.createElement('div'); dialog.id = 'qa-obstruction'; dialog.setAttribute('aria-modal', 'true'); dialog.textContent = 'QA dialog'; document.body.appendChild(dialog); });
    await page.waitForTimeout(100); check(await page.locator('[data-ari-dock]').isHidden(), 'Steps aside for modal');
    await page.evaluate(() => document.getElementById('qa-obstruction')?.remove());
    await launcher.waitFor({ state: 'visible' });
    await page.emulateMedia({ media: 'print' }); check(await launcher.isHidden() && await page.locator('[data-ari-tip="home"]').isHidden(), 'Omitted in print');
    await page.emulateMedia({ media: 'screen' });
    check(errors.length === 0, 'No browser runtime errors: ' + errors.join(';'));
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === base || /^(data|blob):/.test(route.request().url()) ? route.continue() : route.abort());
  await context.addInitScript(() => localStorage.setItem('aria-cookie-consent', 'essential'));
  await context.addCookies([{ name: 'aria_render', value: process.env.SOCIAL_RENDER_TOKEN!, url: base, httpOnly: true }]);
  const page = await context.newPage();
  for (const lang of ['en', 'fa', 'ps'] as const) {
    for (const path of ['opportunities', 'opportunity-matcher', 'cv-builder', 'letters', 'services', 'contact', 'employers/post', 'submit-opportunity', 'track', `opportunities/${snapshot.samples[0].slug}`]) {
      const response = await page.goto(`${base}/${lang}/${path}`, { waitUntil: 'networkidle' });
      check(response?.ok(), `${lang}/${path} HTTP success`);
      check(await page.locator('[data-ari-tip]').count() === 1, `${lang}/${path} one contextual tip`);
      if (['cv-builder', 'letters', 'opportunity-matcher', 'contact', 'employers/post', 'track', 'submit-opportunity'].includes(path)) check(await page.locator('[data-ari-dock]').count() === 0, 'No floating overlay on forms/tools');
      await readyImages(page);
      await page.screenshot({ path: `${output}/${lang}-${path.split('/')[0]}-desktop.png` });
    }
    for (const row of snapshot.samples) for (const size of ['square', 'portrait', 'story']) {
      await page.goto(`${base}/${lang}/social-poster?slug=${row.slug}&size=${size}&ari=${row.category === 'job' ? 'classic' : 'scholar'}`, { waitUntil: 'networkidle' });
      const canvas = page.locator('[data-ari-poster]');
      await canvas.waitFor(); await readyImages(page);
      check(await page.locator('[data-ari-dock]').count() === 0, 'No widget in poster renderer');
      const png = await canvas.screenshot(); const meta = await sharp(png).metadata();
      check(meta.width === 1080 && meta.height === ({ square: 1080, portrait: 1350, story: 1920 } as Record<string, number>)[size], 'Exact social format pixels');
      const band = await canvas.locator('[data-ari-band]').boundingBox(); const content = await canvas.locator('[data-ari-content]').boundingBox();
      check(band && content && content.y + content.height <= band.y + 1, 'Mascot reserved below all content');
      check((await canvas.innerText()).includes(row.localized[lang].title), 'Real listing headline preserved');
      await writeFile(`${output}/${lang}-${row.category}-${size}.png`, png);
    }
    // Reusable blank template + site awareness campaign, without factual claims or queueing.
    for (const blank of [false, true]) {
      const props = { template: 'promo', lang, size: 'portrait', title: blank ? '' : ARI_COPY[lang].action, note: blank ? '' : ARI_COPY[lang].contexts.home, ari: { preset: 'global', align: 'end' }, checklist: [] };
      await page.goto(`${base}/${lang}/studio-render?p=${encodeURIComponent(JSON.stringify(props))}`, { waitUntil: 'networkidle' });
      const canvas = page.locator('[data-studio-canvas="1"][data-render-ready="1"]'); await canvas.waitFor(); await readyImages(page);
      await canvas.screenshot({ path: `${output}/${lang}-${blank ? 'blank-template' : 'awareness'}-portrait.png` });
    }
  }
  // Existing authenticated save path preserves ARI, while the browser's real PNG export uses the same node.
  const email = 'ari-qa@example.test';
  await db.adminUser.upsert({ where: { email }, update: {}, create: { email, name: 'ARI QA', role: 'admin', password: 'unused-test-hash' } });
  const payload = Buffer.from(JSON.stringify({ email, t: Date.now() })).toString('base64url');
  const session = payload + '.' + createHmac('sha256', process.env.ADMIN_SESSION_SECRET!).update(payload).digest('base64url');
  await context.addCookies([{ name: 'aria-admin-session', value: session, url: base, httpOnly: true }, { name: 'aria-lang', value: 'en', url: base }]);
  const design = { contentRef: 'ari-review-only', forDate: '2099-01-01', templateType: 'promo', themeId: 'midnight', layout: 'classic', size: 'portrait', overrides: { ari: { preset: 'global', size: 180, align: 'end' } } };
  const saved = await context.request.post(base + '/api/admin/studio/design', { data: { action: 'save', design, contentJson: { template: 'promo', lang: 'en', size: 'portrait', title: ARI_COPY.en.action, ari: design.overrides.ari }, captionJson: {} } });
  check(saved.ok(), 'Authenticated existing Studio save');
  const loaded = await context.request.get(base + '/api/admin/studio/design?date=2099-01-01');
  const savedJson = await loaded.json(); check(savedJson.designs.some((d: any) => d.contentRef === 'ari-review-only' && d.overrides.ari.preset === 'global'), 'Saved ARI override reload');
  await page.goto(base + '/admin', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Brand Studio/i }).click();
  const preset = page.locator('select').filter({ has: page.locator('option[value="scholar"]') });
  await preset.first().waitFor({ state: 'visible' }); await preset.first().selectOption('scholar');
  await page.locator('[data-ari-poster="scholar"]').first().waitFor();
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  const download = await downloadPromise; await download.saveAs(output + '/studio-actual-download.png');
  const exported = await sharp(output + '/studio-actual-download.png').metadata(); check(exported.width === 1080 && exported.format === 'png', 'Real existing Studio PNG export');
  check(await db.socialPostQueue.count() === beforeQueue, 'Zero posts queued or delivered');
  await context.close();
  await writeFile(output + '/verification.json', JSON.stringify({ checks, status: 'passed', locales: ['en', 'fa', 'ps'], viewports: [320, 390, 1440], themes: ['light', 'dark'], deliveryCalls: 0, screenshots: true }, null, 2));
  console.log(`PASS ${checks} ARI candidate checks; screenshots and unpublished PNG exports in ${output}`);
} finally { await browser.close(); await db.$disconnect(); }
