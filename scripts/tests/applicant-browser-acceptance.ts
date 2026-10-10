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
 for(const lang of ['en','fa','ps'] as const)for(const width of [375,390,768,1024,1280,1440]){
  const mobile=width<768;
  const context=await browser.newContext({
   viewport:{width,height:mobile?844:900},
   deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile
  });
  await context.addCookies([{name:'aria-applicant-session',value:token,url:root,httpOnly:true,sameSite:'Lax'}]);
  const page=await context.newPage();
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message.slice(0,180)));
  const pages=['get-started','employers/post','login','register','forgot-password','portal','portal/profile','portal/settings','portal/cvs','portal/career','portal/notifications','portal/matcher'];
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
   if(segment==='employers/post') {
    const desktopNav=page.locator('header nav');
    const desktopVisible=await desktopNav.isVisible();
    if(desktopVisible!==(width>=1024))issues.push(lang+' navigation wrong breakpoint '+width);
    if(width>=1024){
     const bounds=await page.locator('header').boundingBox();
     if(!bounds||bounds.width>width)issues.push(lang+' navigation exceeds laptop width '+width);
     // Real pointer events must open on the first click, not be cancelled by hover.
     const toggle=desktopNav.locator('button[aria-expanded]').first();
     await toggle.click();
     if(await toggle.getAttribute('aria-expanded')!=='true')issues.push(lang+' desktop first click failed '+width);
     await toggle.click();
     if(await toggle.getAttribute('aria-expanded')!=='false')issues.push(lang+' desktop second click failed '+width);
     await toggle.press('Enter');
     if(await toggle.getAttribute('aria-expanded')!=='true')issues.push(lang+' desktop keyboard open failed '+width);
     await toggle.press('Escape');
     if(await toggle.getAttribute('aria-expanded')!=='false')issues.push(lang+' desktop Escape failed '+width);
    }
    const form=page.locator('main form');
    const next=form.locator('button[type=submit]');
    // Empty input must stay on step one and must never hit the submission API.
    let submissions=0;
    let payload:Record<string,unknown>={};
    await page.route('**/api/opportunities/submit',async route=>{
     submissions++; payload=route.request().postDataJSON();
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,referenceCode:'UI-TEST-123'})});
    });
    await next.click();
    if(!(await form.locator('fieldset[data-step="0"]').isVisible())||submissions)issues.push(lang+' invalid form advanced');
    await form.locator('[name=organization]').fill('Interface Test Organization');
    await form.locator('[name=title]').fill('Community Programme Coordinator');
    await form.locator('[name=categorySlug]').selectOption('jobs');
    await form.locator('[name=description]').fill('Coordinate community programmes, support project reporting, and work with a local team to deliver training and services.');
    await next.click();
    const stepHeading=await form.locator('h2').boundingBox();
    if(!stepHeading||stepHeading.y<80||stepHeading.y>300)issues.push(lang+' next step heading outside useful viewport');
    await form.locator('[name=contactEmail]').fill('review@test.invalid');
    await next.click();
    if(!(await form.locator('[role=alert]').isVisible())||submissions)issues.push(lang+' application method validation missing');
    await form.locator('[name=applyPhone]').fill('+93700123456');
    await next.click();
    if(!(await form.getByRole('heading',{name:'Community Programme Coordinator'}).isVisible())||submissions)issues.push(lang+' review missing or premature submit');
    await form.getByRole('button',{name:lang==='en'?'Back':lang==='fa'?'بازگشت':'شاته',exact:true}).click();
    if(await form.locator('[name=applyPhone]').inputValue()!=='+93700123456')issues.push(lang+' data lost on back');
    await next.click();
    await next.click();
    await page.getByText('UI-TEST-123',{exact:true}).waitFor();
    if(submissions!==1||payload.applyPhone!=='+93700123456'||payload.organization!=='Interface Test Organization')issues.push(lang+' submission payload invalid');
    await page.unroute('**/api/opportunities/submit');
    // A real home link must navigate out of the posting route.
    await page.locator('header a').first().click();
    await page.waitForURL(root+'/'+lang);
    if(new URL(page.url()).pathname!=='/'+lang)issues.push(lang+' logo failed to navigate home');
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
