'use client';
import React,{useEffect,useState} from 'react';
import Link from 'next/link';
import {JOB_ROLE_IDS,roleName,type JobRole} from '@/lib/job-role-taxonomy';
import {AF_PROVINCES,type AfghanProvince} from '@/lib/geo/provinces';
import {EDUCATION_LEVELS,FIELD_AREAS,MATCHER_INTENTS,type MatcherProfile,type EducationLevel,type FieldArea,type MatcherIntent} from '@/lib/opportunity-matcher';
type Lang='en'|'fa'|'ps';
type Match={id:string;slug:string;title:string;organization:string|null;location:string;deadline:string|null;matchStrength:string;eligibilityStatus:string;dataConfidence:string;reasons:string[];verified:string[];unknowns:string[];conflicts:string[];explanation:string};
type Saved={id:string;name:string;profile:MatcherProfile;active:boolean;updatedAt:string};
const WORDS={
en:{
 title:'Advanced opportunity matching',intro:'Build a detailed, editable profile. ARIA HUB checks actual listings and known eligibility conditions; matches are not acceptance predictions.',
 quick:'Quick Match',save:'Save this search',saved:'Your saved searches',searchName:'Search name',search:'Find suitable opportunities',section:['Goals & job roles','Education & field','Experience & skills','Eligibility & location','Review & results'],next:'Next',back:'Back',goal:'I am looking for',roles:'Preferred job positions',roleHint:'Select up to 12. Exact roles help avoid irrelevant vacancies.',findRole:'Find an occupation',roleNo:'No roles selected — include all occupations.',education:'Current education',target:'Desired degree',field:'Field of study',experience:'Years of work experience',skills:'Skills, separated by commas',nationality:'Nationality (required for eligibility checking)',residence:'Country of residence',destinations:'Countries to consider (comma-separated, or Anywhere)',provinces:'Preferred Afghan provinces',workMode:'Work arrangement',any:'Any',remote:'Remote',onSite:'On site',hybrid:'Hybrid',review:'Review your preferences before searching.',profileSave:'Save these as my verified career facts',profileLoad:'Use my reviewed career facts',factsNote:'Only information you manually review is reused; uploaded CV text is not automatically trusted.',noMatches:'No sufficiently supported matches found. Broaden your roles, location or eligibility preferences.',why:'Why it matched',unknown:'Still needs verification',conflicts:'Potential conflict',verified:'Supported requirements',edit:'Edit search',remove:'Delete',activate:'Enable saved search',deactivate:'Pause saved search',notifications:'Saved searches do not send notifications yet. Email/push alerts will be introduced separately with your consent.',error:'Unable to complete request.',results:'Recommended opportunities',detail:'View opportunity',privacy:'Your saved preferences belong to your account. No AI calls are required for this ranking.',strong:'Strong',good:'Good',possible:'Possible',loading:'Checking live published opportunities…',disabled:'No available results',saveOk:'Saved',salaryNote:'Salary, work authorization and missing eligibility facts are not guessed.'
},
fa:{
 title:'تطبیق پیشرفته فرصت‌ها',intro:'مشخصات مفصل خود را بسازید. آریا هاب فرصت‌ها و شرایط واقعی را بررسی می‌کند؛ پیشنهادها تضمین قبولی نیستند.',
 quick:'تطبیق سریع',save:'ذخیره این جستجو',saved:'جستجوهای ذخیره‌شده',searchName:'نام جستجو',search:'یافتن فرصت‌های مناسب',section:['هدف‌ها و وظایف','تحصیل و رشته','تجربه و مهارت‌ها','شرایط و موقعیت','بررسی و نتیجه'],next:'بعدی',back:'قبلی',goal:'دنبال این فرصت‌ها هستم',roles:'وظایف مورد نظر',roleHint:'حداکثر ۱۲ وظیفه را انتخاب کنید تا پیشنهادهای نامربوط کمتر شود.',findRole:'جستجوی وظیفه',roleNo:'هیچ وظیفه‌ای انتخاب نشده؛ همه بررسی می‌شوند.',education:'تحصیلات فعلی',target:'مقطع تحصیلی مورد نظر',field:'رشته تحصیلی',experience:'سال‌های تجربه کاری',skills:'مهارت‌ها (جداشده با کامه)',nationality:'تابعیت (برای بررسی شرایط)',residence:'کشور محل اقامت',destinations:'کشورهای مورد نظر (با کامه یا Anywhere)',provinces:'ولایت‌های مورد نظر در افغانستان',workMode:'نوع محل کار',any:'فرقی ندارد',remote:'از راه دور',onSite:'حضوری',hybrid:'ترکیبی',review:'پیش از جستجو، انتخاب‌های خود را بررسی کنید.',profileSave:'ذخیره اطلاعات تأییدشده مسلکی',profileLoad:'استفاده از اطلاعات تأییدشده من',factsNote:'فقط اطلاعاتی که خودتان بررسی کرده‌اید استفاده می‌شود؛ اطلاعات استخراج‌نشده از CV معتبر فرض نمی‌شود.',noMatches:'تطبیق کافی پیدا نشد. وظیفه، موقعیت یا شرایط را گسترده‌تر کنید.',why:'چرا تطبیق دارد',unknown:'هنوز نیاز به بررسی دارد',conflicts:'تعارض احتمالی',verified:'شرایط پشتیبانی‌شده',edit:'ویرایش جستجو',remove:'حذف',activate:'فعال‌سازی جستجوی ذخیره‌شده',deactivate:'توقف جستجوی ذخیره‌شده',notifications:'جستجوهای ذخیره‌شده هنوز اطلاع‌رسانی ارسال نمی‌کنند. ایمیل و اعلان‌ها بعداً با رضایت شما فعال می‌شوند.',error:'درخواست ناکام شد.',results:'فرصت‌های پیشنهادشده',detail:'مشاهده فرصت',privacy:'این ترجیحات در حساب خصوصی شما ذخیره می‌شوند. تطبیق نیاز به فراخوانی AI ندارد.',strong:'قوی',good:'خوب',possible:'ممکن',loading:'فرصت‌های نشرشده بررسی می‌شوند…',disabled:'نتیجه‌ای موجود نیست',saveOk:'ذخیره شد',salaryNote:'معلومات نامعلوم معاش و شرایط به‌طور حدسی تکمیل نمی‌شوند.'
},
ps:{
 title:'د فرصتونو پرمختللې برابرونه',intro:'خپل مفصل معلومات ولیکئ. آریا هاب واقعي فرصتونه او معلوم شرطونه پرتله کوي؛ دا د منلو ضمانت نه دی.',
 quick:'چټکه برابرونه',save:'دا لټون خوندي کړئ',saved:'خوندي لټونونه',searchName:'د لټون نوم',search:'مناسب فرصتونه ولټوئ',section:['موخې او دندې','زده کړې او څانګه','تجربه او مهارتونه','شرطونه او ځای','کتنه او پایلې'],next:'بل',back:'شاته',goal:'زه دا فرصتونه غواړم',roles:'غوره دندې',roleHint:'تر ۱۲ پورې دندې وټاکئ، څو غیر اړوند فرصتونه کم شي.',findRole:'د دندې لټون',roleNo:'کومه دنده نه ده ټاکل شوې؛ ټولې پرتله کېږي.',education:'اوسنۍ زده کړې',target:'غوښتل شوې زده کړې',field:'د زده کړې څانګه',experience:'د کاري تجربې کلونه',skills:'مهارتونه (په کامه بېل)',nationality:'تابعیت (د شرایطو لپاره)',residence:'اوسنی هېواد',destinations:'غوره هېوادونه (په کامه یا Anywhere)',provinces:'د افغانستان غوره ولایتونه',workMode:'د کار ډول',any:'هر ډول',remote:'له لرې',onSite:'حضوري',hybrid:'ګډ',review:'له لټون مخکې خپلې خوښې وګورئ.',profileSave:'تایید شوي کاري معلومات خوندي کړئ',profileLoad:'زما تایید شوي معلومات وکاروئ',factsNote:'یوازې هغه معلومات کارول کېږي چې تاسو تایید کړي وي؛ د سي وي اتومات استخراج لا نه دی فعال.',noMatches:'مناسب فرصت ونه موندل شو. غوره توبونه پراخ کړئ.',why:'د برابرون لامل',unknown:'لا تایید غواړي',conflicts:'احتمالي ستونزه',verified:'تایید شوي شرطونه',edit:'لټون بدل کړئ',remove:'ړنګ کړئ',activate:'خوندي لټون فعال کړئ',deactivate:'خوندي لټون ودروئ',notifications:'خوندي لټونونه لا خبرتیاوې نه لېږي. برېښنالیک او پش خبرتیاوې به وروسته ستاسو په اجازه فعالې شي.',error:'غوښتنه ناکامه شوه.',results:'وړاندیز شوي فرصتونه',detail:'فرصت وګورئ',privacy:'ستاسو غوره توبونه په شخصي حساب کې ساتل کېږي. د دې برابرولو لپاره AI نه کارول کېږي.',strong:'قوي',good:'ښه',possible:'ممکن',loading:'نشر شوي فرصتونه ارزول کېږي…',disabled:'پایلې نشته',saveOk:'خوندي شو',salaryNote:'ناڅرګند معاش او شرطونه نه اټکلېږي.'
}
} as const;
const educationLabels:Record<EducationLevel,string>={high_school:'High School / مکتب',bachelors:'Bachelor / لیسانس',masters:'Master / ماستری',phd:'PhD / دوکتورا',other:'Other / سایر'};
const fieldLabels:Record<FieldArea,string>={any:'Any field',technology:'Technology',engineering:'Engineering',business:'Business & Finance',health:'Health',education:'Education',social_sciences:'Social sciences',law_policy:'Law & Policy',natural_sciences:'Natural sciences',environment_agriculture:'Agriculture & Environment',arts_humanities:'Arts & Humanities'};
const defaultProfile=(lang:Lang):MatcherProfile=>({intents:['job'],education:'bachelors',nationality:'',residence:'',destinations:['anywhere'],fieldArea:'any',preferredRoles:[],preferredProvinces:[],skills:[],desiredWorkMode:'any',lang,explainWithAi:false});
const checklist=(selected:string[],id:string,max:number)=>selected.includes(id)?selected.filter(x=>x!==id):selected.length<max?[...selected,id]:selected;
const evidenceName=(key:string,lang:Lang)=>{
 const keys:Record<string,[string,string,string]>={
  preferred_role:['Chosen occupation matches the job title','عنوان وظیفه با شغل مورد نظر تطبیق دارد','غوره دنده له عنوان سره برابره ده'],
  province:['Preferred province','ولایت مورد نظر','غوره ولایت'],
  skills:['Some named skills appear in the job details','بعضی مهارت‌ها در شرایط ذکر شده‌اند','ځینې مهارتونه په دنده کې یاد شوي'],
  work_mode:['Work arrangement matches','نوع محل کار تطبیق دارد','د کار ډول برابر دی'],
  nationality:['Nationality eligibility','شرایط تابعیت','د تابعیت شرطونه'],
  experience:['Experience requirement','شرط تجربه','د تجربې شرط'],
  education:['Education requirement','شرط تحصیلی','د زده کړې شرط'],
  destination:['Destination matches','مقصد تطبیق دارد','ځای برابر دی'],
  field:['Field of study','رشته تحصیلی','د زده کړې څانګه'],
  deadline:['Deadline not stated','مهلت مشخص نیست','وروستۍ نېټه نده معلومه']
 };return keys[key]?.[lang==='en'?0:lang==='fa'?1:2]||key.replace(/_/g,' ');
};
export function AdvancedMatcher({lang}:{lang:Lang}){
 const t=WORDS[lang],rtl=lang!=='en';
 const [step,setStep]=useState(0),[profile,setProfile]=useState<MatcherProfile>(defaultProfile(lang)),[name,setName]=useState('My career matches'),[roleQuery,setRoleQuery]=useState(''),[saved,setSaved]=useState<Saved[]>([]),[results,setResults]=useState<Match[]>([]),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const [skillsText,setSkillsText]=useState(''),[destText,setDestText]=useState('Anywhere');
 const set=<K extends keyof MatcherProfile,>(field:K,value:MatcherProfile[K])=>setProfile(p=>({...p,[field]:value}));
 const refresh=async()=>{const r=await fetch('/api/applicant/saved-searches',{cache:'no-store'});if(r.ok){const d=await r.json();setSaved(d.items||[]);}};
 useEffect(()=>{void refresh().catch(()=>{});},[]);
 const payload=():MatcherProfile=>({...profile,lang,explainWithAi:false,skills:skillsText.split(/[,،\n]/).map(x=>x.trim()).filter(Boolean).slice(0,25),destinations:destText.split(/[,،\n]/).map(x=>x.trim()).filter(Boolean).slice(0,8).map(x=>x.toLowerCase()==='anywhere'?'anywhere':x)});
 const valid=()=>{const p=payload();return Boolean(p.intents.length&&p.nationality.trim().length>1&&p.residence.trim().length>1&&(p.destinations?.length||0)>0);};
 const find=async()=>{if(!valid()){setStatus(lang==='fa'?'تابعیت، محل اقامت و مقصد را تکمیل کنید.':lang==='ps'?'تابعیت، استوګنځی او هېواد ولیکئ.':'Complete nationality, residence and destination first.');return;}
 setBusy(true);setStatus(t.loading);setResults([]);
 try{const r=await fetch('/api/opportunities/matcher',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload())});const d=await r.json();if(!r.ok)throw Error(d.error||t.error);setResults(d.results||[]);setStatus((d.results||[]).length?'':t.noMatches);}catch(e){setStatus(e instanceof Error?e.message:t.error);}finally{setBusy(false);}};
 const save=async()=>{if(!valid())return setStatus(t.error);setBusy(true);try{const r=await fetch('/api/applicant/saved-searches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim()||t.title,profile:payload()})});const d=await r.json();if(!r.ok)throw Error(d.error);await refresh();setStatus(t.saveOk);}catch(e){setStatus(e instanceof Error?e.message:t.error);}finally{setBusy(false);}};
 const facts=async(mode:'load'|'save')=>{setBusy(true);try{if(mode==='save'){const p=payload();const r=await fetch('/api/applicant/career-facts',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({education:p.education,fieldArea:p.fieldArea,experienceYears:p.experienceYears,preferredRoles:p.preferredRoles,skills:p.skills})});if(!r.ok)throw Error('failed');setStatus(t.saveOk);}
 else{const r=await fetch('/api/applicant/career-facts',{cache:'no-store'});const d=await r.json();if(!r.ok||!d.facts)throw Error('No reviewed career facts saved');setProfile(p=>({...p,...d.facts,lang,explainWithAi:false}));setSkillsText((d.facts.skills||[]).join(', '));setStatus(t.saveOk);}
 }catch(e){setStatus(e instanceof Error?e.message:t.error);}finally{setBusy(false);}};
 const load=(item:Saved)=>{setProfile({...defaultProfile(lang),...item.profile,lang,explainWithAi:false});setSkillsText((item.profile.skills||[]).join(', '));setDestText((item.profile.destinations||['anywhere']).join(', '));setName(item.name);setStep(4);setResults([]);setStatus('');};
 const update=async(item:Saved,remove:boolean)=>{const r=await fetch('/api/applicant/saved-searches/'+encodeURIComponent(item.id),{method:remove?'DELETE':'PATCH',headers:{'Content-Type':'application/json'},body:remove?undefined:JSON.stringify({name:item.name,profile:item.profile,active:!item.active})});if(!r.ok)return setStatus(t.error);await refresh();};
 const choiceClass=(on:boolean)=>'rounded-lg border px-3 py-2 text-sm '+(on?'border-primary bg-primary/10 font-semibold':'bg-card hover:border-primary');
 return <main dir={rtl?'rtl':'ltr'} className="mx-auto max-w-5xl px-4 py-10">
  <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">{t.title}</h1><Link href={'/'+lang+'/opportunity-matcher'} className="rounded-lg border px-3 py-2 text-sm">{t.quick}</Link></div>
  <p className="mt-3 text-muted-foreground">{t.intro}</p>
  <div className="my-6 flex flex-wrap gap-2">{t.section.map((title,i)=><button key={title} type="button" onClick={()=>setStep(i)} className={choiceClass(step===i)}>{i+1}. {title}</button>)}</div>
  <section className="rounded-xl border bg-card p-5 md:p-7 space-y-5">
   <h2 className="text-xl font-bold">{t.section[step]}</h2>
   {step===0&&<>
    <fieldset><legend className="mb-3 font-semibold">{t.goal}</legend><div className="flex flex-wrap gap-2">{MATCHER_INTENTS.map(intent=><button type="button" key={intent} aria-pressed={profile.intents.includes(intent)} className={choiceClass(profile.intents.includes(intent))} onClick={()=>set('intents',checklist(profile.intents,intent,3) as MatcherIntent[])}>{intent.replace(/_/g,' ')}</button>)}</div></fieldset>
    <fieldset><legend className="mb-2 font-semibold">{t.roles}</legend><p className="mb-3 text-sm text-muted-foreground">{t.roleHint}</p>
     <input value={roleQuery} onChange={e=>setRoleQuery(e.target.value)} placeholder={t.findRole} className="w-full rounded-lg border bg-background p-3"/>
     <div className="mt-3 flex max-h-64 flex-wrap gap-2 overflow-auto">{JOB_ROLE_IDS.filter(id=>id!=='other'&&(!roleQuery||roleName(id,lang).toLowerCase().includes(roleQuery.toLowerCase())||id.includes(roleQuery.toLowerCase()))).map(role=><button type="button" key={role} aria-pressed={(profile.preferredRoles||[]).includes(role)} className={choiceClass((profile.preferredRoles||[]).includes(role))} onClick={()=>set('preferredRoles',checklist(profile.preferredRoles||[],role,12) as JobRole[])}>{roleName(role,lang)}</button>)}</div>
     {!(profile.preferredRoles||[]).length&&<p className="mt-2 text-xs text-muted-foreground">{t.roleNo}</p>}
    </fieldset>
   </>}
   {step===1&&<>
    <label className="block font-semibold">{t.education}<select className="mt-2 w-full rounded-lg border bg-background p-3" value={profile.education} onChange={e=>set('education',e.target.value as EducationLevel)}>{EDUCATION_LEVELS.map(x=><option key={x} value={x}>{educationLabels[x]}</option>)}</select></label>
    <label className="block font-semibold">{t.target}<select className="mt-2 w-full rounded-lg border bg-background p-3" value={profile.targetEducation||''} onChange={e=>set('targetEducation',e.target.value?e.target.value as EducationLevel:undefined)}><option value="">{t.any}</option>{EDUCATION_LEVELS.map(x=><option key={x} value={x}>{educationLabels[x]}</option>)}</select></label>
    <label className="block font-semibold">{t.field}<select className="mt-2 w-full rounded-lg border bg-background p-3" value={profile.fieldArea} onChange={e=>set('fieldArea',e.target.value as FieldArea)}>{FIELD_AREAS.map(x=><option key={x} value={x}>{fieldLabels[x]}</option>)}</select></label>
   </>}
   {step===2&&<>
    <label className="block font-semibold">{t.experience}<input type="number" min={0} max={50} value={profile.experienceYears??''} onChange={e=>set('experienceYears',e.target.value===''?undefined:Number(e.target.value))} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
    <label className="block font-semibold">{t.skills}<textarea value={skillsText} onChange={e=>setSkillsText(e.target.value)} maxLength={1600} rows={4} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>void facts('load')} className="rounded-lg border px-3 py-2">{t.profileLoad}</button><button type="button" onClick={()=>void facts('save')} className="rounded-lg border px-3 py-2">{t.profileSave}</button></div><p className="text-sm text-muted-foreground">{t.factsNote}</p>
   </>}
   {step===3&&<>
    <label className="block font-semibold">{t.nationality}<input maxLength={80} value={profile.nationality} onChange={e=>set('nationality',e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3" required/></label>
    <label className="block font-semibold">{t.residence}<input maxLength={80} value={profile.residence} onChange={e=>set('residence',e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3" required/></label>
    <label className="block font-semibold">{t.destinations}<input value={destText} onChange={e=>setDestText(e.target.value)} maxLength={500} className="mt-2 w-full rounded-lg border bg-background p-3" dir="ltr"/></label>
    <fieldset><legend className="font-semibold">{t.provinces}</legend><div className="mt-2 flex max-h-48 flex-wrap gap-2 overflow-auto">{AF_PROVINCES.map(province=><button key={province} type="button" aria-pressed={(profile.preferredProvinces||[]).includes(province)} onClick={()=>set('preferredProvinces',checklist(profile.preferredProvinces||[],province,34) as AfghanProvince[])} className={choiceClass((profile.preferredProvinces||[]).includes(province))}>{province}</button>)}</div></fieldset>
    <label className="block font-semibold">{t.workMode}<select value={profile.desiredWorkMode||'any'} onChange={e=>set('desiredWorkMode',e.target.value as 'any'|'remote'|'on_site'|'hybrid')} className="mt-2 w-full rounded-lg border bg-background p-3"><option value="any">{t.any}</option><option value="remote">{t.remote}</option><option value="on_site">{t.onSite}</option><option value="hybrid">{t.hybrid}</option></select></label>
   </>}
   {step===4&&<>
    <p className="text-sm text-muted-foreground">{t.review}</p>
    <dl className="grid gap-2 text-sm sm:grid-cols-2"><div><dt className="font-semibold">{t.goal}</dt><dd>{profile.intents.join(', ')}</dd></div><div><dt className="font-semibold">{t.roles}</dt><dd>{(profile.preferredRoles||[]).map(x=>roleName(x,lang)).join(', ')||t.any}</dd></div><div><dt className="font-semibold">{t.education}</dt><dd>{educationLabels[profile.education]}</dd></div><div><dt className="font-semibold">{t.provinces}</dt><dd>{(profile.preferredProvinces||[]).join(', ')||t.any}</dd></div></dl>
    <p className="text-xs text-muted-foreground">{t.salaryNote}</p>
    <button type="button" disabled={busy||!valid()} onClick={()=>void find()} className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy?t.loading:t.search}</button>
    <div className="mt-6 max-w-xl space-y-3 border-t pt-5">
      <label className="block font-semibold">{t.searchName}<input value={name} maxLength={80} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-lg border bg-background p-3"/></label>
      <button type="button" disabled={busy||!valid()} onClick={()=>void save()} className="rounded-lg border px-4 py-2 disabled:opacity-50">{t.save}</button>
      <p className="text-xs text-muted-foreground">{t.notifications}</p>
    </div>
   </>}
   <div className="flex justify-between gap-3 border-t pt-4">{step>0?<button onClick={()=>setStep(step-1)} type="button" className="rounded-lg border px-4 py-2">{t.back}</button>:<span/>}{step<4&&<button type="button" onClick={()=>setStep(step+1)} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">{t.next}</button>}</div>
  </section>
  {status&&<p role="status" className="my-5 rounded-lg border p-3">{status}</p>}
  {results.length>0&&<section aria-label={t.results} className="mt-10 space-y-4"><h2 className="text-2xl font-bold">{t.results} ({results.length})</h2>{results.map(r=><article key={r.id} className="rounded-xl border bg-card p-5">
    <Link href={'/'+lang+'/opportunities/'+encodeURIComponent(r.slug)} className="text-lg font-bold underline">{r.title}</Link>
    <p className="mt-1 text-sm text-muted-foreground">{[r.organization,r.location,r.deadline?.slice(0,10)].filter(Boolean).join(' · ')}</p>
    <p className="mt-2 text-sm"><strong>{t[r.matchStrength as 'strong'|'good'|'possible']||r.matchStrength}</strong> · {r.eligibilityStatus.replace(/_/g,' ')} · {r.dataConfidence}</p>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      {r.reasons.length>0&&<div><h3 className="font-semibold">{t.why}</h3><ul className="list-disc ps-5 text-sm">{r.reasons.map(x=><li key={x}>{evidenceName(x,lang)}</li>)}</ul></div>}
      {r.unknowns.length>0&&<div><h3 className="font-semibold">{t.unknown}</h3><ul className="list-disc ps-5 text-sm">{r.unknowns.map(x=><li key={x}>{evidenceName(x,lang)}</li>)}</ul></div>}
      {r.verified.length>0&&<div><h3 className="font-semibold">{t.verified}</h3><ul className="list-disc ps-5 text-sm">{r.verified.map(x=><li key={x}>{evidenceName(x,lang)}</li>)}</ul></div>}
    </div><Link href={'/'+lang+'/opportunities/'+encodeURIComponent(r.slug)} className="mt-4 inline-block rounded-lg border px-3 py-2">{t.detail}</Link>
  </article>)}</section>}
  <section className="mt-10"><h2 className="text-xl font-bold">{t.saved}</h2><p className="my-2 text-sm text-muted-foreground">{t.notifications}</p><div className="space-y-3">{saved.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><button type="button" className="text-start font-semibold underline" onClick={()=>load(item)}>{item.name}</button><div className="flex gap-2"><button type="button" className="rounded-lg border px-2 py-1 text-sm" onClick={()=>void update(item,false)}>{item.active?t.deactivate:t.activate}</button><button type="button" className="rounded-lg border px-2 py-1 text-sm" onClick={()=>void update(item,true)}>{t.remove}</button></div></div>)}</div></section>
  <p className="mt-8 text-xs text-muted-foreground">{t.privacy}</p>
 </main>;
}
