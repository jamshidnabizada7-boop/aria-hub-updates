import {describe,test,expect} from 'bun:test';
import {validateCVUpload,CVFileError,MAX_CV_BYTES} from '../src/lib/applicants/cv-upload-validation';
const fakePdf=(suffix='%%EOF')=>Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n'+suffix);
function fakePng(w:number,h:number){
 const b=Buffer.alloc(32);Buffer.from([137,80,78,71,13,10,26,10]).copy(b,0);
 b.write('IHDR',12,'ascii');b.writeUInt32BE(w,16);b.writeUInt32BE(h,20);return b;
}
function fakeJpeg(w:number,h:number){
 const b=Buffer.alloc(32);b[0]=255;b[1]=216;b[2]=255;b[3]=192;b.writeUInt16BE(17,4);b[6]=8;b.writeUInt16BE(h,7);b.writeUInt16BE(w,9);return b;
}
function fakeWebp(w:number,h:number){
 const b=Buffer.alloc(36);b.write('RIFF',0);b.writeUInt32LE(28,4);b.write('WEBPVP8X',8);
 b[24]=(w-1)&255;b[25]=((w-1)>>8)&255;b[26]=((w-1)>>16)&255;
 b[27]=(h-1)&255;b[28]=((h-1)>>8)&255;b[29]=((h-1)>>16)&255;return b;
}
describe('M2 CV upload signatures and bounds',()=>{
 test('detects legitimate header and extension pairs for PDFs and photos',()=>{
  expect(validateCVUpload('cv.PDF',fakePdf()).mime).toBe('application/pdf');
  expect(validateCVUpload('scan.png',fakePng(1200,1700)).mime).toBe('image/png');
  expect(validateCVUpload('scan.jpeg',fakeJpeg(1200,1700)).extension).toBe('jpg');
  expect(validateCVUpload('scan.webp',fakeWebp(1200,1700)).mime).toBe('image/webp');
 });
 test('rejects executable-looking PDFs, malformed PDFs and spoofed filenames',()=>{
  expect(()=>validateCVUpload('x.pdf',Buffer.from('just words not PDF format'))).toThrow(CVFileError);
  expect(()=>validateCVUpload('bad.pdf',fakePdf('no trailer'))).toThrow(CVFileError);
  expect(()=>validateCVUpload('evil.pdf.exe',fakePdf())).toThrow(CVFileError);
  expect(()=>validateCVUpload('../cv.pdf',fakePdf())).toThrow(CVFileError);
  expect(()=>validateCVUpload('cv.jpeg',fakePdf())).toThrow(CVFileError);
 });
 test('enforces file size and image pixel bounds',()=>{
  expect(()=>validateCVUpload('cv.pdf',Buffer.alloc(MAX_CV_BYTES+1))).toThrow(CVFileError);
  expect(()=>validateCVUpload('large.png',fakePng(10000,10000))).toThrow(CVFileError);
  expect(()=>validateCVUpload('zero.png',fakePng(0,100))).toThrow(CVFileError);
 });
 test('random zip contents cannot masquerade as a DOCX',()=>{
  expect(()=>validateCVUpload('cv.docx',Buffer.from('PK\x03\x04'+ 'A'.repeat(100),'binary'))).toThrow(CVFileError);
 });
});
