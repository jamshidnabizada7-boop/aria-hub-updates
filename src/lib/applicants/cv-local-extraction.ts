import 'server-only';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { validateCVUpload } from './cv-upload-validation';
import { fetchPrivateCV } from './cv-private-storage';
import { proposeCVFields, type ExtractedCV } from './cv-extraction-proposals';
import { wordDocumentXmlToText } from './cv-docx-text';

/** A separate worker only: NO OCR in a Next.js request handler. */
const MAX_OUTPUT=250_000, MAX_PAGES=12;
class ExtractFailure extends Error {
 constructor(public code:string){super(code);}
}
function run(command:string,args:string[],input?:Uint8Array,timeout=20000):Promise<string>{
 return new Promise((resolve,reject)=>{
  const child=spawn(command,args,{stdio:['pipe','pipe','pipe'],shell:false,env:{
   NODE_ENV:process.env.NODE_ENV||'production',PATH:process.env.PATH||'/usr/bin:/bin',LANG:'C.UTF-8',HOME:'/nonexistent',
   OMP_THREAD_LIMIT:'1',OMP_NUM_THREADS:'1'
  }});
  const stdout:Buffer[]=[],stderr:Buffer[]=[];
  let size=0,closed=false;
  const fail=(code:string)=>{
   if(closed)return;
   closed=true;clearTimeout(timer);child.kill('SIGKILL');reject(new ExtractFailure(code));
  };
  const timer=setTimeout(()=>fail('processor_timeout'),timeout);
  child.on('error',()=>fail('processor_unavailable'));
  child.stdout.on('data',(part:Buffer)=>{size+=part.length;if(size>MAX_OUTPUT)fail('processor_output_limit');else stdout.push(part);});
  child.stderr.on('data',(part:Buffer)=>{if(stderr.reduce((sum,x)=>sum+x.length,0)<4000)stderr.push(part);});
  child.on('close',(code)=>{
   if(closed)return;
   closed=true;clearTimeout(timer);
   if(code!==0){reject(new ExtractFailure('processor_failed'));return;}
   resolve(Buffer.concat(stdout).toString('utf8'));
  });
  child.stdin.on('error',()=>{}); // process may exit while stdin is closing
  child.stdin.end(input?Buffer.from(input):undefined);
 });
}
const hasUsefulText=(text:string)=>text.replace(/[\s\d\p{P}\p{S}]/gu,'').length>=45;
async function languages():Promise<string>{
 const raw=(await run('tesseract',['--list-langs'],undefined,5000)).toLowerCase();
 const installed=new Set(raw.split(/\r?\n/).map(x=>x.trim()));
 // Fail closed for missing Afghan-language OCR packs. Do NOT silently claim
 // English-only Tesseract supports Persian or Pashto.
 if(!installed.has('eng')||!installed.has('fas')||!installed.has('pus'))
  throw new ExtractFailure('missing_ocr_languages');
 return 'eng+fas+pus';
}
async function docxText(file:string):Promise<string>{
 // Validator already checked archive bounds; run() caps extracted XML bytes.
 const xml=await run('unzip',['-p',file,'word/document.xml'],undefined,12000);
 return wordDocumentXmlToText(xml).slice(0,MAX_OUTPUT);
}
async function ocrImage(bytes:Uint8Array,langs:string):Promise<string>{
 // Decode / rotate / bound megapixels BEFORE invoking OCR; do not forward
 // original malformed image containers to Tesseract.
 const png=await sharp(Buffer.from(bytes),{limitInputPixels:25_000_000})
   .rotate().resize({width:2100,height:3000,fit:'inside',withoutEnlargement:true})
   .png({compressionLevel:9}).toBuffer();
 return run('tesseract',['stdin','stdout','-l',langs,'--psm','11'],png,30000);
}
async function processPDF(file:string,dir:string):Promise<{text:string;method:ExtractedCV['method']}>{
 const info=await run('pdfinfo',[file],undefined,8000);
 const pages=Number(info.match(/^Pages:\s*(\d+)/m)?.[1]);
 if(!Number.isInteger(pages)||pages<1||pages>MAX_PAGES)throw new ExtractFailure('pdf_pages_out_of_bounds');
 const extracted=await run('pdftotext',['-f','1','-l',String(pages),'-layout',file,'-'],undefined,20000);
 if(hasUsefulText(extracted))return {text:extracted,method:'pdftotext'};
 const langs=await languages();
 // OCR no more than first 3 scanned pages at 1800px (resource budget).
 let text='';
 for(let page=1;page<=Math.min(pages,3);page++){
  const prefix=join(dir,'page-'+page);
  await run('pdftoppm',['-f',String(page),'-l',String(page),'-scale-to','1800','-png','-singlefile',file,prefix],undefined,20000);
  const data=await readFile(prefix+'.png');
  text+=(await ocrImage(data,langs))+'\n';
 }
 return {text,method:'pdf-tesseract'};
}
/** Bounded extraction entrypoint for private worker and isolated byte fixtures. */
export async function extractCVBytes(
 file:{originalName:string;sha256:string},bytes:Uint8Array
):Promise<ExtractedCV>{
 const digest=createHash('sha256').update(bytes).digest('hex');
 if(digest!==file.sha256)throw new ExtractFailure('source_hash_mismatch');
 const kind=validateCVUpload(file.originalName,bytes).extension;
 const dir=await mkdtemp(join(tmpdir(),'aria-cv-')); // owner-only folder
 try{
  const source=join(dir,'source.'+kind);
  await writeFile(source,bytes,{mode:0o600});
  let text:string,method:ExtractedCV['method'];
  if(kind==='docx'){text=await docxText(source);method='docx-xml';}
  else if(kind==='pdf'){({text,method}=await processPDF(source,dir));}
  else {const lang=await languages();text=await ocrImage(bytes,lang);method='tesseract';}
  if(!hasUsefulText(text))throw new ExtractFailure('insufficient_readable_text');
  return proposeCVFields(text.slice(0,MAX_OUTPUT),method);
 }finally{
  await rm(dir,{recursive:true,force:true,maxRetries:2});
 }
}
export async function extractStoredCV(
 file:{storageKey:string;originalName:string;sha256:string}
):Promise<ExtractedCV>{
 return extractCVBytes(file,await fetchPrivateCV(file.storageKey));
}
export function cvProcessingCode(error:unknown):string{
 return error instanceof ExtractFailure?error.code:
  error instanceof Error && /cv_|invalid_file|image_dimensions/.test(error.message)?'unsafe_or_unreadable_file':'processing_failed';
}
