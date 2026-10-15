'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Building2, Check, Eye, EyeOff, Loader2, ShieldCheck, UserRound } from 'lucide-react';
import { HiringBrand, HiringLanguages, HiringTheme } from '@/components/employers/workspace-ui';

const copy = {
  en: {
    label: 'FOR EMPLOYERS', title: 'Make room for\nyour next great hire.', body: 'A dedicated space for your organization, your vacancies and the people who apply.',
    steps: ['Build your organization profile', 'Submit a vacancy for review', 'Manage applications with your team'],
    note: 'You choose how candidates apply. Receive applications here or direct them to your official application channel.',
    login: 'Sign in', register: 'Create account', loginTitle: 'Welcome back.', registerTitle: 'Start your hiring workspace.',
    loginBody: 'Sign in to manage your organization and vacancies.', registerBody: 'Create your personal account first. You can add or join an organization next.',
    name: 'Full name', email: 'Email address', password: 'Password', hint: 'Use 12–128 characters for a new account.',
    forgot: 'Forgot password?', reset: 'Request account recovery', resetBody: 'Enter your account email. Recovery is completed with ARIA HUB support.',
    resetHelp: 'If the account exists, your request has been recorded. Contact ARIA HUB support to complete recovery.',
    quick: 'Only hiring once?', quickLink: 'Submit a vacancy without an account', show: 'Show password', hide: 'Hide password',
    next: 'Create account & continue', working: 'Please wait…', switch: 'Already use ARIA HUB? Sign in with your existing email and password.',
    jobseeker: 'Looking for work?', seekerLink: 'Jobseeker sign in', home: 'Back to ARIA HUB', support: 'Contact support',
    back: 'Back to sign in', error: 'We could not complete the request. Please try again.', privacy: 'Your organization is reviewed before you can publish vacancies.',
  },
  fa: {
    label: 'برای کارفرمایان', title: 'همکار بعدی خود را\nاز این‌جا پیدا کنید.', body: 'فضایی برای سازمان، وظایف شما و کسانی که درخواست می‌فرستند.',
    steps: ['مشخصات سازمان را تکمیل کنید', 'وظیفه را برای بررسی بفرستید', 'درخواست‌ها را با تیم مدیریت کنید'],
    note: 'روش درخواست را خودتان انتخاب کنید؛ دریافت در آریا هاب یا ارجاع به راه رسمی درخواست شما.',
    login: 'ورود', register: 'ایجاد حساب', loginTitle: 'دوباره خوش آمدید.', registerTitle: 'بخش استخدام خود را بسازید.',
    loginBody: 'برای مدیریت سازمان و وظایف خود وارد شوید.', registerBody: 'نخست حساب شخصی بسازید. سپس سازمان را اضافه کنید یا به آن بپیوندید.',
    name: 'نام کامل', email: 'آدرس ایمیل', password: 'رمز عبور', hint: 'برای حساب جدید از ۱۲ تا ۱۲۸ حرف استفاده کنید.',
    forgot: 'رمز را فراموش کرده‌اید؟', reset: 'درخواست بازیابی حساب', resetBody: 'ایمیل حساب را وارد کنید. بازیابی با همکاری پشتیبانی آریا هاب تکمیل می‌شود.',
    resetHelp: 'اگر حساب موجود باشد، درخواست ثبت شده است. برای تکمیل بازیابی با پشتیبانی آریا هاب تماس بگیرید.',
    quick: 'فقط یک وظیفه دارید؟', quickLink: 'بدون حساب وظیفه بفرستید', show: 'نمایش رمز', hide: 'پنهان کردن رمز',
    next: 'ایجاد حساب و ادامه', working: 'لطفاً صبر کنید…', switch: 'حساب آریا هاب دارید؟ با همان ایمیل و رمز وارد شوید.',
    jobseeker: 'دنبال وظیفه هستید؟', seekerLink: 'ورود جویندۀ فرصت', home: 'بازگشت به آریا هاب', support: 'تماس با پشتیبانی',
    back: 'بازگشت به ورود', error: 'درخواست تکمیل نشد. دوباره تلاش کنید.', privacy: 'پیش از نشر وظایف، سازمان شما بررسی می‌شود.',
  },
  ps: {
    label: 'د کار ورکوونکو لپاره', title: 'خپل راتلونکی همکار\nله دې ځایه ومومئ.', body: 'ستاسې د ادارې، دندو او غوښتونکو لپاره ځانګړی ځای.',
    steps: ['د ادارې معلومات بشپړ کړئ', 'دنده د ارزونې لپاره ولېږئ', 'غوښتنلیکونه له ټیم سره اداره کړئ'],
    note: 'د غوښتنلیک لاره خپله وټاکئ. دلته یې ترلاسه کړئ یا غوښتونکي خپلې رسمي لارې ته ولېږئ.',
    login: 'ننوتل', register: 'حساب جوړول', loginTitle: 'بیا ښه راغلاست.', registerTitle: 'د استخدام برخه جوړه کړئ.',
    loginBody: 'د ادارې او دندو د مدیریت لپاره ننوځئ.', registerBody: 'لومړی شخصي حساب جوړ کړئ. بیا اداره زیاته یا ورسره یوځای شئ.',
    name: 'بشپړ نوم', email: 'برېښنالیک', password: 'پټنوم', hint: 'د نوي حساب لپاره له ۱۲ تر ۱۲۸ توري وکاروئ.',
    forgot: 'پټنوم مو هېر شوی؟', reset: 'د حساب بېرته ترلاسه کول', resetBody: 'د حساب برېښنالیک ولیکئ. بیا د آریا هاب مرسته وغواړئ.',
    resetHelp: 'که حساب موجود وي، غوښتنه ثبت شوې ده. د بشپړولو لپاره د آریا هاب له ملاتړ سره اړیکه ونیسئ.',
    quick: 'یوازې یوه دنده لرئ؟', quickLink: 'له حساب پرته دنده ولېږئ', show: 'پټنوم ښکاره کړئ', hide: 'پټنوم پټ کړئ',
    next: 'حساب جوړ او دوام ورکړئ', working: 'لږ انتظار وکړئ…', switch: 'د آریا هاب حساب لرئ؟ په هماغه برېښنالیک او پټنوم ننوځئ.',
    jobseeker: 'د کار په لټه کې یاست؟', seekerLink: 'د فرصت لټوونکي ننوتل', home: 'آریا هاب ته ستنېدل', support: 'له ملاتړ سره اړیکه',
    back: 'ننوتلو ته ستنېدل', error: 'غوښتنه بشپړه نه شوه. بیا هڅه وکړئ.', privacy: 'د دندو تر خپرولو مخکې ستاسې اداره ارزول کېږي.',
  },
};

export default function EmployerLoginPage() {
  const params = useParams();
  const lang = params.lang === 'fa' || params.lang === 'ps' ? params.lang : 'en';
  const c = copy[lang], router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [show, setShow] = useState(false), [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(''), [isError, setIsError] = useState(false), [forgot, setForgot] = useState(false);
  const sending = useRef(false);
  function changeMode(next: 'login' | 'register') { setMode(next); setForgot(false); setMessage(''); setShow(false); }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending.current) return;
    sending.current = true; setBusy(true); setMessage(''); setIsError(false);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await fetch('/api/employers/auth/' + (forgot ? 'forgot-password' : mode), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || c.error);
      if (forgot) { setMessage(c.resetHelp); return; }
      const claim = new URLSearchParams(window.location.search).get('claim')?.slice(0, 200);
      router.push('/' + lang + '/employers/dashboard' + (claim ? '?claim=' + encodeURIComponent(claim) : ''));
      router.refresh();
    } catch (error) { setIsError(true); setMessage(error instanceof Error ? error.message : c.error); }
    finally { sending.current = false; setBusy(false); }
  }
  return <div className="hiring-ui auth-page" dir={lang === 'en' ? 'ltr' : 'rtl'}>
    <header className="hiring-topbar"><HiringBrand lang={lang} /><div className="flex items-center gap-2"><HiringLanguages lang={lang} path="employers/login" /><HiringTheme lang={lang}/></div></header>
    <main id="main-content" className="auth-layout">
      <section className="auth-story">
        <div className="auth-story-top"><span className="hiring-eyebrow"><span className="hiring-dot" />{c.label}</span><Building2 size={24} aria-hidden="true" /></div>
        <h2>{c.title}</h2><p className="auth-story-description">{c.body}</p>
        <ol className="auth-steps">{c.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p><Check size={17} aria-hidden="true" /></li>)}</ol>
        <p className="auth-story-note"><ShieldCheck size={20} aria-hidden="true" />{c.note}</p>
      </section>
      <section className="auth-form-area">
        <p className="auth-audience"><UserRound size={15} aria-hidden="true" />{c.jobseeker} <Link href={'/' + lang + '/login'}>{c.seekerLink}<ArrowUpRight size={14} aria-hidden="true" /></Link></p>
        <div className="auth-form-inner">
          <div className="hiring-mode" aria-label={c.label}>{(['login', 'register'] as const).map(value => <button disabled={busy} type="button" key={value} aria-pressed={!forgot && mode === value} onClick={() => changeMode(value)}>{c[value]}</button>)}</div>
          <h1>{forgot ? c.reset : mode === 'login' ? c.loginTitle : c.registerTitle}</h1>
          <p className="hiring-subtitle">{forgot ? c.resetBody : mode === 'login' ? c.loginBody : c.registerBody}</p>
          <form onSubmit={submit} className="hiring-form">
            <fieldset disabled={busy}><legend className="sr-only">{forgot ? c.reset : c[mode]}</legend>
              {mode === 'register' && !forgot && <label>{c.name}<input name="name" required maxLength={160} autoComplete="name" /></label>}
              <label>{c.email}<input name="email" type="email" required autoComplete="email" maxLength={254} placeholder="you@organization.org" dir="ltr" /></label>
              {!forgot && <div><div className="hiring-label-row"><label htmlFor="employer-password">{c.password}</label>{mode === 'login' && <button type="button" onClick={() => { setForgot(true); setMessage(''); }}>{c.forgot}</button>}</div>
                <div className="hiring-password"><input id="employer-password" name="password" required minLength={mode === 'register' ? 12 : 1} maxLength={128} type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} dir="ltr" aria-describedby={mode === 'register' ? 'employer-password-hint' : undefined} /><button type="button" aria-label={show ? c.hide : c.show} aria-pressed={show} onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                {mode === 'register' && <p id="employer-password-hint" className="hiring-hint">{c.hint}</p>}
              </div>}
            </fieldset>
            {message && <div role={isError ? 'alert' : 'status'} className={'hiring-notice ' + (isError ? 'is-error' : '')}>{message}{forgot && !isError && <Link href={'/' + lang + '/contact'}>{c.support}<ArrowUpRight size={15} /></Link>}</div>}
            <button disabled={busy} aria-busy={busy} className="hiring-primary auth-submit">{busy ? <Loader2 className="animate-spin" size={18} /> : null}{busy ? c.working : forgot ? c.reset : mode === 'register' ? c.next : c.login}{!busy && <ArrowUpRight size={18} className="rtl:-scale-x-100" aria-hidden="true" />}</button>
          </form>
          {forgot ? <button type="button" disabled={busy} className="hiring-text-button" onClick={() => changeMode('login')}><ArrowLeft size={16} className="rtl:-scale-x-100" />{c.back}</button> : <p className="auth-trust">{mode === 'register' ? <><ShieldCheck size={16} />{c.privacy}</> : c.switch}</p>}
          <div className="auth-quick"><span>{c.quick}</span><Link href={'/' + lang + '/employers/post'}>{c.quickLink}<ArrowUpRight size={15} /></Link></div>
        </div>
      </section>
    </main>
    <footer className="auth-footer"><Link href={'/' + lang}><ArrowLeft size={15} className="rtl:-scale-x-100" />{c.home}</Link><Link href={'/' + lang + '/contact'}>{c.support}<ArrowUpRight size={14} /></Link></footer>
  </div>;
}
