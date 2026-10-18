/**
 * Phase 6 authenticated workspace: synthetic, disposable test user, browser
 * only talks to loopback; no production accounts and zero writes to actual DB.
 */
import {chromium} from 'playwright-core';
import {PrismaClient} from '@prisma/client';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
const origin=process.env.ARIA_RED_PREVIEW_ORIGIN;
if(process.env.REQUIRE_TEST_DATABASE!=='1'||origin!=='http://127.0.0.1:3107')
 throw Error('private_preview_qa_requires_disposable_loopback');
const db=new PrismaClient();const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const issues:string[]=[];let checks=0;
const check=(v:boolean,why:string)=>{checks++;if(!v)issues.push(why);};
const email='redesign-qa-'+randomBytes(8).toString('hex')+'@test.invalid';
const token=randomBytes(32).toString('base64url');
const user=await db.user.create({data:{email,name:'ARIA Preview Test',emailVerified:new Date(),applicantProfile:{create:{preferredLocale:'en'}}}});
await db.session.create({data:{userId:user.id,sessionToken:createHash('sha256').update(token).digest('hex'),expires:new Date(Date.now()+7200000)}});
await mkdir('/tmp/aria-redesign-preview',{recursive:true});
const routes=['/portal','/portal/profile','/portal/matcher','/portal/cvs','/portal/cv-builder','/portal/career','/portal/notifications','/portal/settings'] as const;
try{
 for(const lang of ['en','fa','ps'] as const)for(const width of [390,1366]){
  const context=await browser.newContext({viewport:{width,height:920},locale:lang==='en'?'en-US':lang==='fa'?'fa-AF':'ps-AF'});
  await context.addCookies([{name:'aria-applicant-session',value:token,url:origin,httpOnly:true,sameSite:'Lax'}]);
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   return url.origin===origin||['data:','blob:'].includes(url.protocol) ? route.continue() : route.abort();
  });
  const page=await context.newPage();
  for(const segment of routes){
   const path='/'+lang+'/redesign-preview'+segment,jsErrors:string[]=[];
   const listener=(err:Error)=>jsErrors.push(err.message.slice(0,170));
   page.on('pageerror',listener);
   const res=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:30000});
   check(res?.status()===200,lang+' '+width+' '+segment+' status '+(res?.status()??'missing'));
   const root=page.locator('.aria-v2.aria-portal');
   check(await root.count()===1,lang+' '+width+' '+segment+' private shell');
   check(await root.getAttribute('dir')===(lang==='en'?'ltr':'rtl'),lang+' '+width+' '+segment+' direction');
   check(await page.locator('.aria-portal-tabs a').count()>=5,lang+' '+width+' '+segment+' tab navigation');
   check(await page.locator('main').count()>0,lang+' '+width+' '+segment+' content');
   check(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)<=8,lang+' '+width+' '+segment+' overflow');
   check(jsErrors.length===0,lang+' '+width+' '+segment+' JS errors: '+jsErrors.join('|'));
   page.off('pageerror',listener);
   if(segment==='/portal'&&width===390)await page.screenshot({path:'/tmp/aria-redesign-preview/'+lang+'-portal-mobile-synthetic.png',fullPage:true});
   if(segment==='/portal/matcher'&&width===1366)await page.screenshot({path:'/tmp/aria-redesign-preview/'+lang+'-matcher-desktop-synthetic.png',fullPage:true});
  }
  await context.close();
 }
 console.log(JSON.stringify({privateChecks:checks,issues,syntheticUser:true,externalWrites:0},null,2));
 if(issues.length)throw Error('Private preview QA failed '+issues.length+' checks: '+issues.join('\n'));
}finally{
 await browser.close();
 await db.session.deleteMany({where:{userId:user.id}}).catch(()=>{});
 await db.user.delete({where:{id:user.id}}).catch(()=>{});
 await db.$disconnect();
}
