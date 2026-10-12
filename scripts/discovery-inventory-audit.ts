import { db } from '../src/lib/db';
import { discoveryInventory } from '../src/lib/social/discovery/inventory';
import { decryptCredentials } from '../src/lib/social/credentials';
const inventory=await discoveryInventory();
if(process.argv.includes('--diagnose')){
  const [sources,rows]=await Promise.all([db.importSource.findMany({select:{name:true,baseUrl:true,enabled:true,autoPublish:true,healthStatus:true}}),db.opportunity.findMany({where:{status:'published',deadline:{gte:new Date(new Date().toISOString().slice(0,10)+'T00:00:00Z')}},select:{jobType:true,category:{select:{slug:true}},verificationStatus:true,sourceName:true,importStatus:true,applyUrlType:true,applyUrl:true,guidelines:true,description:true,sourceUrl:true,deadline:true,extractedData:true},take:5000})]);
  console.log(JSON.stringify({diagnostics:{sources,totalDatedActive:rows.length,samples:rows.slice(0,8).map(row=>({type:row.jobType,category:row.category?.slug,verification:row.verificationStatus,source:row.sourceName,importStatus:row.importStatus,applyUrlType:row.applyUrlType,hasApply:!!row.applyUrl,guideLength:row.guidelines?.length??0,bodyLength:row.description.length,hasSource:!!row.sourceUrl,deadline:row.deadline}))}},null,2));
}
const channels=await db.publishChannel.findMany({select:{platform:true,enabled:true,lastStatus:true,lastError:true,credentials:true}});
console.log(JSON.stringify({checkedAt:new Date().toISOString(),inventory,channels:channels.map(row=>{
  const creds=decryptCredentials(row.credentials);
  return {platform:row.platform,enabled:row.enabled,lastStatus:row.lastStatus,configured:Boolean(creds.accessToken||creds.botToken),error:(row.lastError||'').replace(/access_token=[^&\s]+/gi,'access_token=[redacted]').replace(/EA[A-Za-z0-9]{30,}/g,'[redacted]').slice(0,160)};
})},null,2));
await db.$disconnect();
