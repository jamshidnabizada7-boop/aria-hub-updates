'use client';

import { useState, useRef, useEffect } from 'react';
import { AF_PROVINCES } from '@/lib/geo/provinces';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Search,
  Send,
  Wallet,
} from 'lucide-react';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/lang-route';

const CATEGORIES = [
  { slug: 'jobs', key: 'opportunities.jobs' },
  { slug: 'internships', key: 'opportunities.internships' },
  { slug: 'training', key: 'opportunities.training' },
  { slug: 'volunteer', key: 'opportunities.volunteer' },
  { slug: 'fellowships', key: 'opportunities.fellowships' },
  { slug: 'competitions', key: 'opportunities.competitions' },
] as const;

const JOB_TYPES = [
  { value: 'full-time', key: 'employers.post.jobType.fullTime' },
  { value: 'part-time', key: 'employers.post.jobType.partTime' },
  { value: 'contract', key: 'employers.post.jobType.contract' },
  { value: 'internship', key: 'employers.post.jobType.internship' },
  { value: 'remote', key: 'employers.post.jobType.remote' },
] as const;

const PROVINCE_OPTIONS = AF_PROVINCES as readonly string[];
const inputClasses =
  'h-12 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground shadow-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

const labelClasses = 'mb-1.5 block text-sm font-semibold';

const sectionTitleClasses =
  'flex items-center gap-2 text-base font-semibold text-foreground';

export function EmployerPostForm({ lang }: { lang: Lang }) {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(lang, key, params);

  const ui = {
    en: {steps:['The opportunity','Application details','Review & send'], next:'Continue', back:'Back', review:'Review job post', submit:'Send for review', edit:'Edit details', required:'Fields marked * are required. Other details are optional.', note:'Your post will be reviewed before it appears on ARIA HUB.', application:'Add at least one application method: a link, email or phone number.', ready:'Ready for a final look?', reviewHint:'Check the details below. You can go back and edit before sending.', private:'Private contact · only for our review team', missing:'Not provided', saved:'Your details stay here while you move between steps.', optional:'Additional details (optional)', min:'Minimum 80 characters', count:'characters', choose:'Choose a category'},
    fa: {steps:['معلومات فرصت','جزئیات درخواست','بررسی و ارسال'], next:'ادامه', back:'بازگشت', review:'بررسی آگهی', submit:'ارسال برای بررسی', edit:'ویرایش معلومات', required:'موارد دارای * الزامی‌اند. سایر معلومات اختیاری‌اند.', note:'آگهی شما پیش از نشر در آریا هاب بررسی می‌شود.', application:'حداقل یک روش درخواست وارد کنید: لینک، ایمیل یا شماره تماس.', ready:'آماده بررسی نهایی هستید؟', reviewHint:'معلومات زیر را بررسی کنید. پیش از ارسال می‌توانید آن‌ها را ویرایش کنید.', private:'تماس خصوصی · فقط برای تیم بررسی', missing:'ارائه نشده', saved:'معلومات شما هنگام رفتن به مرحله بعد حفظ می‌شود.', optional:'معلومات بیشتر (اختیاری)', min:'حداقل ۸۰ حرف', count:'حرف', choose:'دسته‌بندی را انتخاب کنید'},
    ps: {steps:['د فرصت معلومات','د غوښتنلیک جزئیات','کتنه او لېږل'], next:'دوام', back:'شاته', review:'اعلان وګورئ', submit:'د کتنې لپاره لېږل', edit:'معلومات بدل کړئ', required:'د * نښې برخې اړینې دي. نور معلومات اختیاري دي.', note:'ستاسو اعلان په آریا هاب کې له خپرېدو مخکې کتل کېږي.', application:'لږ تر لږه یوه لاره ولیکئ: لینک، برېښنالیک یا د ټیلیفون شمېره.', ready:'وروستۍ کتنې ته چمتو یاست؟', reviewHint:'لاندې معلومات وګورئ. له لېږلو مخکې یې بدلولای شئ.', private:'شخصي اړیکه · یوازې زموږ د کتنې ټیم لپاره', missing:'نه دي ورکړل شوي', saved:'د ګامونو ترمنځ ستاسو معلومات ساتل کېږي.', optional:'نور معلومات (اختیاري)', min:'لږ تر لږه ۸۰ توري', count:'توري', choose:'کټګوري وټاکئ'}
  }[lang];
  const [step, setStep] = useState(0);
  const [review, setReview] = useState<Record<string,string>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);
  const sending = useRef(false);
  useEffect(() => { if (hasNavigated.current) headingRef.current?.focus(); }, [step]);
  function changeStep(value:number) { hasNavigated.current=true; setStep(value); setError(''); }
  function validateStep(form:HTMLFormElement, value:number) {
    const fields = form.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>(`fieldset[data-step="${value}"] input, fieldset[data-step="${value}"] select, fieldset[data-step="${value}"] textarea`);
    for(const field of fields) {
      if(!field.checkValidity()) {
        const details=field.closest('details'); if(details) details.open=true;
        field.reportValidity(); return false;
      }
    }
    if(value===1) {
      const fd=new FormData(form);
      if(!['applyUrl','applyEmail','applyPhone'].some(key=>String(fd.get(key)||'').trim())) {
        setError(ui.application); form.querySelector<HTMLInputElement>('#ep-applyurl')?.focus(); return false;
      }
    }
    return true;
  }

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [descLen, setDescLen] = useState(0);
  const [referenceCode, setReferenceCode] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (sending.current) return;
    if(step<2) {
      if(!validateStep(form,step)) return;
      if(step===1) setReview(Object.fromEntries(Array.from(new FormData(form).entries()).map(([key,value])=>[key,String(value)])));
      changeStep(step+1); return;
    }
    const fd = new FormData(form);
    sending.current=true;
    setStatus('submitting');
    setError('');
    try {
      const res = await fetch('/api/opportunities/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitterType: 'employer',
          title: fd.get('title'),
          organization: fd.get('organization'),
          categorySlug: fd.get('categorySlug'),
          country: fd.get('country'),
          deadline: fd.get('deadline'),
          applyUrl: fd.get('applyUrl'),
          applyEmail: fd.get('applyEmail'),
          applyPhone: fd.get('applyPhone'),
          description: fd.get('description'),
          contactName: fd.get('contactName'),
          contactEmail: fd.get('contactEmail'),
          jobType: fd.get('jobType'),
          salaryRange: fd.get('salaryRange'),
          location: fd.get('location'),
          companyWebsite: fd.get('companyWebsite'),
          // Phase 14: professional fields (all optional)
          vacancyNumber: fd.get('vacancyNumber'),
          numberOfVacancies: fd.get('numberOfVacancies'),
          province: fd.get('province'),
          city: fd.get('city'),
          district: fd.get('district'),
          contractType: fd.get('contractType'),
          contractDuration: fd.get('contractDuration'),
          genderRequirement: fd.get('genderRequirement'),
          nationalityRequirement: fd.get('nationalityRequirement'),
          salaryGrade: fd.get('salaryGrade'),
          education: fd.get('education'),
          experience: fd.get('experience'),
          responsibilities: fd.get('responsibilities'),
          requirements: fd.get('requirements'),
          guidelines: fd.get('guidelines'),
          website: fd.get('website'), // honeypot
          lang,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || t('submit.error'));
        setStatus('error');
        return;
      }
      setReferenceCode(typeof data.referenceCode === 'string' ? data.referenceCode : '');
      setStatus('success');
      form.reset();
      setDescLen(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError(t('submit.error'));
      setStatus('error');
    } finally { sending.current=false; }
  }

  function copyRef() {
    if (!referenceCode) return;
    navigator.clipboard?.writeText(referenceCode).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => undefined
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.07] via-card to-card p-8 text-center shadow-float sm:p-10">
        <span
          aria-hidden="true"
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        >
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h2 dir="auto" className="mt-5 text-2xl font-bold">
          {t('employers.post.success.title')}
        </h2>
        <p dir="auto" className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {t('employers.post.success.body')}
        </p>
        {referenceCode && (
          <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-emerald-500/25 bg-card/80 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {t('submit.success.refLabel')}
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <code dir="ltr" className="rounded-lg bg-muted px-3 py-1.5 font-mono text-lg font-black tracking-[0.18em]">
                {referenceCode}
              </code>
              <button
                type="button"
                onClick={copyRef}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    {t('submit.success.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('submit.success.copy')}
                  </>
                )}
              </button>
            </div>
            <p dir="auto" className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t('submit.success.refHint')}
            </p>
          </div>
        )}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {setStatus('idle');changeStep(0);}}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-chart-2 px-6 text-sm font-semibold text-primary-foreground shadow-float transition-opacity hover:opacity-90"
          >
            <Send className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
            {t('employers.post.success.another')}
          </button>
          <Link
            href={`/${lang}/opportunities`}
            className="inline-flex h-11 items-center rounded-xl border border-border bg-card/60 px-6 text-sm font-semibold transition-colors hover:bg-accent"
          >
            {t('opportunities.title')}
          </Link>
        </div>
        {referenceCode && (
          <div className="mt-5">
            <Link
              href={`/${lang}/track?ref=${encodeURIComponent(referenceCode)}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {t('submit.success.track')}
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/[0.03] sm:p-8"
      aria-busy={status === 'submitting'}
      noValidate
    >
      <ol aria-label={t('employers.post.title')} className="mb-8 grid grid-cols-3 gap-2 border-b border-border pb-6">
        {ui.steps.map((label,i)=><li key={label} aria-current={step===i?'step':undefined} className={'flex flex-col gap-2 text-xs font-medium '+(step===i?'text-primary':'text-muted-foreground')}>
          <span aria-hidden="true" className={'grid h-8 w-8 place-items-center rounded-full text-sm font-semibold '+(step===i?'bg-primary text-primary-foreground':step>i?'bg-primary/10 text-primary':'bg-muted')}>{step>i?<CheckCircle2 className="h-4 w-4"/>:i+1}</span><span>{label}</span>
        </li>)}
      </ol>
      <h2 ref={headingRef} tabIndex={-1} className="scroll-mt-28 text-2xl font-semibold tracking-tight outline-none">{ui.steps[step]}</h2>
      <p className="mb-7 mt-2 text-sm leading-6 text-muted-foreground">{step===2?ui.reviewHint:ui.required}</p>
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

      <fieldset data-step="0" hidden={step!==0} disabled={status==='submitting'}>
      <legend className="sr-only">{ui.steps[0]}</legend>
      {/* ── Company details ─────────────────────────────────────────────── */}
      <p className={sectionTitleClasses}>
        <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
        {t('employers.post.companySection')}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ep-org" className={labelClasses}>
            {t('employers.post.companyName')} <span className="text-destructive">*</span>
          </label>
          <input id="ep-org" name="organization" type="text" required maxLength={120} placeholder={t('employers.post.companyNamePlaceholder')} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="ep-web" className={labelClasses}>
            {t('employers.post.companyWebsite')}
          </label>
          <input id="ep-web" name="companyWebsite" type="url" dir="ltr" placeholder="https://…" className={inputClasses} />
        </div>
      </div>

      {/* ── Role details ────────────────────────────────────────────────── */}
      <p className={`${sectionTitleClasses} mt-7`}>
        <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
        {t('employers.post.roleSection')}
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="ep-title" className={labelClasses}>
            {t('employers.post.jobTitle')} <span className="text-destructive">*</span>
          </label>
          <input id="ep-title" name="title" type="text" required minLength={5} maxLength={200} placeholder={t('employers.post.jobTitlePlaceholder')} className={inputClasses} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-category" className={labelClasses}>
              {t('submit.form.category')} <span className="text-destructive">*</span>
            </label>
            <select id="ep-category" name="categorySlug" required defaultValue="" className={inputClasses}>
              <option value="" disabled>
                {ui.choose}
              </option>
              {CATEGORIES.map(({ slug, key }) => (
                <option key={slug} value={slug}>
                  {t(key)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ep-jobtype" className={labelClasses}>
              {t('employers.post.jobType')}
            </label>
            <select id="ep-jobtype" name="jobType" defaultValue="full-time" className={inputClasses}>
              {JOB_TYPES.map(({ value, key }) => (
                <option key={value} value={value}>
                  {t(key)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-location" className={labelClasses}>
              {t('employers.post.location')}
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input id="ep-location" name="location" type="text" maxLength={120} placeholder={t('employers.post.locationPlaceholder')} className={`${inputClasses} ps-10`} />
            </div>
          </div>
          <div>
            <label htmlFor="ep-country" className={labelClasses}>
              {t('submit.form.country')}
            </label>
            <input id="ep-country" name="country" type="text" maxLength={80} placeholder={t('submit.form.countryPlaceholder')} className={inputClasses} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-salary" className={labelClasses}>
              {t('employers.post.salary')}
            </label>
            <div className="relative">
              <Wallet className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input id="ep-salary" name="salaryRange" type="text" maxLength={120} placeholder={t('employers.post.salaryPlaceholder')} className={`${inputClasses} ps-10`} />
            </div>
          </div>
          <div>
            <label htmlFor="ep-deadline" className={labelClasses}>
              {t('submit.form.deadline')}
            </label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input id="ep-deadline" name="deadline" type="date" className={`${inputClasses} ps-10`} />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="ep-desc" className={labelClasses}>
            {t('submit.form.description')} <span className="text-destructive">*</span>
          </label>
          <textarea
            id="ep-desc"
            name="description"
            required
            aria-describedby="ep-description-hint"
            minLength={80}
            maxLength={8000}
            rows={5}
            onChange={(e) => setDescLen(e.target.value.length)}
            placeholder={t('submit.form.descriptionHint')}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span id="ep-description-hint" className="text-muted-foreground">{ui.min}</span>
            <span
              aria-live="polite"
              className={descLen >= 80 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}
              dir="ltr"
            >
              {descLen.toLocaleString()} / 8,000 {ui.count}
            </span>
          </div>
        </div>
      </div>

      </fieldset>
      <fieldset data-step="1" hidden={step!==1} disabled={status==='submitting'}>
      <legend className="sr-only">{ui.steps[1]}</legend>
      {/* ── How to apply ────────────────────────────────────────────────── */}
      <p className={`${sectionTitleClasses} mt-7`}>
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        {t('employers.post.applySection')}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ep-applyurl" className={labelClasses}>
            {t('submit.form.applyUrl')}
          </label>
          <input id="ep-applyurl" name="applyUrl" type="url" dir="ltr" placeholder="https://…" className={inputClasses} />
        </div>
        <div>
          <label htmlFor="ep-applyemail" className={labelClasses}>
            {t('submit.form.applyEmail')}
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute inset-y-0 start-3.5 my-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input id="ep-applyemail" name="applyEmail" type="email" dir="ltr" placeholder="jobs@example.org" className={`${inputClasses} ps-10`} />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ep-applyph" className={labelClasses}>{lang==='en'?'Application phone number':lang==='fa'?'شماره تماس برای درخواست':'د غوښتنلیک د ټیلیفون شمېره'}</label>
          <input id="ep-applyph" name="applyPhone" type="tel" dir="ltr" inputMode="tel" maxLength={32} placeholder="+93 700 123 456" className={inputClasses}/>
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-muted/70 p-4 text-sm leading-6 text-muted-foreground">{ui.application} {lang==='en'?'These application details will be public when approved.':lang==='fa'?'این معلومات پس از تأیید عمومی می‌شود.':'دا معلومات له تایید وروسته عامه کېږي.'}</p>

      {/* ── Professional details (Phase 14, all optional) ────────────────── */}
      <details className="mt-7 rounded-lg border bg-card/50 p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          {ui.optional}
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ep-vac" className={labelClasses}>{lang==='fa'?'شماره مرجع':lang==='ps'?'د بست شمېره':'Vacancy / reference number'}</label>
            <input id="ep-vac" name="vacancyNumber" type="text" maxLength={60} className={inputClasses} />
          </div>
          <div>
            <label htmlFor="ep-ncvac" className={labelClasses}>{lang==='fa'?'تعداد بست‌ها':lang==='ps'?'د بستونو شمېر':'Number of vacancies'}</label>
            <input id="ep-ncvac" name="numberOfVacancies" type="number" min={1} max={999} className={inputClasses} />
          </div>
          <div>
            <label htmlFor="ep-prov" className={labelClasses}>{lang==='fa'?'ولایت':lang==='ps'?'ولایت':'Province'}</label>
            <select id="ep-prov" name="province" className={inputClasses} defaultValue="">
              <option value="">—</option>
              {PROVINCE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ep-city" className={labelClasses}>{lang==='fa'?'شهر':lang==='ps'?'ښار':'City'}</label>
            <input id="ep-city" name="city" type="text" maxLength={80} className={inputClasses} />
          </div>
          <div>
            <label htmlFor="ep-dist" className={labelClasses}>{lang==='fa'?'ولسوالی':lang==='ps'?'ولسوالي':'District'}</label>
            <input id="ep-dist" name="district" type="text" maxLength={80} className={inputClasses} />
          </div>
          <div>
            <label htmlFor="ep-ct" className={labelClasses}>{lang==='fa'?'نوع قرارداد':lang==='ps'?'د قرارداد ډول':'Contract type'}</label>
            <input id="ep-ct" name="contractType" type="text" maxLength={60} className={inputClasses} />
          </div>
          <div>
            <label htmlFor="ep-cd" className={labelClasses}>{lang==='fa'?'مدت قرارداد':lang==='ps'?'د قرارداد موده':'Contract duration'}</label>
            <input id="ep-cd" name="contractDuration" type="text" maxLength={60} className={inputClasses} />
          </div>
          <div>
            <label htmlFor="ep-gen" className={labelClasses}>{lang==='fa'?'شرط جنسیت (در صورت ذکر)':lang==='ps'?'د جنسیت شرط (که یاد شوی وي)':'Gender requirement (if stated)'}</label>
            <input id="ep-gen" name="genderRequirement" type="text" maxLength={60} className={inputClasses} />
          </div>
          <div>
            <label htmlFor="ep-nat" className={labelClasses}>{lang==='fa'?'شرط تابعیت (در صورت ذکر)':lang==='ps'?'د تابعیت شرط (که یاد شوی وي)':'Nationality requirement (if stated)'}</label>
            <input id="ep-nat" name="nationalityRequirement" type="text" maxLength={80} className={inputClasses} />
          </div>
          <div>
            <label htmlFor="ep-sg" className={labelClasses}>{lang==='fa'?'درجه معاش':lang==='ps'?'د معاش درجه':'Salary grade'}</label>
            <input id="ep-sg" name="salaryGrade" type="text" maxLength={60} className={inputClasses} />
          </div>
        </div>
        <div className="mt-4 grid gap-4">
          <div>
            <label htmlFor="ep-edu" className={labelClasses}>{lang==='fa'?'تحصیلات':lang==='ps'?'زده کړې':'Education'}</label>
            <input id="ep-edu" name="education" type="text" maxLength={2000} className={inputClasses} />
          </div>
          <div>
            <label htmlFor="ep-exp" className={labelClasses}>{lang==='fa'?'تجربه':lang==='ps'?'تجربه':'Experience'}</label>
            <input id="ep-exp" name="experience" type="text" maxLength={2000} className={inputClasses} />
          </div>
          <div>
            <label htmlFor="ep-resp" className={labelClasses}>{lang==='fa'?'مسئولیت‌ها':lang==='ps'?'مسئولیتونه':'Responsibilities'}</label>
            <textarea id="ep-resp" name="responsibilities" rows={4} maxLength={8000} className={inputClasses} />
          </div>
          <div>
            <label htmlFor="ep-req" className={labelClasses}>{lang==='fa'?'شرایط و اسناد لازم':lang==='ps'?'شرطونه او اړین اسناد':'Requirements / required documents'}</label>
            <textarea id="ep-req" name="requirements" rows={4} maxLength={8000} className={inputClasses} />
          </div>
          <div>
            <label htmlFor="ep-guid" className={labelClasses}>{lang==='fa'?'رهنمای درخواست':lang==='ps'?'د غوښتنلیک لارښوونې':'Submission guideline'}</label>
            <textarea id="ep-guid" name="guidelines" rows={3} maxLength={4000} className={inputClasses} />
          </div>
        </div>
      </details>

      {/* ── Contact details ─────────────────────────────────────────────── */}
      <p className={`${sectionTitleClasses} mt-7`}>
        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
        {t('submit.form.contactSection')}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ep-contactname" className={labelClasses}>
            {t('submit.form.contactName')}
          </label>
          <input id="ep-contactname" name="contactName" type="text" maxLength={120} className={inputClasses} />
        </div>
        <div>
          <label htmlFor="ep-contactemail" className={labelClasses}>
            {t('submit.form.contactEmail')} <span className="text-destructive">*</span>
          </label>
          <input id="ep-contactemail" name="contactEmail" type="email" required dir="ltr" placeholder="you@example.com" className={inputClasses} />
        </div>
      </div>
      <p dir="auto" className="mt-2 text-xs text-muted-foreground">
        {t('submit.form.contactHint')}
      </p>

      </fieldset>
      {step===2&&<section aria-label={ui.review} className="space-y-5">
        <div className="rounded-2xl border border-border bg-muted/30 p-5"><p className="text-sm font-medium text-primary">{review.organization}</p><h3 className="mt-2 break-words text-2xl font-semibold">{review.title}</h3><p className="mt-2 text-sm text-muted-foreground">{[review.location,review.country].filter(Boolean).join(' · ')}</p><p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7">{review.description}</p></div>
        <dl className="grid gap-4 sm:grid-cols-2">{[
          ['categorySlug',t('submit.form.category')],['jobType',t('employers.post.jobType')],['deadline',t('submit.form.deadline')],['salaryRange',t('employers.post.salary')],['companyWebsite',t('employers.post.companyWebsite')],['applyUrl',t('submit.form.applyUrl')],['applyEmail',t('submit.form.applyEmail')],['applyPhone',lang==='en'?'Application phone':lang==='fa'?'شماره درخواست':'د غوښتنلیک شمېره'],
          ['vacancyNumber',lang==='fa'?'شماره مرجع':lang==='ps'?'د بست شمېره':'Vacancy number'],
          ['numberOfVacancies',lang==='fa'?'تعداد بست‌ها':lang==='ps'?'د بستونو شمېر':'Number of vacancies'],
          ['province',lang==='fa'?'ولایت':lang==='ps'?'ولایت':'Province'],
          ['city',lang==='fa'?'شهر':lang==='ps'?'ښار':'City'],
          ['district',lang==='fa'?'ولسوالی':lang==='ps'?'ولسوالي':'District'],
          ['contractType',lang==='fa'?'نوع قرارداد':lang==='ps'?'د قرارداد ډول':'Contract type'],
          ['contractDuration',lang==='fa'?'مدت قرارداد':lang==='ps'?'د قرارداد موده':'Contract duration'],
          ['genderRequirement',lang==='fa'?'شرط جنسیت':lang==='ps'?'د جنسیت شرط':'Gender requirement'],
          ['nationalityRequirement',lang==='fa'?'شرط تابعیت':lang==='ps'?'د تابعیت شرط':'Nationality requirement'],
          ['salaryGrade',lang==='fa'?'درجه معاش':lang==='ps'?'د معاش درجه':'Salary grade'],
          ['education',lang==='fa'?'تحصیلات':lang==='ps'?'زده کړې':'Education'],
          ['experience',lang==='fa'?'تجربه':lang==='ps'?'تجربه':'Experience'],
          ['responsibilities',lang==='fa'?'مسئولیت‌ها':lang==='ps'?'مسئولیتونه':'Responsibilities'],
          ['requirements',lang==='fa'?'شرایط':lang==='ps'?'شرطونه':'Requirements'],
          ['guidelines',lang==='fa'?'رهنمای درخواست':lang==='ps'?'د غوښتنلیک لارښوونې':'Submission guidelines'],
        ].filter(([key])=>review[key]).map(([key,label])=><div key={key} className="min-w-0 rounded-xl border p-4"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 break-words text-sm font-medium" dir="auto">{key==='categorySlug'?t(CATEGORIES.find(c=>c.slug===review[key])?.key||'submit.form.category'):key==='jobType'?t(JOB_TYPES.find(c=>c.value===review[key])?.key||'employers.post.jobType'):review[key]}</dd></div>)}</dl>
        <div className="rounded-xl bg-primary/5 p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary"/>{ui.private}</h3><p className="mt-2 break-words text-sm" dir="auto">{review.contactName} · {review.contactEmail}</p></div>
        <p className="text-sm leading-6 text-muted-foreground">{ui.note}</p>
      </section>}
      {error&&<p role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
      <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
        {step>0&&<button type="button" disabled={status==='submitting'} onClick={()=>changeStep(step-1)} className="journey-secondary"><ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true"/>{ui.back}</button>}
        <button key={step} type="submit" disabled={status==='submitting'} className="journey-primary min-w-0 flex-1">
          {status==='submitting'?<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>:step===2?<Send className="h-4 w-4" aria-hidden="true"/>:null}
          {status==='submitting'?t('submit.form.submitting'):step===2?ui.submit:step===1?ui.review:ui.next}
          {step<2&&<ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true"/>}
        </button>
      </div>
      <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">{step<2?ui.saved:ui.note}</p>



      <p dir="auto" className="mt-6 flex flex-wrap items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        {t('employers.communityNote')}{' '}
        <Link href={`/${lang}/submit-opportunity`} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          {t('employers.communityLink')}
          <ArrowRight className="h-3 w-3 rtl:-scale-x-100" aria-hidden="true" />
        </Link>
      </p>
    </form>
  );
}
