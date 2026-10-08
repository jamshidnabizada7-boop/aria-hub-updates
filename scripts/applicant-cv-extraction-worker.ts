/**
 * Private CV text/OCR extraction worker. No deployment or scheduling.
 * DRY RUN (default):
 *   bun --conditions=react-server scripts/applicant-cv-extraction-worker.ts
 * STAGING ONLY:
 *   bun --conditions=react-server scripts/applicant-cv-extraction-worker.ts --apply
 * Requires CV_OCR_ENABLED=true and private storage credentials, plus
 * pdfinfo, pdftotext, pdftoppm, unzip and tesseract eng/fas/pus.
 */
import {PrismaClient} from '@prisma/client';
import {extractStoredCV,cvProcessingCode} from '../src/lib/applicants/cv-local-extraction';
const db=new PrismaClient();
const APPLY=process.argv.includes('--apply');
const enabled=()=>process.env.APPLICANT_AUTH_ENABLED==='true'
 &&process.env.CLOUD_CV_STORAGE_ENABLED==='true'&&process.env.CV_OCR_ENABLED==='true';
const MAX_BATCH=3;
async function claim(){
 const rows=await db.$queryRaw<Array<{
  id:string;sha256:string;storageKey:string;originalName:string;processingClaimedAt:Date
 }>>`
 UPDATE "ApplicantDocument" AS d
 SET "status"='processing',"processingAttempts"=d."processingAttempts"+1,
     "processingClaimedAt"=now(),"updatedAt"=now()
 WHERE d."id" IN (
   SELECT "id" FROM "ApplicantDocument"
   WHERE (
    ("status"='uploaded' AND "nextProcessingAt"<=now())
    OR ("status"='processing' AND "processingClaimedAt"<now()-interval '20 minutes')
   ) AND "processingAttempts"<3
   ORDER BY "nextProcessingAt" ASC,"id" ASC LIMIT 3
   FOR UPDATE SKIP LOCKED
 )
 RETURNING d."id",d."sha256",d."storageKey",d."originalName",d."processingClaimedAt"
 `;
 return rows;
}
async function main(){
 if(APPLY&&!enabled())throw Error('cv_processing_feature_disabled');
 if(!APPLY){
  const counts=await db.applicantDocument.groupBy({by:['status'],_count:{_all:true}});
  console.log(JSON.stringify({mode:'dry_run',counts:counts.map(x=>({status:x.status,count:x._count._all})),noWrites:true}));
  return;
 }
 const rows=await claim();
 const report={mode:'apply',claimed:rows.length,readyForReview:0,retry:0,failed:0,leaseLost:0};
 for(const row of rows){
  try{
   const extracted=await extractStoredCV(row);
   const result=await db.applicantDocument.updateMany({
    where:{id:row.id,sha256:row.sha256,status:'processing',processingClaimedAt:row.processingClaimedAt},
    data:{status:'review',extraction:extracted,processingError:null,processingClaimedAt:null}
   });
   if(result.count)report.readyForReview++;else report.leaseLost++;
  }catch(error){
   const code=cvProcessingCode(error);
   const current=await db.applicantDocument.findUnique({
    where:{id:row.id},select:{processingAttempts:true,status:true,processingClaimedAt:true}
   });
   if(!current||current.status!=='processing'||current.processingClaimedAt?.getTime()!==row.processingClaimedAt.getTime()){
    report.leaseLost++;continue;
   }
   const hardStop=['source_hash_mismatch','pdf_pages_out_of_bounds','unsafe_or_unreadable_file'].includes(code);
   const terminal=hardStop||current.processingAttempts>=3;
   const updated=await db.applicantDocument.updateMany({
    where:{id:row.id,status:'processing',processingClaimedAt:row.processingClaimedAt},
    data:{status:terminal?'failed':'uploaded',processingError:code,
     nextProcessingAt:new Date(Date.now()+Math.min(24*3600000,60000*Math.pow(5,current.processingAttempts))),
     processingClaimedAt:null}
   });
   if(updated.count){if(terminal)report.failed++;else report.retry++;}
  }
 }
 console.log(JSON.stringify(report));
}
main().catch(error=>{console.error('[cv-processor] failed',error instanceof Error?error.name:'unknown');process.exitCode=1;})
 .finally(()=>db.$disconnect());
