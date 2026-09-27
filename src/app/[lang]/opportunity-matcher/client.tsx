'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
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
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SaveButton } from '@/components/site/save-button';
import { useLangHref } from '@/hooks/use-lang-href';
import { useLangStore } from '@/lib/lang-store';
import type { EducationLevel, FieldArea, MatcherIntent } from '@/lib/opportunity-matcher';

type Lang = 'en' | 'fa' | 'ps';
type ResultState = 'idle' | 'loading' | 'results' | 'no_match' | 'error' | 'rate_limited';

interface Profile {
  intents: MatcherIntent[];
  education: EducationLevel;
  targetEducation?: EducationLevel;
  nationality: string;
  residence: string;
  destinations: string[];
  fieldArea: FieldArea;
  experienceYears?: number;
}

interface MatchResult {
  id: string;
  slug: string;
  title: string;
  type: string;
  location: string;
  organization: string | null;
  deadline: string | null;
  sourceName: string | null;
  lastChecked: string | null;
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
  fieldArea: 'any',
};

const COPY = {
  en: {
    title: 'Find opportunities that actually fit',
    intro: 'ARIA HUB checks your preferences against the opportunity facts we have. Unknown requirements stay unknown — we do not estimate acceptance chances.',
    step: 'Step', of: 'of', next: 'Next', back: 'Back',
    intentTitle: 'What are you looking for?', intentSub: 'Choose up to 3 opportunity types. You can combine related goals.',
    educationTitle: 'What is your current education level?', educationSub: 'This is stored as a language-neutral value so every language receives the same matching logic.',
    profileTitle: 'Tell us where you are applying from', profileSub: 'Nationality and residence are different and can affect international eligibility.',
    destinationTitle: 'Where would you like to go?', destinationSub: 'Choose Anywhere if destination is flexible. Add a field or role to improve relevance.',
    nationality: 'Nationality', residence: 'Current country of residence', destination: 'Preferred destinations', field: 'Field or discipline', searchCountry: 'Search countries…', noCountry: 'No country found',
    fieldPlaceholder: 'Any field',
    experience: 'Years of relevant experience', experienceUnknown: 'Not sure / prefer not to say', targetEducation: 'Target degree or study level',
    anywhere: 'Anywhere', tryAnywhere: 'Try any destination', find: 'Find matches', edit: 'Edit preferences', startOver: 'Start over',
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
    deadline: 'Deadline', noDeadline: 'No deadline listed', source: 'Source', checked: 'Last checked',
    categoryAlert: 'Notify me about strong matches', alertHint: 'Save these Matcher preferences by email. After confirmation, ARIA HUB will notify you only when a new strong match appears.',
    alertEmail: 'Email address', alertDaily: 'Daily', alertWeekly: 'Weekly', alertButton: 'Save match alert', alertSending: 'Saving…', alertSuccess: 'Check your inbox to confirm this match alert.', alertError: 'Could not save the alert. Please try again.',
    viewDetails: 'View details',
    privacy: 'Matcher answers stay in this browser session unless you opt into email alerts. For optional AI explanations, ARIA HUB sends only opportunity evidence plus intent, education/target level, destinations and field area — not nationality or residence.',
  },
  fa: {
    title: 'فرصت‌هایی را پیدا کنید که واقعاً با شما سازگارند',
    intro: 'آریا هاب ترجیحات شما را با اطلاعات موجود فرصت‌ها مقایسه می‌کند. موارد نامعلوم را نامعلوم نگه می‌داریم و شانس قبولی را حدس نمی‌زنیم.',
    step: 'مرحله', of: 'از', next: 'بعدی', back: 'قبلی',
    intentTitle: 'دنبال چه نوع فرصتی هستید؟', intentSub: 'حداکثر ۳ نوع فرصت را انتخاب کنید. می‌توانید هدف‌های مرتبط را با هم انتخاب کنید.',
    educationTitle: 'سطح فعلی تحصیل شما چیست؟', educationSub: 'این مقدار به‌صورت ثابت و مستقل از زبان ذخیره می‌شود تا منطق تطبیق در همه زبان‌ها یکسان باشد.',
    profileTitle: 'از کجا درخواست می‌دهید؟', profileSub: 'تابعیت و محل اقامت متفاوت‌اند و ممکن است بر شرایط بین‌المللی اثر بگذارند.',
    destinationTitle: 'ترجیح می‌دهید به کجا بروید؟', destinationSub: 'اگر مقصد برایتان مهم نیست «هرجا» را انتخاب کنید. رشته یا نقش را هم می‌توانید اضافه کنید.',
    nationality: 'تابعیت', residence: 'کشور محل اقامت فعلی', destination: 'مقصدهای ترجیحی', field: 'رشته یا حوزه', searchCountry: 'جستجوی کشور…', noCountry: 'کشوری پیدا نشد',
    fieldPlaceholder: 'هر رشته',
    experience: 'سال‌های تجربه مرتبط', experienceUnknown: 'مطمئن نیستم / ترجیح می‌دهم نگویم', targetEducation: 'مقطع یا سطح تحصیلی مورد نظر',
    anywhere: 'هرجا', tryAnywhere: 'جستجو در همه مقصدها', find: 'یافتن فرصت‌ها', edit: 'ویرایش ترجیحات', startOver: 'شروع دوباره',
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
    deadline: 'آخرین مهلت', noDeadline: 'مهلت ثبت نشده', source: 'منبع', checked: 'آخرین بررسی',
    categoryAlert: 'اطلاع‌رسانی تطبیق‌های قوی', alertHint: 'این ترجیحات Matcher را با ایمیل ذخیره کنید. پس از تأیید، آریا هاب فقط وقتی یک تطبیق قوی جدید پیدا شود به شما اطلاع می‌دهد.',
    alertEmail: 'آدرس ایمیل', alertDaily: 'روزانه', alertWeekly: 'هفتگی', alertButton: 'ذخیره اطلاع‌رسانی تطبیق', alertSending: 'در حال ذخیره…', alertSuccess: 'برای تأیید اطلاع‌رسانی، ایمیل خود را بررسی کنید.', alertError: 'ذخیره اطلاع‌رسانی ممکن نشد. دوباره تلاش کنید.',
    viewDetails: 'مشاهده جزئیات',
    privacy: 'پاسخ‌های Matcher در همین نشست مرورگر می‌ماند مگر این‌که اطلاع‌رسانی ایمیلی را فعال کنید. برای توضیح اختیاری AI فقط شواهد فرصت و ترجیحات غیرحساس مانند نوع فرصت، تحصیل/مقطع هدف، مقصد و حوزه فرستاده می‌شود؛ تابعیت و محل اقامت به AI فرستاده نمی‌شود.',
  },
  ps: {
    title: 'هغه فرصتونه ومومئ چې رښتیا درسره برابر وي',
    intro: 'آریا هاب ستاسو غوره توبونه له هغو معلوماتو سره پرتله کوي چې د فرصتونو په اړه یې لرو. ناپېژندل شوي شرطونه ناپېژندل شوي پاتې کېږي او د منل کېدو چانس نه اټکلوو.',
    step: 'ګام', of: 'له', next: 'بل', back: 'شاته',
    intentTitle: 'د څه ډول فرصت په لټه کې یاست؟', intentSub: 'تر ۳ پورې د فرصت ډولونه وټاکئ. اړوند هدفونه یوځای ټاکلای شئ.',
    educationTitle: 'ستاسو اوسنی تعلیمي کچه څه ده؟', educationSub: 'دا ارزښت له ژبې خپلواک ساتل کېږي څو د ټولو ژبو د برابرولو منطق یو شان وي.',
    profileTitle: 'له کوم ځایه غوښتنلیک ورکوئ؟', profileSub: 'تابعیت او اوسېدنه جلا معلومات دي او د نړیوالو شرایطو اغېزمنولای شي.',
    destinationTitle: 'کوم ځای ته تلل غواړئ؟', destinationSub: 'که ځای مهم نه وي، هرځای وټاکئ. د لا ښه تړاو لپاره رشته یا رول هم ولیکئ.',
    nationality: 'تابعیت', residence: 'اوسنی د اوسېدو هېواد', destination: 'غوره ځایونه', field: 'رشته یا حوزه', searchCountry: 'هېواد ولټوئ…', noCountry: 'هېواد ونه موندل شو',
    fieldPlaceholder: 'هره رشته',
    experience: 'د اړوندې تجربې کلونه', experienceUnknown: 'ډاډه نه یم / نه وایم', targetEducation: 'هدف تعلیمي درجه یا کچه',
    anywhere: 'هرځای', tryAnywhere: 'هر ځای کې ولټوئ', find: 'فرصتونه ومومئ', edit: 'غوره توبونه سمول', startOver: 'له سره پیل',
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
    deadline: 'وروستۍ نېټه', noDeadline: 'نېټه نه ده ثبت شوې', source: 'سرچینه', checked: 'وروستی کتل',
    categoryAlert: 'د قوي برابرښت خبرتیا راکړئ', alertHint: 'دا Matcher غوره توبونه د ایمیل له لارې خوندي کړئ. له تایید وروسته آریا هاب یوازې د نوي قوي برابرښت پر مهال خبر درکوي.',
    alertEmail: 'بریښنالیک', alertDaily: 'ورځنی', alertWeekly: 'اونیز', alertButton: 'د برابرښت خبرتیا خوندي کړئ', alertSending: 'خوندي کېږي…', alertSuccess: 'د خبرتیا د تایید لپاره خپل ایمیل وګورئ.', alertError: 'خبرتیا ونه خوندي شوه. بیا هڅه وکړئ.',
    viewDetails: 'تفصیل وګورئ',
    privacy: 'د Matcher ځوابونه د براوزر په همدې ناسته کې پاتې کېږي، تر هغه چې د ایمیل خبرتیاوې فعالې نه کړئ. د اختیاري AI تشریح لپاره یوازې د فرصت شواهد او غیرحساس غوره توبونه لکه ډول، زده کړه/هدف کچه، ځایونه او حوزه لېږل کېږي؛ تابعیت او اوسېدنه AI ته نه لېږل کېږي.',
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

const FIELD_LABELS: Record<Lang, Record<FieldArea, string>> = {
  en: {
    any: 'Any field',
    technology: 'Technology & Computer Science',
    engineering: 'Engineering',
    business: 'Business, Economics & Finance',
    health: 'Health & Medicine',
    education: 'Education',
    social_sciences: 'Social Sciences',
    law_policy: 'Law, Policy & Governance',
    natural_sciences: 'Natural Sciences & Mathematics',
    environment_agriculture: 'Environment & Agriculture',
    arts_humanities: 'Arts, Media & Humanities',
  },
  fa: {
    any: 'هر رشته',
    technology: 'فناوری و علوم کامپیوتر',
    engineering: 'مهندسی',
    business: 'تجارت، اقتصاد و مالی',
    health: 'صحت و پزشکی',
    education: 'آموزش',
    social_sciences: 'علوم اجتماعی',
    law_policy: 'حقوق، پالیسی و حکومت‌داری',
    natural_sciences: 'علوم طبیعی و ریاضی',
    environment_agriculture: 'محیط زیست و زراعت',
    arts_humanities: 'هنر، رسانه و علوم انسانی',
  },
  ps: {
    any: 'هره رشته',
    technology: 'ټکنالوژي او کمپیوټر ساینس',
    engineering: 'انجینري',
    business: 'سوداګري، اقتصاد او مالي چارې',
    health: 'روغتیا او طب',
    education: 'زده کړه',
    social_sciences: 'ټولنیز علوم',
    law_policy: 'حقوق، پالیسي او حکومتولي',
    natural_sciences: 'طبیعي علوم او ریاضي',
    environment_agriculture: 'چاپېریال او کرنه',
    arts_humanities: 'هنر، رسنۍ او بشري علوم',
  },
};

const COUNTRY_CODES = (
  'AF AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'
).split(' ');

function getCountryOptions(lang: Lang) {
  const locale = lang === 'fa' ? 'fa-AF' : lang === 'ps' ? 'ps-AF' : 'en';
  const englishNames = new Intl.DisplayNames(['en'], { type: 'region' });
  const localizedNames = new Intl.DisplayNames([locale, 'en'], { type: 'region' });

  return COUNTRY_CODES.map((code) => ({
    value: englishNames.of(code) || code,
    label: localizedNames.of(code) || englishNames.of(code) || code,
  })).sort((a, b) => a.label.localeCompare(b.label, locale));
}

const REASON_COPY: Record<Lang, Record<string, string>> = {
  en: { opportunity_type: 'Opportunity type matches', destination: 'Destination matches', target_level: 'Target study level matches', education: 'Current education appears compatible', field: 'Field/role appears relevant', deadline_practicality: 'There is still practical time before the deadline', open_deadline: 'Deadline is currently open', nationality: 'Nationality appears explicitly supported', experience: 'Experience requirement appears satisfied' },
  fa: { opportunity_type: 'نوع فرصت با انتخاب شما تطبیق دارد', destination: 'مقصد تطبیق دارد', target_level: 'مقطع تحصیلی مورد نظر تطبیق دارد', education: 'تحصیلات فعلی سازگار به نظر می‌رسد', field: 'رشته یا نقش مرتبط است', deadline_practicality: 'برای مهلت درخواست هنوز زمان عملی وجود دارد', open_deadline: 'مهلت فعلاً باز است', nationality: 'تابعیت به‌صورت صریح پشتیبانی می‌شود', experience: 'شرط تجربه برآورده به نظر می‌رسد' },
  ps: { opportunity_type: 'د فرصت ډول ستاسو له انتخاب سره برابر دی', destination: 'ځای برابر دی', target_level: 'هدف تعلیمي کچه برابره ده', education: 'اوسنۍ زده کړه مناسبه ښکاري', field: 'رشته یا رول اړوند دی', deadline_practicality: 'تر وروستۍ نېټې عملي وخت شته', open_deadline: 'وروستۍ نېټه لا خلاصه ده', nationality: 'تابعیت په څرګند ډول ملاتړ کېږي', experience: 'د تجربې شرط پوره ښکاري' },
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
  const countryOptions = useMemo(() => getCountryOptions(lang), [lang]);

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

  const submit = async (overrideProfile?: Profile) => {
    const activeProfile = overrideProfile ?? profile;
    setState('loading');
    setResults([]);
    track('matcher_submitted', { intent: activeProfile.intents[0] });
    try {
      const res = await fetch('/api/opportunities/matcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activeProfile, lang }),
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
                onFeedback={(kind) => {
                  track(kind === 'helpful' ? 'matcher_helpful' : 'matcher_not_relevant', { opportunity: result.slug });
                  void fetch('/api/opportunities/matcher/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      opportunityId: result.id,
                      signal: kind,
                      intent: profile.intents[0],
                      lang,
                    }),
                  });
                }}
              />
            </motion.div>
          ))}
        </div>

        <GlassCard className="mt-6">
          <MatcherAlertSignup profile={profile} lang={lang} copy={c} />
          <p className="mt-5 text-center text-xs text-muted-foreground">{c.privacy}</p>
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
            {isNoMatch && !profile.destinations.includes('anywhere') && (
              <Button
                variant="secondary"
                onClick={() => {
                  const relaxed = { ...profile, destinations: ['anywhere'] };
                  setProfile(relaxed);
                  void submit(relaxed);
                }}
              >
                {c.tryAnywhere}
              </Button>
            )}
            <Button asChild><Link href={hrefFn('/opportunities')}>{c.browse}</Link></Button>
          </div>
          {isNoMatch && (
            <div className="mt-7 border-t pt-6 text-start">
              <MatcherAlertSignup profile={profile} lang={lang} copy={c} />
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label={c.intentTitle}>
                {(Object.keys(INTENT_LABELS[lang]) as MatcherIntent[]).map((intent) => {
                  const selected = profile.intents.includes(intent);
                  return (
                    <button
                      key={intent}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setProfile((p) => {
                        if (selected) return { ...p, intents: p.intents.filter((item) => item !== intent) };
                        if (p.intents.length >= 3) return p;
                        return { ...p, intents: [...p.intents, intent] };
                      })}
                      className={`flex min-h-20 items-center gap-3 rounded-2xl border p-4 text-start transition-colors ${selected ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'bg-background/60 hover:bg-accent'}`}
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${selected ? 'border-amber-600 bg-amber-600 text-white' : 'border-muted-foreground/40'}`}>
                        {selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      </span>
                      <span className="font-semibold">{INTENT_LABELS[lang][intent]}</span>
                    </button>
                  );
                })}
              </div>
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
                <CountrySelect label={c.nationality} value={profile.nationality} options={countryOptions} searchLabel={c.searchCountry} emptyLabel={c.noCountry} onChange={(value) => setProfile((p) => ({ ...p, nationality: value }))} />
                <CountrySelect label={c.residence} value={profile.residence} options={countryOptions} searchLabel={c.searchCountry} emptyLabel={c.noCountry} onChange={(value) => setProfile((p) => ({ ...p, residence: value }))} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <Label className="mb-2 block">{c.destination}</Label>
                  <CountryMultiSelect
                    values={profile.destinations}
                    options={countryOptions}
                    anywhereLabel={c.anywhere}
                    searchLabel={c.searchCountry}
                    emptyLabel={c.noCountry}
                    ariaLabel={c.destination}
                    onChange={(values) => setProfile((p) => ({ ...p, destinations: values }))}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">{c.field}</Label>
                  <Select value={profile.fieldArea} onValueChange={(value) => setProfile((p) => ({ ...p, fieldArea: value as FieldArea }))}>
                    <SelectTrigger><SelectValue placeholder={c.fieldPlaceholder} /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FIELD_LABELS[lang]) as FieldArea[]).map((area) => (
                        <SelectItem key={area} value={area}>{FIELD_LABELS[lang][area]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(profile.intents.includes('scholarship') || profile.intents.includes('fellowship') || profile.intents.includes('exchange_program')) && (
                  <div>
                    <Label className="mb-2 block">{c.targetEducation}</Label>
                    <Select
                      value={profile.targetEducation || profile.education}
                      onValueChange={(value) => setProfile((p) => ({ ...p, targetEducation: value as EducationLevel }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(EDUCATION_LABELS[lang]) as EducationLevel[])
                          .filter((level) => level !== 'other')
                          .map((level) => (
                            <SelectItem key={level} value={level}>{EDUCATION_LABELS[lang][level]}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(profile.intents.includes('job') || profile.intents.includes('internship')) && (
                  <div>
                    <Label className="mb-2 block">{c.experience}</Label>
                    <Select
                      value={profile.experienceYears == null ? 'unknown' : String(profile.experienceYears)}
                      onValueChange={(value) => setProfile((p) => ({
                        ...p,
                        experienceYears: value === 'unknown' ? undefined : Number(value),
                      }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">{c.experienceUnknown}</SelectItem>
                        {[0, 1, 2, 3, 5, 10].map((years) => (
                          <SelectItem key={years} value={String(years)}>
                            {years === 10 ? '10+' : years}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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

function CountrySelect({
  label,
  value,
  options,
  searchLabel,
  emptyLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  searchLabel: string;
  emptyLabel: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            <span className="truncate">{selected?.label || value}</span>
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchLabel} />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check className={`me-2 h-4 w-4 ${option.value === value ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
                  {option.label}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CountryMultiSelect({
  values,
  options,
  anywhereLabel,
  searchLabel,
  emptyLabel,
  ariaLabel,
  onChange,
}: {
  values: string[];
  options: { value: string; label: string }[];
  anywhereLabel: string;
  searchLabel: string;
  emptyLabel: string;
  ariaLabel: string;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const anywhere = values.includes('anywhere');
  const selectedLabels = values
    .filter((value) => value !== 'anywhere')
    .map((value) => options.find((option) => option.value === value)?.label || value);

  const toggle = (value: string) => {
    const current = values.filter((item) => item !== 'anywhere');
    const selected = current.includes(value);
    const next = selected
      ? current.filter((item) => item !== value)
      : [...current, value].slice(0, 8);
    onChange(next.length ? next : ['anywhere']);
  };

  return (
    <div role="group" aria-label={ariaLabel}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={anywhere ? 'default' : 'outline'}
          size="sm"
          aria-pressed={anywhere}
          onClick={() => onChange(['anywhere'])}
        >
          {anywhereLabel}
        </Button>
        {!anywhere && selectedLabels.map((label) => (
          <span key={label} className="rounded-full border bg-amber-50 px-3 py-1.5 text-sm dark:bg-amber-950/30">{label}</span>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="mt-3 w-full justify-between font-normal">
            <span className="truncate">{anywhere ? anywhereLabel : selectedLabels.join(', ')}</span>
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchLabel} />
            <CommandList>
              <CommandEmpty>{emptyLabel}</CommandEmpty>
              {options.map((option) => {
                const selected = values.includes(option.value);
                return (
                  <CommandItem key={option.value} value={`${option.label} ${option.value}`} onSelect={() => toggle(option.value)}>
                    <Check className={`me-2 h-4 w-4 ${selected ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
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
  const [feedback, setFeedback] = useState<'helpful' | 'not_relevant' | null>(null);
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

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <p><strong>{copy.deadline}:</strong> {deadline}</p>
          {result.sourceName && <p><strong>{copy.source}:</strong> {result.sourceName}</p>}
          {result.lastChecked && (
            <p><strong>{copy.checked}:</strong> {new Intl.DateTimeFormat(lang === 'fa' ? 'fa-AF' : lang === 'ps' ? 'ps-AF' : 'en-GB', { dateStyle: 'medium' }).format(new Date(result.lastChecked))}</p>
          )}
        </div>

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
              {copy.viewDetails}
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
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={feedback === 'helpful'}
              disabled={feedback !== null}
              onClick={() => { setFeedback('helpful'); onFeedback('helpful'); }}
            >
              <ThumbsUp className="me-1 h-4 w-4" />{copy.helpful}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={feedback === 'not_relevant'}
              disabled={feedback !== null}
              onClick={() => { setFeedback('not_relevant'); onFeedback('not_relevant'); }}
            >
              <ThumbsDown className="me-1 h-4 w-4" />{copy.notRelevant}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MatcherAlertSignup({
  profile,
  lang,
  copy,
}: {
  profile: Profile;
  lang: Lang;
  copy: (typeof COPY)[Lang];
}) {
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/matcher-alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          frequency,
          profile: { ...profile, lang },
          website: '',
        }),
      });
      if (!res.ok) throw new Error(`matcher alert ${res.status}`);
      setStatus('success');
      track('matcher_alert_created', { frequency });
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={submit} className="text-start">
      <div className="flex items-start gap-2">
        <Bell className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <p className="font-semibold">{copy.categoryAlert}</p>
          <p className="mt-1 text-sm text-muted-foreground">{copy.alertHint}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <Label htmlFor="matcher-alert-email" className="sr-only">{copy.alertEmail}</Label>
          <Input
            id="matcher-alert-email"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.alertEmail}
          />
        </div>
        <Select value={frequency} onValueChange={(value) => setFrequency(value as 'daily' | 'weekly')}>
          <SelectTrigger aria-label={frequency === 'daily' ? copy.alertDaily : copy.alertWeekly}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">{copy.alertDaily}</SelectItem>
            <SelectItem value="weekly">{copy.alertWeekly}</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={status === 'sending' || status === 'success'}>
          {status === 'sending' ? copy.alertSending : copy.alertButton}
        </Button>
      </div>
      {status === 'success' && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400" role="status">{copy.alertSuccess}</p>}
      {status === 'error' && <p className="mt-2 text-sm text-destructive" role="alert">{copy.alertError}</p>}
    </form>
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
