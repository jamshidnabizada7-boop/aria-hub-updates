import { chromium } from 'playwright-core';
import sharp from 'sharp';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {resolveExecutable} from '../../src/lib/import/scrapers/browser-fetch';
import {discoverySpec,DISCOVERY_STYLES,discoveryNumber} from '../../src/lib/social/discovery/catalog';
const base=process.env.DISCOVERY_REVIEW_URL||'http://127.0.0.1:3012';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Local review only');
const out=resolve(process.env.DISCOVERY_REVIEW_OUTPUT||'../discovery-review');await mkdir(out,{recursive:true});
const samples=process.env.DISCOVERY_REVIEW_FIXTURES ? JSON.parse(await readFile(process.env.DISCOVERY_REVIEW_FIXTURES,'utf8')).inventory.slice(0,3) : ['jobs-balkh','scholarships','ngo'].map(id=>({spec:discoverySpec(id)!,count:30,capturedAt:'2026-10-12T09:00:00Z',fingerprint:'a'.repeat(64)}));
const browser=await chromium.launch({headless:true,...(resolveExecutable()?{executablePath:resolveExecutable()!}:{})});
const issues:string[]=[];let checks=0;let exports=0;const check=(condition:boolean,message:string)=>{checks++;if(!condition)issues.push(message);};
try{
  const context=await browser.newContext({viewport:{width:1180,height:2100},deviceScaleFactor:2});
  await context.route('**/*',r=>new URL(r.request().url()).origin===base||/^(data|blob):/.test(r.request().url())?r.continue():r.abort());
  await context.addCookies([{name:'aria_render',value:process.env.SOCIAL_RENDER_TOKEN||'local-discovery-review-token',url:base,httpOnly:true}]);
  const page=await context.newPage();page.on('pageerror',e=>issues.push(e.message));
  for(const style of DISCOVERY_STYLES)for(const lang of ['en','fa','ps'] as const)for(const size of ['square','portrait','story'] as const)for(const [i,snapshot]of samples.entries()){
    const props={template:'collection',collection:snapshot,campaignStyle:style,lang,size};
    await page.goto(`${base}/${lang}/studio-render?p=${encodeURIComponent(JSON.stringify(props))}`,{waitUntil:'networkidle'});
    const canvas=page.locator('[data-discovery-canvas]');await page.locator('[data-render-ready="1"]').waitFor();
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images).map(img=>img.decode()));});
    const bounds=await canvas.evaluate(el=>{const main=el.querySelector('main')!;const footer=el.querySelector('footer')!.getBoundingClientRect();const title=el.querySelector('h1')!;return {mainOverflow:main.scrollHeight-main.clientHeight,bottom:Math.max(...Array.from(main.children).map(c=>c.getBoundingClientRect().bottom)),footer:footer.top,width:el.getBoundingClientRect().width,count:el.querySelector('[data-count]')!.textContent,title:title.textContent,fontLoaded:document.fonts.check('900 60px "ARIA Studio"'),titleOverflow:title.scrollWidth-title.clientWidth};});
    const name=`${style}-${lang}-${size}-${snapshot.spec.id}`;
    check(bounds.mainOverflow<=2,name+' main fits');check(bounds.bottom<=bounds.footer+1,name+' footer clear');check(bounds.titleOverflow<=2,name+' title fits');check(bounds.count===discoveryNumber(snapshot.count,lang),name+' exact count');check(bounds.fontLoaded,name+' local font');
    const png=await canvas.screenshot({type:'png'});const metadata=await sharp(png).metadata();
    check(metadata.width===2160&&metadata.height===({square:2160,portrait:2700,story:3840}[size]),name+' lossless master dimensions');
    if(size==='portrait'){const jpeg=await sharp(png).resize(1080,1350).toColourspace('srgb').jpeg({quality:98,chromaSubsampling:'4:4:4'}).toBuffer();check(jpeg.length<8_000_000,name+' Instagram upload budget');}
    await writeFile(out+'/'+name+'.png',png);exports++;
    if(i===0&&lang==='fa'&&size==='square')await writeFile(out+'/'+style+'-featured.png',png);
  }
  await writeFile(out+'/verification.json',JSON.stringify({passed:!issues.length,checks,exports,issues,fixtureSource:process.env.DISCOVERY_REVIEW_FIXTURES?'live inventory':'isolated test fixtures',externalPublicationCalls:0},null,2));
  if(issues.length)throw Error(issues.join('\n'));console.log(`PASS ${checks} checks; ${exports} high-resolution exports`);
}finally{await browser.close();}
