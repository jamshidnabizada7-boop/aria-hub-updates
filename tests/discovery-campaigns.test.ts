import { describe, expect, test, afterAll, mock } from 'bun:test';
mock.module('server-only',()=>({}));
import { DISCOVERY_SPECS, discoverySpec, discoveryHeadline, discoveryUrl, discoveryCaption } from '../src/lib/social/discovery/catalog';
import { discoveryWhere, readDiscoverySnapshot } from '../src/lib/social/discovery/inventory';
import { newAttribution, signAttribution, readAttribution, recordRegistrationAttribution, recordVerifiedRegistration } from '../src/lib/social/discovery/attribution';
import { db } from '../src/lib/db';
import {queueDiscoveryCampaign} from '../src/lib/social/discovery/queue';

describe('discovery copy and attribution',()=>{
  test('whitelists collections and produces localized facts without inflated claims',()=>{
    expect(DISCOVERY_SPECS.length).toBe(41);
    expect(discoverySpec('../admin')).toBeNull();
    const snapshot={spec:discoverySpec('jobs-balkh')!,count:30,capturedAt:'2026-10-12T09:00:00Z',fingerprint:'a'.repeat(64)};
    for(const lang of ['en','fa','ps'] as const){
      const headline=discoveryHeadline(snapshot,lang);expect(headline).not.toContain('+');
      expect(headline).toContain(lang==='en'?'Balkh':'بلخ');
      const url=new URL(discoveryUrl(snapshot.spec,lang,'campaign123','linkedin'));
      expect(url.pathname).toBe('/'+lang+'/discover/jobs-balkh');expect(url.searchParams.get('utm_source')).toBe('linkedin');
      expect(discoveryCaption(snapshot,lang,'campaign123','facebook')).toContain('campaign=campaign123');
    }
  });
  test('uses Afghan calendar day for date-only deadlines and exact times for timed ones',()=>{
    const spec=discoverySpec('jobs-kabul')!;
    const before=discoveryWhere(spec,new Date('2026-10-12T19:29:59Z'));
    const after=discoveryWhere(spec,new Date('2026-10-12T19:30:00Z'));
    expect(before.OR?.[1].deadline).toEqual(new Date('2026-10-12T00:00:00Z'));
    expect(after.OR?.[1].deadline).toEqual(new Date('2026-10-13T00:00:00Z'));
    expect(before.status).toBe('published');expect(before.verificationStatus).toBeDefined();
    expect(discoveryWhere(discoverySpec('remote')!).matchProfile).toEqual({reviewed:true,locationType:'remote'});
    expect(discoveryWhere(discoverySpec('graduates')!).matchProfile).toEqual({reviewed:true,minExperienceYears:0});
  });
  test('rejects tampered and expired attribution cookies',()=>{
    process.env.DISCOVERY_ANALYTICS_SECRET='local-discovery-attribution-test-only-12345';
    const a=newAttribution('campaign123','instagram');const token=signAttribution(a);
    expect(readAttribution(token)).toEqual(a);expect(readAttribution(token+'x')).toBeNull();
    expect(readAttribution(signAttribution({...a,expires:Date.now()-1}))).toBeNull();
    expect(readAttribution(signAttribution({...a,platform:'evil'}))).toBeNull();
  });
});

const url=process.env.DATABASE_URL?new URL(process.env.DATABASE_URL):null;
const safe=url && ['127.0.0.1','localhost'].includes(url.hostname) && /_(test|fresh)$/.test(url.pathname);
let available=false;if(safe)try{await db.$queryRaw`SELECT 1`;available=true;}catch{}
if(process.env.REQUIRE_TEST_DATABASE==='1'&&!available)throw Error('Required isolated database unavailable');
const prefix='discovery-safety-'+Date.now();
const cases: [string,string,string|null,Date|null][]=[
  ['active','published','verified_official',new Date('2099-01-01')],
  ['draft','draft','verified_official',new Date('2099-01-01')],
  ['expired','published','verified_official',new Date('2020-01-01')],
  ['unknown-date','published','verified_official',null],
  ['unconfirmed','published','single_source',new Date('2099-01-01')],
];
describe.skipIf(!available)('real database count and publication safety',()=>{
  test('serializes concurrent campaign requests and prevents identical inventory repeats',async()=>{
    for(let index=0;index<6;index++)await db.opportunity.create({data:{slug:prefix+'-rotation-'+index,title:'Synthetic reviewed job '+index,description:'Responsibilities and application instructions for this synthetic reviewed job. '.repeat(4),jobType:'job',status:'published',verificationStatus:'verified_official',sourceUrl:'https://example.org/jobs/'+prefix+index,applyUrl:'https://example.org/apply/'+prefix+index,applyUrlType:'direct_application',deadline:new Date('2099-01-01'),locations:{create:[{province:'Kabul',confidence:1,rawLabel:'Kabul'},{province:'Balkh',confidence:1,rawLabel:'Balkh'}]}}});
    const scheduled=new Date(Date.now()+100*86400000);
    const results=await Promise.allSettled([queueDiscoveryCampaign('jobs-kabul','fa','atlas',scheduled),queueDiscoveryCampaign('jobs-kabul','ps','signal',scheduled)]);
    const successes=results.filter((result):result is PromiseFulfilledResult<Awaited<ReturnType<typeof queueDiscoveryCampaign>>>=>result.status==='fulfilled');
    try{
      expect(successes.length).toBe(1);expect(results.filter(result=>result.status==='rejected').length).toBe(1);
      await expect(queueDiscoveryCampaign('jobs-balkh','en','ledger',new Date(scheduled.getTime()+86400000))).rejects.toThrow('collection_already_queued_or_recently_published');
    }finally{for(const result of successes)await db.socialPostQueue.delete({where:{id:result.value.id}});}
  });
  test('tracks only consented visits, deduplicates retries and records server-side account conversions',async()=>{
    const row=await db.socialPostQueue.create({data:{templateType:'collection',scheduledFor:new Date(),status:'published',contentJson:{template:'collection',collection:{spec:discoverySpec('jobs')!,count:5,capturedAt:new Date().toISOString(),fingerprint:'a'.repeat(64)}},captionJson:{},results:{facebook:{ok:true}}}});
    const user=await db.user.create({data:{email:prefix+'@test.invalid',name:'Synthetic attribution account'}});
    const {NextRequest}=await import('next/server');const {POST}=await import('../src/app/api/discovery/track/route');
    const request=(body:object)=>new NextRequest('https://www.myariahub.com/api/discovery/track',{method:'POST',headers:{Origin:'https://www.myariahub.com',Host:'www.myariahub.com','Content-Type':'application/json'},body:JSON.stringify(body)});
    const body={queueId:row.id,platform:'facebook',kind:'landing_view',visitor:'b'.repeat(32),consent:true};
    try{
      expect((await POST(request({...body,consent:false}))).status).toBe(400);
      expect((await POST(request({...body,kind:'registration'}))).status).toBe(400);
      const response=await POST(request(body));expect(response.status).toBe(200);
      expect((await POST(request(body))).status).toBe(200);
      expect(await db.discoveryCampaignEvent.count({where:{queueId:row.id,kind:'landing_view'}})).toBe(1);
      const cookie=response.headers.get('set-cookie')!.split(';')[0];
      const req=new Request('https://www.myariahub.com/api/applicant/auth/register',{headers:{cookie}});
      await recordRegistrationAttribution(req,user.id);await recordRegistrationAttribution(req,user.id);await recordVerifiedRegistration(user.id);
      expect(await db.discoveryCampaignEvent.count({where:{queueId:row.id,kind:'registration'}})).toBe(1);
      expect(await db.discoveryCampaignEvent.count({where:{queueId:row.id,kind:'verified_registration'}})).toBe(1);
      expect((await POST(request({kind:'revoke',consent:true}))).headers.get('set-cookie')).toContain('Max-Age=0');
    }finally{await db.socialPostQueue.delete({where:{id:row.id}});await db.user.delete({where:{id:user.id}});}
  });
  test('counts canonical listings once, excluding drafts, expiry, missing deadlines and unconfirmed sources',async()=>{
    const spec=discoverySpec('jobs-kabul')!;const before=await readDiscoverySnapshot(spec.id);
    for(const [key,status,verificationStatus,deadline] of cases)await db.opportunity.create({data:{slug:prefix+'-'+key,title:key,description:'A detailed job opportunity with clear application instructions and responsibilities. '.repeat(4),jobType:'job',status:status as 'published'|'draft',verificationStatus,sourceUrl:'https://example.org/jobs/'+prefix+'-'+key,applyUrl:'https://example.org/apply/'+prefix+'-'+key,applyUrlType:'direct_application',deadline,locations:{create:[{province:'Kabul',confidence:1,rawLabel:'Kabul'},{province:'Balkh',confidence:1,rawLabel:'Balkh'}]}}});
    const after=await readDiscoverySnapshot(spec.id);expect(after!.count).toBe(before!.count+1);
    expect(after!.fingerprint).not.toBe(before!.fingerprint);
  });
  test('recounts before any delivery and invalidates stale artwork instead of publishing it',async()=>{
    const spec=discoverySpec('jobs-kabul')!;const snapshot=await readDiscoverySnapshot(spec.id);
    const row=await db.socialPostQueue.create({data:{contentRef:'collection:'+spec.id,templateType:'collection',scheduledFor:new Date(),status:'ready',imageStatus:'ready',contentJson:{template:'collection',collection:{...snapshot!,count:snapshot!.count+1},lang:'en'},captionJson:{en:'Untrusted count'},imagePaths:{square:'https://test.public.blob.vercel-storage.com/test.png'},requiresManualPublish:true}});
    // Missing credentials are never sent: the count gate runs before network publication.
    const existing=await db.publishChannel.findUnique({where:{platform:'facebook'}});
    const channel=existing ?? await db.publishChannel.create({data:{platform:'facebook',label:'isolated discovery test',enabled:true,credentials:{}}});
    if(existing&&!existing.enabled)await db.publishChannel.update({where:{id:existing.id},data:{enabled:true}});
    try{
      const {publishQueueRow}=await import('../src/lib/social/queue-publishing');
      const result=await publishQueueRow(row.id,{manual:true});expect(result.attempted).toBe(false);expect(result.error).toBe('campaign_refreshed_before_delivery');
      const updated=await db.socialPostQueue.findUniqueOrThrow({where:{id:row.id}});expect(['pending','cancelled']).toContain(updated.status);expect(await db.socialDelivery.count({where:{queueId:row.id}})).toBe(0);
    }finally{await db.socialPostQueue.delete({where:{id:row.id}});if(!existing)await db.publishChannel.delete({where:{id:channel.id}});else await db.publishChannel.update({where:{id:existing.id},data:{enabled:existing.enabled}});}
  });
});
afterAll(async()=>{if(available)await db.opportunity.deleteMany({where:{slug:{startsWith:prefix}}});});
