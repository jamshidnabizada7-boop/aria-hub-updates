/**
 * ARIA HUB occupation taxonomy v1. Internal IDs are language-neutral.
 * This is intentionally explicit, versionable, and deterministic; no
 * inferred personal attributes, no AI calls and no fuzzy substring match.
 */
export const JOB_ROLES = {
 driver: {en:'Driver / Chauffeur',fa:'راننده / موترران',ps:'موټر چلوونکی',terms:['driver','drivers','driving','chauffeur','delivery driver','موترران','راننده','دریور','موټر چلوونکی','چلوونکی']},
 teacher: {en:'Teacher / Educator',fa:'معلم / آموزگار',ps:'ښوونکی',terms:['teacher','teachers','teaching','educator','school instructor','school tutor','معلم','آموزگار','استاد مکتب','ښوونکی','ښوونکې','ښوونه']},
 lecturer: {en:'Lecturer / Professor',fa:'استاد دانشگاه',ps:'د پوهنتون استاد',terms:['lecturer','professor','university instructor','university faculty','استاد دانشگاه','استاد پوهنتون','پوهنتون استاد']},
 nurse: {en:'Nurse / Midwife',fa:'نرس / قابله',ps:'نرس / قابله',terms:['nurse','nursing','midwife','midwifery','قابله','نرس','پرستار','قابله ګۍ']},
 doctor: {en:'Doctor / Physician',fa:'داکتر',ps:'ډاکټر',terms:['medical doctor','physician','medical officer','doctor','داکتر','دکتر','ډاکټر']},
 pharmacist: {en:'Pharmacist',fa:'دواساز / فارمسست',ps:'فارمسست',terms:['pharmacist','pharmacy officer','فارمسست','دواساز','درمل جوړونکی']},
 accountant: {en:'Accountant',fa:'محاسب',ps:'محاسب',terms:['accountant','accounting officer','bookkeeper','محاسب','حسابدار','حسابدارۍ']},
 finance: {en:'Finance Officer',fa:'مسئول مالی',ps:'مالي مامور',terms:['finance officer','finance manager','financial analyst','finance assistant','مسئول مالی','آمر مالی','مالي مامور','مالي مدیر']},
 administration: {en:'Administration',fa:'امور اداری',ps:'اداري چارې',terms:['administrative officer','administration officer','office assistant','office manager','admin assistant','اداری','آمر اداری','اداري مامور','اداري چارې']},
 logistics: {en:'Logistics / Supply Chain',fa:'لوژستیک',ps:'لوژستیک',terms:['logistics','supply chain','warehouse officer','storekeeper','procurement officer','لوژستیک','تدارکات','گدام دار','اکمالات']},
 security: {en:'Security Guard',fa:'محافظ امنیتی',ps:'امنیتي ساتونکی',terms:['security guard','guard','watchman','security officer','محافظ','نگهبان','پیره دار','ساتونکی']},
 cleaner: {en:'Cleaner / Janitor',fa:'صفاکار',ps:'پاکوونکی',terms:['cleaner','cleaning worker','janitor','housekeeping','صفاکار','نظافتچی','پاکوونکی']},
 software: {en:'Software / IT',fa:'تکنالوژی معلوماتی / نرم‌افزار',ps:'سافټویر / معلوماتي ټکنالوژي',terms:['software engineer','software developer','frontend developer','backend developer','web developer','programmer','it officer','information technology officer','انجنیر نرم افزار','برنامه نویس','پروگرامر','سافټویر انجنیر']},
 data: {en:'Data / M&E',fa:'داده و نظارت',ps:'ډیټا / څارنه',terms:['data analyst','data entry','data officer','database administrator','monitoring and evaluation','m&e officer','دیتا انترى','تحلیل داده','ارزیابی و نظارت','ډیټا']},
 civil_engineer: {en:'Civil Engineer',fa:'انجنیر ساختمانی',ps:'ساختماني انجنیر',terms:['civil engineer','construction engineer','site engineer','structural engineer','انجنیر ساختمانی','انجنیر سیول','ساختماني انجنیر']},
 electrical_engineer: {en:'Electrical Engineer',fa:'انجنیر برق',ps:'برېښنا انجنیر',terms:['electrical engineer','power engineer','electrician','انجنیر برق','برقکار','برېښنا انجنیر']},
 translator: {en:'Translator / Interpreter',fa:'مترجم / ترجمان',ps:'ژباړن',terms:['translator','interpreter','translation officer','مترجم','ترجمان','ژباړن','ژباړه']},
 project_officer: {en:'Project / Programme Officer',fa:'مسئول پروژه / برنامه',ps:'د پروژې مامور',terms:['project officer','project manager','programme officer','program officer','program manager','field project officer','مسئول پروژه','مدیر پروژه','آمر برنامه','د پروژې مامور']},
 ngo_field: {en:'NGO Field Worker',fa:'کارمند ساحوی',ps:'ساحوي کارکوونکی',terms:['field officer','field worker','community mobilizer','outreach worker','social mobilizer','کارمند ساحوی','بسیج کننده اجتماعی','ساحوي مامور']},
 agriculture: {en:'Agriculture / Livestock',fa:'زراعت / مالداری',ps:'کرنه / مالداري',terms:['agriculture officer','agronomist','veterinarian','livestock officer','agricultural technician','زراعت','مالداری','وترنر','کرنیز مامور']},
 sales: {en:'Sales / Retail',fa:'فروشات',ps:'پلور',terms:['sales officer','sales representative','salesman','saleswoman','shop assistant','retail worker','فروشنده','مسئول فروشات','پلورونکی']},
 marketing: {en:'Marketing / Communications',fa:'بازاریابی / ارتباطات',ps:'بازارموندنه',terms:['marketing officer','communications officer','digital marketing','marketing manager','بازاریابی','مارکتینگ','ارتباطات','بازارموندنه']},
 hr: {en:'Human Resources',fa:'منابع بشری',ps:'بشري سرچینې',terms:['human resources officer','hr officer','recruitment officer','hr manager','منابع بشری','مسئول استخدام','بشري سرچینې']},
 legal: {en:'Legal / Compliance',fa:'حقوق / قانون',ps:'حقوق / قانون',terms:['lawyer','legal officer','legal advisor','compliance officer','attorney','وکیل مدافع','مشاور حقوقی','مسئول حقوقی','حقوقي سلاکار']},
 social_worker: {en:'Social Worker / Protection',fa:'مددکار اجتماعی',ps:'ټولنیز کارکوونکی',terms:['social worker','case worker','protection officer','psychosocial worker','case management officer','مددکار اجتماعی','کارمند حمایت','ټولنیز کارکوونکی']},
 construction: {en:'Construction / Skilled Trades',fa:'ساختمانی و حرفه‌ای',ps:'ساختماني او حرفوي',terms:['mason','carpenter','plumber','welder','technician','construction worker','نجار','بنّا','نل دوان','ویلډر','ترکاڼ']},
 hospitality: {en:'Hospitality / Cook',fa:'آشپزی / مهمانداری',ps:'پخلی / مېلمه پالنه',terms:['cook','chef','kitchen assistant','hotel receptionist','hospitality officer','آشپز','آشپزخانه','مهماندار','اشپز']},
 journalist: {en:'Journalism / Media',fa:'خبرنگاری / رسانه',ps:'ژورنالیزم',terms:['journalist','reporter','editor','media officer','videographer','خبرنگار','ژورنالیست','گزارشگر','ژورنالېست']},
 customer_service: {en:'Customer Service',fa:'خدمات مشتریان',ps:'پېرودونکو خدمتونه',terms:['customer service agent','call center agent','customer support','receptionist','خدمات مشتریان','پشتیبانی مشتری','د پېرودونکو خدمتونه']},
 other: {en:'Other / Any occupation',fa:'سایر / هر وظیفه',ps:'نور / هر ډول دنده',terms:[]}
} as const;
export type JobRole = keyof typeof JOB_ROLES;
export const JOB_ROLE_IDS=Object.keys(JOB_ROLES) as JobRole[];

function canon(value:string):string{
 return value.toLocaleLowerCase('en').normalize('NFKC')
 .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u064b-\u065f\u0670]/g,'')
 .replace(/[_–—\\/.,:()\[\]{}!?-]+/g,' ').replace(/\s+/g,' ').trim();
}
function boundary(text:string,term:string):boolean{
 const phrase=canon(term);if(!phrase)return false;
 let from=0;while(true){
  const i=text.indexOf(phrase,from);if(i<0)return false;
  const before=i===0?' ':text[i-1], after=text[i+phrase.length]||' ';
  if(!/[\p{L}\p{N}]/u.test(before)&&!/[\p{L}\p{N}]/u.test(after))return true;
  from=i+1;
 }
}
/** A title/position is stronger occupational evidence than a job description. */
export function recognizeJobRoles(title:string,jobType?:string|null):JobRole[]{
 const text=canon([title,jobType||''].join(' '));
 return JOB_ROLE_IDS.filter(id=>id!=='other' && JOB_ROLES[id].terms.some(term=>boundary(text,term)));
}
export function roleMatchesPreference(selected:readonly JobRole[],title:string,jobType?:string|null):{matched:JobRole[];recognized:JobRole[]}{
 const recognized=recognizeJobRoles(title,jobType);
 const matched=selected.includes('other')?recognized:recognized.filter(role=>selected.includes(role));
 return {recognized,matched};
}
export function roleName(id:JobRole,lang:'en'|'fa'|'ps'):string{return JOB_ROLES[id][lang];}
