import { z } from 'zod';

/** All values extracted from a CV are untrusted proposals until user review. */
export const CVFieldSchema=z.enum(['fullName','headline','education','skills','languages','educationHistory','workHistory','certifications']);
export type CVField=z.infer<typeof CVFieldSchema>;
export const ExtractedCVSchema=z.object({
 version:z.literal(1),
 method:z.enum(['pdftotext','tesseract','docx-xml','pdf-tesseract']),
 language:z.enum(['en','fa','ps','unknown']),
 fields:z.object({
  fullName:z.string().max(120).optional(),
  headline:z.string().max(160).optional(),
  education:z.enum(['high_school','bachelors','masters','phd','other']).optional(),
  skills:z.array(z.string().min(2).max(60)).max(25).optional(),
  languages:z.array(z.string().min(2).max(60)).max(15).optional(),
  educationHistory:z.array(z.string().min(3).max(240)).max(8).optional(),
  workHistory:z.array(z.string().min(3).max(240)).max(10).optional(),
  certifications:z.array(z.string().min(3).max(200)).max(8).optional()
 }).strict(),
 evidence:z.record(z.string().max(40),z.object({snippet:z.string().max(240),confidence:z.number().min(0).max(1)})),
 extractedAt:z.string().datetime(),
 textCharacters:z.number().int().nonnegative(),
 requiresUserReview:z.literal(true)
}).strict();
export type ExtractedCV=z.infer<typeof ExtractedCVSchema>;

export const CVReviewSchema=z.object({
 sourceSha256:z.string().regex(/^[a-f0-9]{64}$/),
 acceptedFields:z.array(CVFieldSchema).min(1).max(8),
 edits:ExtractedCVSchema.shape.fields.partial(),
 replaceExisting:z.boolean().default(false)
}).strict();

/** Read-only, evidence-backed suggestions. NEVER write proposed CV values to profile here. */
export function proposeCVFields(text:string,method:ExtractedCV['method']):ExtractedCV{
 const original=text.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
 const lines=text.normalize('NFKC').split(/\r?\n/).map(x=>x.replace(/[\u0000-\u001f\u007f]/g,' ').trim()).filter(Boolean).slice(0,450);
 const short=(value:string,max=220)=>value.replace(/\s+/g,' ').trim().slice(0,max);
 const fa=/[\u0600-\u06ff]/.test(original);
 const ps=/[ټځڅډړږڼښګۍ]/.test(original);
 const language:ExtractedCV['language']=ps?'ps':fa?'fa':/[a-z]/i.test(original)?'en':'unknown';
 const fields:ExtractedCV['fields']={};
 const evidence:ExtractedCV['evidence']={};
 const set=<K extends CVField>(field:K,value:NonNullable<ExtractedCV['fields'][K]>,snippet:string,confidence:number)=>{
  (fields as Record<string,unknown>)[field]=value;
  evidence[field]={snippet:short(snippet,240),confidence};
 };
 // A name may appear in the first line. Leave uncertain headings to applicant.
 const first=lines[0]||'';
 if(first && first.length>=5&&first.length<=80&&!/[0-9@:/]/.test(first)&&!/^(cv|resume|curriculum|vitae|profile|سوانح|سی وی|معلومات|ژوندلیک)/i.test(first))
  set('fullName',short(first,120),first,0.45);
 const degrees:[RegExp,ExtractedCV['fields']['education']][]=[
  [/\b(ph\.?d|doctorate|doctoral)\b|دکتورا|دوکتورا|ډاکټری|دوکتوراه/i,'phd'],
  [/\b(master'?s?|msc|m\.sc|ma|m\.a)\b|ماستری|ماسټري|ماستر/i,'masters'],
  [/\b(bachelor'?s?|bsc|b\.sc|ba|b\.a)\b|لیسانس|ليسانس|لېسانس/i,'bachelors'],
  [/\b(high school|secondary school|grade 12|12th grade)\b|بکلوریا|بکلوريا|دولسم ټولګی/i,'high_school'],
 ];
 for(const [pattern,level] of degrees){
  const line=lines.find(x=>pattern.test(x));if(line){set('education',level!,line,0.72);break;}
 }
 // Only suggest explicitly stated skills, never invent a credential.
 const catalog=[
  ['Microsoft Excel',/\bexcel\b|اکسل|ايکسل/i],['Microsoft Word',/\bmicrosoft word\b|\bms word\b|ورد/i],
  ['Teaching',/\bteaching\b|تدریس|ښوونه/i],['Driving',/\bdriving\b|موتررانی|موټر چلول/i],
  ['Accounting',/\baccounting\b|حسابداری|حسابدارۍ/i],['Data Entry',/\bdata entry\b|دیتا انتری|ډیټا انټري/i],
  ['Project Management',/\bproject management\b|مدیریت پروژه|پروژې مدیریت/i],
  ['Nursing',/\bnursing\b|نرسنګ|پرستاری/i],['Customer Service',/\bcustomer service\b|خدمات مشتریان|پېرودونکو خدمت/i],
  ['Python',/\bpython\b/i],['JavaScript',/\bjavascript\b/i],['SQL',/\bsql\b/i],
  ['English Teaching',/\benglish teacher\b|تدریس انگلیسی|د انګلیسي تدریس/i]
 ] as const;
 const found=catalog.filter(([,pattern])=>pattern.test(original)).slice(0,25).map(([name])=>name);
 if(found.length){const snippet=lines.find(l=>catalog.some(([,p])=>p.test(l)))||'';set('skills',[...found],snippet,0.63);}
 const languageSection=/^(?:languages?|زبان(?:[‌\s]*ها)?|ژبې|ژبه)\s*[:：]?\s*(.*)$/i;
 const languageIndex=lines.findIndex(x=>languageSection.test(x));
 if(languageIndex>=0){
  const entries: string[]=[];
  const inline=languageSection.exec(lines[languageIndex])?.[1]?.trim();
  const span=[...(inline?[inline]:[]),...lines.slice(languageIndex+1,Math.min(languageIndex+5,lines.length))];
  for(const line of span) {
   if(/^(?:work|experience|education|skills|certifications?|تحصیلات|تجربه|مهارت|زده کړې|کاري تجربه|سندونه)(?:\s|[:：]|$)/iu.test(line))break;
   for(const [label,pattern] of [['English',/english|انگلیسی|انګلیسي/i],['Persian',/persian|فارسی|دری|فارسي/i],['Pashto',/pashto|پښتو/i],['Arabic',/arabic|عربی|عربي/i]] as const)
    if(pattern.test(line)&&!entries.includes(label))entries.push(label);
  }
  if(entries.length)set('languages',entries,span.join('; '),0.6);
 }
 function section(start:RegExp,stop:RegExp,max:number){
  const i=lines.findIndex(x=>start.test(x) && x.length<75);
  if(i<0)return [] as string[];
  const subset:string[]=[];
  for(const x of lines.slice(i+1,i+max+5)){
   if(stop.test(x)&&x.length<75)break;
   if(x.length>=3&&x.length<=240)subset.push(short(x,240));
   if(subset.length>=max)break;
  }
  return subset;
 }
 const startWork=/^(work experience|employment history|professional experience|experience|تجربه کاری|تجارب کاری|کاري تجربه|کاري تجربې)\s*[:：]?$/i;
 const startEducation=/^(education|academic background|qualifications|تحصیلات|سوابق تحصیلی|زده کړې|تحصیلي سوابق)\s*[:：]?$/i;
 const startCert=/^(certifications?|certificates?|licenses?|گواهینامه|تصدیق‌نامه|سندونه|سندونه او تصدیقونه)\s*[:：]?$/i;
 // Unicode headings cannot use JS \\b: Arabic-script letters do not count as ASCII word characters.
 // Stop only at an actual heading, so content from the next section is never
 // falsely attributed to education, employment or a certificate.
 const stop=/^(?:work experience|employment history|professional experience|experience|education|academic background|qualifications|skills|certifications?|certificates?|licenses?|languages?|references|contact|profile|projects|تجربه(?: کاری)?|تجارب کاری|تحصیلات|سوابق تحصیلی|مهارت(?:[‌\s]*ها)?|زبان(?:[‌\s]*ها)?|مراجع|زده کړې|تحصیلي سوابق|کاري تجرب(?:ه|ې)|ژبې|ژبه|تصدیق[‌-]?نامه|گواهینامه|سندونه(?: او تصدیقونه)?)(?:\s*[:：].*|\s*)$/iu;
 const history=section(startWork,stop,10);
 const school=section(startEducation,stop,8);
 const certs=section(startCert,stop,8);
 if(history.length)set('workHistory',history,history.slice(0,2).join('; '),0.4);
 if(school.length)set('educationHistory',school,school.slice(0,2).join('; '),0.45);
 if(certs.length)set('certifications',certs,certs.slice(0,2).join('; '),0.4);
 // The engine never guesses age, nationality, gender, employment dates or years.
 return ExtractedCVSchema.parse({
  version:1,method,language,fields,evidence,extractedAt:new Date().toISOString(),
  textCharacters:Math.min(text.length,250000),requiresUserReview:true
 });
}
export const APPROVED_CV_FIELDS=CVFieldSchema.options;
