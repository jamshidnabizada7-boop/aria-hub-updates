/**
 * Applicant match email outbox — never scheduled or enabled by default.
 *
 * DRY RUN: bun --conditions=react-server scripts/applicant-email-alert-worker.ts
 * STAGING: bun --conditions=react-server scripts/applicant-email-alert-worker.ts --send
 *
 * Email is opt-in, requires a verified applicant account, and uses the existing
 * configured SMTP adapter. Matching itself NEVER calls any paid/free LLM.
 */
import { PrismaClient } from '@prisma/client';
import { sendHtmlEmail, smtpConfigured } from '../src/lib/mailer';
import { emailDue, safeLocale } from '../src/lib/applicants/notification-service';
import { getLocalizedContent } from '../src/lib/i18n-content';

const db=new PrismaClient(),SEND=process.argv.includes('--send');
const MAX_USERS=50,MAX_ITEMS=6;
const ready=()=>process.env.APPLICANT_AUTH_ENABLED==='true'&&
 process.env.APPLICANT_MATCHER_V3_ENABLED==='true'&&
 process.env.APPLICANT_NOTIFICATIONS_ENABLED==='true'&&
 process.env.APPLICANT_MATCH_ALERT_EMAIL_ENABLED==='true'&&
 smtpConfigured();
function htmlEsc(v:unknown){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function emailText(lang:'en'|'fa'|'ps'){
 return {
  en:{subject:'New matching opportunities from ARIA HUB',heading:'New opportunities matching your preferences',view:'View opportunity',footer:'You enabled match emails in your ARIA HUB account. Update preferences in your portal.'},
  fa:{subject:'فرصت‌های مناسب جدید از آریا هاب',heading:'فرصت‌های جدید مطابق ترجیحات شما',view:'مشاهده فرصت',footer:'شما اطلاع‌رسانی ایمیلی را در حساب آریا هاب فعال کرده‌اید. از حساب خود تنظیمات را تغییر دهید.'},
  ps:{subject:'له آریا هاب څخه نوي مناسب فرصتونه',heading:'ستاسو د خوښې نوې برابرې دندې او فرصتونه',view:'فرصت وګورئ',footer:'تاسو په خپل آریا هاب حساب کې د برېښنالیک خبرتیاوې فعالې کړې دي. تنظیمات په حساب کې بدلولای شئ.'}
 }[lang];
}
function renderEmail(lang:'en'|'fa'|'ps',records:Array<{slug:string;title:string;organization:string|null}>){
 const t=emailText(lang),base=process.env.PUBLIC_SITE_URL||'https://www.myariahub.com';
 const publicBase=new URL(base);if(publicBase.protocol!=='https:')throw Error('invalid_mail_base_url');
 const rows=records.map(r=>{
  const link=new URL('/'+lang+'/opportunities/'+encodeURIComponent(r.slug),publicBase).toString();
  return '<li style="margin:12px 0"><strong>'+htmlEsc(r.title)+'</strong><p>'+htmlEsc(r.organization||'')+'</p><a href="'+htmlEsc(link)+'">'+htmlEsc(t.view)+'</a></li>';
 }).join('');
 const manage=new URL('/'+lang+'/portal/notifications',publicBase).toString();
 return {subject:t.subject,html:'<!doctype html><html lang="'+lang+'" dir="'+(lang==='en'?'ltr':'rtl')+'"><body style="font-family:Tahoma,Arial,sans-serif;max-width:620px;margin:auto;padding:24px"><h2>'+htmlEsc(t.heading)+'</h2><ul>'+rows+'</ul><hr><p>'+htmlEsc(t.footer)+' <a href="'+htmlEsc(manage)+'">'+htmlEsc(t.view)+'</a></p></body></html>'};
}
async function claimBatch(prefId:string,applicantProfileId:string){
 return db.$transaction(async tx=>{
  // Database lock avoids two email workers sending parallel digests for a user.
  const locks=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "ApplicantNotificationPreference" WHERE "id"=${prefId} FOR UPDATE SKIP LOCKED`;
  if(!locks.length)return [];
  const active=await tx.applicantNotificationPreference.findUnique({where:{id:prefId}});
  if(!active?.emailEnabled || !emailDue(active.lastEmailAt,active.emailFrequency as 'daily'|'weekly',new Date()))return [];
  const inProgress=await tx.applicantEmailDelivery.count({
   where:{status:'processing',claimedAt:{gt:new Date(Date.now()-15*60000)},notification:{applicantProfileId}}
  });
  if(inProgress)return [];
  await tx.applicantEmailDelivery.updateMany({
   where:{status:'processing',claimedAt:{lte:new Date(Date.now()-15*60000)},notification:{applicantProfileId}},
   data:{status:'pending',claimedAt:null}
  });
  const due=await tx.applicantEmailDelivery.findMany({
   where:{status:'pending',nextAttemptAt:{lte:new Date()},notification:{
    applicantProfileId,savedSearch:{active:true},
    opportunity:{status:'published',OR:[{deadline:null},{deadline:{gte:new Date()}}]}
   }},
   orderBy:{createdAt:'asc'},take:MAX_ITEMS,select:{id:true}
  });
  if(!due.length)return [];
  const ids=due.map(r=>r.id);
  const result=await tx.applicantEmailDelivery.updateMany({where:{id:{in:ids},status:'pending'},data:{status:'processing',claimedAt:new Date()}});
  if(result.count!==ids.length)throw Error('mail_claim_conflict');
  return ids;
 });
}
async function release(ids:string[],err:string){
 if(!ids.length)return;
 const rows=await db.applicantEmailDelivery.findMany({where:{id:{in:ids}},select:{id:true,attempts:true}});
 for(const row of rows){
  const next=row.attempts+1;
  await db.applicantEmailDelivery.updateMany({where:{id:row.id,status:'processing'},data:{
   status:next>=5?'suppressed':'pending',attempts:next,
   nextAttemptAt:new Date(Date.now()+Math.min(24*3600000,Math.pow(2,next)*5*60000)),
   claimedAt:null,errorCode:err
  }});
 }
}
async function main(){
 if(SEND&&!ready())throw Error('email_lane_disabled_or_smtp_missing');
 const users=await db.applicantNotificationPreference.findMany({
  where:{emailEnabled:true},take:MAX_USERS,
  orderBy:[{lastEmailAt:{sort:'asc',nulls:'first'}},{id:'asc'}],
  include:{applicantProfile:{include:{user:{select:{email:true,emailVerified:true,disabled:true}}}}}
 });
 let dueUsers=0,sent=0,skipped=0;
 for(const pref of users){
  if(!pref.applicantProfile.user.emailVerified||pref.applicantProfile.user.disabled)continue;
  if(!emailDue(pref.lastEmailAt,pref.emailFrequency as 'daily'|'weekly',new Date()))continue;
  dueUsers++;
  if(!SEND)continue;
  const ids=await claimBatch(pref.id,pref.applicantProfileId);
  if(!ids.length){skipped++;continue;}
  try{
   const rows=await db.applicantEmailDelivery.findMany({where:{id:{in:ids}},include:{notification:{
    include:{opportunity:{select:{title:true,titleI18n:true,slug:true,organization:true}}}
   }}});
   if(!rows.length)throw Error('empty_batch');
   const lang=safeLocale(pref.applicantProfile.preferredLocale);
   const items=rows.map(row=>({
    slug:row.notification.opportunity.slug,
    title:getLocalizedContent(row.notification.opportunity.title,row.notification.opportunity.titleI18n as Record<string,string>|null,lang),
    organization:row.notification.opportunity.organization
   }));
   // Recheck consent just before external delivery.
   const consent=await db.applicantNotificationPreference.findUnique({where:{id:pref.id}});
   if(!consent?.emailEnabled){
    await db.applicantEmailDelivery.updateMany({where:{id:{in:ids},status:'processing'},data:{status:'suppressed',claimedAt:null,errorCode:'consent_disabled'}});
    continue;
   }
   const {subject,html}=renderEmail(lang,items);
   const result=await sendHtmlEmail({to:pref.applicantProfile.user.email!,subject,html});
   if(!result.sent)throw Error('smtp_unavailable');
   await db.$transaction([
    db.applicantEmailDelivery.updateMany({where:{id:{in:ids},status:'processing'},data:{status:'sent',sentAt:new Date(),claimedAt:null,errorCode:null}}),
    db.applicantNotificationPreference.update({where:{id:pref.id},data:{lastEmailAt:new Date()}})
   ]);
   sent++;
  }catch(e){await release(ids,e instanceof Error?e.name:'delivery_failure');}
 }
 console.log(JSON.stringify({mode:SEND?'send':'dry_run',applicantPreferences:users.length,dueUsers,sentBatches:sent,skipped}));
 if(users.length===MAX_USERS)console.warn('[applicant-mail] recipient page limit reached; increase capacity only with monitoring');
}
main().catch(err=>{console.error('[applicant-mail] worker failed',err instanceof Error?err.name:'unknown');process.exitCode=1}).finally(()=>db.$disconnect());
