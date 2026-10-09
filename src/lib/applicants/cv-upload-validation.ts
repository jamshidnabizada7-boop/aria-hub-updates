/**
 * Bounded, content-based CV upload classification. Do not trust File.type,
 * filename, or leading PK bytes for DOCX. Parsing/OCR always happens off the
 * web request path with separate limits; this module does not execute content.
 */
export const MAX_CV_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 25_000_000;
const MAX_DOCX_UNCOMPRESSED = 20 * 1024 * 1024;
const MAX_DOCX_ENTRIES = 250;
type SafeFormat = { mime: string; extension: 'pdf'|'docx'|'jpg'|'png'|'webp' };
export class CVFileError extends Error {
  constructor(public code: string) { super(code); }
}
function invalid(): never { throw new CVFileError('invalid_file_format'); }
function boundedPixels(w:number,h:number): void {
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w*h>MAX_IMAGE_PIXELS) throw new CVFileError('image_dimensions_out_of_bounds');
}
function docxPackage(bytes: Uint8Array): boolean {
  const b=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  // EOCD must occur in the last 65557 bytes; reject multi-disk / Zip64.
  let eocd=-1;
  for(let p=b.length-22;p>=Math.max(0,b.length-65557);p--){
    if(b.readUInt32LE(p)===0x06054b50){eocd=p;break;}
  }
  if(eocd<0)return false;
  const count=b.readUInt16LE(eocd+10);
  const centralSize=b.readUInt32LE(eocd+12), offset=b.readUInt32LE(eocd+16);
  if(!count||count>MAX_DOCX_ENTRIES||centralSize===0xffffffff||offset===0xffffffff||offset+centralSize>eocd)return false;
  let p=offset,uncompressed=0,hasManifest=false,hasDocument=false;
  for(let n=0;n<count;n++){
    if(p+46>eocd||b.readUInt32LE(p)!==0x02014b50)return false;
    const flags=b.readUInt16LE(p+8), method=b.readUInt16LE(p+10);
    const zipped=b.readUInt32LE(p+20), unpacked=b.readUInt32LE(p+24);
    const nameLen=b.readUInt16LE(p+28),extra=b.readUInt16LE(p+30),comment=b.readUInt16LE(p+32);
    if(flags&1 || (method!==0 && method!==8) || unpacked===0xffffffff || zipped===0xffffffff)return false;
    if(nameLen===0||p+46+nameLen+extra+comment>eocd)return false;
    const name=b.subarray(p+46,p+46+nameLen).toString('utf8').replace(/\\/g,'/');
    if(name.startsWith('/')||name.includes('../')||name.includes('..\\')||name.includes('\0')||/\.(exe|dll|js|vbs|bat|sh)$/i.test(name))return false;
    if(/vbaProject\.bin$/i.test(name))return false;
    uncompressed+=unpacked;
    if(uncompressed>MAX_DOCX_UNCOMPRESSED || (zipped>0 && unpacked/zipped>150))return false;
    if(name==='[Content_Types].xml')hasManifest=true;
    if(name==='word/document.xml')hasDocument=true;
    p+=46+nameLen+extra+comment;
  }
  return hasManifest&&hasDocument&&p===offset+centralSize;
}
function jpegSize(b:Buffer):void {
  let p=2;
  while(p+4<b.length){
    if(b[p]!==0xff)invalid();
    let marker=b[p+1];p+=2;
    if(marker===0xd9||marker===0xda)break;
    if(marker>=0xd0&&marker<=0xd7)continue;
    if(p+2>b.length)invalid();
    const size=b.readUInt16BE(p);if(size<2||p+size>b.length)invalid();
    if([0xc0,0xc1,0xc2,0xc3].includes(marker)){
      if(size<7)invalid();boundedPixels(b.readUInt16BE(p+5),b.readUInt16BE(p+3));return;
    }
    p+=size;
  }
  invalid();
}
function webpSize(b:Buffer):void{
  const kind=b.toString('ascii',12,16);
  if(kind==='VP8X'&&b.length>=30){const w=1+b[24]+(b[25]<<8)+(b[26]<<16);const h=1+b[27]+(b[28]<<8)+(b[29]<<16);boundedPixels(w,h);return;}
  if(kind==='VP8L'&&b.length>=25 && b[20]===0x2f){const w=1+(((b[22]&0x3f)<<8)|b[21]);const h=1+(((b[24]&0x0f)<<10)|(b[23]<<2)|((b[22]&0xc0)>>6));boundedPixels(w,h);return;}
  if(kind==='VP8 '&&b.length>=30 && b[23]===0x9d&&b[24]===0x01&&b[25]===0x2a){boundedPixels(b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff);return;}
  invalid();
}
export function validateCVUpload(filename:string,bytes:Uint8Array):SafeFormat{
  if(!Number.isInteger(bytes.byteLength)||bytes.byteLength<24||bytes.byteLength>MAX_CV_BYTES)throw new CVFileError('invalid_file_size');
  const b=Buffer.from(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const extension=filename.toLowerCase().match(/\.([a-z0-9]{2,4})$/)?.[1];
  if(!extension||filename.length>180||/[\0\/\\]/.test(filename))invalid();
  if(extension==='pdf'&&b.subarray(0,5).toString('ascii')==='%PDF-') {
    if(!b.subarray(Math.max(0,b.length-1024)).toString('latin1').includes('%%EOF'))invalid();
    return {extension:'pdf',mime:'application/pdf'};
  }
  if(extension==='docx'&&b.readUInt32LE(0)===0x04034b50&&docxPackage(bytes))return {extension:'docx',mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
  if(['jpg','jpeg'].includes(extension)&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff){jpegSize(b);return {extension:'jpg',mime:'image/jpeg'};}
  if(extension==='png'&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&b.subarray(12,16).toString('ascii')==='IHDR'){
    boundedPixels(b.readUInt32BE(16),b.readUInt32BE(20));return {extension:'png',mime:'image/png'};
  }
  if(extension==='webp'&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'&&b.readUInt32LE(4)+8<=b.length){
    webpSize(b);return {extension:'webp',mime:'image/webp'};
  }
  invalid();
}
