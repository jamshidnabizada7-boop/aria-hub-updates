/**
 * One-off visual verification: render the Brand Studio layout matrix through
 * the /studio-render headless route using system Edge, saving element PNGs.
 * Usage: node scripts/render-matrix.mjs  (dev server must be on :3000)
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'D:/tmp-studio-shots';
await mkdir(OUT, { recursive: true });

const BASE = {
  title: 'Hiring is accelerating across Afghanistan',
  stat: { value: '26+', label: 'Organizations hiring', sub: 'verified on ARIA HUB this week' },
};

const MATRIX = [
  { name: '01-split-midnight-square-stat', props: { template: 'stat', lang: 'en', size: 'square', themeId: 'midnight', layout: 'split', ...BASE } },
  { name: '02-frame-midnight-square-quote', props: { template: 'quote', lang: 'en', size: 'square', themeId: 'midnight', layout: 'frame', title: 'Your career is a journey, not a race — keep moving' } },
  { name: '03-stack-midnight-square-promo', props: { template: 'promo', lang: 'en', size: 'square', themeId: 'midnight', layout: 'stack', title: 'Everything you need, one platform', note: 'Free for job seekers', checklist: ['500+ verified jobs', 'Scholarships & fellowships', 'CV Builder & interview prep'] } },
  { name: '04-glass-ivory-square-tip', props: { template: 'tip', lang: 'en', size: 'square', themeId: 'ivory', layout: 'glass', title: 'Tailor your CV for every application', note: 'Tip seven in our career series', seriesNo: 7 } },
  { name: '05-banner-sunset-square-deadline', props: { template: 'deadline', lang: 'en', size: 'square', themeId: 'sunset', layout: 'banner', title: 'MoPH Medical Officer jobs close soon', deadlineDate: '2026-09-18' } },
  { name: '06-ticket-midnight-square-story', props: { template: 'story', lang: 'en', size: 'square', themeId: 'midnight', layout: 'ticket', title: 'From Kabul to a full scholarship in Europe', person: { name: 'Ahmad N.', meta: 'Chevening Scholar, 2025' } } },
  { name: '07-split-emerald-square-promo-fa', props: { template: 'promo', lang: 'fa', size: 'square', themeId: 'emerald', layout: 'split', title: 'هر آنچه نیاز دارید، یک پلتفرم', checklist: ['بیش از ۵۰۰ شغل تأیید شده', 'بورسیه‌ها و فلوشیپ‌ها', 'ساخت رزومه و آمادگی مصاحبه'] } },
  { name: '08-banner-sunset-portrait-news-fa', props: { template: 'news', lang: 'fa', size: 'portrait', themeId: 'sunset', layout: 'banner', title: 'سیاست جدید ویزا اعلام شد', note: 'تحلیل کامل در سایت', newsDate: '2026-09-12' } },
  { name: '09-frame-ivory-story-stat', props: { template: 'stat', lang: 'en', size: 'story', themeId: 'ivory', layout: 'frame', title: 'Countries covered by ARIA HUB', stat: { value: '35', label: 'Countries covered', sub: 'jobs, scholarships and visas' } } },
  { name: '10-classic-midnight-square-stat-baseline', props: { template: 'stat', lang: 'en', size: 'square', themeId: 'midnight', layout: 'classic', ...BASE } },
];

const { chromium } = await import('playwright-core');
// Optional argv filters: `node scripts/render-matrix.mjs 01 05` renders only
// configs whose name starts with those prefixes (resumable after OOM crashes).
const filters = process.argv.slice(2);
const selected = filters.length ? MATRIX.filter((m) => filters.some((f) => m.name.startsWith(f))) : MATRIX;
const browser = await chromium.launch({ channel: 'msedge', args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 2100 } });
page.on('pageerror', (e) => console.log('PAGE ERROR:', String(e).slice(0, 120)));

let ok = 0, fail = 0;
for (const { name, props } of selected) {
  const qs = encodeURIComponent(JSON.stringify(props));
  try {
    await page.goto(`http://127.0.0.1:3000/en/studio-render?p=${qs}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('[data-studio-canvas="1"]', { timeout: 20000 });
    await page.waitForSelector('img[alt="QR"]', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(400);
    const el = await page.$('[data-studio-canvas="1"]');
    await el.screenshot({ path: join(OUT, `${name}.png`) });
    console.log('OK  ', name);
    ok++;
  } catch (e) {
    console.error('FAIL', name, '→', (e instanceof Error ? e.message : e).slice(0, 160));
    fail++;
  }
}
await browser.close();
console.log(`done: ${ok} ok, ${fail} fail → ${OUT}`);
process.exit(0);
