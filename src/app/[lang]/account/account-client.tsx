'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type Lang = 'en'|'fa'|'ps';
type Mode = 'login'|'register'|'forgot-password'|'reset-password';
const copy = {
 en:{login:'Log in',register:'Create account',forgot:'Forgot password?',reset:'Reset password',name:'Full name',email:'Email',password:'Password',confirm:'New password',send:'Continue',info:'Check your email for instructions. Email delivery must be configured.',verified:'Your email is verified. Log in.',invalid:'Verification link expired or invalid.',error:'Unable to complete request.',back:'Back to login',title:'Welcome to ARIA HUB',helper:'A free account to manage your career profile and opportunities.'},
 fa:{login:'ورود',register:'ایجاد حساب',forgot:'رمز عبور را فراموش کرده‌اید؟',reset:'تغییر رمز عبور',name:'نام کامل',email:'ایمیل',password:'رمز عبور',confirm:'رمز عبور جدید',send:'ادامه',info:'برای دریافت راهنمایی ایمیل خود را بررسی کنید. ارسال ایمیل باید فعال باشد.',verified:'ایمیل شما تأیید شد. وارد شوید.',invalid:'لینک تأیید نامعتبر یا منقضی شده است.',error:'درخواست تکمیل نشد.',back:'بازگشت به ورود',title:'به آریا هاب خوش آمدید',helper:'حساب رایگان برای مدیریت مشخصات و فرصت‌های شما.'},
 ps:{login:'ننوتل',register:'حساب جوړول',forgot:'پټنوم مو هېر شوی؟',reset:'پټنوم بدلول',name:'بشپړ نوم',email:'برېښنالیک',password:'پټنوم',confirm:'نوی پټنوم',send:'دوام',info:'خپل برېښنالیک وګورئ. د برېښنالیک لېږل باید فعال وي.',verified:'برېښنالیک تایید شو. ننوځئ.',invalid:'د تایید لینک ناسم یا پای ته رسېدلی.',error:'غوښتنه بشپړه نه شوه.',back:'ننوتلو ته ستنېدل',title:'آریا هاب ته ښه راغلاست',helper:'د شخصي معلوماتو او فرصتونو لپاره وړیا حساب.'}
};
export function AccountClient({lang,mode}:{lang:Lang,mode:Mode}) {
 const t=copy[lang], router=useRouter(), query=useSearchParams();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setMessage('');
 try {
  const response=await fetch('/api/applicant/auth/'+mode,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,name,token:query.get('token'),lang})});
  const data=await response.json();
  if(!response.ok){setMessage(data.error==='email_delivery_unavailable'?t.info:data.error||t.error);return;}
  if(mode==='login'){router.push('/'+lang+'/portal');router.refresh();}
  else if(mode==='reset-password'){router.push('/'+lang+'/login');}
  else setMessage(t.info);
 }catch{setMessage(t.error);}finally{setBusy(false);}};
 return <main className="mx-auto max-w-md px-5 py-14" dir={lang==='en'?'ltr':'rtl'}>
  <h1 className="text-3xl font-bold">{t.title}</h1><p className="mt-3 text-muted-foreground">{t.helper}</p>
  {query.get('verified') && <p role="status" className="mt-4 rounded-lg border p-3">{query.get('verified')==='yes'?t.verified:t.invalid}</p>}
  <div className="mt-6 flex gap-4 text-sm"><Link href={'/'+lang+'/login'} className="underline">{t.login}</Link><Link href={'/'+lang+'/register'} className="underline">{t.register}</Link></div>
  <form onSubmit={submit} className="mt-6 space-y-4">
  {mode==='register'&&<label className="block text-sm">{t.name}<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-3"/></label>}
  {mode!=='reset-password'&&<label className="block text-sm">{t.email}<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-3" dir="ltr"/></label>}
  {mode!=='forgot-password'&&<label className="block text-sm">{mode==='reset-password'?t.confirm:t.password}<input type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='login'?1:12} value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-3" dir="ltr"/></label>}
  <button type="submit" disabled={busy} className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy?'…':mode==='login'?t.login:mode==='register'?t.register:mode==='forgot-password'?t.forgot:t.reset}</button>
  </form>
  {message&&<p role="status" className="mt-4 rounded-lg border p-3 text-sm">{message}</p>}
  <div className="mt-5 text-sm"><Link href={'/'+lang+(mode==='login'?'/forgot-password':'/login')} className="underline">{mode==='login'?t.forgot:t.back}</Link></div>
 </main>;
}