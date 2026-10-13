import { normalizeEvidence } from './repair-contract';
import { normalizeDigits } from './ai/translate-chunks';

const aliases:Record<string,RegExp>={
  job:/\b(job|vacanc(?:y|ies)|hiring|employment|position|recruitment)\b|وظیفه|بست|دنده/i,
  scholarship:/\bscholarship|بورسیه|بورس/i,
  fellowship:/\bfellowship|فلوشیپ|فلوشپ/i,
  internship:/\binternship|\bintern\b|کارآموز|کار زده/i,
  grant:/\bgrant|کمک مالی|مالي مرسته/i,
  training:/\btraining|\bworkshop|آموزش|روزنه/i,
  conference:/\bconference|کنفرانس|کنفرانس/i,
  competition:/\bcompetition|\bcontest|رقابت|سیالي/i,
  volunteer:/\bvolunteer|داوطلب|رضاکار/i,
  'government-job':/government|civil service|وزارت|دولتی|حکومت|اداره دولتي/i,
  'ngo-job':/\bngo\b|non.government|non.profit|humanitarian|مؤسسه|غیردولتی|بشردوستانه|خیریه/i,
  'remote-job':/\bremote|work from home|از راه دور|له لرې/i,
  'exchange-program':/exchange program|تبادل|تبادله/i,
};
export function categoryEvidence(slug:string,name:string,quote:string){
  const key=slug.toLowerCase().replace(/s$/,'');
  return aliases[key]?.test(quote)??normalizeEvidence(quote).includes(normalizeEvidence(name));
}
export function matchEvidence(field:string,value:unknown,quote:string){
  const text=normalizeEvidence(normalizeDigits(quote));
  if(Array.isArray(value))return value.length>0&&value.every(v=>typeof v==='string'&&text.includes(normalizeEvidence(v)));
  if(typeof value==='number'){
    const numbers:string[]=text.match(/\b\d+(?:\.\d+)?\b/g)||[];
    if(!numbers.includes(String(value)))return false;
    return /Age$/.test(field)?/\bage|\bold|عمر|سن|کلن/.test(text):/experience|تجربه|سابقه|تجربې/.test(text);
  }
  if(typeof value==='boolean')return field==='visaSponsorship'&&/visa|ویزا/.test(text)&&(value?/sponsor|provided|تمویل|حمایت/.test(text)&&!/not|no sponsorship|نه|بدون/.test(text):/not|no sponsorship|نه|بدون/.test(text));
  if(typeof value==='string')return text.includes(normalizeEvidence(value.replace(/_/g,' '))) || (value==='onsite'&&/on.site|on site|حضوری/.test(text));
  return false;
}
