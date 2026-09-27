'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  GraduationCap,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import Link from 'next/link';
import { track } from '@vercel/analytics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SaveButton } from '@/components/site/save-button';
import { useLangHref } from '@/hooks/use-lang-href';
import { useLangStore } from '@/lib/lang-store';
import type { EducationLevel, MatcherIntent } from '@/lib/opportunity-matcher';

type Lang = 'en' | 'fa' | 'ps';
type ResultState = 'idle' | 'loading' | 'results' | 'no_match' | 'error' | 'rate_limited';

interface Profile {
  intents: MatcherIntent[];
  education: EducationLevel;
  nationality: string;
  residence: string;
  destinations: string[];
  field: string;
}

interface MatchResult {
  id: string;
  slug: string;
  title: string;
  type: string;
  location: string;
  organization: string | null;
  deadline: string | null;
  matchStrength: 'strong' | 'good' | 'possible';
  eligibilityStatus: 'likely_eligible' | 'needs_check' | 'potential_conflict' | 'incomplete';
  dataConfidence: 'high' | 'medium' | 'low';
  reasons: string[];
  verified: string[];
  unknowns: string[];
  conflicts: string[];
  explanation: string;
}

const EMPTY_PROFILE: Profile = {
  intents: [],
  education: 'bachelors',
  nationality: 'Afghanistan',
  residence: 'Afghanistan',
  destinations: ['anywhere'],
  field: '',
};

const COPY = {
  en: {
    title: 'Find opportunities that actually fit',
    intro: 'ARIA HUB checks your preferences against the opportunity facts we have. Unknown requirements stay unknown — we do not estimate acceptance chances.',
    step: 'Step', of: 'of', next: 'Next', back: 'Back',
    intentTitle: 'What are you looking for?', intentSub: 'Choose the opportunity type that matters most right now.',
    educationTitle: 'What is your current education level?', educationSub: 'This is stored as a language-neutral value so every language receives the same matching logic.',
    profileTitle: 'Tell us where you are applying from', profileSub: 'Nationality and residence are different and can affect international eligibility.',
    destinationTitle: 'Where would you like to go?', destinationSub: 'Choose Anywhere if destination is flexible. Add a field or role to improve relevance.',
    nationality: 'Nationality', residence: 'Current country of residence', destination: 'Preferred destination', field: 'Field, discipline or role (optional)',
    fieldPlaceholder: 'e.g. Computer Science, Public Health, Software Engineering',
    anywhere: 'Anywhere', find: 'Find matches', edit: 'Edit preferences', startOver: 'Start over',
    loadingTitle: 'Checking active opportunities', loadingSub: 'Comparing type, destination, known requirements and data confidence.',
    resultsTitle: 'Your opportunity matches', resultsSub: 'These are recommendations, not acceptance predictions.',
    noMatchTitle: 'No strong match right now', noMatch: 'We did not find an active opportunity with enough supporting signals. Broaden the destination, change the type, or browse all opportunities.',
    errorTitle: 'Matcher temporarily unavailable', error: 'Your preferences were kept. Please try again.',
    rateTitle: 'Too many requests', rate: 'Please try again shortly. This limit protects the public AI-enabled service from abuse.',
    browse: 'Browse all opportunities', match: 'Preference match', eligibility: 'Eligibility', confidence: 'Data confidence',
    strong: 'Strong', good: 'Good', possible: 'Possible',
    likely_eligible: 'Likely eligible from known requirements', needs_check: 'Some requirements need checking', potential_conflict: 'Potential eligibility conflict', incomplete: 'Eligibility information incomplete',
    high: 'High', medium: 'Medium', low: 'Low',
    why: 'Why this matched', verified: 'What ARIA HUB could verify', unknown: 'Still check', ai: 'AI explanation',
    aiDisclosure: 'AI may help explain already-selected evidence. It does not decide eligibility and does not estimate acceptance probability.',
    saveHint: 'Save this opportunity', cv: 'Prepare CV for this opportunity',
    helpful: 'Helpful', notRelevant: 'Not relevant',
    deadline: 'Deadline', noDeadline: 'No deadline listed',
    categoryAlert: 'Get category alerts', alertHint: 'ARIA HUB can email you new opportunities in this category. Current alerts are category-based, not personalized match alerts.',
    privacy: 'Matcher preferences stay in this browser session. Only the submitted profile and selected evidence may be sent to the configured AI provider for explanation.',
  },
  fa: {
    title: 'فرصت‌هایی را پیدا کنید که واقعاً با شما سازگارند',
    intro: 'آریا هاب ترجیحات شما را با اطلاعات موجود فرصت‌ها مقایسه می‌کند. موارد نامعلوم را نامعلوم نگه می‌داریم و شانس قبولی را حدس نمی‌زنیم.',
    step: 'مرحله', of: 'از', next: 'بعدی', back: 'قبلی',
    intentTitle: 'دنبال چه نوع فرصتی هستید؟', intentSub: 'نوع فرصتی را انتخاب کنید که اکنون برای شما مهم‌تر است.',
    educationTitle: 'سطح فعلی تحصیل شما چیست؟', educationSub: 'این مقدار به‌صورت ثابت و مستقل از زبان ذخیره می‌شود تا منطق تطبیق در همه زبان‌ها یکسان باشد.',
    profileTitle: 'از کجا درخواست می‌دهید؟', profileSub: 'تابعیت و محل اقامت متفاوت‌اند و ممکن است بر شرایط بین‌المللی اثر بگذارند.',
    destinationTitle: 'ترجیح می‌دهید به کجا بروید؟', destinationSub: 'اگر مقصد برایتان مهم نیست «هرجا» را انتخاب کنید. رشته یا نقش را هم می‌توانید اضافه کنید.',
    nationality: 'تابعیت', residence: 'کشور محل اقامت فعلی', destination: 'مقصد ترجیحی', field: 'رشته، تخصص یا نقش (اختیاری)',
    fieldPlaceholder: 'مثلاً علوم کامپیوتر، صحت عامه، مهندسی نرم‌افزار',
    anywhere: 'هرجا', find: 'یافتن فرصت‌ها', edit: 'ویرایش ترجیحات', startOver: 'شروع دوباره',
    loadingTitle: 'در حال بررسی فرصت‌های فعال', loadingSub: 'نوع فرصت، مقصد، شرایط شناخته‌شده و کیفیت داده مقایسه می‌شود.',
    resultsTitle: 'فرصت‌های مناسب برای شما', resultsSub: 'این‌ها پیشنهاد هستند، نه پیش‌بینی شانس قبولی.',
    noMatchTitle: 'فعلاً تطبیق قوی پیدا نشد', noMatch: 'فرصت فعالی با شواهد کافی پیدا نشد. مقصد را گسترده‌تر کنید، نوع فرصت را تغییر دهید یا همه فرصت‌ها را ببینید.',
    errorTitle: 'تطبیق‌دهنده موقتاً در دسترس نیست', error: 'ترجیحات شما حفظ شده است. دوباره تلاش کنید.',
    rateTitle: 'درخواست‌های زیاد', rate: 'کمی بعد دوباره تلاش کنید. این محدودیت برای محافظت از سرویس عمومی دارای AI است.',
    browse: 'دیدن همه فرصت‌ها', match: 'تطبیق ترجیحات', eligibility: 'شرایط واجد بودن', confidence: 'اعتماد به داده',
    strong: 'قوی', good: 'خوب', possible: 'ممکن',
    likely_eligible: 'بر اساس شرایط شناخته‌شده احتمالاً واجد شرایط', needs_check: 'بعضی شرایط باید بررسی شود', potential_conflict: 'تعارض احتمالی در شرایط', incomplete: 'اطلاعات شرایط ناقص است',
    high: 'زیاد', medium: 'متوسط', low: 'کم',
    why: 'چرا این فرصت پیشنهاد شد', verified: 'مواردی که آریا هاب توانست بررسی کند', unknown: 'مواردی که باید بررسی کنید', ai: 'توضیح AI',
    aiDisclosure: 'AI فقط می‌تواند شواهد از قبل انتخاب‌شده را توضیح دهد. درباره واجد شرایط بودن تصمیم نمی‌گیرد و شانس قبولی را تخمین نمی‌زند.',
    saveHint: 'ذخیره این فرصت', cv: 'آماده‌سازی CV برای این فرصت',
    helpful: 'مفید بود', notRelevant: 'مرتبط نبود',
    deadline: 'آخرین مهلت', noDeadline: 'مهلت ثبت نشده',
    categoryAlert: 'دریافت اطلاع‌رسانی دسته‌بندی', alertHint: 'آریا هاب می‌تواند فرصت‌های جدید این دسته را ایمیل کند. اطلاع‌رسانی فعلی براساس دسته‌بندی است، نه تطبیق شخصی.',
    privacy: 'ترجیحات تطبیق در همین نشست مرورگر نگه‌داری می‌شود. فقط پروفایل ارسال‌شده و شواهد انتخاب‌شده ممکن است برای توضیح به ارائه‌دهنده AI تنظیم‌شده فرستاده شود.',
  },
  ps: {
    title: 'هغه فرصتونه ومومئ چې رښتیا درسره برابر وي',
    intro: 'آریا هاب ستاسو غوره توبونه له هغو معلوماتو سره پرتله کوي چې د فرصتونو په اړه یې لرو. ناپېژندل شوي شرطونه ناپېژندل شوي پاتې کېږي او د منل کېدو چانس نه اټکلوو.',
    step: 'ګام', of: 'له', next: 'بل', back: 'شاته',
    intentTitle: 'د څه ډول فرصت په لټه کې یاست؟', intentSub: 'هغه ډول غوره کړئ چې اوس درته تر ټولو مهم دی.',
    educationTitle: 'ستاسو اوسنی تعلیمي کچه څه ده؟', educationSub: 'دا ارزښت له ژبې خپلواک ساتل کېږي څو د ټولو ژبو د برابرولو منطق یو شان وي.',
    profileTitle: 'له کوم ځایه غوښتنلیک ورکوئ؟', profileSub: 'تابعیت او اوسېدنه جلا معلومات دي او د نړیوالو شرایطو اغېزمنولای شي.',
    destinationTitle: 'کوم ځای ته تلل غواړئ؟', destinationSub: 'که ځای مهم نه وي، هرځای وټاکئ. د لا ښه تړاو لپاره رشته یا رول هم ولیکئ.',
    nationality: 'تابعیت', residence: 'اوسنی د اوسېدو هېواد', destination: 'غوره ځای', field: 'رشته، تخصص یا رول (اختیاري)',
    fieldPlaceholder: 'لکه کمپیوټر ساینس، عامه روغتیا، سافټویر انجینري',
    anywhere: 'هرځای', find: 'فرصتونه ومومئ', edit: 'غوره توبونه سمول', startOver: 'له سره پیل',
    loadingTitle: 'فعال فرصتونه کتل کېږي', loadingSub: 'ډول، ځای، پېژندل شوي شرطونه او د معلوماتو باور پرتله کېږي.',
    resultsTitle: 'ستاسو مناسب فرصتونه', resultsSub: 'دا سپارښتنې دي، د منل کېدو وړاندوینې نه دي.',
    noMatchTitle: 'اوس مهال قوي برابرښت ونه موندل شو', noMatch: 'د کافي شواهدو لرونکی فعال فرصت ونه موندل شو. ځای پراخ کړئ، ډول بدل کړئ یا ټول فرصتونه وګورئ.',
    errorTitle: 'برابرونکی لنډمهاله ستونزه لري', error: 'ستاسو غوره توبونه ساتل شوي. بیا هڅه وکړئ.',
    rateTitle: 'ډېرې غوښتنې', rate: 'لږ وروسته بیا هڅه وکړئ. دا محدودیت عامه AI خدمت له ناوړه کارونې ساتي.',
    browse: 'ټول فرصتونه', match: 'د غوره توب برابرښت', eligibility: 'وړتیا', confidence: 'د معلوماتو باور',
    strong: 'قوي', good: 'ښه', possible: 'ممکن',
    likely_eligible: 'د پېژندل شویو شرطونو له مخې ښايي وړ وي', needs_check: 'ځینې شرطونه باید وکتل شي', potential_conflict: 'د وړتیا احتمالي ټکر', incomplete: 'د وړتیا معلومات نیمګړي دي',
    high: 'لوړ', medium: 'منځنی', low: 'ټیټ',
    why: 'ولې دا فرصت برابر شو', verified: 'هغه څه چې آریا هاب تایید کړای شول', unknown: 'لا یې وګورئ', ai: 'د AI تشریح',
    aiDisclosure: 'AI یوازې مخکې ټاکل شوي شواهد تشریح کوي. د وړتیا پرېکړه نه کوي او د منل کېدو چانس نه اټکلوي.',
    saveHint: 'فرصت خوندي کړئ', cv: 'د دې فرصت لپاره CV چمتو کړئ',
    helpful: 'ګټور و', notRelevant: 'اړوند نه و',
    deadline: 'وروستۍ نېټه', noDeadline: 'نېټه نه ده ثبت شوې',
    categoryAlert: 'د کټګورۍ خبرتیاوې', alertHint: 'آریا هاب د همدې کټګورۍ نوي فرصتونه ایمیل کولای شي. اوسني خبرتیاوې کټګوري-بنسټ دي، شخصي matcher خبرتیاوې نه دي.',
    privacy: 'د matcher غوره توبونه د همدې براوزر په ناسته کې پاتې کېږي. یوازې لېږل شوی پروفایل او ټاکل شوي شواهد ښايي د تشریح لپاره تنظیم شوي AI چمتوکوونکي ته واستول شي.',
  },
} as const;

const INTENT_LABELS: Record<Lang, Record<MatcherIntent, string>> = {
  en: { scholarship: 'Scholarship', fellowship: 'Fellowship', internship: 'Internship', job: 'Job', training: 'Training', conference: 'Conference', competition: 'Competition', exchange_program: 'Exchange program', volunteer: 'Volunteer' },
  fa: { scholarship: 'بورسیه تحصیلی', fellowship: 'فلوشیپ', internship: 'کارآموزی', job: 'وظیفه', training: 'آموزش', conference: 'کنفرانس', competition: 'رقابت', exchange_program: 'برنامه تبادله', volunteer: 'داوطلبی' },
  ps: { scholarship: 'بورس', fellowship: 'فلوشیپ', internship: 'انټرنشیپ', job: 'دنده', training: 'روزنه', conference: 'کنفرانس', competition: 'سیالي', exchange_program: 'تبادلې پروګرام', volunteer: 'رضاکاري' },
};

const EDUCATION_LABELS: Record<Lang, Record<EducationLevel, string>> = {
  en: { high_school: 'High school', bachelors: "Bachelor's", masters: "Master's", phd: 'PhD / Doctorate', other: 'Other' },
  fa: { high_school: 'دبیرستان', bachelors: 'لیسانس', masters: 'فوق لیسانس', phd: 'دکترا', other: 'سایر' },
  ps: { high_school: 'لېسه', bachelors: 'لیسانس', masters: 'ماسټري', phd: 'دوکتورا', other: 'نور' },
};

const COUNTRIES = [
  { value: 'Afghanistan', en: 'Afghanistan', fa: 'افغانستان', ps: 'افغانستان' },
  { value: 'Pakistan', en: 'Pakistan', fa: 'پاکستان', ps: 'پاکستان' },
  { value: 'Iran', en: 'Iran', fa: 'ایران', ps: 'ایران' },
  { value: 'Türkiye', en: 'Türkiye', fa: 'ترکیه', ps: 'ترکیه' },
  { value: 'United Arab Emirates', en: 'United Arab Emirates', fa: 'امارات متحده عربی', ps: 'متحده عربي امارات' },
  { value: 'Qatar', en: 'Qatar', fa: 'قطر', ps: 'قطر' },
  { value: 'India', en: 'India', fa: 'هند', ps: 'هند' },
  { value: 'Germany', en: 'Germany', fa: 'آلمان', ps: 'جرمني' },
  { value: 'Canada', en: 'Canada', fa: 'کانادا', ps: 'کاناډا' },
  { value: 'United States', en: 'United States', fa: 'ایالات متحده', ps: 'متحده ایالات' },
  { value: 'United Kingdom', en: 'United Kingdom', fa: 'بریتانیا', ps: 'بریتانیا' },
  { value: 'Australia', en: 'Australia', fa: 'استرالیا', ps: 'اسټرالیا' },
  { value: 'France', en: 'France', fa: 'فرانسه', ps: 'فرانسه' },
  { value: 'Netherlands', en: 'Netherlands', fa: 'هالند', ps: 'هالنډ' },
  { value: 'Sweden', en: 'Sweden', fa: 'سویدن', ps: 'سویډن' },
  { value: 'Italy', en: 'Italy', fa: 'ایتالیا', ps: 'ایټالیا' },
  { value: 'Spain', en: 'Spain', fa: 'اسپانیا', ps: 'هسپانیا' },
  { value: 'Japan', en: 'Japan', fa: 'جاپان', ps: 'جاپان' },
] as const;

const REASON_COPY: Record<Lang, Record<string, string>> = {
  en: { opportunity_type: 'Opportunity type matches', destination: 'Destination matches', education: 'Education level appears compatible', field: 'Field/role appears relevant', deadline_practicality: 'There is still practical time before the deadline', open_deadline: 'Deadline is currently open', nationality: 'Nationality appears explicitly supported' },
  fa: { opportunity_type: 'نوع فرصت با انتخاب شما تطبیق دارد', destination: 'مقصد تطبیق دارد', education: 'سطح تحصیل سازگار به نظر می‌رسد', field: 'رشته یا نقش مرتبط است', deadline_practicality: 'برای مهلت درخواست هنوز زمان عملی وجود دارد', open_deadline: 'مهلت فعلاً باز است', nationality: 'تابعیت به‌صورت صریح پشتیبانی می‌شود' },
  ps: { opportunity_type: 'د فرصت ډول ستاسو له انتخاب سره برابر دی', destination: 'ځای برابر دی', education: 'تعلیمي کچه مناسبه ښکاري', field: 'رشته یا رول اړوند دی', deadline_practicality: 'تر وروستۍ نېټې عملي وخت شته', open_deadline: 'وروستۍ نېټه لا خلاصه ده', nationality: 'تابعیت په څرګند ډول ملاتړ کېږي' },
};

const UNKNOWN_COPY: Record<Lang, Record<string, string>> = {
  en: { destination: 'Destination fit', education: 'Education requirement', field: 'Field/role requirement', nationality: 'Nationality eligibility', deadline: 'Deadline details' },
  fa: { destination: 'سازگاری مقصد', education: 'شرط تحصیلی', field: 'شرط رشته یا نقش', nationality: 'شرط تابعیت', deadline: 'جزئیات مهلت' },
  ps: { destination: 'د ځای برابرښت', education: 'تعلیمي شرط', field: 'د رشتې یا رول شرط', nationality: 'د تابعیت وړتیا', deadline: 'د وروستۍ نېټې معلومات' },
};

function safeLang(value: string): Lang {
  return value === 'fa' || value === 'ps' ? value : 'en';
}

export function OpportunityMatcherClient() {
  const lang = safeLang(useLangStore((s) => s.code));
  const hrefFn = useLangHref();
  const c = COPY[lang];
  const reduceMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [state, setState] = useState<ResultState>('idle');
  const [results, setResults] = useState<MatchResult[]>([]);
  const [aiUsed, setAiUsed] = useState(false);

  const rtl = lang === 'fa' || lang === 'ps';

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('aria-opportunity-matcher-profile-v2');
      if (saved) setProfile({ ...EMPTY_PROFILE, ...JSON.parse(saved) });
    } catch {}
    track('matcher_started');
  }, []);

  useEffect(() => {
    if (state === 'idle') {
      try {
        sessionStorage.setItem('aria-opportunity-matcher-profile-v2', JSON.stringify(profile));
      } catch {}
    }
  }, [profile, state]);

  useEffect(() => {
    if (step >= 1 && step <= 4) {
      requestAnimationFrame(() => headingRef.current?.focus());
    }
  }, [step]);

  const motionProps = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } };

  const canContinue = useMemo(() => {
    if (step === 1) return profile.intents.length > 0;
    if (step === 2) return !!profile.education;
    if (step === 3) return profile.nationality.length > 1 && profile.residence.length > 1;
    if (step === 4) return profile.destinations.length > 0;
    return true;
  }, [profile, step]);

  const next = () => {
    track('matcher_step_completed', { step });
    if (step < 4) setStep((s) => s + 1);
    else void submit();
  };

  const submit = async () => {
    setState('loading');
    setResults([]);
    track('matcher_submitted', { intent: profile.intents[0] });
    try {
      const res = await fetch('/api/opportunities/matcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, lang }),
      });
      if (res.status === 429) {
        setState('rate_limited');
        return;
      }
      if (!res.ok) throw new Error(`matcher ${res.status}`);
      const data = await res.json();
      const nextResults = Array.isArray(data.results) ? data.results as MatchResult[] : [];
      setAiUsed(Boolean(data.ai));
      setResults(nextResults);
      if (data.status === 'no_strong_match' || nextResults.length === 0) {
        setState('no_match');
        track('matcher_no_strong_match');
      } else {
        setState('results');
        track('matcher_results_count', { count: nextResults.length });
      }
    } catch (error) {
      console.error('[matcher]', error);
      setState('error');
    }
  };

  const reset = () => {
    setProfile(EMPTY_PROFILE);
    setStep(1);
    setResults([]);
    setState('idle');
    try { sessionStorage.removeItem('aria-opportunity-matcher-profile-v2'); } catch {}
  };

  if (state === 'loading') {
    return (
      <div className="mx-auto w-full max-w-3xl px-4" aria-live="polite">
        <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative mb-7 h-20 w-20" role="status" aria-label={c.loadingTitle}>
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 border-t-amber-500 motion-reduce:animate-none animate-spin" />
            <Search className="absolute inset-0 m-auto h-7 w-7 text-amber-600" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold">{c.loadingTitle}</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{c.loadingSub}</p>
        </GlassCard>
      </div>
    );
  }

  if (state === 'results') {
    return (
      <div className="mx-auto w-full max-w-4xl px-4" dir={rtl ? 'rtl' : 'ltr'} aria-live="polite">
        <div className="mb-7 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" aria-hidden="true" />
          <h2 className="text-3xl font-bold">{c.resultsTitle}</h2>
          <p className="mt-2 text-muted-foreground">{c.resultsSub}</p>
        </div>

        <div className="mb-5 rounded-2xl border border-amber-300/50 bg-amber-50/70 p-4 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="flex items-start gap-2">
            <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{aiUsed ? c.aiDisclosure : c.intro}</p>
          </div>
        </div>

        <div className="space-y-5">
          {results.map((result, index) => (
            <motion.div key={result.id} {...(reduceMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: index * 0.06 } })}>
              <ResultCard
                result={result}
                lang={lang}
                copy={c}
                hrefFn={hrefFn}
                onFeedback={(kind) => track(kind === 'helpful' ? 'matcher_helpful' : 'matcher_not_relevant', { opportunity: result.slug })}
              />
            </motion.div>
          ))}
        </div>

        <GlassCard className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">{c.privacy}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => { setState('idle'); setStep(1); track('matcher_edit_preferences'); }}>
              {c.edit}
            </Button>
            <Button variant="ghost" onClick={reset}>{c.startOver}</Button>
            <Button asChild>
              <Link href={hrefFn('/opportunities')}>{c.browse}</Link>
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (state === 'no_match' || state === 'error' || state === 'rate_limited') {
    const isNoMatch = state === 'no_match';
    const title = isNoMatch ? c.noMatchTitle : state === 'rate_limited' ? c.rateTitle : c.errorTitle;
    const body = isNoMatch ? c.noMatch : state === 'rate_limited' ? c.rate : c.error;
    return (
      <div className="mx-auto w-full max-w-2xl px-4" dir={rtl ? 'rtl' : 'ltr'} role="status" aria-live="assertive">
        <GlassCard className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-amber-600" aria-hidden="true" />
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{body}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={() => { setState('idle'); setStep(isNoMatch ? 4 : step); }}>{c.edit}</Button>
            <Button asChild><Link href={hrefFn('/opportunities')}>{c.browse}</Link></Button>
          </div>
          {isNoMatch && (
            <div className="mt-7 border-t pt-6 text-start">
              <p className="font-semibold">{c.categoryAlert}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.alertHint}</p>
              <Button asChild variant="link" className="mt-2 px-0">
                <Link href={hrefFn('/opportunities') + '#alerts'}><Bell className="me-2 h-4 w-4" />{c.categoryAlert}</Link>
              </Button>
            </div>
          )}
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 sm:px-4" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="mb-6 text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-amber-600" aria-hidden="true" />
        <h1 className="text-3xl font-bold sm:text-4xl">{c.title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{c.intro}</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} {...motionProps}>
          <GlassCard>
            <div className="mb-6">
              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {c.step} {step} {c.of} 4
              </span>
              <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-bold outline-none">
                {step === 1 ? c.intentTitle : step === 2 ? c.educationTitle : step === 3 ? c.profileTitle : c.destinationTitle}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {step === 1 ? c.intentSub : step === 2 ? c.educationSub : step === 3 ? c.profileSub : c.destinationSub}
              </p>
            </div>

            {step === 1 && (
              <RadioGroup
                value={profile.intents[0] || ''}
                onValueChange={(value) => setProfile((p) => ({ ...p, intents: [value as MatcherIntent] }))}
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                aria-label={c.intentTitle}
              >
                {(Object.keys(INTENT_LABELS[lang]) as MatcherIntent[]).map((intent) => (
                  <Label key={intent} htmlFor={`intent-${intent}`} className="flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border bg-background/60 p-4 hover:bg-accent">
                    <RadioGroupItem id={`intent-${intent}`} value={intent} />
                    <span className="font-semibold">{INTENT_LABELS[lang][intent]}</span>
                  </Label>
                ))}
              </RadioGroup>
            )}

            {step === 2 && (
              <RadioGroup
                value={profile.education}
                onValueChange={(value) => setProfile((p) => ({ ...p, education: value as EducationLevel }))}
                className="space-y-3"
                aria-label={c.educationTitle}
              >
                {(Object.keys(EDUCATION_LABELS[lang]) as EducationLevel[]).map((level) => (
                  <Label key={level} htmlFor={`edu-${level}`} className="flex cursor-pointer items-center gap-3 rounded-xl border bg-background/60 p-4 hover:bg-accent">
                    <RadioGroupItem id={`edu-${level}`} value={level} />
                    <span>{EDUCATION_LABELS[lang][level]}</span>
                  </Label>
                ))}
              </RadioGroup>
            )}

            {step === 3 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <CountrySelect label={c.nationality} value={profile.nationality} lang={lang} onChange={(value) => setProfile((p) => ({ ...p, nationality: value }))} />
                <CountrySelect label={c.residence} value={profile.residence} lang={lang} onChange={(value) => setProfile((p) => ({ ...p, residence: value }))} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <Label className="mb-2 block">{c.destination}</Label>
                  <Select value={profile.destinations[0]} onValueChange={(value) => setProfile((p) => ({ ...p, destinations: [value] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anywhere">{c.anywhere}</SelectItem>
                      {COUNTRIES.map((country) => <SelectItem key={country.value} value={country.value}>{country[lang]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="matcher-field" className="mb-2 block">{c.field}</Label>
                  <Input id="matcher-field" value={profile.field} maxLength={80} placeholder={c.fieldPlaceholder} onChange={(e) => setProfile((p) => ({ ...p, field: e.target.value }))} />
                </div>
                <p className="rounded-xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">{c.privacy}</p>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t pt-5">
              {step > 1 ? <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>{c.back}</Button> : <span />}
              <Button onClick={next} disabled={!canContinue}>
                {step === 4 ? c.find : c.next}
                <ChevronRight className={`ms-2 h-4 w-4 ${rtl ? 'rotate-180' : ''}`} aria-hidden="true" />
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CountrySelect({ label, value, lang, onChange }: { label: string; value: string; lang: Lang; onChange: (value: string) => void }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((country) => <SelectItem key={country.value} value={country.value}>{country[lang]}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ResultCard({
  result,
  lang,
  copy,
  hrefFn,
  onFeedback,
}: {
  result: MatchResult;
  lang: Lang;
  copy: (typeof COPY)[Lang];
  hrefFn: (path: string) => string;
  onFeedback: (kind: 'helpful' | 'not_relevant') => void;
}) {
  const deadline = result.deadline
    ? new Intl.DateTimeFormat(lang === 'fa' ? 'fa-AF' : lang === 'ps' ? 'ps-AF' : 'en-GB', { dateStyle: 'medium' }).format(new Date(result.deadline))
    : copy.noDeadline;

  return (
    <Card className="overflow-hidden border-border/70 bg-background/80 shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{result.type}</Badge>
          <Badge>{result.location}</Badge>
          <Badge>{copy.match}: {copy[result.matchStrength]}</Badge>
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <Link href={hrefFn(`/opportunities/${result.slug}`)} onClick={() => track('matcher_result_opened', { opportunity: result.slug })} className="text-xl font-bold hover:text-amber-700">
              {result.title}
            </Link>
            {result.organization && <p className="mt-1 text-sm text-muted-foreground">{result.organization}</p>}
          </div>
          <SaveButton slug={result.slug} />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Status label={copy.match} value={copy[result.matchStrength]} />
          <Status label={copy.eligibility} value={copy[result.eligibilityStatus]} />
          <Status label={copy.confidence} value={copy[result.dataConfidence]} />
        </div>

        <p className="mt-4 text-sm"><strong>{copy.deadline}:</strong> {deadline}</p>

        {result.reasons.length > 0 && (
          <EvidenceBlock title={copy.why} items={result.reasons.map((key) => REASON_COPY[lang][key] || key)} tone="positive" />
        )}
        {result.verified.length > 0 && (
          <EvidenceBlock title={copy.verified} items={result.verified.map((key) => REASON_COPY[lang][key] || key)} tone="positive" />
        )}
        {result.unknowns.length > 0 && (
          <EvidenceBlock title={copy.unknown} items={result.unknowns.map((key) => UNKNOWN_COPY[lang][key] || key)} tone="neutral" />
        )}
        {result.explanation && (
          <div className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">{copy.ai}</p>
            <p className="mt-1 text-sm leading-6">{result.explanation}</p>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href={hrefFn(`/opportunities/${result.slug}`)}>
              {copy.why}
              <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={hrefFn(`/cv-builder?opportunity=${encodeURIComponent(result.slug)}`)}>
              <BriefcaseBusiness className="me-2 h-4 w-4" aria-hidden="true" />
              {copy.cv}
            </Link>
          </Button>
          <div className="ms-auto flex gap-1" aria-label={copy.helpful}>
            <Button variant="ghost" size="sm" onClick={() => onFeedback('helpful')}><ThumbsUp className="me-1 h-4 w-4" />{copy.helpful}</Button>
            <Button variant="ghost" size="sm" onClick={() => onFeedback('not_relevant')}><ThumbsDown className="me-1 h-4 w-4" />{copy.notRelevant}</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EvidenceBlock({ title, items, tone }: { title: string; items: string[]; tone: 'positive' | 'neutral' }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {items.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true">{tone === 'positive' ? '✓' : '•'}</span><span>{item}</span></li>)}
      </ul>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border bg-muted/60 px-2.5 py-1 text-xs font-medium">{children}</span>;
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-white/40 bg-white/50 p-5 shadow-xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/50 sm:p-8 ${className}`}>{children}</div>;
}
