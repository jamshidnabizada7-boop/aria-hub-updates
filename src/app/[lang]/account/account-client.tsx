'use client';
import { useRef, useState } from 'react';
import {applicantReturnPath} from '@/lib/applicants/navigation';
import {AccountLane} from '@/components/site/account-choices';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, LockKeyhole, Loader2, Eye, EyeOff, MailCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

type Lang = 'en' | 'fa' | 'ps';
type Mode = 'login' | 'register' | 'forgot-password' | 'reset-password';
const copy = {
 en: {
  login:'Log in', register:'Create account', forgot:'Forgot password?', reset:'Choose a new password',
  name:'Full name', email:'Email address', password:'Password', confirm:'Confirm password', newPassword:'New password',
  welcome:'Welcome back', registerTitle:'Your next chapter starts here', helper:'One ARIA HUB account for your profile, CVs, saved searches and applications.',
  registerHelper:'Create your free account, verify your email, then explore your personal dashboard.',
  forgotHelper:'Enter your account email. We will send a secure link to choose a new password.',
  resetHelper:'Choose a strong password. Your other sessions will be signed out.',
  sendReset:'Send reset link', updatePassword:'Save new password', working:'Please wait…',
  back:'Back to log in', start:'Back to get started', passwordHint:'Use 12–128 characters.', show:'Show password', hide:'Hide password',
  verificationTitle:'Check your email', verificationBody:'If this address can be registered, a verification link is on its way. Open it within 30 minutes, then log in. Already have an account? Use your current password to log in.',
  resend:'Resend verification email', edit:'Change details', inbox:'Check spam or junk if the email does not appear.',
  resetSent:'If this email belongs to an eligible account, a reset link is on its way. It expires in 30 minutes.',
  verified:'Your email is verified. You can now log in.', invalid:'This verification link is invalid or expired. Log in to request another email.',
  resetDone:'Your password has been changed. Log in with your new password.',
  deleted:'Your account is disabled and queued for permanent deletion.',
  unavailable:'Email verification and password recovery are being configured. Please try again later.',
  accountsUnavailable:'Accounts are temporarily unavailable. You can still explore opportunities and build a CV.',
  error:'We could not complete the request. Please try again.',
  credentials:'The email or password is incorrect. Check your details and try again.',
  verifyFirst:'Verify your email before logging in. You can resend the verification link below.',
  rate:'Too many attempts. Please wait a few minutes before trying again.',
  delivery:'We could not send the email. Please try again shortly. Your registration details are safe to retry.',
  mismatch:'The passwords do not match.', invalidReset:'This reset link is invalid or expired. Request a new one.',
  invalidRegistration:'Enter your name, a valid email and a password of 12–128 characters.'
 },
 fa: {
  login:'ورود', register:'ایجاد حساب', forgot:'رمز عبور را فراموش کرده‌اید؟', reset:'رمز جدید انتخاب کنید',
  name:'نام کامل', email:'آدرس ایمیل', password:'رمز عبور', confirm:'تأیید رمز عبور', newPassword:'رمز عبور جدید',
  welcome:'خوش آمدید', registerTitle:'گام بعدی شما از این‌جا آغاز می‌شود', helper:'یک حساب آریا هاب برای مشخصات، سی‌وی‌ها، جستجوها و درخواست‌های شما.',
  registerHelper:'حساب رایگان بسازید، ایمیل خود را تأیید کنید و وارد داشبورد شخصی شوید.',
  forgotHelper:'ایمیل حساب خود را وارد کنید. لینک امن انتخاب رمز جدید را می‌فرستیم.',
  resetHelper:'رمز قوی انتخاب کنید. از نشست‌های دیگر خارج می‌شوید.',
  sendReset:'ارسال لینک بازیابی', updatePassword:'ذخیره رمز جدید', working:'لطفاً صبر کنید…',
  back:'بازگشت به ورود', start:'بازگشت به آغاز', passwordHint:'از ۱۲ تا ۱۲۸ حرف استفاده کنید.', show:'نمایش رمز', hide:'پنهان کردن رمز',
  verificationTitle:'ایمیل خود را بررسی کنید', verificationBody:'اگر این آدرس قابل ثبت باشد، لینک تأیید فرستاده می‌شود. در ۳۰ دقیقه آن را باز کنید و سپس وارد شوید. اگر قبلاً حساب دارید، با رمز فعلی وارد شوید.',
  resend:'ارسال دوبارۀ ایمیل تأیید', edit:'تغییر معلومات', inbox:'اگر ایمیل نرسید، پوشۀ اسپم را بررسی کنید.',
  resetSent:'اگر این ایمیل متعلق به حساب قابل بازیابی باشد، لینک بازیابی فرستاده می‌شود و تا ۳۰ دقیقه اعتبار دارد.',
  verified:'ایمیل شما تأیید شد. اکنون وارد شوید.', invalid:'لینک تأیید نامعتبر یا منقضی شده است. برای درخواست ایمیل تازه وارد شوید.',
  resetDone:'رمز شما تغییر کرد. با رمز جدید وارد شوید.', deleted:'حساب شما غیرفعال و در صف حذف دایمی است.',
  unavailable:'تأیید ایمیل و بازیابی رمز در حال تنظیم است. بعداً دوباره تلاش کنید.',
  accountsUnavailable:'حساب‌ها فعلاً در دسترس نیستند. می‌توانید فرصت‌ها را جستجو و سی‌وی بسازید.',
  error:'درخواست تکمیل نشد. دوباره تلاش کنید.', credentials:'ایمیل یا رمز نادرست است. معلومات را بررسی کنید.',
  verifyFirst:'پیش از ورود ایمیل خود را تأیید کنید. می‌توانید لینک تازه درخواست کنید.',
  rate:'تلاش‌های زیادی انجام شده است. چند دقیقه صبر کنید.', delivery:'ایمیل فرستاده نشد. کمی بعد دوباره تلاش کنید. ثبت با همان معلومات قابل تکرار است.',
  mismatch:'رمزهای عبور یکسان نیستند.', invalidReset:'لینک بازیابی نامعتبر یا منقضی شده است. لینک تازه درخواست کنید.',
  invalidRegistration:'نام، ایمیل معتبر و رمز ۱۲ تا ۱۲۸ حرفی وارد کنید.'
 },
 ps: {
  login:'ننوتل', register:'حساب جوړول', forgot:'پټنوم مو هېر شوی؟', reset:'نوی پټنوم وټاکئ',
  name:'بشپړ نوم', email:'برېښنالیک', password:'پټنوم', confirm:'پټنوم تایید کړئ', newPassword:'نوی پټنوم',
  welcome:'ښه راغلاست', registerTitle:'ستاسو راتلونکی ګام له دې ځایه پیلېږي', helper:'د معلوماتو، سي وي، خوندي لټونونو او غوښتنلیکونو لپاره یو آریا هاب حساب.',
  registerHelper:'وړیا حساب جوړ کړئ، برېښنالیک تایید کړئ او شخصي ډشبورډ ته ننوځئ.',
  forgotHelper:'د حساب برېښنالیک ولیکئ. د نوي پټنوم لپاره خوندي لینک درلېږو.',
  resetHelper:'پیاوړی پټنوم وټاکئ. ستاسو نورې ناستې به بندې شي.',
  sendReset:'د بېرته ترلاسه کولو لینک لېږل', updatePassword:'نوی پټنوم خوندي کړئ', working:'لږ انتظار وکړئ…',
  back:'ننوتلو ته ستنېدل', start:'پیل ته ستنېدل', passwordHint:'له ۱۲ تر ۱۲۸ توري وکاروئ.', show:'پټنوم وښایئ', hide:'پټنوم پټ کړئ',
  verificationTitle:'خپل برېښنالیک وګورئ', verificationBody:'که دا پته د ثبت وړ وي، د تایید لینک درلېږل کېږي. په ۳۰ دقیقو کې یې پرانیزئ او ننوځئ. که حساب لرئ، په اوسني پټنوم ننوځئ.',
  resend:'د تایید برېښنالیک بیا لېږل', edit:'معلومات بدل کړئ', inbox:'که برېښنالیک نه ښکاري، سپم هم وګورئ.',
  resetSent:'که دا برېښنالیک د وړ حساب وي، لینک درلېږل کېږي او تر ۳۰ دقیقو اعتبار لري.',
  verified:'برېښنالیک تایید شو. اوس ننوځئ.', invalid:'د تایید لینک ناسم یا پای ته رسېدلی. د نوي برېښنالیک غوښتنې لپاره ننوځئ.',
  resetDone:'پټنوم بدل شو. په نوي پټنوم ننوځئ.', deleted:'ستاسو حساب بند او د دایمي ړنګولو په کتار کې دی.',
  unavailable:'د برېښنالیک تایید او د پټنوم بېرته ترلاسه کول تنظیمېږي. وروسته بیا هڅه وکړئ.',
  accountsUnavailable:'حسابونه اوس نشته. فرصتونه لټول او سي وي جوړولای شئ.',
  error:'غوښتنه بشپړه نه شوه. بیا هڅه وکړئ.', credentials:'برېښنالیک یا پټنوم ناسم دی. معلومات وګورئ.',
  verifyFirst:'له ننوتلو مخکې برېښنالیک تایید کړئ. لاندې نوی لینک غوښتلای شئ.',
  rate:'ډېرې هڅې شوې دي. څو دقیقې انتظار وکړئ.', delivery:'برېښنالیک ونه لېږل شو. لږ وروسته بیا هڅه وکړئ. په هماغو معلوماتو بیا ثبت کولای شئ.',
  mismatch:'پټنومونه یو شان نه دي.', invalidReset:'د پټنوم لینک ناسم یا پای ته رسېدلی. نوی لینک وغواړئ.',
  invalidRegistration:'نوم، سم برېښنالیک او له ۱۲ تر ۱۲۸ تورو پټنوم ولیکئ.'
 }
};

export function AccountClient({lang,mode,enabled=true,emailAvailable=true}:{lang:Lang;mode:Mode;enabled?:boolean;emailAvailable?:boolean}) {
 const t=copy[lang], router=useRouter(), query=useSearchParams();
 const destination=applicantReturnPath(query.get('next'),lang);
 const authHref=(path:string)=>'/'+lang+'/'+path+(destination!=='/'+lang+'/portal'?'?next='+encodeURIComponent(destination):'');
 const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [confirm,setConfirm]=useState(''), [name,setName]=useState('');
 const [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [isError,setIsError]=useState(false);
 const [showPassword,setShowPassword]=useState(false), [needsVerification,setNeedsVerification]=useState(false), [checkEmail,setCheckEmail]=useState(false);
 const sending=useRef(false);
 const requiresNewPassword=mode==='register'||mode==='reset-password';
 const inputClass='mt-2 w-full rounded-xl border bg-background px-4 py-3 text-base';
 const errorText=(code:string)=>({invalid_credentials:t.credentials,email_not_verified:t.verifyFirst,rate_limited:t.rate,email_delivery_unavailable:t.delivery,invalid_reset:t.invalidReset,invalid_registration:t.invalidRegistration}[code]||t.error);
 async function submit(e:React.FormEvent<HTMLFormElement>) {
  e.preventDefault(); if(sending.current) return;
  if(requiresNewPassword && password!==confirm) {setMessage(t.mismatch);setIsError(true);return;}
  sending.current=true;setBusy(true);setMessage('');setIsError(false);setNeedsVerification(false);
  try {
   const response=await fetch('/api/applicant/auth/'+mode,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,name,token:query.get('token'),lang})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok) {setNeedsVerification(data.error==='email_not_verified');setMessage(errorText(data.error));setIsError(true);return;}
   if(mode==='login') {router.push(destination);router.refresh();}
   else if(mode==='reset-password') router.push('/'+lang+'/login?reset=yes');
   else if(mode==='register') setCheckEmail(true);
   else setMessage(t.resetSent);
  } catch {setMessage(t.error);setIsError(true);} finally {sending.current=false;setBusy(false);}
 }
 async function resend() {
  if(sending.current) return;
  sending.current=true;setBusy(true);setMessage('');setIsError(false);
  try {
   const response=await fetch('/api/applicant/auth/resend-verification',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,lang})});
   const data=await response.json().catch(()=>({}));
   setMessage(response.ok?t.inbox:errorText(data.error));setIsError(!response.ok);
  } catch {setMessage(t.error);setIsError(true);} finally {sending.current=false;setBusy(false);}
 }
 const blocked=!enabled||(!emailAvailable&&(mode==='register'||mode==='forgot-password'));
 const title=checkEmail?t.verificationTitle:mode==='login'?t.welcome:mode==='register'?t.registerTitle:mode==='forgot-password'?t.forgot:t.reset;
 const helper=mode==='login'?t.helper:mode==='register'?t.registerHelper:mode==='forgot-password'?t.forgotHelper:t.resetHelper;
 return <main id="main-content" className="account-panel" dir={lang==='en'?'ltr':'rtl'}>
  <Link href={'/'+lang+'/get-started'} className="mb-7 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 rtl:-scale-x-100"/>{t.start}</Link>
  <AccountLane lang={lang}/>
  <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">{checkEmail?<MailCheck className="h-6 w-6" aria-hidden="true"/>:<LockKeyhole className="h-6 w-6" aria-hidden="true"/>}</span>
  <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
  <p className="mt-3 text-sm leading-7 text-muted-foreground">{checkEmail?t.verificationBody:helper}</p>
  {query.get('deleted')==='yes'&&<p role="status" className="mt-4 rounded-xl border p-4 text-sm">{t.deleted}</p>}
  {query.get('verified')&&<p role="status" className="mt-4 rounded-xl border p-4 text-sm">{query.get('verified')==='yes'?t.verified:t.invalid}</p>}
  {query.get('reset')==='yes'&&<p role="status" className="mt-4 rounded-xl bg-emerald-500/10 p-4 text-sm">{t.resetDone}</p>}
  {(mode==='login'||mode==='register')&&!checkEmail&&<nav aria-label={t.helper} className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-center text-sm">{(['login','register'] as const).map(tab=><Link key={tab} href={authHref(tab)} aria-current={mode===tab?'page':undefined} className={'rounded-lg px-3 py-3 font-semibold '+(mode===tab?'bg-card shadow-sm':'text-muted-foreground')}>{t[tab]}</Link>)}</nav>}
  {blocked?<p role="status" className="my-6 rounded-xl border p-4 text-sm leading-7">{enabled?t.unavailable:t.accountsUnavailable}</p>:checkEmail?<div className="mt-6 space-y-3">
    <p className="break-all rounded-xl bg-muted p-4 text-sm font-medium" dir="ltr">{email}</p>
    <p className="text-sm leading-6 text-muted-foreground">{t.inbox}</p>
    <Link href={authHref('login')} className="journey-primary w-full">{t.login}<ArrowRight className="h-4 w-4 rtl:-scale-x-100"/></Link>
    <button type="button" onClick={resend} disabled={busy} className="journey-secondary w-full">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:null}{t.resend}</button>
    <button type="button" disabled={busy} className="min-h-11 w-full text-sm font-medium text-muted-foreground" onClick={()=>{setCheckEmail(false);setMessage('');}}>{t.edit}</button>
   </div>:<form onSubmit={submit} className="mt-6 space-y-5">
    <fieldset disabled={busy} className="min-w-0 space-y-5">
     <legend className="sr-only">{title}</legend>
     {mode==='register'&&<label className="block text-sm">{t.name}<input name="name" autoComplete="name" required maxLength={120} value={name} onChange={e=>setName(e.target.value)} className={inputClass}/></label>}
     {mode!=='reset-password'&&<label className="block text-sm">{t.email}<input name="email" type="email" autoComplete="email" required maxLength={200} value={email} onChange={e=>setEmail(e.target.value)} className={inputClass} dir="ltr"/></label>}
     {mode!=='forgot-password'&&<>
      <label className="block text-sm">{requiresNewPassword?t.newPassword:t.password}<input name="password" type={showPassword?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} required minLength={requiresNewPassword?12:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className={inputClass} dir="ltr" aria-describedby={requiresNewPassword?'password-hint':undefined}/></label>
      {requiresNewPassword&&<><p id="password-hint" className="text-xs text-muted-foreground">{t.passwordHint}</p><label className="block text-sm">{t.confirm}<input name="confirmPassword" type={showPassword?'text':'password'} autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} className={inputClass} dir="ltr"/></label></>}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><button type="button" aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)} className="inline-flex min-h-11 items-center gap-2 text-muted-foreground">{showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}{showPassword?t.hide:t.show}</button>{mode==='login'&&<Link href={authHref('forgot-password')} className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">{t.forgot}</Link>}</div>
     </>}
    </fieldset>
    <button type="submit" disabled={busy} aria-busy={busy} className="journey-primary w-full">{busy?<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>:null}{busy?t.working:mode==='login'?t.login:mode==='register'?t.register:mode==='forgot-password'?t.sendReset:t.updatePassword}</button>
   </form>}
  {message&&<p role={isError?'alert':'status'} className={'mt-5 rounded-xl border p-4 text-sm leading-6 '+(isError?'border-destructive/30 bg-destructive/5 text-destructive':'bg-muted/50')}>{message}</p>}
  {mode==='login'&&needsVerification&&emailAvailable&&<button type="button" onClick={resend} disabled={busy||!email} className="journey-secondary mt-4 w-full">{t.resend}</button>}
  {mode!=='login'&&!checkEmail&&<Link href={authHref('login')} className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">{t.back}</Link>}
 </main>;
}
