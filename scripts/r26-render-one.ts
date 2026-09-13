import { db } from '../src/lib/db';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const row = await db.socialPostQueue.findFirst({ where: { templateType: 'quote', imageStatus: 'failed' } });
if (!row) { console.log('none'); process.exit(0); }
const props = row.contentJson as Record<string, unknown>;
console.log('props keys:', Object.keys(props).join(','));
console.log('title:', String(props.title).slice(0, 60));

const exe = '/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell';
const { chromium } = await import('playwright-core');
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1180, height: 1500 } });
page.on('pageerror', (e) => console.log('PAGE ERROR:', String(e).slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERR:', m.text().slice(0, 150)); });
const qs = encodeURIComponent(JSON.stringify(props));
try {
  const resp = await page.goto(`http://127.0.0.1:3000/fa/studio-render?p=${qs}`, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('status:', resp?.status());
  await page.waitForSelector('[data-studio-canvas="1"]', { timeout: 20000 });
  const el = await page.$('[data-studio-canvas="1"]');
  await mkdir(join(process.cwd(), 'public', 'generated-posts'), { recursive: true });
  await el!.screenshot({ path: join(process.cwd(), 'public', 'generated-posts', 'render-quote.png') });
  console.log('OK saved');
} catch (e) {
  console.error('ERR:', (e instanceof Error ? e.message : e).slice(0, 250));
}
await browser.close();
process.exit(0);
