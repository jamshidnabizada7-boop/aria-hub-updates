'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LockKeyhole, Loader2, Eye, EyeOff } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

type Lang = 'en'|'fa'|'ps';
type Mode = 'login'|'register'|'forgot-password'|'reset-password';
const copy = {
 en:{login:'Log in',register:'Create account',forgot:'Forgot password?',reset:'Reset password',name:'Full name',email:'Email',password:'Password',confirm:'New password',send:'Continue',info:'Check your email for instructions, then log in.',verified:'Your email is verified. Log in.',invalid:'Verification link expired or invalid.',error:'Unable to complete request.',back:'Back to login',title:'Welcome to ARIA HUB',helper:'A free account to manage your career profile and opportunities.'},
 fa:{login:'ورود',register:'ایجاد حساب',forgot:'رمز عبور را فراموش کرده‌اید؟',reset:'تغییر رمز عبور',name:'نام کامل',email:'ایمیل',password:'رمز عبور',confirm:'رمز عبور جدید',send:'ادامه',info:'ایمیل خود را برای راهنمایی بررسی کنید و سپس وارد شوید.',verified:'ایمیل شما تأیید شد. وارد شوید.',invalid:'لینک تأیید نامعتبر یا منقضی شده است.',error:'درخواست تکمیل نشد.',back:'بازگشت به ورود',title:'به آریا هاب خوش آمدید',helper:'حساب رایگان برای مدیریت مشخصات و فرصت‌های شما.'},
 ps:{login:'ننوتل',register:'حساب جوړول',forgot:'پټنوم مو هېر شوی؟',reset:'پټنوم بدلول',name:'بشپړ نوم',email:'برېښنالیک',password:'پټنوم',confirm:'نوی پټنوم',send:'دوام',info:'د لارښوونو لپاره برېښنالیک وګورئ، بیا ننوځئ.',verified:'برېښنالیک تایید شو. ننوځئ.',invalid:'د تایید لینک ناسم یا پای ته رسېدلی.',error:'غوښتنه بشپړه نه شوه.',back:'ننوتلو ته ستنېدل',title:'آریا هاب ته ښه راغلاست',helper:'د شخصي معلوماتو او فرصتونو لپاره وړیا حساب.'}
};
export function AccountClient({lang,mode,enabled=true,emailAvailable=true}:{lang:Lang,mode:Mode;enabled?:boolean;emailAvailable?:boolean}) {
 const t=copy[lang], router=useRouter(), query=useSearchParams();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [enroll,setEnroll]=useState(mode==='register'&&!emailAvailable);
 const enrollLabel=lang==='en'?'Add applicant access':lang==='fa'?'افزودن دسترسی متقاضی':'د غوښتونکي لاسرسی ورزیاتول';
 const emailNotice=lang==='en'?'New account registration and email recovery are temporarily unavailable. Existing verified employer accounts can add applicant access with their current password.':lang==='fa'?'ثبت حساب جدید و بازیابی ایمیلی فعلاً در دسترس نیست. دارندگان حساب کارفرمای تأییدشده می‌توانند با رمز فعلی دسترسی متقاضی اضافه کنند.':'د نوي حساب ثبت او د برېښنالیک له لارې بېرته ترلاسه کول اوس نشته. تایید شوي کارورکوونکي په اوسني پټنوم د غوښتونکي لاسرسی ورزیاتولای شي.';
 const [showPassword,setShowPassword]=useState(false);
 const [needsVerification,setNeedsVerification]=useState(false);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');
 try {
  const response=await fetch('/api/applicant/auth/'+(enroll?'enroll':mode),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,name,token:query.get('token'),lang})});
  const data=await response.json();
  if(!response.ok){setNeedsVerification(data.error==='email_not_verified');setMessage(t.error);return;}
  if(enroll){router.push('/'+lang+'/login?enrolled=yes');}
  else if(mode==='login'){router.push('/'+lang+'/portal');router.refresh();}
  else if(mode==='reset-password'){router.push('/'+lang+'/login');}
  else setMessage(t.info);
 }catch{setMessage(t.error);}finally{setBusy(false);}};
 if(!enabled)return <main id="main-content" className="account-panel" dir={lang==='en'?'ltr':'rtl'}><h1 className="text-3xl font-bold">{t.title}</h1><p className="my-5">{lang==='en'?'Applicant accounts are temporarily unavailable. You can still explore opportunities and build a CV.':lang==='fa'?'حساب متقاضی فعلاً در دسترس نیست. می‌توانید فرصت‌ها را جستجو و سی‌وی بسازید.':'د غوښتونکي حساب اوس نشته. فرصتونه لټول او سي وي جوړولای شئ.'}</p><Link className="underline" href={'/'+lang+'/get-started'}>{lang==='en'?'Explore ARIA HUB':lang==='fa'?'کاوش آریا هاب':'آریا هاب وپلټئ'}</Link></main>;
 if(mode==='forgot-password'&&!emailAvailable)return <main id="main-content" className="account-panel" dir={lang==='en'?'ltr':'rtl'}><h1 className="text-3xl font-bold">{t.forgot}</h1><p className="my-5" role="status">{emailNotice}</p><Link className="underline" href={'/'+lang+'/login'}>{t.back}</Link></main>;
 return <main id="main-content" className="account-panel" dir={lang==='en'?'ltr':'rtl'}>
  <Link href={'/'+lang+'/get-started'} className="mb-7 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 rtl:-scale-x-100"/>{lang==='en'?'Back to get started':lang==='fa'?'بازگشت به آغاز':'پیل ته ستنېدل'}</Link>
  <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><LockKeyhole className="h-6 w-6" aria-hidden="true"/></span>
  <h1 className="text-3xl font-bold tracking-tight">{mode==='login'?t.title:mode==='register'?(enroll?enrollLabel:t.register):mode==='forgot-password'?t.forgot:t.reset}</h1><p className="mt-3 text-muted-foreground">{t.helper}</p>
  {query.get('enrolled')==='yes'&&<p role="status" className="mt-4 rounded-xl bg-emerald-500/10 p-4 text-sm">{lang==='en'?'Applicant access is ready. Log in with your existing password.':lang==='fa'?'دسترسی متقاضی آماده است. با رمز فعلی وارد شوید.':'د غوښتونکي لاسرسی چمتو دی. په اوسني پټنوم ننوځئ.'}</p>}
  {query.get('deleted')==='yes'&&<p role="status" className="mt-4 rounded-lg border p-3">{lang==='en'?'Your account is disabled and queued for permanent deletion.':lang==='fa'?'حساب شما غیرفعال و در صف حذف دایمی است.':'ستاسو حساب بند او د دایمي ړنګولو په کتار کې دی.'}</p>}
  {query.get('verified') && <p role="status" className="mt-4 rounded-lg border p-3">{query.get('verified')==='yes'?t.verified:t.invalid}</p>}
  {!emailAvailable&&<p role="status" className="mt-4 rounded-lg border p-3 text-sm">{emailNotice}</p>}
  {(mode==='login'||mode==='register')&&<nav className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-center text-sm"><Link href={'/'+lang+'/login'} aria-current={mode==='login'?'page':undefined} className={'rounded-lg px-3 py-3 font-semibold '+(mode==='login'?'bg-card shadow-sm':'text-muted-foreground')}>{t.login}</Link><Link href={'/'+lang+'/register'} aria-current={mode==='register'?'page':undefined} className={'rounded-lg px-3 py-3 font-semibold '+(mode==='register'?'bg-card shadow-sm':'text-muted-foreground')}>{emailAvailable?t.register:enrollLabel}</Link></nav>}
  <form onSubmit={submit} className="mt-6 space-y-4">
  {mode==='register'&&emailAvailable&&<label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={enroll} onChange={e=>setEnroll(e.target.checked)}/>{lang==='en'?'I already have an employer account. Add applicant access using my existing password.':lang==='fa'?'حساب کارفرما دارم؛ با رمز فعلی دسترسی متقاضی را اضافه کنید.':'د کارورکوونکي حساب لرم؛ په اوسني پټنوم د غوښتونکي لاسرسی ورزیات کړئ.'}</label>}
  {mode==='register'&&!enroll&&<label className="block text-sm">{t.name}<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-3"/></label>}
  {mode!=='reset-password'&&<label className="block text-sm">{t.email}<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-3" dir="ltr"/></label>}
  {mode!=='forgot-password'&&<label className="block text-sm">{mode==='reset-password'?t.confirm:t.password}<input type={showPassword?'text':'password'} autoComplete={mode==='login'||enroll?'current-password':'new-password'} required minLength={mode==='login'||enroll?1:12} value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-3" dir="ltr"/></label>}
  {mode!=='forgot-password'&&<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">{(mode==='register'&&!enroll||mode==='reset-password')&&<span>{lang==='en'?'Use at least 12 characters.':lang==='fa'?'حداقل ۱۲ حرف استفاده کنید.':'لږ تر لږه ۱۲ توري وکاروئ.'}</span>}<button type="button" aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)} className="ms-auto inline-flex min-h-11 items-center gap-2">{showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}{lang==='en'?(showPassword?'Hide password':'Show password'):lang==='fa'?(showPassword?'پنهان کردن رمز':'نمایش رمز'):(showPassword?'پټنوم پټ کړئ':'پټنوم وښایئ')}</button></div>}
  <button type="submit" disabled={busy} className="journey-primary w-full" aria-busy={busy}>{busy?<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>:null}{busy?t.send:mode==='login'?t.login:mode==='register'?(enroll?enrollLabel:t.register):mode==='forgot-password'?t.forgot:t.reset}</button>
  </form>
  {message&&<p role="status" className="mt-4 rounded-lg border p-3 text-sm">{message}</p>}
  {mode==='login' && needsVerification && <button type="button" className="mt-3 text-sm underline" disabled={busy || !email} onClick={async()=>{
    setBusy(true);try{const res=await fetch('/api/applicant/auth/resend-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,lang})});setMessage(res.ok?t.info:t.error);}catch{setMessage(t.error);}finally{setBusy(false);}
  }}>{lang==='fa'?'ارسال دوبارۀ ایمیل تأیید':lang==='ps'?'د تایید برېښنالیک بیا لېږل':'Resend verification email'}</button>}
  {(mode!=='login'||emailAvailable)&&<div className="mt-5 text-sm"><Link href={'/'+lang+(mode==='login'?'/forgot-password':'/login')} className="underline">{mode==='login'?t.forgot:t.back}</Link></div>}
 </main>;
}
