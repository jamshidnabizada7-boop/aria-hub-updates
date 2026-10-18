/**
 * Phase 6 — disposable, loopback-only public UI acceptance.
 * No production accounts, no offsite requests and no actual contact submits.
 */
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
const origin=process.env.ARIA_RED_PREVIEW_ORIGIN;
if(process.env.REQUIRE_TEST_DATABASE!=='1'||origin!=='http://127.0.0.1:3107')
 throw Error('redesign_test_requires_disposable_local_database');
const root=new URL(origin);
const issues:string[]=[];let assertions=0;
const check=(value:boolean,label:string)=>{assertions++;if(!value)issues.push(label);};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const langs=['en','fa','ps'] as const;
const routes=['','/services','/visas','/blog','/organizations','/success-stories','/employers','/about','/contact'] as const;
await mkdir('/tmp/aria-redesign-preview',{recursive:true});
try{
 for(const lang of langs){
  for(const width of [390,768,1366]){
   const context=await browser.newContext({viewport:{width,height:900},locale:lang==='fa'?'fa-AF':lang==='ps'?'ps-AF':'en-US'});
   await context.route('**/*',route=>{
    const u=new URL(route.request().url());
    return u.origin===root.origin || u.protocol==='data:' || u.protocol==='blob:' ? route.continue() : route.abort();
   });
   const page=await context.newPage();
   for(const route of routes){
    const path='/'+lang+'/redesign-preview'+route;
    const jsErrors:string[]=[];
    const listener=(error:Error)=>jsErrors.push(error.message.slice(0,150));
    page.on('pageerror',listener);
    const response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:30000});
    check(Boolean(response)&&response!.status()===200,lang+' '+width+' '+path+' HTTP '+(response?.status()??'?'));
    const preview=page.locator('.aria-v2');
    check(await preview.count()===1,lang+' '+width+' '+path+' unique preview wrapper');
    check(await preview.getAttribute('dir')===(lang==='en'?'ltr':'rtl'),lang+' '+width+' '+path+' direction');
    const heading=page.locator('main h1').first();
    if(route===''){
      check(await page.locator('main').count()>0,lang+' '+width+' homepage main exists');
    }else{
      check(await heading.count()>0,lang+' '+width+' '+path+' h1');
    }
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    check(overflow<=8,lang+' '+width+' '+path+' horizontal overflow='+overflow);
    check(jsErrors.length===0,lang+' '+width+' '+path+' JS exceptions '+jsErrors.join('|'));
    page.off('pageerror',listener);
    if(width===390 && ['','/services','/contact','/employers'].includes(route))
     await page.screenshot({path:'/tmp/aria-redesign-preview/'+lang+'-'+(route.slice(1)||'home')+'-mobile.png',fullPage:true});
   }
   if(width===1366)await page.screenshot({path:'/tmp/aria-redesign-preview/'+lang+'-contact-desktop.png',fullPage:true});
   if(width===390){
    const path='/'+lang+'/redesign-preview/contact';
    await page.goto(origin+path,{waitUntil:'domcontentloaded'});
    let sent=0;
    await page.route('**/api/contact',async route=>{sent++;await route.fulfill({status:200,contentType:'application/json',body:'{"success":true}'});});
    const form=page.locator('form.aria-public-contact-form');
    await form.locator('[name=name]').fill('Disposable Preview Tester');
    await form.locator('[name=email]').fill('preview@test.invalid');
    await form.locator('[name=message]').fill('Safe isolated test message only.');
    await form.locator('button[type=submit]').click();
    await page.locator('form [role=status]').waitFor({timeout:10000});
    check(sent===1,lang+' contact submission intercepted');
    check((await form.locator('[role=status]').textContent()||'').length>8,lang+' form feedback');
    // No production API was contacted: Playwright fulfilled the request.
   }
   const privateResponse=await context.request.get(origin+'/'+lang+'/redesign-preview/portal',{maxRedirects:0});
   check(privateResponse.status()===307||privateResponse.status()===302||privateResponse.status()===404,lang+' private workspace guarded');
   await context.close();
  }
 }
 console.log(JSON.stringify({checks:assertions,issues,screenshots:'saved under /tmp/aria-redesign-preview',mode:'disposable loopback',contactWrites:0},null,2));
 if(issues.length)throw Error('Redesign preview failed '+issues.length+' checks:\n'+issues.join('\n'));
}finally{await browser.close();}
