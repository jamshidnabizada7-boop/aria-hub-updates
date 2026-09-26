/** Local production-build release checks. Requires isolated *_test DB, test session/render secrets and TEST_BASE_URL. */
import { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { resolveExecutable } from '../src/lib/import/scrapers/browser-fetch';
import { DESIGN_FAMILIES } from '../src/lib/social/studio/registry';
const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3100';
const database = new URL(process.env.DATABASE_URL || '');
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname) || !['127.0.0.1', 'localhost'].includes(database.hostname) || !database.pathname.endsWith('_test')) throw Error('Use an isolated localhost test database and server');
const secret = process.env.ADMIN_SESSION_SECRET;
const renderToken = process.env.SOCIAL_RENDER_TOKEN;
if (!secret || !renderToken) throw Error('Set the same test-only ADMIN_SESSION_SECRET and SOCIAL_RENDER_TOKEN as the local server');
const email = 'release-check@example.test';
const check = (value: unknown, message: string) => { if (!value) throw Error(message); };
const payload=Buffer.from(JSON.stringify({email,t:Date.now()})).toString('base64url');
const token=payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
const headers={'Content-Type':'application/json',Cookie:'aria-admin-session='+token};
const forDate = new Date(Date.now()+270*60000).toISOString().slice(0,10);
try {
await db.adminUser.upsert({where:{email},create:{email,name:'Release test',password:'disabled',role:'support'},update:{role:'support'}});
await db.opportunity.upsert({where:{slug:'release-e2e-test'},create:{slug:'release-e2e-test',title:'100% Funded Release Test Scholarship',description:'A local release verification fixture.',status:'published'},update:{status:'published'}});
for(const path of ['automation','studio/design','studio/visuals','pipeline/social','pipeline/tick']){
 const r=await fetch(base+'/api/admin/'+path,{method:'POST',headers,body:'{}'});
 check(r.status===403,'support must be forbidden: '+path+' '+r.status);
}
console.log('PASS: support role rejected by all five mutation endpoints');
await db.adminUser.update({where:{email},data:{role:'admin'}});
const design={contentRef:'spotlight-release-e2e-test',forDate,templateType:'spotlight',themeId:'midnight',layout:'classic',size:'square',overrides:{title:'100% Saved Release Title',designFamily:'global-portal',media:{hero:{url:'/images/studio/premium/global-portal.png',opacity:0.8}}}};
for(const action of ['save','ensure-row']){
 const r=await fetch(base+'/api/admin/studio/design',{method:'POST',headers,body:JSON.stringify({action,design,contentJson:{template:'spotlight',lang:'en',size:'square',title:'100% Saved Release Title',designFamily:'global-portal',media:design.overrides.media},captionJson:{en:'Test'}})});
 check(r.ok,'save failed '+r.status); const data=await r.json(); if(action==='ensure-row') check(data.row.requiresManualPublish,'manual flag');
}
const loaded=await (await fetch(base+'/api/admin/studio/design?date='+forDate,{headers})).json();
check(loaded.designs.some((d:any)=>d.contentRef===design.contentRef&&d.overrides.title===design.overrides.title&&d.overrides.media.hero.opacity===0.8),'save reload mismatch');
const refused=await fetch(base+'/api/admin/studio/design',{method:'POST',headers,body:JSON.stringify({action:'save',design:{...design,overrides:{visualUrl:'http://127.0.0.1/private'}}})});
check(refused.status===400,'private media URL allowed');
console.log('PASS: authenticated Studio save/reload/ensure-row and SSRF guard');
const browser=await chromium.launch({executablePath:resolveExecutable()!,headless:true});
try{
 const context=await browser.newContext({viewport:{width:1440,height:2100},acceptDownloads:true});
 await context.route('**/*',async route=>{const u=new URL(route.request().url()); if(u.origin===base||u.protocol==='data:'||u.protocol==='blob:') await route.continue(); else await route.abort();});
 const page=await context.newPage(); const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/en/studio-render?p='+encodeURIComponent(JSON.stringify({template:'quote',lang:'en',size:'square',title:'100% test'})));
 check(await page.locator('[data-studio-canvas]').count()===0,'render gate missing');
 await context.addCookies([{name:'aria_render',value:renderToken,url:base,httpOnly:true,sameSite:'Strict'}]);
 const samples=[{template:'spotlight',lang:'en',size:'square',posterData:{slug:'release-e2e-test',title:'100% Legacy Scholarship',titleI18n:null,organization:'ARIA',country:'Afghanistan',deadline:null,featured:false,salary:null,salaryI18n:null,category:null}}, {template:'quote',lang:'fa',size:'story',title:'100% Legacy Quote'}, ...DESIGN_FAMILIES.filter(d=>d.id!=='legacy').map((d,i)=>({template:d.supportedTemplates[0],lang:['en','fa','ps'][i%3],size:['square','portrait','story'][i%3],designFamily:d.id,title:'100% Premium Scholarship',sourceSlug:'release-e2e-test',note:'A local release check',media:i===0?design.overrides.media:undefined}))];
 for(const props of samples){
  await page.goto(base+'/en/studio-render?p='+encodeURIComponent(JSON.stringify(props)),{waitUntil:'domcontentloaded'});
  const canvas=page.locator('[data-studio-canvas="1"][data-render-ready="1"]'); await canvas.waitFor({timeout:20000});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images,img=>img.decode()));});
  check((await canvas.innerText()).includes('100%'),'percent title missing');
  const png=await canvas.screenshot({type:'png'});const meta=await sharp(png).metadata();check(meta.width===1080&&meta.height===({square:1080,portrait:1350,story:1920} as any)[props.size],'incorrect canvas dimensions');
  const jpg=await sharp(png).jpeg({quality:92}).toBuffer(); console.log('PASS render '+('designFamily' in props?props.designFamily:props.template)+' '+props.lang+' '+props.size+' jpegBytes='+jpg.length);
 }
 check(errors.length===0,'browser errors: '+errors.join(';'));
 await context.addCookies([{name:'aria-admin-session',value:token,url:base,httpOnly:true},{name:'aria-lang',value:'en',url:base}]);
 await page.goto(base+'/admin',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:/Brand Studio/i}).click();
 await page.getByRole('button',{name:'Download PNG',exact:true}).waitFor({timeout:30000});
 const downloadPromise=page.waitForEvent('download',{timeout:60000});
 await page.getByRole('button',{name:'Download PNG',exact:true}).click();
 const download=await downloadPromise;const path=await download.path();check(path,'no download');const metadata=await sharp(path!).metadata();check(metadata.format==='png'&&metadata.width===1080,'invalid browser PNG export');
 console.log('PASS: actual Brand Studio Download PNG '+metadata.width+'x'+metadata.height);
}finally{await browser.close();}
} finally {
  await db.socialPostQueue.deleteMany({ where: { contentRef: 'release-e2e-test' } });
  await db.studioDesign.deleteMany({ where: { contentRef: 'spotlight-release-e2e-test' } });
  await db.opportunity.deleteMany({ where: { slug: 'release-e2e-test' } });
  await db.adminUser.deleteMany({ where: { email } });
  await db.$disconnect();
}
