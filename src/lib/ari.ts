import type { Lang } from '@/lib/lang-route';

export const ARI_ASSETS = ['classic', 'minimal', 'scholar', 'global', 'happy', 'thinking', 'celebrating', 'reading', 'stellar', 'nature', 'waving'] as const;
export type AriVariant = typeof ARI_ASSETS[number];
export type AriContext = 'home' | 'listing' | 'detail' | 'matcher' | 'cv' | 'letter' | 'interview' | 'services' | 'contact' | 'employer' | 'submit' | 'track' | 'reading';
export const ARI_ENABLED = process.env.NEXT_PUBLIC_ARI_ENABLED === 'true';
export const ARI_HIDDEN_KEY = 'aria-guide-hidden-v1';

// Explicit public allowlist: no authentication, admin, portal, render or timed practice surfaces.
export function ariContext(pathname: string): AriContext | null {
  const path = pathname.replace(/^\/(en|fa|ps)(?=\/|$)/, '').replace(/\/$/, '') || '/';
  if (path === '/') return 'home';
  if (path === '/opportunities') return 'listing';
  if (/^\/opportunities\/[^/]+$/.test(path) && path !== '/opportunities/saved') return 'detail';
  if (path === '/opportunity-matcher') return 'matcher';
  if (path === '/cv-builder') return 'cv';
  if (path === '/letters') return 'letter';
  if (path === '/interview-prep') return 'interview';
  if (['/services', '/about', '/templates'].includes(path)) return 'services';
  if (path === '/contact') return 'contact';
  if (path === '/employers' || path === '/employers/post') return 'employer';
  if (path === '/submit-opportunity') return 'submit';
  if (path === '/track') return 'track';
  if (/^\/(blog|success-stories|press)(\/[^/]+)?$/.test(path)) return 'reading';
  return null;
}

export function ariCanFloat(context: AriContext | null) {
  return context !== null && !['cv', 'letter', 'matcher', 'interview', 'employer', 'submit', 'track', 'contact', 'reading'].includes(context);
}
export function ariVariant(context: AriContext): AriVariant {
  return ['matcher', 'cv', 'letter', 'interview', 'detail'].includes(context) ? 'scholar' : 'classic';
}

export const ARI_COPY = {
  en: {
    name: 'ARI', guide: 'Your opportunity guide', open: 'Open ARI guide', close: 'Close ARI guide', hide: 'Hide ARI', restore: 'Show ARI', dismiss: 'Dismiss tip',
    intro: 'Choose your next step. ARI helps you navigate ARIA HUB.', privacy: 'Navigation guidance only. No chat or personal information is sent.',
    jobs: 'Find jobs', scholarships: 'Find scholarships', matcher: 'Opportunity Matcher', cv: 'Build my CV', letter: 'Write a letter', contact: 'Contact ARIA HUB',
    action: 'Find opportunities', servicesAction: 'Explore services', employerAction: 'Post an opportunity', checklist: 'Application checklist',
    eligibility: 'Read the listing’s requirements and confirm your eligibility with the provider.', documents: 'Prepare the documents requested in the official instructions.', official: 'Use the official application link and review the provider’s instructions.', deadline: 'Check the listed deadline before you apply.', noDeadline: 'No deadline is listed. Confirm the date with the provider.',
    studio: 'ARI mascot', none: 'None', classic: 'Classic', scholar: 'Scholar', global: 'Global', celebrating: 'Celebrating', size: 'Artwork size', placement: 'Safe placement', start: 'Start', center: 'Center', end: 'End', safe: 'Artwork stays in a reserved band, clear of the content and QR code.',
    contexts: { home: 'Hi, I’m ARI. Start with a search, then explore the opportunities that interest you.', listing: 'Use category, location and deadline filters to narrow your search. Clear a filter if you find no results.', detail: 'Before applying, review the requirements, prepare your documents and follow the official instructions.', matcher: 'Answer each step using your current profile. Matches are suggestions, not predictions of acceptance.', cv: 'Complete your experience, education and contact details. Review the preview before exporting; ARI stays out of your CV.', letter: 'Choose a letter type, describe your relevant experience and review every claim before exporting.', interview: 'Explore questions and practice at your own pace. ARI stays out of timed sessions.', services: 'Explore the services and career tools, then choose what fits your next step.', contact: 'Use the contact form to reach the team. Never include passwords or verification codes.', employer: 'Add accurate job details, requirements and an official application method. Submissions go through review.', submit: 'Share the original source and complete the opportunity details so the team can review them.', track: 'Use your submission reference to check the review status. Keep your reference safe.', reading: 'Ready for your next step? Explore opportunities and practical career tools.' },
  },
  fa: {
    name: 'آری', guide: 'راهنمای فرصت‌های شما', open: 'باز کردن راهنمای آری', close: 'بستن راهنمای آری', hide: 'پنهان کردن آری', restore: 'نمایش آری', dismiss: 'بستن راهنما',
    intro: 'گام بعدی خود را انتخاب کنید. آری در استفاده از آریا هاب راهنمای شماست.', privacy: 'فقط راهنمای استفاده از سایت است. چت یا اطلاعات شخصی ارسال نمی‌شود.',
    jobs: 'یافتن وظایف', scholarships: 'یافتن بورسیه‌ها', matcher: 'یابندهٔ فرصت مناسب', cv: 'ساخت رزومه', letter: 'نوشتن نامه', contact: 'تماس با آریا هاب', action: 'یافتن فرصت‌ها', servicesAction: 'مشاهدهٔ خدمات', employerAction: 'ثبت فرصت کاری', checklist: 'فهرست آمادگی درخواست',
    eligibility: 'شرایط فرصت را بخوانید و واجد شرایط بودن خود را با ارائه‌دهنده بررسی کنید.', documents: 'اسناد خواسته‌شده در دستورالعمل رسمی را آماده کنید.', official: 'از پیوند رسمی درخواست استفاده کنید و دستورالعمل ارائه‌دهنده را بخوانید.', deadline: 'پیش از درخواست، مهلت ثبت‌شده را بررسی کنید.', noDeadline: 'مهلتی ثبت نشده است. تاریخ را با ارائه‌دهنده بررسی کنید.',
    studio: 'شخصیت آری', none: 'بدون شخصیت', classic: 'کلاسیک', scholar: 'دانش‌پژوه', global: 'جهانی', celebrating: 'شادمانی', size: 'اندازهٔ تصویر', placement: 'جای‌گذاری امن', start: 'ابتدا', center: 'وسط', end: 'انتها', safe: 'تصویر در نوار جداگانه و دور از محتوا و کد پاسخ سریع قرار می‌گیرد.',
    contexts: { home: 'سلام، من آری هستم. با جستجو شروع کنید و فرصت‌های مورد علاقهٔ خود را پیدا کنید.', listing: 'با فیلتر دسته‌بندی، موقعیت و مهلت، نتایج را محدود کنید. اگر نتیجه‌ای نبود، یک فیلتر را حذف کنید.', detail: 'پیش از درخواست، شرایط را بررسی کنید، اسناد را آماده سازید و دستورالعمل رسمی را دنبال کنید.', matcher: 'هر مرحله را با اطلاعات فعلی خود تکمیل کنید. نتایج پیشنهاد هستند، نه پیش‌بینی قبولی.', cv: 'تجربه، تحصیلات و اطلاعات تماس را تکمیل کنید. پیش از دانلود، پیش‌نمایش را بررسی کنید؛ آری در رزومه ظاهر نمی‌شود.', letter: 'نوع نامه را انتخاب کنید، تجربهٔ مرتبط خود را بنویسید و پیش از دانلود، تمام ادعاها را بررسی کنید.', interview: 'پرسش‌ها را ببینید و با سرعت دلخواه تمرین کنید. آری در جلسات زمان‌دار ظاهر نمی‌شود.', services: 'خدمات و ابزارهای شغلی را ببینید و گزینهٔ مناسب گام بعدی خود را انتخاب کنید.', contact: 'از فرم تماس برای ارتباط با تیم استفاده کنید. رمز عبور یا کد تأیید را وارد نکنید.', employer: 'جزئیات دقیق وظیفه، شرایط و روش رسمی درخواست را بنویسید. درخواست‌ها بررسی می‌شوند.', submit: 'منبع اصلی و جزئیات فرصت را کامل کنید تا تیم آن را بررسی کند.', track: 'با کد پیگیری، وضعیت بررسی درخواست را ببینید. کد خود را محفوظ نگه دارید.', reading: 'برای گام بعدی آماده‌اید؟ فرصت‌ها و ابزارهای کاربردی شغلی را ببینید.' },
  },
  ps: {
    name: 'آري', guide: 'ستاسو د فرصتونو لارښود', open: 'د آري لارښود پرانیزئ', close: 'د آري لارښود وتړئ', hide: 'آري پټ کړئ', restore: 'آري ښکاره کړئ', dismiss: 'لارښوونه وتړئ',
    intro: 'خپل بل ګام وټاکئ. آري د آریا هاب په کارولو کې لارښوونه کوي.', privacy: 'یوازې د سایټ د کارولو لارښوونه ده. خبرې یا شخصي معلومات نه لېږل کېږي.',
    jobs: 'دندې ومومئ', scholarships: 'بورسونه ومومئ', matcher: 'د مناسب فرصت موندونکی', cv: 'زما ژوندلیک جوړ کړئ', letter: 'لیک ولیکئ', contact: 'له آریا هاب سره اړیکه', action: 'فرصتونه ومومئ', servicesAction: 'خدمتونه وګورئ', employerAction: 'کاري فرصت ثبت کړئ', checklist: 'د غوښتنلیک د چمتووالي لېست',
    eligibility: 'د فرصت شرایط ولولئ او خپل وړتیا له وړاندې کوونکي سره تایید کړئ.', documents: 'په رسمي لارښوونو کې غوښتل شوي اسناد چمتو کړئ.', official: 'د غوښتنلیک رسمي لینک وکاروئ او د وړاندې کوونکي لارښوونې ولولئ.', deadline: 'له غوښتنلیک مخکې ثبت شوې وروستۍ نېټه وګورئ.', noDeadline: 'وروستۍ نېټه نه ده ثبت شوې. نېټه له وړاندې کوونکي سره تایید کړئ.',
    studio: 'د آري انځور', none: 'پرته له انځوره', classic: 'کلاسیک', scholar: 'زده‌کړیال', global: 'نړیوال', celebrating: 'خوشحالي', size: 'د انځور اندازه', placement: 'خوندي ځای', start: 'پیل', center: 'منځ', end: 'پای', safe: 'انځور په جلا برخه کې له منځپانګې او چټک ځواب کوډ څخه لرې پاتې کېږي.',
    contexts: { home: 'سلام، زه آري یم. په لټون پیل وکړئ او د خپلې خوښې فرصتونه ومومئ.', listing: 'د کټګورۍ، ځای او وروستۍ نېټې چاڼګرونه وکاروئ. که پایلې نه وي، یو چاڼګر لرې کړئ.', detail: 'له غوښتنلیک مخکې شرایط وګورئ، اسناد چمتو کړئ او رسمي لارښوونې تعقیب کړئ.', matcher: 'هر ګام په خپلو اوسنیو معلوماتو بشپړ کړئ. پایلې سپارښتنې دي، د منلو وړاندوینې نه دي.', cv: 'تجربه، زده‌کړې او د اړیکې معلومات بشپړ کړئ. له ښکته کولو مخکې مخکتنه وګورئ؛ آري په ژوندلیک کې نه ښکاري.', letter: 'د لیک ډول وټاکئ، خپله اړونده تجربه ولیکئ او له ښکته کولو مخکې ټولې ادعاوې وګورئ.', interview: 'پوښتنې وګورئ او په خپل سرعت تمرین وکړئ. آري په وخت لرونکو غونډو کې نه ښکاري.', services: 'خدمتونه او کاري وسیلې وګورئ، بیا د خپل بل ګام لپاره مناسب انتخاب وکړئ.', contact: 'له ټیم سره د اړیکې لپاره فورمه وکاروئ. پټنومونه یا د تایید کوډونه مه لیکئ.', employer: 'د دندې کره معلومات، شرایط او د غوښتنلیک رسمي لاره ولیکئ. غوښتنې ارزول کېږي.', submit: 'اصلي سرچینه او د فرصت بشپړ معلومات ورکړئ چې ټیم یې وارزوي.', track: 'د خپلې غوښتنې په تعقیبي کوډ د ارزونې حالت وګورئ. خپل کوډ خوندي وساتئ.', reading: 'د بل ګام لپاره چمتو یاست؟ فرصتونه او ګټورې کاري وسیلې وګورئ.' },
  },
} satisfies Record<Lang, object>;

export function ariLinks(lang: Lang) {
  const c = ARI_COPY[lang];
  return [
    { href: `/${lang}/opportunities?category=job`, label: c.jobs },
    { href: `/${lang}/opportunities?category=scholarship`, label: c.scholarships },
    { href: `/${lang}/opportunity-matcher`, label: c.matcher },
    { href: `/${lang}/cv-builder`, label: c.cv },
    { href: `/${lang}/letters`, label: c.letter },
    { href: `/${lang}/contact`, label: c.contact },
  ];
}

export const ARI_MATCHER_STEPS = {
 en: ['Choose the types of opportunities you want to explore.', 'Select your current education level so requirements can be compared.', 'Provide your nationality and residence; providers may have different rules for each.', 'Choose destinations you are open to. Confirm all requirements on the official listing.'],
 fa: ['نوع فرصت‌هایی را که می‌خواهید ببینید انتخاب کنید.', 'سطح تحصیلات فعلی خود را انتخاب کنید تا شرایط مقایسه شوند.', 'تابعیت و محل اقامت خود را وارد کنید؛ شرایط ارائه‌دهنده ممکن است برای هر یک متفاوت باشد.', 'مقصدهایی را که برای شما مناسب است انتخاب کنید. شرایط را در منبع رسمی بررسی کنید.'],
 ps: ['د هغو فرصتونو ډولونه وټاکئ چې غواړئ ویې ګورئ.', 'د شرایطو د پرتله کولو لپاره خپلې اوسنۍ زده‌کړې وټاکئ.', 'خپل تابعیت او د اوسېدو ځای ورکړئ؛ د وړاندې کوونکي شرایط د هر یوه لپاره توپیر لرلی شي.', 'د خپلې خوښې ځایونه وټاکئ. ټول شرایط په رسمي سرچینه کې وګورئ.'],
} satisfies Record<Lang, string[]>;
