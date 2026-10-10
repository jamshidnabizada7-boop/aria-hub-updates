/** Run on isolated Oracle staging data only. Real scanner/storage/OCR; no messages. */
import {PrismaClient} from '@prisma/client';
import {readFile,stat} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {newApplicantSession,APPLICANT_COOKIE} from '../../src/lib/applicant-auth';
import {POST as upload} from '../../src/app/api/applicant/cvs/route';
import {GET as download,DELETE as remove} from '../../src/app/api/applicant/cvs/[id]/route';
import {GET as reviewGet,POST as reviewPost} from '../../src/app/api/applicant/cvs/[id]/review/route';
import {scanCV} from '../../src/lib/applicants/cv-scan';
import {removePrivateCV} from '../../src/lib/applicants/cv-private-storage';
const uri=new URL(process.env.DATABASE_URL||'postgresql://localhost/disabled');
if(!['127.0.0.1','localhost'].includes(uri.hostname)||!uri.pathname.endsWith('_test')||process.env.CV_PRIVATE_DIRECTORY!=='/var/lib/aria-hub/staging-cvs')throw Error('isolated_oracle_services_required');
Object.assign(process.env,{NODE_ENV:'test',APPLICANT_AUTH_ENABLED:'true',APPLICANT_ALLOWED_HOSTS:'localhost:3000'});
const db=new PrismaClient(),owners:string[]=[],base='http://localhost:3000';
function check(value:unknown,message:string):asserts value{if(!value)throw Error(message);}
function request(path:string,method:string,token:string,body?:unknown){
 const value=body===undefined?undefined:JSON.stringify(body);
 return new Request(base+path,{method,headers:{host:'localhost:3000',origin:base,cookie:APPLICANT_COOKIE+'='+token,...(value?{'content-type':'application/json','content-length':String(Buffer.byteLength(value))}:{})},body:value});
}
async function account(){const user=await db.user.create({data:{email:'oracle-services-'+crypto.randomUUID()+'@test.invalid',emailVerified:new Date(),applicantProfile:{create:{}}},include:{applicantProfile:true}});owners.push(user.id);return {user,token:await newApplicantSession(user.id)};}
let completed=0;
try{
 const clean=await readFile('/tmp/aria-cv-corpus/en-native.pdf');check(await scanCV(clean),'clean_scanner_failed');
 const signature='X5O!P%@AP[4\\PZX54(P^)7CC)7}$'+'EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
 check(!await scanCV(Buffer.from(signature)),'virus_signature_not_rejected');
 const b=await account();
 for(const [locale,file] of [['en','en-native.pdf'],['fa','fa-native.docx'],['ps','ps-photo.jpg'],['en','en-scanned.pdf'],['fa','fa-photo.jpg'],['ps','ps-native.docx']] as const){
  const a=await account();
  const bytes=await readFile('/tmp/aria-cv-corpus/'+file),data=new FormData();data.append('file',new File([bytes],file));
  const prepared=new Request(base+'/api/applicant/cvs',{method:'POST',body:data});
  // Keep Bun's multipart Request intact: reserializing it can change its boundary.
  prepared.headers.set('content-length',String(bytes.length+1024));
  prepared.headers.set('origin',base);prepared.headers.set('host','localhost:3000');
  prepared.headers.set('cookie',APPLICANT_COOKIE+'='+a.token);
  const response=await upload(prepared);
  check(response.status===201,'upload_failed_'+response.status+'_'+(await response.clone().text()));
  const {item}=await response.json();const context={params:Promise.resolve({id:item.id})};
  check((await download(request('/api/applicant/cvs/'+item.id,'GET',b.token),context)).status===404,'foreign_read_allowed');
  const ownerRead=await download(request('/api/applicant/cvs/'+item.id,'GET',a.token),context);
  check(ownerRead.status===200&&createHash('sha256').update(Buffer.from(await ownerRead.arrayBuffer())).digest('hex')===createHash('sha256').update(bytes).digest('hex'),'download_hash_failed');
  const row=await db.applicantDocument.findUniqueOrThrow({where:{id:item.id}});
  const physical=process.env.CV_PRIVATE_DIRECTORY+'/'+row.storageKey+'.enc',stored=await readFile(physical);
  check(!stored.includes(bytes),'stored_plaintext');
  const worker=spawnSync(process.execPath,['--conditions=react-server','scripts/applicant-cv-extraction-worker.ts','--apply'],{env:process.env,encoding:'utf8',timeout:360000});
  check(worker.status===0,'extraction_worker_failed');
  const processed=await db.applicantDocument.findUniqueOrThrow({where:{id:item.id}});
  check(processed.status==='review','ocr_not_ready_'+processed.processingError);
  const review=await reviewGet(request('/api/applicant/cvs/'+item.id+'/review','GET',a.token),context);
  check(review.status===200,'review_unavailable');
  check((await reviewGet(request('/api/applicant/cvs/'+item.id+'/review','GET',b.token),context)).status===404,'foreign_review_allowed');
  // Extraction never silently changes the applicant's qualifications.
  const profile=await db.applicantProfile.findUniqueOrThrow({where:{id:a.user.applicantProfile!.id}});
  check(profile.verifiedCareerFacts===null,'extraction_silently_saved_profile');
  const reviewed=await review.json();
  check(reviewed.document.proposal?.textCharacters>30,'empty_extraction');
  const approval={sourceSha256:reviewed.document.sourceSha256,acceptedFields:['fullName'],edits:{fullName:'Reviewed fictional '+locale+' applicant'},replaceExisting:false};
  check((await reviewPost(request('/api/applicant/cvs/'+item.id+'/review','POST',b.token,approval),context)).status!==200,'foreign_approval_allowed');
  check((await reviewPost(request('/api/applicant/cvs/'+item.id+'/review','POST',a.token,approval),context)).status===200,'owner_review_failed');
  const approved=await db.applicantProfile.findUniqueOrThrow({where:{id:a.user.applicantProfile!.id}});
  check((approved.verifiedCareerFacts as Record<string,unknown>)?.fullName===approval.edits.fullName,'review_not_saved');
  check((await reviewPost(request('/api/applicant/cvs/'+item.id+'/review','POST',a.token,approval),context)).status===409,'review_replay_allowed');
  check((await remove(request('/api/applicant/cvs/'+item.id,'DELETE',b.token),context)).status===404,'foreign_deletion_allowed');
  check((await remove(request('/api/applicant/cvs/'+item.id,'DELETE',a.token),context)).status===200,'owner_deletion_failed');
  check(await stat(physical).then(()=>false,()=>true),'encrypted_file_not_deleted');
  console.log(JSON.stringify({locale,file,upload:true,encrypted:true,scanner:true,ocr:processed.status,ownerOnly:true,explicitReview:true,replayRejected:true,deleted:true}));completed++;
 }
 console.log(JSON.stringify({completed,virusRejected:true,externalMessages:0,environment:'isolated-oracle-staging'}));
}finally{
 const docs=await db.applicantDocument.findMany({where:{applicantProfile:{userId:{in:owners}}}});
 for(const doc of docs)await removePrivateCV(doc.storageKey);
 await db.user.deleteMany({where:{id:{in:owners}}});await db.$disconnect();
}
