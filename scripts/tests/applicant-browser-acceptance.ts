/**
 * Local, disposable Chromium browser acceptance. Never navigates external
 * domains and never uses a production account. Real phones and externally
 * deployed staging are deliberately outside this test's scope.
 */
import {chromium} from 'playwright-core';
import {PrismaClient} from '@prisma/client';
import {createHash,randomBytes} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
const root=process.env.BROWSER_QA_ORIGIN||'http://127.0.0.1:3104';
if(process.env.REQUIRE_TEST_DATABASE!=='1'||root!=='http://127.0.0.1:3104')
 throw Error('browser_qa_requires_ephemeral_local_database_and_server');
const db=new PrismaClient();
const base=new URL(root);
const user=await db.user.create({data:{
 email:'browser-qa-'+randomBytes(10).toString('hex')+'@test.invalid',
 name:'ARIA Browser Fixture',emailVerified:new Date(),applicantProfile:{create:{preferredLocale:'fa'}}
}});
const token=randomBytes(32).toString('base64url');
await db.session.create({data:{userId:user.id,sessionToken:createHash('sha256').update(token).digest('hex'),
 expires:new Date(Date.now()+2*3600000)}});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const issues:string[]=[];
let completed=0;
await mkdir('/tmp/aria-browser-snapshots',{recursive:true});
try{
 for(const lang of ['en','fa','ps'] as const)for(const width of [375,390,768,1440]){
  const mobile=width<768;
  const context=await browser.newContext({
   viewport:{width,height:mobile?844:900},
   deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile
  });
  await context.addCookies([{name:'aria-applicant-session',value:token,url:root,httpOnly:true,sameSite:'Lax'}]);
  const page=await context.newPage();
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message.slice(0,180)));
  const pages=['get-started','login','register','forgot-password','portal','portal/profile','portal/settings','portal/cvs','portal/career','portal/notifications','portal/matcher'];
  for(const segment of pages){
   const response=await page.goto(root+'/'+lang+'/'+segment,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForTimeout(300);
   if(!response||response.status()>=400)issues.push(lang+' '+segment+' HTTP '+(response?.status()??'none'));
   const html=await page.evaluate(()=>({lang:document.documentElement.lang,dir:document.documentElement.dir}));
   if(html.lang!==lang)issues.push(lang+' '+segment+' unexpected html lang '+html.lang);
   if(html.dir!==(lang==='en'?'ltr':'rtl'))issues.push(lang+' '+segment+' unexpected html direction '+html.dir);
   const selected=page.locator('main[dir],main [dir]').first();
   if((await selected.count())>0){
    const direction=await selected.getAttribute('dir');
    if(direction&&direction!==(lang==='en'?'ltr':'rtl'))issues.push(lang+' '+segment+' wrong direction');
   }
   if(await page.locator('body').count()){
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    if(overflow>8)issues.push(lang+' '+segment+' '+(mobile?'mobile':'desktop')+' horizontal overflow='+overflow);
   }
   if(segment==='portal/notifications'){
    const heading=page.getByRole('heading',{level:1});
    if(!(await heading.count()))issues.push(lang+' notifications heading missing');
    if(await page.getByRole('checkbox').count()<2)issues.push(lang+' consent controls missing');
   }
   if(segment==='portal'){
    await page.screenshot({path:'/tmp/aria-browser-snapshots/'+lang+'-'+width+'-portal.png'});
   }
  }
  if(errors.length)issues.push(lang+' '+(mobile?'mobile':'desktop')+' hydration='+errors.join('|'));
  completed++;
  await context.close();
 }
}finally{
 await browser.close();
 await db.user.delete({where:{id:user.id}});
 await db.$disconnect();
}
console.log(JSON.stringify({mode:'isolated_browser',locales:['en','fa','ps'],viewports:4,cases:completed,screenshots:12,issues}));
if(issues.length)process.exitCode=1;
