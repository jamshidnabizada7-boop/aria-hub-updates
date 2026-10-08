/**
 * Parse the visible text from WordprocessingML after the archive has passed
 * ZIP size/entry validation and the extraction subprocess has bounded output.
 * Word may split a single word over many <w:r>/<w:t> runs, so stripping tags
 * must NOT insert spaces between adjacent text runs.
 */
export function wordDocumentXmlToText(xml:string):string {
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('unsafe_docx_xml');
  const text=xml
    .replace(/<w:tab\b[^>]*\/>/g,'\t')
    .replace(/<w:(?:br|cr)\b[^>]*\/>/g,'\n')
    .replace(/<\/w:p>/g,'\n')
    .replace(/<\/w:tr>/g,'\n')
    .replace(/<\/w:tc>/g,'\t')
    .replace(/<[^>]*>/g,'')
    .replace(/&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g,(_m,entity:string)=>{
      if(entity==='amp')return '&';
      if(entity==='lt')return '<';
      if(entity==='gt')return '>';
      if(entity==='quot')return '"';
      if(entity==='apos')return "'";
      const hex=entity.toLowerCase().startsWith('#x');
      const n=Number.parseInt(entity.slice(hex?2:1),hex?16:10);
      return Number.isInteger(n)&&n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'';
    })
    .replace(/[ \t]+/g,' ')
    .replace(/[ \t]*\n[ \t]*/g,'\n');
  return text.trim();
}
