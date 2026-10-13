import 'server-only';
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {mkdir,lstat,statfs,open,readFile,link,unlink} from 'node:fs/promises';
import {isAbsolute,join,resolve,sep} from 'node:path';
const PREFIX=Buffer.from('ARIA-CV1'),MAX=8*1024*1024;
function config(path:string){
 if(!/^[a-z0-9_-]{5,160}\/[a-z0-9_-]{5,160}\.(pdf|docx|jpg|png|webp)$/.test(path))throw Error('cv_storage_key_invalid');
 const root=process.env.CV_PRIVATE_DIRECTORY||'',key=process.env.CV_PRIVATE_STORAGE_KEY||'';
 if(!isAbsolute(root)||root===resolve(/* turbopackIgnore: true */ root,'..')||!/^[a-f0-9]{64}$/i.test(key))throw Error('cv_storage_not_configured');
 const absolute=resolve(/* turbopackIgnore: true */ root);
 // Never allow a web-served location to become the private object store.
 if(absolute===resolve(/* turbopackIgnore: true */ process.cwd())||absolute.startsWith(resolve(/* turbopackIgnore: true */ process.cwd())+sep))throw Error('cv_storage_unsafe_directory');
 return {root:absolute,key:Buffer.from(key,'hex'),owner:join(absolute,path.split('/')[0]),file:join(absolute,path)+'.enc',aad:Buffer.from('aria-private-cv:'+path)};
}
async function privateDirectory(dir:string){
 await mkdir(dir,{recursive:true,mode:0o700});
 const meta=await lstat(dir);
 if(!meta.isDirectory()||meta.isSymbolicLink()||(process.platform!=='win32'&&(meta.mode&0o077)!==0))throw Error('cv_storage_directory_not_private');
}
export async function storeOracleCV(path:string,bytes:Uint8Array){
 if(bytes.length===0||bytes.length>MAX)throw Error('cv_file_too_large');
 const cfg=config(path);await privateDirectory(cfg.root);await privateDirectory(cfg.owner);
 const disk=await statfs(cfg.root);
 if(disk.bavail*disk.bsize<2*1024*1024*1024)throw Error('cv_storage_capacity_unavailable');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',cfg.key,iv);cipher.setAAD(cfg.aad);
 const ciphertext=Buffer.concat([cipher.update(bytes),cipher.final()]);
 const blob=Buffer.concat([PREFIX,iv,cipher.getAuthTag(),ciphertext]);
 const temporary=cfg.file+'.'+randomBytes(8).toString('hex')+'.tmp';
 const handle=await open(temporary,'wx',0o600);
 try{
  try{await handle.writeFile(blob);await handle.sync();}finally{await handle.close();}
  await link(temporary,cfg.file);
 }finally{await unlink(temporary).catch(()=>{});}
}
export async function fetchOracleCV(path:string):Promise<Uint8Array>{
 const cfg=config(path);const meta=await lstat(cfg.file);
 if(!meta.isFile()||meta.isSymbolicLink()||meta.size>MAX+36)throw Error('cv_storage_object_invalid');
 const blob=await readFile(/* turbopackIgnore: true */ cfg.file);
 if(!blob.subarray(0,8).equals(PREFIX)||blob.length<37)throw Error('cv_storage_object_invalid');
 const decipher=createDecipheriv('aes-256-gcm',cfg.key,blob.subarray(8,20));
 decipher.setAAD(cfg.aad);decipher.setAuthTag(blob.subarray(20,36));
 return Buffer.concat([decipher.update(blob.subarray(36)),decipher.final()]);
}
export async function removeOracleCV(path:string){
 const cfg=config(path);
 await unlink(cfg.file).catch(error=>{if(error.code!=='ENOENT')throw error;});
}
