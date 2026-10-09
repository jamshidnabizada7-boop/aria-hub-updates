import {chromium} from 'playwright-core';
import {PrismaClient} from '@prisma/client';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:https';
import {request} from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {mkdir,readFile,rm} from 'node:fs/promises';
import {startAccountSmtp,accountMailLink} from './account-smtp-fixture';

const database=new URL(process.env.DATABASE_URL||'postgresql://localhost/no_database');
if(process.env.REQUIRE_TEST_DATABASE!=='1'||!['127.0.0.1','localhost'].includes(database.hostname)||!database.pathname.endsWith('_test'))throw Error('isolated_account_database_required');
const root='https://127.0.0.1:3107', output='/tmp/aria-account-snapshots';
const certDir='/tmp/aria-account-tls-'+randomBytes(6).toString('hex');
await mkdir(certDir,{recursive:true});await mkdir(output,{recursive:true});
const cert=spawnSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',certDir+'/key.pem','-out',certDir+'/cert.pem','-days','1','-subj','/CN=localhost'],{stdio:'ignore'});
if(cert.status!==0)throw Error('test_certificate_generation_failed');
const db=new PrismaClient(),emails:string[]=[],smtp=await startAccountSmtp();
const server=spawn(process.execPath.includes('bun')?'node':process.execPath,['.next/standalone/server.js'],{env:{...process.env,PORT:'3106',HOSTNAME:'127.0.0.1',NODE_ENV:'production',PUBLIC_SITE_URL:root,APPLICANT_ALLOWED_HOSTS:'127.0.0.1:3107',APPLICANT_AUTH_ENABLED:'true',APPLICANT_TRUST_CLOUDFLARE_HEADERS:'true',SMTP_HOST:'127.0.0.1',SMTP_PORT:String(smtp.port),SMTP_USER:'test-only',SMTP_PASS:'test-only',SMTP_FROM:'ARIA HUB <accounts@test.invalid>'},stdio:'ignore'});
const proxy=createServer({key:await readFile(certDir+'/key.pem'),cert:await readFile(certDir+'/cert.pem')},(req,res)=>{
 const upstream=request({hostname:'127.0.0.1',port:3106,path:req.url,method:req.method,headers:{...req.headers,'x-forwarded-proto':'https','x-forwarded-host':'127.0.0.1:3107'}},response=>{res.writeHead(response.statusCode||502,response.headers);response.pipe(res);});upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);
});
await new Promise<void>(resolve=>proxy.listen(3107,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let completed=0;
async function waitMail(count:number){for(let i=0;i<60;i++){if(smtp.messages.length>count)return accountMailLink(smtp.messages[count]);await new Promise(resolve=>setTimeout(resolve,100));}throw Error('account_email_missing');}
try{
 for(let i=0;i<60;i++){try{const res=await fetch('http://127.0.0.1:3106/en/register');if(res.ok)break;}catch{}if(i===59)throw Error('account_server_unavailable');await new Promise(resolve=>setTimeout(resolve,500));}
 for(const lang of ['en','fa','ps'])for(const width of [390,1440]){
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width,height:900},extraHTTPHeaders:{'cf-connecting-ip':'203.0.113.'+(completed+10)}});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const email='account-browser-'+randomBytes(10).toString('hex')+'@test.invalid';emails.push(email);
  const password='synthetic-registration-123',newPassword='synthetic-recovered-456';
  await page.goto(root+'/'+lang+'/register');
  if(await page.locator('main form').count()!==1)throw Error('registration_not_available');
  if(await page.evaluate(()=>document.documentElement.dir)!==(lang==='en'?'ltr':'rtl'))throw Error('account_direction_incorrect');
  await page.locator('input[name=name]').fill('Synthetic Account');await page.locator('input[name=email]').fill(email);await page.locator('input[name=password]').fill(password);await page.locator('input[name=confirmPassword]').fill(password);
  await page.screenshot({path:output+'/'+lang+'-'+width+'-register.png'});
  const count=smtp.messages.length;await page.locator('main button[type=submit]').click();const link=await waitMail(count);
  await page.locator('main form').waitFor({state:'detached'});
  const unverified=await context.request.post(root+'/api/applicant/auth/login',{headers:{origin:root},data:{email,password,lang}});if(unverified.status()!==403)throw Error('unverified_login_not_rejected');
  await page.goto(link.toString());await page.waitForURL(root+'/'+lang+'/login?verified=yes');
  await page.locator('input[name=email]').fill(email);await page.locator('input[name=password]').fill(password);await page.locator('main button[type=submit]').click();await page.waitForURL(root+'/'+lang+'/portal');
  const oldCookie=(await context.cookies()).find(c=>c.name==='aria-applicant-session');if(!oldCookie?.secure||!oldCookie.httpOnly)throw Error('secure_session_cookie_missing');
  const me=await context.request.get(root+'/api/applicant/auth/me');if((await me.json()).user?.email!==email)throw Error('authenticated_user_missing');
  await page.goto(root+'/'+lang+'/forgot-password');await page.locator('input[name=email]').fill(email);
  const resetCount=smtp.messages.length;await page.locator('main button[type=submit]').click();const resetLink=await waitMail(resetCount);
  await page.goto(resetLink.toString());await page.locator('input[name=password]').fill(newPassword);await page.locator('input[name=confirmPassword]').fill(newPassword);await page.locator('main button[type=submit]').click();await page.waitForURL(root+'/'+lang+'/login?reset=yes');
  const revoked=await context.request.get(root+'/api/applicant/auth/me',{headers:{cookie:'aria-applicant-session='+oldCookie.value}});if((await revoked.json()).user)throw Error('old_session_survived_reset');
  const reuse=await context.request.post(root+'/api/applicant/auth/reset-password',{headers:{origin:root},data:{token:resetLink.searchParams.get('token'),password:newPassword}});if(reuse.status()!==400)throw Error('reset_token_reused');
  await page.locator('input[name=email]').fill(email);await page.locator('input[name=password]').fill(newPassword);await page.locator('main button[type=submit]').click();await page.waitForURL(root+'/'+lang+'/portal');
  if(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)>8)throw Error('account_mobile_overflow');
  if(errors.length)throw Error('account_hydration_error');
  completed++;await context.close();
 }
 console.log(JSON.stringify({completed,flows:['registration','email verification','login','recovery','reset token single use','session revocation'],locales:['en','fa','ps'],widths:[390,1440],externalDeliveries:0}));
}finally{
 await browser.close();server.kill('SIGTERM');proxy.closeAllConnections();await new Promise<void>(resolve=>proxy.close(()=>resolve()));await smtp.close();
 await db.verificationToken.deleteMany({where:{identifier:{in:emails.map(e=>'applicant-email:'+e)}}});await db.user.deleteMany({where:{email:{in:emails}}});await db.$disconnect();await rm(certDir,{recursive:true,force:true});
}
