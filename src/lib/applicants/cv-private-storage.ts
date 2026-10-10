import 'server-only';
import {storeOracleCV,fetchOracleCV,removeOracleCV} from './cv-oracle-storage';
const oracle=()=>process.env.CV_PRIVATE_STORAGE_PROVIDER==='oracle';
function enabled(){if(process.env.CLOUD_CV_STORAGE_ENABLED!=='true')throw Error('cv_storage_disabled');}

/**
 * Storage is private and service-key requests never leave the trusted server.
 * These functions DO NOT authorize users: the route must check the document's
 * applicantProfileId in Postgres before read/delete.
 */
function config(){
  if(process.env.CLOUD_CV_STORAGE_ENABLED!=='true')throw new Error('cv_storage_disabled');
  const base=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket=process.env.CV_PRIVATE_BUCKET || 'aria-applicant-cvs';
  if(!base||!key||!/^[a-z0-9-]{3,63}$/.test(bucket))throw new Error('cv_storage_not_configured');
  const url=new URL(base);
  if(url.protocol!=='https:' && !(process.env.NODE_ENV!=='production'&&url.hostname==='localhost'))throw new Error('cv_storage_invalid_origin');
  return {root:url.origin,key,bucket};
}
function authHeaders(key:string): Record<string,string>{
  // Modern secret keys use apikey; only legacy service-role JWTs are bearer tokens.
  return key.startsWith('sb_secret_')?{apikey:key}:{apikey:key,Authorization:'Bearer '+key};
}
async function privateBucket(){
  const cfg=config();
  const res=await fetch(cfg.root+'/storage/v1/bucket/'+cfg.bucket,{headers:authHeaders(cfg.key),signal:AbortSignal.timeout(8000),cache:'no-store'});
  if(!res.ok)throw new Error('cv_bucket_unavailable');
  const info=await res.json();
  if(info?.public!==false)throw new Error('cv_bucket_not_private');
  return cfg;
}
function objectUrl(cfg:ReturnType<typeof config>,path:string,privateRead=false){
  if(!/^[a-z0-9_-]{5,160}\/[a-z0-9_-]{5,160}\.(pdf|docx|jpg|png|webp)$/.test(path))throw new Error('cv_storage_key_invalid');
  return cfg.root+'/storage/v1/object/'+(privateRead?'authenticated/':'')+cfg.bucket+'/'+path;
}
export async function storePrivateCV(path:string,bytes:Uint8Array,mime:string):Promise<void>{
 enabled();if(oracle())return storeOracleCV(path,bytes);
 const cfg=await privateBucket();
 const res=await fetch(objectUrl(cfg,path),{method:'POST',headers:{...authHeaders(cfg.key),'Content-Type':mime,'x-upsert':'false','Cache-Control':'private, no-store'},body:Buffer.from(bytes),signal:AbortSignal.timeout(20000),cache:'no-store'});
 if(!res.ok)throw new Error('cv_upload_failed');
}
export async function fetchPrivateCV(path:string):Promise<Uint8Array>{
 enabled();if(oracle())return fetchOracleCV(path);
 const cfg=await privateBucket();
 const res=await fetch(objectUrl(cfg,path,true),{headers:authHeaders(cfg.key),signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(!res.ok)throw new Error('cv_download_failed');
 const array=new Uint8Array(await res.arrayBuffer());
 if(array.length>8*1024*1024)throw new Error('cv_file_too_large');
 return array;
}
export async function removePrivateCV(path:string):Promise<void>{
 enabled();if(oracle())return removeOracleCV(path);
 const cfg=await privateBucket();
 objectUrl(cfg,path); // Apply the same ownership-key format guard to deletion.
 const res=await fetch(cfg.root+'/storage/v1/object/'+cfg.bucket,{method:'DELETE',headers:{...authHeaders(cfg.key),'Content-Type':'application/json'},body:JSON.stringify({prefixes:[path]}),signal:AbortSignal.timeout(12000),cache:'no-store'});
 if(!res.ok)throw new Error('cv_delete_failed');
}
