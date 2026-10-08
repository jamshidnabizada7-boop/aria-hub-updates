/**
 * Uses actual Poppler, unzip, sharp and Tesseract through the worker's
 * production extraction code with synthetic, non-personal document samples.
 * No cloud storage, live worker, application server, SMTP or AI provider.
 */
import {describe,expect,test} from 'bun:test';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {extractCVBytes} from '../src/lib/applicants/cv-local-extraction';
import {ExtractedCVSchema} from '../src/lib/applicants/cv-extraction-proposals';
const dir='/tmp/aria-cv-corpus';
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
type Spec={name:string;method:'pdftotext'|'pdf-tesseract'|'docx-xml'|'tesseract';language:'en'|'fa'|'ps';education?:string;skill?:string};
const samples:Spec[]=[
 {name:'en-native.pdf',method:'pdftotext',language:'en',education:'bachelors',skill:'Teaching'},
 {name:'en-native.docx',method:'docx-xml',language:'en',education:'bachelors',skill:'Teaching'},
 {name:'fa-native.docx',method:'docx-xml',language:'fa',education:'bachelors',skill:'Teaching'},
 {name:'ps-native.docx',method:'docx-xml',language:'ps',education:'bachelors',skill:'Teaching'},
 {name:'en-scanned.pdf',method:'pdf-tesseract',language:'en',education:'bachelors',skill:'Teaching'},
 {name:'fa-scanned.pdf',method:'pdf-tesseract',language:'fa'},
 {name:'ps-scanned.pdf',method:'pdf-tesseract',language:'ps'},
 {name:'en-photo.jpg',method:'tesseract',language:'en',education:'bachelors',skill:'Teaching'},
 {name:'fa-photo.jpg',method:'tesseract',language:'fa'},
 {name:'ps-photo.jpg',method:'tesseract',language:'ps'},
 {name:'en-photo.png',method:'tesseract',language:'en',education:'bachelors'},
 {name:'en-photo.webp',method:'tesseract',language:'en',education:'bachelors'}
];
describe('isolated genuine-format CV integration corpus',()=>{
 test('corpus includes expected samples, not mocked file headers',async()=>{
  expect((await readdir(dir)).sort()).toEqual(samples.map(x=>x.name).sort());
 });
 for(const spec of samples) {
  test(spec.name+' -> '+spec.method,async()=>{
   const bytes=new Uint8Array(await readFile(join(dir,spec.name)));
   const extraction=await extractCVBytes({originalName:spec.name,sha256:digest(bytes)},bytes);
   expect(ExtractedCVSchema.safeParse(extraction).success).toBe(true);
   expect(extraction.requiresUserReview).toBe(true);
   expect(extraction.method).toBe(spec.method);
   expect(extraction.textCharacters).toBeGreaterThanOrEqual(45);
   if(spec.name.includes('native'))expect(extraction.language).toBe(spec.language);
   if(spec.education)expect(extraction.fields.education).toBe(spec.education);
   if(spec.skill)expect(extraction.fields.skills).toContain(spec.skill);
   expect(JSON.stringify(extraction.fields)).not.toMatch(/nationality|dateOfBirth|gender|experienceYears|admissionProbability/);
   for(const key of Object.keys(extraction.fields)){
    expect(extraction.evidence[key]?.snippet?.length).toBeGreaterThan(0);
    expect(extraction.evidence[key]?.confidence).toBeLessThan(1);
   }
   // Never print raw CV text; report only aggregate, non-personal markers.
   console.log('CV_CORPUS',spec.name,extraction.method,extraction.language,Object.keys(extraction.fields).join(','));
  },90000);
 }
 test('wrong source SHA is rejected before file parsers run',async()=>{
  const bytes=new Uint8Array(await readFile(join(dir,'fa-photo.jpg')));
  await expect(extractCVBytes({originalName:'fa-photo.jpg',sha256:'0'.repeat(64)},bytes)).rejects.toThrow('source_hash_mismatch');
 });
 test('damaged PDF cannot masquerade as a real source document',async()=>{
  const bytes=new Uint8Array(Buffer.from('%PDF-1.7\ninvalid content\n%%EOF'));
  await expect(extractCVBytes({originalName:'bad.pdf',sha256:digest(bytes)},bytes)).rejects.toThrow();
 });
});
