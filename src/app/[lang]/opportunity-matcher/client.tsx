'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  Globe,
  GraduationCap,
  Search,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSavedSlugs, toggleSavedSlug } from '@/components/site/save-button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLangHref } from '@/hooks/use-lang-href';
import { useLangStore } from '@/lib/lang-store';
import type {
  DataConfidence,
  EducationLevel,
  EligibilityStatus,
  MatcherIntent,
  MatchStrength,
} from '@/lib/opportunity-matcher';

type Lang = 'fa' | 'ps' | 'en';

interface Profile {
  intent: MatcherIntent | '';
  education: EducationLevel | '';
  nationality: string;
  residence: string;
  targetCountry: string;
  experienceYears: number | null;
}

interface MatchResult {
  id: string;
  slug: string;
  title: string;
  type: string;
  intent: MatcherIntent;
  organization: string | null;
  location: string;
  deadline: string | null;
  daysRemaining: number | null;
  strength: MatchStrength;
  eligibilityStatus: EligibilityStatus;
  dataConfidence: DataConfidence;
  reasons: string[];
  verified: string[];
  check: string[];
  rationale: string;
}

interface MatcherResponse {
  status: 'ok' | 'no_strong_match';
  results: MatchResult[];
  nearMatches: MatchResult[];
  ai: boolean;
  disclosure: string | null;
}

type ViewState = 'form' | 'loading' | 'results' | 'no_match' | 'error';

const STORAGE_KEY = 'aria-opportunity-matcher-profile-v2';

const COUNTRIES = [
  ['ANY', 'Anywhere', 'هرجا', 'هر ځای'],
  ['AF', 'Afghanistan', 'افغانستان', 'افغانستان'],
  ['PK', 'Pakistan', 'پاکستان', 'پاکستان'],
  ['IR', 'Iran', 'ایران', 'ایران'],
  ['TR', 'Türkiye', 'ترکیه', 'ترکیه'],
  ['AE', 'United Arab Emirates', 'امارات متحده عربی', 'متحده عربي امارات'],
  ['QA', 'Qatar', 'قطر', 'قطر'],
  ['IN', 'India', 'هند', 'هند'],
  ['DE', 'Germany', 'آلمان', 'جرمني'],
  ['CA', 'Canada', 'کانادا', 'کاناډا'],
  ['US', 'United States', 'ایالات متحده', 'متحده ایالات'],
  ['GB', 'United Kingdom', 'بریتانیا', 'بریتانیا'],
  ['AU', 'Australia', 'استرالیا', 'استرالیا'],
  ['FR', 'France', 'فرانسه', 'فرانسه'],
  ['NL', 'Netherlands', 'هلند', 'هالنډ'],
  ['SE', 'Sweden', 'سویدن', 'سویډن'],
  ['IT', 'Italy', 'ایتالیا', 'ایټالیا'],
  ['ES', 'Spain', 'اسپانیا', 'هسپانیه'],
  ['JP', 'Japan', 'جاپان', 'جاپان'],
  ['KR', 'South Korea', 'کوریای جنوبی', 'سویلي کوریا'],
  ['CN', 'China', 'چین', 'چین'],
  ['SA', 'Saudi Arabia', 'عربستان سعودی', 'سعودي عربستان'],
  ['MY', 'Malaysia', 'مالیزیا', 'مالیزیا'],
  ['ID', 'Indonesia', 'اندونیزیا', 'اندونیزیا'],
  ['SG', 'Singapore', 'سنگاپور', 'سنګاپور'],
  ['NZ', 'New Zealand', 'نیوزیلند', 'نیوزیلنډ'],
  ['CH', 'Switzerland', 'سوئیس', 'سویس'],
  ['AT', 'Austria', 'اتریش', 'اتریش'],
  ['BE', 'Belgium', 'بلجیم', 'بلجیم'],
  ['DK', 'Denmark', 'دنمارک', 'ډنمارک'],
  ['NO', 'Norway', 'ناروی', 'ناروې'],
  ['FI', 'Finland', 'فنلاند', 'فنلنډ'],
  ['IE', 'Ireland', 'ایرلند', 'ایرلنډ'],
  ['PT', 'Portugal', 'پرتگال', 'پرتګال'],
  ['PL', 'Poland', 'لهستان', 'پولنډ'],
  ['CZ', 'Czechia', 'جمهوری چک', 'چک'],
  ['HU', 'Hungary', 'هنگری', 'هنګري'],
  ['RO', 'Romania', 'رومانیا', 'رومانیا'],
  ['GR', 'Greece', 'یونان', 'یونان'],
  ['RU', 'Russia', 'روسیه', 'روسیه'],
  ['KZ', 'Kazakhstan', 'قزاقستان', 'قزاقستان'],
  ['UZ', 'Uzbekistan', 'ازبکستان', 'ازبکستان'],
  ['TJ', 'Tajikistan', 'تاجیکستان', 'تاجکستان'],
  ['KG', 'Kyrgyzstan', 'قرغیزستان', 'قرغزستان'],
  ['AZ', 'Azerbaijan', 'آذربایجان', 'اذربایجان'],
  ['GE', 'Georgia', 'گرجستان', 'ګرجستان'],
  ['EG', 'Egypt', 'مصر', 'مصر'],
  ['JO', 'Jordan', 'اردن', 'اردن'],
  ['LB', 'Lebanon', 'لبنان', 'لبنان'],
  ['IQ', 'Iraq', 'عراق', 'عراق'],
  ['BD', 'Bangladesh', 'بنگلادیش', 'بنګله‌دېش'],
  ['NP', 'Nepal', 'نیپال', 'نیپال'],
  ['LK', 'Sri Lanka', 'سریلانکا', 'سریلانکا'],
] as const;

const copy = {
  en: {
    title: 'Find opportunities that fit what you actually need',
    intro: 'ARIA HUB checks relevance and the eligibility facts we have. Unknown requirements stay unknown — no fake acceptance probabilities.',
    privacy: 'Your answers are used for this match. If AI is available, it may only explain already-selected results using supplied evidence.',
    step: 'Step',
    of: 'of',
    next: 'Next',
    back: 'Back',
    find: 'Find matches',
    edit: 'Edit preferences',
    startOver: 'Start over',
    browse: 'Browse all opportunities',
    retry: 'Try again',
    loading: 'Checking open opportunities…',
    loadingSub: 'Comparing your preferences with structured opportunity facts.',
    errorTitle: 'We could not complete the match',
    errorBody: 'Your preferences are still saved. Try again or browse all opportunities.',
    noTitle: 'No strong verified match right now',
    noBody: 'ARIA HUB did not find a result strong enough to recommend confidently. You can review near matches or broaden your preferences.',
    near: 'Possible near matches',
    resultsTitle: 'Your strongest matches',
    resultsSub: 'These are ranked by relevance, known eligibility facts, deadline practicality, and data quality.',
    saved: 'Saved',
    save: 'Save',
    view: 'View details',
    strong: 'Strong match',
    good: 'Good match',
    possible: 'Possible match',
    likely_eligible: 'Likely eligible from known requirements',
    needs_check: 'Some eligibility needs checking',
    potential_conflict: 'Potential eligibility conflict',
    incomplete: 'Eligibility information incomplete',
    confidence: 'Data confidence',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    why: 'Why this matched',
    verified: 'What ARIA HUB verified',
    check: 'What you should check',
    deadline: 'Deadline',
    days: 'days remaining',
    today: 'closes today',
    noDeadline: 'Deadline not structured',
    organization: 'Organization',
    ai: 'AI explanation',
    profileIntent: 'What are you looking for?',
    profileIntentSub: 'Choose the opportunity type you want to prioritize.',
    education: 'Your current education level',
    educationSub: 'This is stored as a canonical value, so English, Persian and Pashto are matched identically.',
    nationality: 'Nationality',
    residence: 'Current country of residence',
    profileSub: 'These are kept separate because international eligibility often treats them differently.',
    optional: 'Optional',
    destination: 'Preferred destination',
    destinationSub: 'Choose a country or Anywhere.',
    experience: 'Years of relevant experience',
    experienceSub: 'Used only when a listing has a structured minimum experience requirement.',
    scholarship: 'Scholarship',
    fellowship: 'Fellowship',
    internship: 'Internship',
    job: 'Job',
    training: 'Training',
    conference: 'Conference',
    competition: 'Competition',
    exchange: 'Exchange',
    volunteer: 'Volunteer',
    high_school: 'High school',
    bachelors: "Bachelor's",
    masters: "Master's",
    phd: 'PhD / Doctorate',
    other: 'Other',
    notSet: 'Prefer not to say',
    years0: '0 years',
    years1: '1 year',
    yearsN: 'years',
    broaden: 'Try Anywhere instead',
  },
  fa: {
    title: 'فرصت‌هایی را پیدا کنید که واقعاً با نیاز شما هماهنگ است',
    intro: 'ARIA HUB میزان ارتباط و اطلاعات واجد شرایط بودن موجود را بررسی می‌کند. موارد نامشخص، نامشخص می‌مانند و احتمال پذیرش جعلی نمایش داده نمی‌شود.',
    privacy: 'پاسخ‌های شما برای همین جستجو استفاده می‌شود. اگر هوش مصنوعی فعال باشد، فقط نتایج از قبل انتخاب‌شده را با استفاده از شواهد موجود توضیح می‌دهد.',
    step: 'مرحله',
    of: 'از',
    next: 'بعدی',
    back: 'قبلی',
    find: 'یافتن فرصت‌ها',
    edit: 'ویرایش ترجیحات',
    startOver: 'شروع دوباره',
    browse: 'مشاهده همه فرصت‌ها',
    retry: 'تلاش دوباره',
    loading: 'در حال بررسی فرصت‌های باز…',
    loadingSub: 'ترجیحات شما با اطلاعات ساختاریافته فرصت‌ها مقایسه می‌شود.',
    errorTitle: 'نتوانستیم تطبیق را کامل کنیم',
    errorBody: 'ترجیحات شما ذخیره شده است. دوباره تلاش کنید یا همه فرصت‌ها را ببینید.',
    noTitle: 'فعلاً تطبیق قوی و قابل‌اعتماد پیدا نشد',
    noBody: 'ARIA HUB نتیجه‌ای را پیدا نکرد که به اندازه کافی قوی باشد تا با اطمینان پیشنهاد شود. می‌توانید تطبیق‌های نزدیک را ببینید یا ترجیحات را گسترده‌تر کنید.',
    near: 'تطبیق‌های احتمالی نزدیک',
    resultsTitle: 'بهترین تطبیق‌های شما',
    resultsSub: 'رتبه‌بندی بر اساس ارتباط، شرایط شناخته‌شده، عملی بودن مهلت و کیفیت داده انجام شده است.',
    saved: 'ذخیره شد',
    save: 'ذخیره',
    view: 'مشاهده جزئیات',
    strong: 'تطبیق قوی',
    good: 'تطبیق خوب',
    possible: 'تطبیق احتمالی',
    likely_eligible: 'بر اساس شرایط شناخته‌شده احتمالاً واجد شرایط',
    needs_check: 'بخشی از شرایط باید بررسی شود',
    potential_conflict: 'احتمال ناسازگاری در شرایط',
    incomplete: 'اطلاعات واجد شرایط بودن ناقص است',
    confidence: 'اعتماد به داده',
    high: 'زیاد',
    medium: 'متوسط',
    low: 'کم',
    why: 'چرا پیشنهاد شد',
    verified: 'مواردی که ARIA HUB بررسی کرد',
    check: 'مواردی که شما باید بررسی کنید',
    deadline: 'مهلت',
    days: 'روز باقی مانده',
    today: 'امروز بسته می‌شود',
    noDeadline: 'مهلت ساختاریافته نیست',
    organization: 'سازمان',
    ai: 'توضیح هوش مصنوعی',
    profileIntent: 'دنبال چه نوع فرصتی هستید؟',
    profileIntentSub: 'نوع فرصتی را که می‌خواهید در اولویت باشد انتخاب کنید.',
    education: 'سطح تحصیلات فعلی شما',
    educationSub: 'این مقدار به‌صورت استاندارد ذخیره می‌شود تا فارسی، پشتو و انگلیسی یکسان تطبیق شوند.',
    nationality: 'تابعیت',
    residence: 'کشور محل اقامت فعلی',
    profileSub: 'این دو جدا هستند چون شرایط بین‌المللی اغلب تابعیت و اقامت را متفاوت بررسی می‌کند.',
    optional: 'اختیاری',
    destination: 'مقصد ترجیحی',
    destinationSub: 'یک کشور یا «هرجا» را انتخاب کنید.',
    experience: 'سال‌های تجربه مرتبط',
    experienceSub: 'فقط زمانی استفاده می‌شود که فرصت، حداقل تجربه مشخص داشته باشد.',
    scholarship: 'بورسیه تحصیلی',
    fellowship: 'فلوشیپ',
    internship: 'کارآموزی',
    job: 'وظیفه',
    training: 'آموزش',
    conference: 'کنفرانس',
    competition: 'رقابت',
    exchange: 'برنامه تبادله',
    volunteer: 'داوطلبی',
    high_school: 'مکتب / لیسه',
    bachelors: 'لیسانس',
    masters: 'فوق لیسانس',
    phd: 'دکترا',
    other: 'سایر',
    notSet: 'ترجیح می‌دهم نگویم',
    years0: '۰ سال',
    years1: '۱ سال',
    yearsN: 'سال',
    broaden: 'مقصد را «هرجا» کنید',
  },
  ps: {
    title: 'هغه فرصتونه ومومئ چې رښتیا ستاسو له اړتیا سره سمون لري',
    intro: 'ARIA HUB اړوندوالی او هغه د وړتیا معلومات ګوري چې موږ یې لرو. نامعلوم شرطونه نامعلوم پاتې کېږي او د منل کېدو جعلي احتمال نه ښودل کېږي.',
    privacy: 'ستاسو ځوابونه د همدې میچ لپاره کارول کېږي. که AI فعال وي، یوازې مخکې ټاکل شوې پایلې د ورکړل شوو شواهدو له مخې تشریح کوي.',
    step: 'پړاو',
    of: 'له',
    next: 'بل',
    back: 'شاته',
    find: 'میچونه ومومئ',
    edit: 'غوره توبونه سم کړئ',
    startOver: 'له سره پیل',
    browse: 'ټول فرصتونه وګورئ',
    retry: 'بیا هڅه',
    loading: 'خلاص فرصتونه کتل کېږي…',
    loadingSub: 'ستاسو غوره توبونه د فرصتونو له جوړښتي معلوماتو سره پرتله کېږي.',
    errorTitle: 'میچ بشپړ نه شو',
    errorBody: 'ستاسو غوره توبونه خوندي دي. بیا هڅه وکړئ یا ټول فرصتونه وګورئ.',
    noTitle: 'اوس مهال قوي او تایید شوی میچ نشته',
    noBody: 'ARIA HUB داسې پایله ونه موندله چې په کافي باور وړاندیز شي. نږدې میچونه وګورئ یا غوره توبونه پراخ کړئ.',
    near: 'ممکن نږدې میچونه',
    resultsTitle: 'ستاسو قوي میچونه',
    resultsSub: 'رتبه بندي د اړوندتیا، معلومو شرایطو، وروستۍ نېټې او د معلوماتو کیفیت پر بنسټ ده.',
    saved: 'خوندي شو',
    save: 'خوندي کړئ',
    view: 'جزییات وګورئ',
    strong: 'قوي میچ',
    good: 'ښه میچ',
    possible: 'ممکن میچ',
    likely_eligible: 'د معلومو شرایطو له مخې احتمالاً وړ',
    needs_check: 'ځینې شرایط باید وکتل شي',
    potential_conflict: 'ممکن د وړتیا ټکر',
    incomplete: 'د وړتیا معلومات نیمګړي دي',
    confidence: 'د معلوماتو باور',
    high: 'لوړ',
    medium: 'منځنی',
    low: 'ټیټ',
    why: 'ولې دا میچ شو',
    verified: 'ARIA HUB څه تایید کړل',
    check: 'تاسو څه باید وګورئ',
    deadline: 'وروستۍ نېټه',
    days: 'ورځې پاتې',
    today: 'نن تړل کېږي',
    noDeadline: 'وروستۍ نېټه جوړښتي نه ده',
    organization: 'اداره',
    ai: 'د AI تشریح',
    profileIntent: 'د کوم فرصت په لټه کې یاست؟',
    profileIntentSub: 'هغه ډول وټاکئ چې غواړئ لومړیتوب ولري.',
    education: 'ستاسو د زده کړو اوسنۍ کچه',
    educationSub: 'دا په معیاري ارزښت ساتل کېږي، نو انګلیسي، فارسي او پښتو یو ډول میچ کېږي.',
    nationality: 'تابعیت',
    residence: 'د اوسني استوګنې هېواد',
    profileSub: 'دا جلا ساتل کېږي ځکه نړیوال شرایط تابعیت او استوګنه بېل ارزوي.',
    optional: 'اختیاري',
    destination: 'غوره منزل',
    destinationSub: 'یو هېواد یا هر ځای وټاکئ.',
    experience: 'د اړوندې تجربې کلونه',
    experienceSub: 'یوازې هغه وخت کارول کېږي چې فرصت لږ تر لږه تجربه روښانه کړې وي.',
    scholarship: 'بورس',
    fellowship: 'فلوشیپ',
    internship: 'انټرنشیپ',
    job: 'دنده',
    training: 'روزنه',
    conference: 'کنفرانس',
    competition: 'سیالي',
    exchange: 'تبادله',
    volunteer: 'رضاکاري',
    high_school: 'لېسه',
    bachelors: 'لیسانس',
    masters: 'ماسټري',
    phd: 'دوکتورا',
    other: 'نور',
    notSet: 'نه غواړم ووایم',
    years0: '۰ کاله',
    years1: '۱ کال',
    yearsN: 'کاله',
    broaden: 'منزل هر ځای کړئ',
  },
} as const;

const INTENTS: { value: MatcherIntent; icon: React.ReactNode }[] = [
  { value: 'scholarship', icon: <GraduationCap className="h-6 w-6" /> },
  { value: 'fellowship', icon: <Sparkles className="h-6 w-6" /> },
  { value: 'internship', icon: <Briefcase className="h-6 w-6" /> },
  { value: 'job', icon: <Briefcase className="h-6 w-6" /> },
  { value: 'training', icon: <GraduationCap className="h-6 w-6" /> },
  { value: 'conference', icon: <Globe className="h-6 w-6" /> },
  { value: 'competition', icon: <Sparkles className="h-6 w-6" /> },
  { value: 'exchange', icon: <Globe className="h-6 w-6" /> },
  { value: 'volunteer', icon: <CheckCircle2 className="h-6 w-6" /> },
];

const EDU: EducationLevel[] = ['high_school', 'bachelors', 'masters', 'phd', 'other'];

export function OpportunityMatcherClient() {
  const hrefFn = useLangHref();
  const lang = useLangStore((s) => s.code) as Lang;
  const c = copy[lang] ?? copy.en;
  const rtl = lang !== 'en';
  const reduceMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [step, setStep] = useState(1);
  const [view, setView] = useState<ViewState>('form');
  const [profile, setProfile] = useState<Profile>({
    intent: '',
    education: '',
    nationality: '',
    residence: '',
    targetCountry: 'ANY',
    experienceYears: null,
  });
  const [results, setResults] = useState<MatchResult[]>([]);
  const [nearMatches, setNearMatches] = useState<MatchResult[]>([]);
  const [disclosure, setDisclosure] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setProfile((prev) => ({ ...prev, ...JSON.parse(raw) }));
      setSaved(new Set(getSavedSlugs()));
    } catch {
      // Invalid browser storage should never break the matcher.
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Session persistence is best-effort.
    }
  }, [profile]);

  useEffect(() => {
    if (view === 'form') headingRef.current?.focus();
  }, [step, view]);

  const totalSteps = 5;
  const directionX = rtl ? 16 : -16;
  const variants = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        hidden: { opacity: 0, x: directionX, y: 8 },
        visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.28 } },
        exit: { opacity: 0, x: -directionX, transition: { duration: 0.18 } },
      };

  const countryLabel = (code: string) => {
    const row = COUNTRIES.find((country) => country[0] === code);
    if (!row) return code;
    return lang === 'fa' ? row[2] : lang === 'ps' ? row[3] : row[1];
  };

  const valid = useMemo(() => {
    if (step === 1) return Boolean(profile.intent);
    if (step === 2) return Boolean(profile.education);
    if (step === 3) return true;
    if (step === 4) return Boolean(profile.targetCountry);
    if (step === 5) return true;
    return false;
  }, [profile, step]);

  async function submit() {
    if (!profile.intent || !profile.education || !profile.targetCountry) return;
    setView('loading');
    setResults([]);
    setNearMatches([]);
    setDisclosure(null);

    try {
      const response = await fetch('/api/opportunities/matcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: profile.intent,
          education: profile.education,
          nationality: profile.nationality || null,
          residence: profile.residence || null,
          targetCountry: profile.targetCountry,
          experienceYears: profile.experienceYears,
          lang,
        }),
      });

      if (!response.ok) throw new Error(`matcher:${response.status}`);
      const data = (await response.json()) as MatcherResponse;
      setResults(Array.isArray(data.results) ? data.results : []);
      setNearMatches(Array.isArray(data.nearMatches) ? data.nearMatches : []);
      setDisclosure(data.disclosure || null);
      setView(data.status === 'ok' && data.results.length ? 'results' : 'no_match');
    } catch (error) {
      console.error('[matcher]', error);
      setView('error');
    }
  }

  function toggleSave(slug: string) {
    setSaved(new Set(toggleSavedSlug(slug)));
  }

  function restart() {
    setProfile({
      intent: '',
      education: '',
      nationality: '',
      residence: '',
      targetCountry: 'ANY',
      experienceYears: null,
    });
    setStep(1);
    setResults([]);
    setNearMatches([]);
    setDisclosure(null);
    setView('form');
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  function broadenToAnywhere() {
    setProfile((p) => ({ ...p, targetCountry: 'ANY' }));
    setStep(4);
    setView('form');
  }

  const stepHeader = (title: string, subtitle: string) => (
    <div className="mb-8 text-start">
      <div className="mb-4 inline-flex rounded-full bg-amber-100 px-4 py-1 text-sm font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
        {c.step} {step} {c.of} {totalSteps}
      </div>
      <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-slate-900 outline-none dark:text-white sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">{subtitle}</p>
    </div>
  );

  const footer = () => (
    <div className="mt-8 flex items-center justify-between border-t border-slate-200/60 pt-6 dark:border-slate-700/60">
      {step > 1 ? (
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))}>
          {rtl ? <ChevronRight className="me-2 h-4 w-4" /> : <ChevronLeft className="me-2 h-4 w-4" />}
          {c.back}
        </Button>
      ) : <span />}
      <Button
        disabled={!valid}
        onClick={() => (step < totalSteps ? setStep((s) => s + 1) : submit())}
        className="rounded-full bg-amber-600 px-7 text-white hover:bg-amber-700"
      >
        {step === totalSteps ? c.find : c.next}
        {rtl ? <ChevronLeft className="ms-2 h-4 w-4" /> : <ChevronRight className="ms-2 h-4 w-4" />}
      </Button>
    </div>
  );

  return (
    <section dir={rtl ? 'rtl' : 'ltr'} className="relative z-10 mx-auto w-full max-w-4xl px-3 py-6 sm:px-4">
      <div className="mb-6 rounded-3xl border border-amber-200/70 bg-amber-50/70 p-5 text-start dark:border-amber-900/50 dark:bg-amber-950/20">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{c.title}</h1>
        <p className="mt-2 text-slate-700 dark:text-slate-300">{c.intro}</p>
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" /> {c.privacy}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {view === 'form' && (
          <motion.div key={`form-${step}`} variants={variants} initial="hidden" animate="visible" exit="exit">
            <GlassCard>
              {step === 1 && (
                <>
                  {stepHeader(c.profileIntent, c.profileIntentSub)}
                  <RadioGroup
                    value={profile.intent}
                    onValueChange={(value) => setProfile((p) => ({ ...p, intent: value as MatcherIntent }))}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                    aria-label={c.profileIntent}
                  >
                    {INTENTS.map((item) => (
                      <Label
                        key={item.value}
                        htmlFor={`intent-${item.value}`}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${profile.intent === item.value ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-200 bg-white/50 hover:border-amber-300 dark:border-slate-700 dark:bg-slate-900/40'}`}
                      >
                        <RadioGroupItem id={`intent-${item.value}`} value={item.value} />
                        <span className="text-amber-600">{item.icon}</span>
                        <span className="font-semibold">{c[item.value]}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                  {footer()}
                </>
              )}

              {step === 2 && (
                <>
                  {stepHeader(c.education, c.educationSub)}
                  <RadioGroup
                    value={profile.education}
                    onValueChange={(value) => setProfile((p) => ({ ...p, education: value as EducationLevel }))}
                    className="space-y-3"
                    aria-label={c.education}
                  >
                    {EDU.map((level) => (
                      <Label
                        key={level}
                        htmlFor={`edu-${level}`}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${profile.education === level ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-slate-200 bg-white/50 dark:border-slate-700 dark:bg-slate-900/40'}`}
                      >
                        <RadioGroupItem id={`edu-${level}`} value={level} />
                        <span className="font-semibold">{c[level]}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                  {footer()}
                </>
              )}

              {step === 3 && (
                <>
                  {stepHeader(`${c.nationality} / ${c.residence}`, c.profileSub)}
                  <div className="grid gap-5 sm:grid-cols-2">
                    <CountrySelect
                      label={c.nationality}
                      value={profile.nationality || '__unset'}
                      onChange={(value) => setProfile((p) => ({ ...p, nationality: value === '__unset' ? '' : value }))}
                      countryLabel={countryLabel}
                      optional={c.optional}
                      includeAnywhere={false}
                      unsetLabel={c.notSet}
                    />
                    <CountrySelect
                      label={c.residence}
                      value={profile.residence || '__unset'}
                      onChange={(value) => setProfile((p) => ({ ...p, residence: value === '__unset' ? '' : value }))}
                      countryLabel={countryLabel}
                      optional={c.optional}
                      includeAnywhere={false}
                      unsetLabel={c.notSet}
                    />
                  </div>
                  {footer()}
                </>
              )}

              {step === 4 && (
                <>
                  {stepHeader(c.destination, c.destinationSub)}
                  <CountrySelect
                    label={c.destination}
                    value={profile.targetCountry}
                    onChange={(value) => setProfile((p) => ({ ...p, targetCountry: value }))}
                    countryLabel={countryLabel}
                    includeAnywhere
                  />
                  {footer()}
                </>
              )}

              {step === 5 && (
                <>
                  {stepHeader(c.experience, c.experienceSub)}
                  <Select
                    value={profile.experienceYears === null ? '__unset' : String(profile.experienceYears)}
                    onValueChange={(value) => setProfile((p) => ({ ...p, experienceYears: value === '__unset' ? null : Number(value) }))}
                  >
                    <SelectTrigger className="h-12 bg-white/70 dark:bg-slate-900/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unset">{c.notSet}</SelectItem>
                      {Array.from({ length: 21 }, (_, years) => (
                        <SelectItem key={years} value={String(years)}>
                          {years === 0 ? c.years0 : years === 1 ? c.years1 : `${years} ${c.yearsN}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {footer()}
                </>
              )}
            </GlassCard>
          </motion.div>
        )}

        {view === 'loading' && (
          <motion.div key="loading" variants={variants} initial="hidden" animate="visible" exit="exit">
            <GlassCard className="py-16 text-center" role="status" aria-live="polite">
              <Search className={`mx-auto mb-5 h-10 w-10 text-amber-600 ${reduceMotion ? '' : 'animate-pulse'}`} />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{c.loading}</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{c.loadingSub}</p>
            </GlassCard>
          </motion.div>
        )}

        {view === 'error' && (
          <motion.div key="error" variants={variants} initial="hidden" animate="visible" exit="exit">
            <GlassCard className="text-center" role="alert">
              <AlertTriangle className="mx-auto mb-4 h-9 w-9 text-amber-600" />
              <h2 className="text-2xl font-bold">{c.errorTitle}</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{c.errorBody}</p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button onClick={submit}>{c.retry}</Button>
                <Button variant="outline" onClick={() => setView('form')}>{c.edit}</Button>
                <Button variant="ghost" asChild><Link href={hrefFn('/opportunities')}>{c.browse}</Link></Button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {view === 'no_match' && (
          <motion.div key="no-match" variants={variants} initial="hidden" animate="visible" exit="exit">
            <GlassCard role="status" aria-live="polite">
              <div className="text-center">
                <CircleHelp className="mx-auto mb-4 h-9 w-9 text-amber-600" />
                <h2 className="text-2xl font-bold">{c.noTitle}</h2>
                <p className="mx-auto mt-2 max-w-2xl text-slate-600 dark:text-slate-300">{c.noBody}</p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  {profile.targetCountry !== 'ANY' && <Button onClick={broadenToAnywhere}>{c.broaden}</Button>}
                  <Button variant="outline" onClick={() => { setStep(1); setView('form'); }}>{c.edit}</Button>
                  <Button variant="ghost" asChild><Link href={hrefFn('/opportunities')}>{c.browse}</Link></Button>
                </div>
              </div>
              {nearMatches.length > 0 && (
                <div className="mt-10 border-t border-slate-200 pt-8 dark:border-slate-700">
                  <h3 className="mb-4 text-lg font-bold">{c.near}</h3>
                  <div className="space-y-4">
                    {nearMatches.map((result) => (
                      <ResultCard key={result.id} result={result} c={c} hrefFn={hrefFn} saved={saved.has(result.slug)} onSave={() => toggleSave(result.slug)} />
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {view === 'results' && (
          <motion.div key="results" variants={variants} initial="hidden" animate="visible" exit="exit" aria-live="polite">
            <div className="mb-6 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{c.resultsTitle}</h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{c.resultsSub}</p>
            </div>
            {disclosure && (
              <div className="mb-5 rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                <span className="font-semibold">{c.ai}: </span>{disclosure}
              </div>
            )}
            <div className="space-y-5">
              {results.map((result) => (
                <ResultCard key={result.id} result={result} c={c} hrefFn={hrefFn} saved={saved.has(result.slug)} onSave={() => toggleSave(result.slug)} />
              ))}
            </div>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => { setStep(1); setView('form'); }}>{c.edit}</Button>
              <Button variant="ghost" onClick={restart}>{c.startOver}</Button>
              <Button variant="ghost" asChild><Link href={hrefFn('/opportunities')}>{c.browse}</Link></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CountrySelect({
  label,
  value,
  onChange,
  countryLabel,
  includeAnywhere,
  optional,
  unsetLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  countryLabel: (value: string) => string;
  includeAnywhere: boolean;
  optional?: string;
  unsetLabel?: string;
}) {
  const rows = includeAnywhere ? COUNTRIES : COUNTRIES.filter((country) => country[0] !== 'ANY');
  return (
    <div>
      <Label className="mb-2 block font-semibold">{label} {optional && <span className="font-normal text-slate-400">({optional})</span>}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-12 bg-white/70 dark:bg-slate-900/60"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-80">
          {unsetLabel && <SelectItem value="__unset">{unsetLabel}</SelectItem>}
          {rows.map((country) => <SelectItem key={country[0]} value={country[0]}>{countryLabel(country[0])}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function ResultCard({
  result,
  c,
  hrefFn,
  saved,
  onSave,
}: {
  result: MatchResult;
  c: typeof copy.en | typeof copy.fa | typeof copy.ps;
  hrefFn: (path: string) => string;
  saved: boolean;
  onSave: () => void;
}) {
  const deadline = result.daysRemaining === null
    ? c.noDeadline
    : result.daysRemaining === 0
      ? c.today
      : `${result.daysRemaining} ${c.days}`;

  const strengthClass = result.strength === 'strong'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
    : result.strength === 'good'
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

  const eligibilityClass = result.eligibilityStatus === 'potential_conflict'
    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
    : result.eligibilityStatus === 'likely_eligible'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
      : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300';

  return (
    <Card className="overflow-hidden border-white/30 bg-white/75 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${strengthClass}`}>{c[result.strength]}</span>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${eligibilityClass}`}>{c[result.eligibilityStatus]}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {c.confidence}: {c[result.dataConfidence]}
          </span>
        </div>

        <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{result.title}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
          <span>{result.type}</span>
          <span className="flex items-center gap-1"><Globe className="h-4 w-4" />{result.location}</span>
          {result.organization && <span>{c.organization}: {result.organization}</span>}
          <span>{c.deadline}: {deadline}</span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <EvidenceBlock title={c.why} items={result.reasons} icon={<Sparkles className="h-4 w-4 text-amber-600" />} />
          <EvidenceBlock title={c.verified} items={result.verified} icon={<Check className="h-4 w-4 text-emerald-600" />} empty />
          <EvidenceBlock title={c.check} items={result.check} icon={<CircleHelp className="h-4 w-4 text-amber-600" />} empty />
        </div>

        {result.rationale && (
          <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            {result.rationale}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="bg-amber-600 text-white hover:bg-amber-700">
            <Link href={hrefFn(`/opportunities/${result.slug}`)}>
              {c.view} <ExternalLink className="ms-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" onClick={onSave} aria-pressed={saved}>
            <Bookmark className={`me-2 h-4 w-4 ${saved ? 'fill-current' : ''}`} />
            {saved ? c.saved : c.save}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function EvidenceBlock({
  title,
  items,
  icon,
  empty,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  empty?: boolean;
}) {
  if (!items.length && empty) return null;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{icon}{title}</div>
      <ul className="space-y-2 text-sm leading-5 text-slate-600 dark:text-slate-300">
        {items.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
      </ul>
    </div>
  );
}

function GlassCard({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-3xl border border-white/40 bg-white/45 p-5 shadow-[0_8px_32px_rgba(31,38,135,0.08)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/50 sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}
