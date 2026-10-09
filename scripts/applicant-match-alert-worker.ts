/**
 * Applicant match alert scanner — staging-only candidate.
 *
 * Usage:
 *   bun --conditions=react-server scripts/applicant-match-alert-worker.ts
 *   bun --conditions=react-server scripts/applicant-match-alert-worker.ts --apply
 *
 * DRY RUN by default. Never run as part of Next.js request path, import,
 * translation or social worker. It must be scheduled explicitly after review.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { MatcherProfileSchema, rankOpportunity, type MatcherOpportunity } from '../src/lib/opportunity-matcher';
import { notificationsEnabled } from '../src/lib/applicants/notification-service';
import { getLocalizedContent } from '../src/lib/i18n-content';
import { matchMaterialVersion } from '../src/lib/applicants/match-alert-version';
import pg from 'pg';

const db=new PrismaClient();
const APPLY=process.argv.includes('--apply');
const MAX_SEARCHES=100,MAX_CANDIDATES=500,MAX_MATCHES_PER_SEARCH=12;
const MS_DAY=86_400_000;
export const alertWorkerReady=(env:NodeJS.ProcessEnv=process.env)=>
  env.APPLICANT_AUTH_ENABLED==='true' &&
  env.APPLICANT_MATCHER_V3_ENABLED==='true' &&
  env.APPLICANT_NOTIFICATIONS_ENABLED==='true' &&
  env.APPLICANT_MATCH_ALERT_WORKER_ENABLED==='true';

async function scan(){
 if(APPLY&&!alertWorkerReady())throw Error('alert_scanner_disabled');
 const now=new Date(),today=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 const since=new Date(now.getTime()-14*MS_DAY);
 const searches=await db.applicantSavedSearch.findMany({
  where:{active:true,applicantProfile:{user:{disabled:false,emailVerified:{not:null}},notificationPreference:{OR:[{inAppEnabled:true},{emailEnabled:true},{pushEnabled:true},{whatsappEnabled:true}]}}},
  include:{applicantProfile:{include:{notificationPreference:true,user:{select:{emailVerified:true,disabled:true}}}}},
  take:MAX_SEARCHES,orderBy:[{lastScannedAt:{sort:'asc',nulls:'first'}},{id:'asc'}]
 });
 // Bounded by recent updates to avoid O(total-opportunities × total-users).
 // The new record or edited listing must have an updatedAt after the
 // saved-search creation time; existing backlog never triggers bulk spam.
 let candidateCount=0;
 let evaluated=0,strong=0,created=0,duplicates=0,invalid=0;
 for(const search of searches){
 const rows=await db.opportunity.findMany({
  where:{status:'published',AND:[{updatedAt:{gte:search.createdAt}},
    ...(search.scanCursorUpdatedAt?[{OR:[{updatedAt:{gt:search.scanCursorUpdatedAt}},
      {updatedAt:search.scanCursorUpdatedAt,id:{gt:search.scanCursorId||''}}]}]:[])],
    OR:[{deadline:null},{deadline:{gte:today}}]},
  orderBy:[{updatedAt:'asc'},{id:'asc'}],take:MAX_CANDIDATES,
  select:{
   id:true,slug:true,title:true,organization:true,country:true,deadline:true,publicationRevision:true,
   locations:{select:{country:true,province:true,city:true}},
   category:{select:{slug:true,name:true}},jobType:true,educationReq:true,
   experience:true,eligibility:true,requirements:true,benefits:true,tags:true,
   extractedData:true,sourceName:true,lastChecked:true,updatedAt:true,
   matchProfile:{select:{
    eligibleNationalities:true,eligibleCountries:true,educationLevels:true,fieldAreas:true,
    minAge:true,maxAge:true,minExperienceYears:true,languages:true,fundingType:true,
    locationType:true,visaSponsorship:true,provenance:true,confidence:true,reviewed:true
   }}
  }
 });
 candidateCount+=rows.length;
  if(search.applicantProfile.user.disabled||!search.applicantProfile.user.emailVerified)continue;
  const pref=search.applicantProfile.notificationPreference;
  if(!pref||(!pref.inAppEnabled&&!pref.emailEnabled&&!pref.pushEnabled&&!pref.whatsappEnabled))continue;
  const parsed=MatcherProfileSchema.safeParse(search.profile);
  if(!parsed.success){invalid++;if(APPLY)await db.applicantSavedSearch.update({where:{id:search.id},data:{lastScannedAt:new Date()}});continue;}
  const profile=parsed.data;
  const matches=[] as Array<{id:string,reasonCodes:string[],materialVersion:string}>;
  let lastProcessed: { id: string; updatedAt: Date } | undefined;
  for(const row of rows){
   lastProcessed=row;
   if(row.updatedAt<search.createdAt)continue;
   const opportunity:MatcherOpportunity={
    id:row.id,slug:row.slug,title:row.title,organization:row.organization,
    country:row.country,deadline:row.deadline,categorySlug:row.category?.slug??null,
    categoryName:row.category?.name??null,jobType:row.jobType,educationReq:row.educationReq,
    experience:row.experience,eligibility:row.eligibility,requirements:row.requirements,
    benefits:row.benefits,tags:row.tags,extractedData:row.extractedData,sourceName:row.sourceName,
    lastChecked:row.lastChecked,updatedAt:row.updatedAt,structuredFacts:row.matchProfile,
    locations:row.locations
   };
   evaluated++;
   const ranked=rankOpportunity(profile,opportunity);
   if(!ranked||ranked.eligibilityStatus==='potential_conflict'||ranked.matchStrength!=='strong')continue;
   matches.push({id:row.id,reasonCodes:ranked.evidence.reasons,materialVersion:matchMaterialVersion({...row,status:'published'})});
   if(matches.length>=MAX_MATCHES_PER_SEARCH)break;
  }
  strong+=matches.length;
  for(const match of matches){
   if(!APPLY)continue;
   try{
    await db.$transaction(async tx=>{
     const note=await tx.applicantNotification.create({
      data:{applicantProfileId:search.applicantProfileId,savedSearchId:search.id,
       opportunityId:match.id,materialVersion:match.materialVersion,evidence:{reasons:match.reasonCodes}},
      select:{id:true}
     });
     // Delivery row exists ONLY when email has explicit opt-in.
     if(pref.emailEnabled){
      await tx.applicantEmailDelivery.create({data:{notificationId:note.id}});
     }
     // Channel delivery rows are created only after the notification has an
     // authorized saved-search match. Verification/consent is rechecked by
     // the dedicated provider worker immediately before every send.
     if(pref.pushEnabled){
      const targets=await tx.applicantPushSubscription.findMany({
       where:{applicantProfileId:search.applicantProfileId,disabledAt:null},select:{id:true},take:5});
      if(targets.length)await tx.applicantChannelDelivery.createMany({data:targets.map(target=>({
       notificationId:note.id,channel:'push',targetId:target.id
      }))});
     }
     if(pref.whatsappEnabled){
      const target=await tx.applicantWhatsAppContact.findUnique({
       where:{applicantProfileId:search.applicantProfileId},select:{id:true,verifiedAt:true,consentedAt:true}});
      if(target?.verifiedAt&&target.consentedAt)await tx.applicantChannelDelivery.create({
       data:{notificationId:note.id,channel:'whatsapp',targetId:target.id}});
     }
    });
    created++;
   }catch(error){
    if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002'){duplicates++;continue;}
    if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2003'){continue;}
    throw error;
   }
  }
  // Persistent page boundary and fair search rotation. Never advance past
  // an unexamined row, including when the per-search alert ceiling is reached.
  if(APPLY)await db.applicantSavedSearch.updateMany({where:{id:search.id,active:true},data:{
    lastScannedAt:new Date(),...(lastProcessed?{scanCursorUpdatedAt:lastProcessed.updatedAt,scanCursorId:lastProcessed.id}:{})
  }});
 }
 console.log(JSON.stringify({mode:APPLY?'apply':'dry_run',searches:searches.length,candidates:candidateCount,evaluated,strongMatches:strong,created,duplicates,invalidProfiles:invalid}));
}
async function main(){
 if(!APPLY)return scan();
 if(!alertWorkerReady())throw Error('alert_scanner_disabled');
 // A dedicated connection holds the session lock across Prisma queries.
 // Competing workers never overwrite a newer persistent cursor.
 const lock=new pg.Client({connectionString:process.env.DATABASE_URL});
 await lock.connect();
 try{
  const result=await lock.query('SELECT pg_try_advisory_lock($1) AS acquired',[83109107]);
  if(!result.rows[0].acquired){console.log(JSON.stringify({mode:'busy',created:0}));return;}
  await scan();
 }finally{await lock.query('SELECT pg_advisory_unlock($1)',[83109107]).catch(()=>{});await lock.end();}
}
main().catch(err=>{console.error('[applicant-alerts] scan failed',err instanceof Error?err.name:'unknown');process.exitCode=1}).finally(()=>db.$disconnect());
