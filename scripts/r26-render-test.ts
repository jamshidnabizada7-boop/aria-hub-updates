import { db } from '../src/lib/db';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const row = await db.socialPostQueue.findFirst({ where: { imageStatus: 'failed' } });
if (!row) { console.log('no failed row'); process.exit(0); }
const props = row.contentJson as Record<string, unknown>;
console.log('template:', props.template, '| lang:', props.lang, '| title:', String(props.title).slice(0, 50));

const exe = '/home/z/.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell';
console.log('exe exists:', existsSync(exe));

const { chromium } = await import('playwright-core');
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1180, height: 1500 } });
const qs = encodeURIComponent(JSON.stringify(props));
const url = `http://127.0.0.1:3000/fa/studio-render?p=${qs}`;
console.log('goto:', url.slice(0, 90));
try {
  const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('status:', resp?.status());
  await page.waitForSelector('[data-studio-canvas="1"]', { timeout: 20000 });
  const el = await page.$('[data-studio-canvas="1"]');
  console.log('element found:', !!el);
  if (el) {
    await mkdirSync();
    const out = join(process.cwd(), 'public', 'generated-posts', 'render-test.png');
    await el.screenshot({ path: out });
    console.log('PNG saved:', out);
  }
} catch (e) {
  console.error('RENDER ERROR:', (e instanceof Error ? e.message : e).slice(0, 300));
}
await browser.close();
process.exit(0);

async function mkdirSync() {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(join(process.cwd(), 'public', 'generated-posts'), { recursive: true });
}
