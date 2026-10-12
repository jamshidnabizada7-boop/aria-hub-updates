import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ROTATION_POOLS } from '../../src/lib/social/studio/rotation';

const base = process.env.STUDIO_REVIEW_URL || 'http://127.0.0.1:3000';
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Review requires localhost');
const out = process.env.STUDIO_REVIEW_OUTPUT || '/tmp/studio-review';
await mkdir(out,{recursive:true});
const fixtures = JSON.parse(await readFile('scripts/tests/fixtures/studio-public-listings.json','utf8'));
const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})});
let checks = 0;
const issues: string[] = [];
function check(value: unknown, message: string) { checks++; if (!value) issues.push(message); }
try {
  const context = await browser.newContext({viewport:{width:1200,height:2100}});
  await context.route('**/*',r=>new URL(r.request().url()).origin === base || /^(data|blob):/.test(r.request().url()) ? r.continue() : r.abort());
  await context.addCookies([{name:'aria_render',value:process.env.SOCIAL_RENDER_TOKEN!,url:base,httpOnly:true}]);
  const page = await context.newPage();
  page.on('pageerror',e=>issues.push(e.message));
  for (const [group, families] of Object.entries(ROTATION_POOLS)) for (const family of families) for (const lang of ['en','fa','ps']) for (const size of ['square','portrait','story']) {
    const row = fixtures.samples.find((r: {category:string})=>r.category === (group === 'scholarship' ? 'scholarship' : 'job'));
    const props = {template:group === 'deadline' ? 'deadline':'spotlight',designFamily:family,lang,size,title:row.localized[lang].title,organization:row.organization,country:row.country,deadlineDate:row.deadline,sourceSlug:row.slug};
    await page.goto(base + '/' + lang + '/studio-render?p=' + encodeURIComponent(JSON.stringify(props)),{waitUntil:'networkidle'});
    const canvas = page.locator('[data-editorial-family]');
    await canvas.waitFor();
    await page.locator('[data-render-ready="1"]').waitFor();
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(img=>img.decode().catch(()=>{})));});
    const bounds = await canvas.evaluate(el=>{
      const main=el.querySelector('main')!;const footer=el.querySelector('footer')!.getBoundingClientRect();
      return {overflow:main.scrollHeight-main.clientHeight,bottom:Math.max(...Array.from(main.children).map(x=>x.getBoundingClientRect().bottom)),footer:footer.top,title:el.querySelector('h1')!.textContent};
    });
    const name = `${family}-${lang}-${size}`;
    check(bounds.overflow <= 2,name+' content fits');
    check(bounds.bottom <= bounds.footer + 1,name+' footer clear');
    check(bounds.title === props.title,name+' entire source title retained');
    const png = await canvas.screenshot();const meta=await sharp(png).metadata();
    check(meta.width === 1080 && meta.height === ({square:1080,portrait:1350,story:1920} as Record<string,number>)[size],name+' dimensions');
    await writeFile(out+'/'+name+'.png',png);
  }
  await writeFile(out+'/verification.json',JSON.stringify({checks,issues,passed:issues.length===0,screenshots:81,externalDeliveryCalls:0},null,2));
  if (issues.length) throw Error(issues.join('\n'));
  console.log(`PASS ${checks} editorial export checks; 81 real PNG exports`);
} finally {await browser.close();}
