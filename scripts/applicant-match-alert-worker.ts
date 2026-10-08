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
  where:{active:true,applicantProfile:{notificationPreference:{OR:[{inAppEnabled:true},{emailEnabled:true},{pushEnabled:true},{whatsappEnabled:true}]}}},
  include:{applicantProfile:{include:{notificationPreference:true,user:{select:{emailVerified:true,disabled:true}}}}},
  take:MAX_SEARCHES,orderBy:[{updatedAt:'desc'},{id:'asc'}]
 });
 // Bounded by recent updates to avoid O(total-opportunities × total-users).
 // The new record or edited listing must have an updatedAt after the
 // saved-search creation time; existing backlog never triggers bulk spam.
 const rows=await db.opportunity.findMany({
  where:{status:'published',updatedAt:{gte:since},OR:[{deadline:null},{deadline:{gte:today}}]},
  orderBy:[{updatedAt:'desc'},{id:'asc'}],take:MAX_CANDIDATES,
  select:{
   id:true,slug:true,title:true,organization:true,country:true,deadline:true,
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
 let evaluated=0,strong=0,created=0,duplicates=0,invalid=0;
 for(const search of searches){
  if(search.applicantProfile.user.disabled||!search.applicantProfile.user.emailVerified)continue;
  const pref=search.applicantProfile.notificationPreference;
  if(!pref||(!pref.inAppEnabled&&!pref.emailEnabled&&!pref.pushEnabled&&!pref.whatsappEnabled))continue;
  const parsed=MatcherProfileSchema.safeParse(search.profile);
  if(!parsed.success){invalid++;continue;}
  const profile=parsed.data;
  const matches=[] as Array<{id:string,reasonCodes:string[]}>;
  for(const row of rows){
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
   matches.push({id:row.id,reasonCodes:ranked.evidence.reasons});
   if(matches.length>=MAX_MATCHES_PER_SEARCH)break;
  }
  strong+=matches.length;
  for(const match of matches){
   if(!APPLY)continue;
   try{
    await db.$transaction(async tx=>{
     const note=await tx.applicantNotification.create({
      data:{applicantProfileId:search.applicantProfileId,savedSearchId:search.id,
       opportunityId:match.id,evidence:{reasons:match.reasonCodes}},
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
 }
 console.log(JSON.stringify({mode:APPLY?'apply':'dry_run',searches:searches.length,candidates:rows.length,evaluated,strongMatches:strong,created,duplicates,invalidProfiles:invalid}));
 if(searches.length===MAX_SEARCHES||rows.length===MAX_CANDIDATES)
  console.warn('[applicant-alerts] scan capacity reached; paging/cursor required before scaling (no silent guarantee of complete coverage)');
}
scan().catch(err=>{console.error('[applicant-alerts] scan failed',err instanceof Error?err.name:'unknown');process.exitCode=1}).finally(()=>db.$disconnect());
