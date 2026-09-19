/**
 * seed-sample-opportunities.ts — LOCAL DEV/QA ONLY.
 *
 * Creates ~18 realistic, fully trilingual opportunities so the site can be
 * developed/QA'd offline while the production Neon DB is quota-blocked.
 *
 * SAFETY: refuses to run against any host except 127.0.0.1/localhost —
 * fake content must NEVER reach production Neon.
 */
import { PrismaClient } from '@prisma/client';

const url = process.env.DATABASE_URL ?? '';
if (!/@(127\.0\.0\.1|localhost):5433/.test(url)) {
  console.error('REFUSING to run: DATABASE_URL is not the local dev DB (127.0.0.1:5433).');
  process.exit(1);
}

const db = new PrismaClient();

type T = { en: string; fa: string; ps: string };
const i18n = (en: string, fa: string, ps: string) => ({ en, fa, ps }) as object;

interface Row {
  slug: string;
  title: T;
  organization: string;
  country: string;
  deadline: string | null;
  featured: boolean;
  jobType: string;
  jobTypeT: T;
  categorySlug: string;
  salary: T | null;
  educationReq: T | null;
  experience: T | null;
  summary: T;
  description: T; // HTML
  tags: T;
}

const CATS: Array<{ name: T; slug: string; icon: string; order: number }> = [
  { slug: 'jobs', icon: 'Briefcase', order: 1, name: i18n('Jobs & Vacancies', 'کارها و بست‌های خالی', 'دندې او تشې څوکۍ') },
  { slug: 'scholarships', icon: 'GraduationCap', order: 2, name: i18n('Scholarships', 'بورس‌های تحصیلی', 'تعلیمي بورسونه') },
  { slug: 'internships', icon: 'Sparkles', order: 3, name: i18n('Internships', 'کارآموزی‌ها', 'کارآموزۍ') },
  { slug: 'fellowships', icon: 'Award', order: 4, name: i18n('Fellowships', 'فلوشیپ‌ها', 'فلوشیپونه') },
  { slug: 'trainings', icon: 'BookOpen', order: 5, name: i18n('Trainings', 'آموزش‌ها', 'روزنې') },
];

const FUTURE = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

const ROWS: Row[] = [
  {
    slug: 'acf-logistics-officer-kabul-2026',
    title: i18n('Logistics Officer — Kabul', 'آمر لوجستیک — کابل', 'لوجستیک آمر — کابل'),
    organization: 'Action Against Hunger',
    country: 'Afghanistan',
    deadline: FUTURE(21), featured: true, jobType: 'job', jobTypeT: i18n('Job', 'کار', 'دنده'),
    categorySlug: 'jobs', salary: i18n(' USD 900–1,200 / month', '۹۰۰–۱٬۲۰۰ دالر در ماه', 'په میاشت کې ۹۰۰–۱,۲۰۰ ډالره'),
    educationReq: i18n('Bachelor degree in logistics or business', 'بکلوریا در لوجستیک یا تجارت', 'د لوجستیک یا سوداګرۍ لیسانس'),
    experience: i18n('2+ years with NGOs', '۲ سال تجربه با موسسات', 'د بنسټونو سره ۲ کاله تجربه'),
    summary: i18n(
      'AAH Afghanistan seeks a Logistics Officer in Kabul to manage procurement, warehousing and fleet for Mazar regional programs.',
      'سازمان اقدام علیه گرسنگی در کابل یک آمر لوجستیک برای مدیریت خریدها، انبار و موترهای برنامه‌های منطقه مزار استخدام می‌کند.',
      'د لوږې پر ضد action بنسټ په کابل کې د مزار سیمې پروګرامونو لپاره د تدارکاتو، ګدام او موټرو د اداره کولو لپاره یو لوجستیک آمر په کار ګماري.'
    ),
    description: i18n(
      '<h3>About the role</h3><p>The Logistics Officer ensures smooth procurement, fleet and warehouse operations for AAH programs in Kabul and regional bases.</p><h4>Key responsibilities</h4><ul><li>Run transparent procurement following AAH and donor procedures</li><li>Manage the Kabul warehouse with accurate stock records</li><li>Coordinate vehicle allocation, maintenance and fuel tracking</li></ul><h4>What we offer</h4><ul><li>One-year renewable contract</li><li>Health insurance for staff and dependents</li><li>Structured training in supply-chain management</li></ul>',
      '<h3>درباره این وظیفه</h3><p>آمر لوجستیک خریدها، امور موترها و انبار برنامه‌های AAH در کابل و پایه‌های منطقه‌ای را روان نگه می‌دارد.</p><h4>مسؤولیت‌های کلیدی</h4><ul><li>اجرای شفاف خریدها طبق پروسیجرهای AAH و تمویل‌کنندگان</li><li>مدیریت انبار کابل با ثبت دقیق ذخایر</li><li>هماهنگی تخصیص موترها، صیانت و تکر سوخت</li></ul><h4>چه چیزی ارائه می‌کنیم</h4><ul><li>قرارداد یک‌ساله قابل تمدید</li><li>بیمه صحی برای کارمندان و اعضای فامیل</li><li>آموزش منظم در مدیریت زنجیره تدارکات</li></ul>',
      '<h3>د دندې په اړه</h3><p>لوجستیک آمر د AAH پروګرامونو لپاره په کابل او سیمه‌ییزو مرکزونو کې تدارکات، موټرو او ګدام چارې په سمه توګه پر مخ وړي.</p><h4>اصلي مسؤولیتونه</h4><ul><li>د AAH او ملاتړو کوونکو پروسیجرونو سره سم شفاف تدارکات</li><li>د کابل ګدام د سمو ذخیره ریکارډونو سره اداره کول</li><li>د موټرو ټاکل، ساتنه او د تیلو حساباتو همغږي کول</li></ul><h4>موږ څه وړاندې کوو</h4><ul><li>یو کاله د نوي کولو وړ قرارداد</li><li>د کارکوونکو او کورنۍ روغتیايي بیمه</li><li>د تدارکاتي زنځیر مدیریت کې منظم روزنه</li></ul>'
    ),
    tags: i18n(['logistics', 'NGO', 'Kabul'], ['لوجستیک', 'موسسه', 'کابل'], ['لوجستیک', 'بنسټ', 'کابل']),
  },
  {
    slug: 'chevening-awards-afghanistan-2026-27',
    title: i18n('Chevening Scholarships 2026–27 — Afghanistan', 'بورسیه چیونینگ ۲۰۲۶–۲۷ — افغانستان', 'چیونینګ بورسونه ۲۰۲۶–۲۷ — افغانستان'),
    organization: 'UK Foreign, Commonwealth & Development Office',
    country: 'United Kingdom',
    deadline: FUTURE(35), featured: true, jobType: 'scholarship', jobTypeT: i18n('Scholarship', 'بورس تحصیلی', 'تعلیمي بورس'),
    categorySlug: 'scholarships', salary: null, educationReq: i18n('Bachelor + 2 years work experience', 'بکلوریا + ۲ سال تجربه کاری', 'لیسانس + ۲ کاله د کار تجربه'),
    experience: null,
    summary: i18n(
      'Fully-funded one-year master\u2019s degrees at any UK university for Afghan professionals with leadership potential. Covers tuition, flights and a monthly stipend.',
      'تحصیلات ماستری یک‌ساله کاملاً تمویل‌شده در هر پوهنتون بریتانیا برای کارشناسان افغان با ظرفیت رهبری. شامل فیس، تکت هواپیما و تنخواه ماهانه.',
      'د افغان مسلکي کسانو لپاره په هر برتانوي پوهنتون کې بشپړ تمویل شوي یو کاله ماسټرۍ. په فیس، د الوتکې ټکټ او میاشتنۍ بورس پورې اړه لري.'
    ),
    description: i18n(
      '<h3>Overview</h3><p>Chevening is the UK government\u2019s international awards programme aimed at developing global leaders. Afghan applicants from all provinces are encouraged.</p><h4>Eligibility</h4><ul><li>Undergraduate degree equivalent to UK 2:1</li><li>At least two years (2,800 hours) of work experience</li><li>Return to Afghanistan for two years after the award</li></ul><h4>Funding covers</h4><ul><li>Full tuition fees</li><li>Monthly living allowance</li><li>Return economy flights and arrival allowance</li></ul><h4>How to apply</h4><p>Apply online through the Chevening portal with two references; shortlisted candidates attend an interview at the British Embassy Kabul.</p>',
      '<h3>معرفی</h3><p>چیونینگ برنامه بین‌المللی دولت بریتانیا برای پرورش رهبران جهانی است. متقاضیان افغان از تمام ولایات تشویق می‌شوند.</p><h4>شرایط واجد شرایط بودن</h4><ul><li>سند لیسانس معادل ۲:۱ بریتانیا</li><li>حداقل دو سال (۲۸۰۰ ساعت) تجربه کاری</li><li>بازگشت به افغانستان برای دو سال پس از ختم بورس</li></ul><h4>تمویل شامل</h4><ul><li>تمام فیس تحصیلی</li><li>تنخواه ماهانه زندگی</li><li>تکت رفت و برگشت و تنخواه ورود</li></ul><h4>نحوه درخواست</h4><p>به‌صورت آنلاین از طریق پورتال چیونینگ با دو معرف؛ کاندیدان لیست کوتاه در سفارت بریتانیا کابل مصاحبه می‌شوند.</p>',
      '<h3>پېژندنه</h3><p>چیونینګ د برتانیا حکومت نړیواله پروګرام ده چې نړیوال مشران روزي. له ټولو ولایتونو څخه افغان غوښتونکي هڅول کیږي.</p><h4>د غوښتنې شرایط</h4><ul><li>له برتانوي ۲:۱ سره برابر لیسانس</li><li>لږ تر لږه دوه کاله (۲۸۰۰ ساعته) د کار تجربه</li><li>له بورس وروسته دوه کاله افغانستان ته ستنېدل</li></ul><h4>تمویل پکې شامل دي</h4><ul><li>ټول تحصیلي فیس</li><li>میاشتنۍ د ژوند تنخواه</li><li>د تګ راتګ ټکټ او د راتګ تنخواه</li></ul><h4>د غوښتنې لار</h4><p>د چیونینګ پورتال له لارې د دوو معرفونو سره آنلاین غوښتنه وکړئ؛ لنډ لیست شوي کاندیدان په کابل کې برتانوي سفارت کې مرکه کیږي.</p>'
    ),
    tags: i18n(['scholarship', 'UK', 'masters'], ['بورس', 'بریتانیا', 'ماستری'], ['بورس', 'برتانیا', 'ماسټري']),
  },
  {
    slug: 'unicef-wash-intern-herat',
    title: i18n('WASH Intern — Herat', 'کارآموز WASH — هرات', 'د WASH کارآموز — هرات'),
    organization: 'UNICEF Afghanistan',
    country: 'Afghanistan',
    deadline: FUTURE(12), featured: false, jobType: 'internship', jobTypeT: i18n('Internship', 'کارآموزی', 'کارآموزي'),
    categorySlug: 'internships', salary: i18n('Stipend 450 USD / month', 'تنخواه ۴۵۰ دالر در ماه', 'میاشتنۍ ۴۵۰ ډالره تنخواه'),
    educationReq: i18n('Recent graduate in engineering or public health', 'فارغ تازه در انجنیری یا صحت عامه', 'په انجینري یا عامه روغتیا کې نوی فارغ'),
    experience: i18n('Not required', 'لازم نیست', 'ته چمتو نه ده'),
    summary: i18n(
      'Six-month internship supporting water, sanitation and hygiene programs in western Afghanistan.',
      'کارآموزی شش‌ماهه در بخش آب، ساماندهی محیطی و بهداشت در غرب افغانستان.',
      'په لویدیځ افغانستان کې د اوبو، پاکو چاپېریال او روغتیا پروګرامونو کې شپږ میاشتنۍ کارآموزي.'
    ),
    description: i18n(
      '<h3>The programme</h3><p>UNICEF Herat offers a six-month learning internship for recent graduates interested in WASH programming.</p><h4>You will learn</h4><ul><li>Field monitoring of water supply schemes</li><li>Data collection and reporting basics</li><li>Coordination with local authorities and communities</li></ul>',
      '<h3>درباره برنامه</h3><p>یونیسف هرات یک کارآموزی شش‌ماهه آموزشی برای فارغان تازه علاقه‌مند به برنامه‌های WASH فراهم می‌کند.</p><h4>چه چیزی می‌آموزید</h4><ul><li>مانیتورینگ میدانی سیستم‌های آبرسانی</li><li>مبانی جمع‌آوری معلومات و گزارش‌دهی</li><li>هماهنگی با مقامات محلی و جوامع</li></ul>',
      '<h3>د پروګرام په اړه</h3><p>یونیسف هرات د WASH پروګرامونو په لید لوري نویو فارغانو لپاره شپږ میاشتنۍ د زده کړې کارآموزي وړاندې کوي.</p><h4>به څه زده کوئ</h4><ul><li>د اوبو رسولو سیستمونو ساحلي څارنه</li><li>د معلوماتو راټولولو او راپور ورکولو اساسات</li><li>له سیمه‌ییزو چارواکو او ټولنو سره همغږي</li></ul>'
    ),
    tags: i18n(['internship', 'UNICEF', 'Herat'], ['کارآموزی', 'یونیسف', 'هرات'], ['کارآموزي', 'یونیسف', 'هرات']),
  },
  {
    slug: 'dai-procurement-consultant-remote',
    title: i18n('Procurement Consultant (Remote)', 'مشاور خرید و تدارکات (آنلاین)', 'د تدارکاتو مشاور (لرې)'),
    organization: 'DAI Global LLC',
    country: 'Remote',
    deadline: FUTURE(9), featured: false, jobType: 'consultancy', jobTypeT: i18n('Consultancy', 'مشاوره', 'مشوره'),
    categorySlug: 'jobs', salary: i18n('Daily rate, commensurate', 'حق‌الزحمه روزانه', 'ورځنی معاش'),
    educationReq: null, experience: i18n('5+ years donor procurement', '۵ سال خرید با تمویل‌کنندگان', 'له ملاتړو سره د تدارکاتو ۵ کاله'),
    summary: i18n(
      'Remote consultancy supporting procurement reviews for a donor-funded governance program.',
      'مشاوره آنلاین برای بازبینی خریدهای یک برنامه حکومت‌داری تمویل‌شده.',
      'د ملاتړ شوي حکومتوالۍ پروګرام لپاره د تدارکاتو بیاکتنې ملاتړ لرې مشوره.'
    ),
    description: i18n(
      '<h3>Scope of work</h3><p>Review procurement documentation, assess compliance with donor rules, and draft findings for the program team.</p><h4>Deliverables</h4><ul><li>Two procurement compliance reports</li><li>Corrective-action tracker</li></ul>',
      '<h3>حوزه کار</h3><p>بازبینی اسناد خرید، ارزیابی مطابقت با قواعد تمویل‌کنندگان و ترتیب یافته‌ها برای تیم برنامه.</p><h4>تحویل‌دادنی‌ها</h4><ul><li>دو گزارش مطابقت خرید</li><li>جدول اقدام اصلاحی</li></ul>',
      '<h3>د کار ساحه</h3><p>د تدارکاتو اسناد بیاکتنه، د ملاتړو له قواعدو سره د مطابقت ارزونه او د پروګرام ټیم لپاره د موندنو مسوده.</p><h4>تحویل کېدونکي</h4><ul><li>د دوه تدارکاتي مطابقت راپورونه</li><li>د اصلاحي اقدامونو تعقیب کوونکی</li></ul>'
    ),
    tags: i18n(['consultancy', 'remote'], ['مشاوره', 'آنلاین'], ['مشوره', 'لرې']),
  },
  {
    slug: 'fulbright-foreign-student-program-2027',
    title: i18n('Fulbright Foreign Student Program 2027', 'برنامه فولبرایت برای محصلان خارجی ۲۰۲۷', 'د بهرنیو زده کوونکو فولبرایټ پروګرام ۲۰۲۷'),
    organization: 'U.S. Department of State',
    country: 'United States',
    deadline: FUTURE(60), featured: true, jobType: 'scholarship', jobTypeT: i18n('Scholarship', 'بورس تحصیلی', 'تعلیمي بورس'),
    categorySlug: 'scholarships', salary: null,
    educationReq: i18n('Bachelor\u2019s degree; TOEFL', 'سند لیسانس؛ توفل', 'لیسانس سند؛ TOEFL'),
    experience: null,
    summary: i18n(
      'Competitive grants for master\u2019s and PhD study in the United States, administered by the U.S. Embassy Kabul.',
      'بورس‌های رقابتی برای تحصیلات ماستری و دکتری در ایالات متحده، از طریق سفارت آمریکا کابل.',
      'په متحده ایالاتو کې د ماسټرۍ او دوکتورا لپاره سيالي بورسونه، د امریکا سفارت کابل له لارې.'
    ),
    description: i18n(
      '<h3>Programme details</h3><p>The Fulbright Foreign Student Program brings citizens of partner countries to the U.S. for graduate study. Grants cover tuition, living costs, health insurance and travel.</p><h4>Selection criteria</h4><ul><li>Academic excellence</li><li>English proficiency (TOEFL iBT)</li><li>Leadership and community engagement</li></ul><h4>Timeline</h4><p>Applications open in spring; tests and interviews follow in summer; finalists depart the next academic year.</p>',
      '<h3>جزئیات برنامه</h3><p>برنامه فولبرایت شهروندان کشورهای شریک را برای تحصیلات عالی به آمریکا می‌برد. بورس شامل فیس، هزینه زندگی، بیمه صحی و سفر است.</p><h4>معیارهای انتخاب</h4><ul><li>برتری تحصیلی</li><li>تسلط به زبان انگلیسی (توفل iBT)</li><li>رهبری و فعالیت اجتماعی</li></ul><h4>تقویم زمانی</h4><p>درخواست‌ها در بهار آغاز؛ آزمون‌ها و مصاحبه‌ها در تابستان؛ نهایی‌ها در سال تحصیلی بعد سفر می‌کنند.</p>',
      '<h3>د پروګرام جزویات</h3><p>فولبرایټ پروګرام د شریکه هیوادونو اوسیدونکي په امریکا کې لوړو زده کړو ته لیږي. بورس فیس، د ژوند لګښت، روغتیايي بیمه او سفر پوښي.</p><h4>د ټاکنې معیارونه</h4><ul><li>تعلیمي لوړوالی</li><li>انګلیسي مهارت (TOEFL iBT)</li><li>مشري او ټولنیزه ښکیلتیا</li></ul><h4>وخت نیټه</h4><p>غوښتنې په پسرلي کې پیل؛ ازموینې او مرکې په اوړي؛ نهايي کاندیدان راتلونکی تعلیمي کال سفر کوي.</p>'
    ),
    tags: i18n(['scholarship', 'USA', 'graduate'], ['بورس', 'آمریکا', 'تحصیلات عالی'], ['بورس', 'امریکا', 'لوړې زده کړې']),
  },
  {
    slug: 'irc-education-officer-nangarhar',
    title: i18n('Education Officer — Nangarhar', 'آمر معارف — ننگرهار', 'د تعلیم آمر — ننګرهار'),
    organization: 'International Rescue Committee',
    country: 'Afghanistan',
    deadline: FUTURE(18), featured: false, jobType: 'job', jobTypeT: i18n('Job', 'کار', 'دنده'),
    categorySlug: 'jobs', salary: i18n('AFN 65,000–85,000 / month', '۶۵٬۰۰۰–۸۵٬۰۰۰ افغانی در ماه', 'په میاشت کې ۶۵,۰۰۰–۸۵,۰۰۰ افغانۍ'),
    educationReq: i18n('Bachelor in education or related', 'بکلوریا در معارف یا رشته مرتبط', 'په تعلیم یا اړوند ډګر کې لیسانس'),
    experience: i18n('3 years education programming', '۳ سال برنامه‌های معارفی', 'د تعلیمي پروګرامونو ۳ کاله'),
    summary: i18n(
      'IRC is hiring an Education Officer to support community-based education classes in Nangarhar province.',
      'IRC برای حمایت از صفوف آموزش محلی‌محور در ولایت ننگرهار یک آمر معارف استخدام می‌کند.',
      'IRC په ننګرهار ولایت کې د ټولنې پر بنسټ د تعلیمي صنفونو ملاتړ لپاره د تعلیم آمر په کار ګماري.'
    ),
    description: i18n(
      '<h3>Position summary</h3><p>The Education Officer oversees CBE classes, teacher mentoring and enrolment tracking across four districts.</p><h4>Responsibilities</h4><ul><li>Supervise 40+ community teachers</li><li>Monitor class quality monthly</li><li>Coordinate with the provincial education department</li></ul>',
      '<h3>خلاصه بست</h3><p>آمر معارف صفوف CBE، رهنمایی معلمان و ثبت شمولیت را در چهار ولسوالی نظارت می‌کند.</p><h4>مسؤولیت‌ها</h4><ul><li>نظارت از بیش از ۴۰ معلم محلی</li><li>مانیتورینگ ماهانه کیفیت صفوف</li><li>هماهنگی با ریاست معارف ولایت</li></ul>',
      '<h3>د څوکۍ لنډیز</h3><p>د تعلیم آمر په څلورو ولسوالیو کې د CBE صنفونو، ښوونکو روزنه او د شمولیت تعقیب څارنه کوي.</p><h4>مسؤولیتونه</h4><ul><li>له ۴۰ زیاتو ټولنیزو ښوونکو څارنه</li><li>د صنفونو د کیفیت میاشتنۍ څارنه</li><li>د ولایتي تعلیم ریاست سره همغږي</li></ul>'
    ),
    tags: i18n(['education', 'NGO', 'Nangarhar'], ['معارف', 'موسسه', 'ننگرهار'], ['تعلیم', 'بنسټ', 'ننګرهار']),
  },
  {
    slug: 'yali-regional-leadership-nairobi',
    title: i18n('YALI Regional Leadership Center — Cohort 52', 'مرکز رهبری منطقه‌ای YALI — دوره ۵۲', 'د YALI سیمه‌ییز مشرتابه مرکز — ۵۲ مه دوره'),
    organization: 'USAID / YALI',
    country: 'Kenya',
    deadline: FUTURE(27), featured: false, jobType: 'training', jobTypeT: i18n('Training', 'آموزش', 'روزنه'),
    categorySlug: 'trainings', salary: null, educationReq: null, experience: i18n('Track record of civic work', 'سابقه فعالیت مدنی', 'د مدني کارونو سوابقه'),
    summary: i18n(
      'Fully-funded three-week leadership training in Nairobi for young African and Afghan leaders (18–35).',
      'آموزش سه‌هفته‌ای رهبری با تمویل کامل در نایروبی برای رهبران جوان آفریقایی و افغان (۱۸–۳۵ سال).',
      'په نیروبي کې د ځوانو افریقايي او افغان مشرانو (۱۸–۳۵ کلن) لپاره بشپړ تمویل شوه درې اونیزه مشرتابه روزنه.'
    ),
    description: i18n(
      '<h3>About</h3><p>The YALI RLC East Africa program trains young leaders in business, civic leadership and public management. Travel, accommodation and meals are covered.</p><h4>Who should apply</h4><ul><li>Ages 18–35</li><li>Fluent English</li><li>Demonstrated community impact</li></ul>',
      '<h3>درباره</h3><p>برنامه YALI آفریقای شرقی رهبران جوان را در تجارت، رهبری مدنی و مدیریت عامه آموزش می‌دهد. سفر، اقامت و خوراک پوشش داده می‌شود.</p><h4>چه کسی باید درخواست دهد</h4><ul><li>سن ۱۸–۳۵ سال</li><li>تسلط به زبان انگلیسی</li><li>تأثیر اثبات‌شده اجتماعی</li></ul>',
      '<h3>په اړه</h3><p>د YALI ختیځې افریقا پروګرام ځوانان په سوداګرۍ، مدني مشرتابه او عامه اداره کې روزي. سفر، استوګنه او خواړه پوښل کیږي.</p><h4>څوک باید غوښتنه وکړي</h4><ul><li>عمر ۱۸–۳۵ کلن</li><li>په انګلیسي روان خبرې</li><li>ثابت شوی ټولنیز اثر</li></ul>'
    ),
    tags: i18n(['training', 'leadership', 'Nairobi'], ['آموزش', 'رهبری', 'نایروبی'], ['روزنه', 'مشرتابه', 'نیروبي']),
  },
  {
    slug: 'wfp-nutrition-assistant-balkh',
    title: i18n('Nutrition Assistant — Balkh', 'کمک‌کار تغذیه — بلخ', 'د تغذیې مرستیال — بلخ'),
    organization: 'World Food Programme',
    country: 'Afghanistan',
    deadline: FUTURE(6), featured: false, jobType: 'job', jobTypeT: i18n('Job', 'کار', 'دنده'),
    categorySlug: 'jobs', salary: i18n('AFN 42,000 / month', '۴۲٬۰۰۰ افغانی در ماه', 'په میاشت کې ۴۲,۰۰۰ افغانۍ'),
    educationReq: i18n('High-school diploma minimum', 'حداقل سند فارغ صنف دوازدهم', 'لږ تر لږه دولسم ټولګي سند'),
    experience: i18n('1 year field experience', '۱ سال تجربه میدانی', '۱ کاله ساحلي تجربه'),
    summary: i18n(
      'Support nutrition screening and cash-transfer distributions in Balkh province health facilities.',
      'حمایت از غرباګری تغذیه‌ای و توزیع انتقالات نقدی در مراکز صحی ولایت بلخ.',
      'په بلخ ولایت کې روغتیايي مراکزو کې د تغذیې سکرینینګ او نغدي مرستو وېش ملاتړ.'
    ),
    description: i18n(
      '<h3>Role</h3><p>The Nutrition Assistant helps run monthly nutrition screenings and supports beneficiary registration at distribution points.</p><h4>Duties</h4><ul><li>Measure and record MUAC and weight-for-height</li><li>Guide beneficiaries through the registration process</li><li>Compile daily distribution reports</li></ul>',
      '<h3>وظیفه</h3><p>کمک‌کار تغذیه در غرباګری‌های ماهانه کمک می‌کند و ثبت‌نام مستفیدین را در نقاط توزیع پشتیبانی می‌نماید.</p><h4>وظایف</h4><ul><li>اندازه‌گیری و ثبت MUAC و وزن به قد</li><li>رهنمایی مستفیدین در پروسه ثبت‌نام</li><li>ترتیب گزارش‌های روزانه توزیع</li></ul>',
      '<h3>دنده</h3><p>د تغذیې مرستیال په میاشتنیو سکرینینګونو کې مرسته کوي او د وېش ټکو کې د ګټه اخیستونکو ثبت ملاتړ کوي.</p><h4>دندې</h4><ul><li>MUAC او وزن-په-قد کچه او ثبت</li><li>د ثبت پروسه کې ګټه اخیستونکو ته لارښوونه</li><li>ورځنيو د وېش راپورونو جوړول</li></ul>'
    ),
    tags: i18n(['nutrition', 'WFP', 'Balkh'], ['تغذیه', 'برنامه غذایی جهانی', 'بلخ'], ['تغذیه', 'WFP', 'بلخ']),
  },
  {
    slug: 'erasmus-mundus-joint-masters-2027',
    title: i18n('Erasmus+ Joint Master Degrees 2027 Intake', 'ماستری‌های مشترک اِراسموس+ پذیرش ۲۰۲۷', 'د اریسموس+ ګډې ماسټرۍ ۲۰۲۷ پذیرش'),
    organization: 'European Commission',
    country: 'Multiple (Europe)',
    deadline: FUTURE(45), featured: true, jobType: 'scholarship', jobTypeT: i18n('Scholarship', 'بورس تحصیلی', 'تعلیمي بورس'),
    categorySlug: 'scholarships', salary: i18n('€1,400 / month stipend', 'تنخواه ۱٬۴۰۰ یورو در ماه', 'میاشتنۍ ۱,۴۰۰ یورو تنخواه'),
    educationReq: i18n('Bachelor\u2019s degree', 'سند لیسانس', 'لیسانس سند'),
    experience: null,
    summary: i18n(
      'Study a master\u2019s in at least two European countries with a full EU scholarship covering fees, travel and living costs.',
      'تحصیل ماستری در حداقل دو کشور اروپایی با بورس کامل اتحادیه اروپا شامل فیس، سفر و هزینه زندگی.',
      'په لږ تر لږه دوه اروپايي هیوادونو کې ماسټري ولولئ، د اتحادیې بشپړ بورس فیس، سفر او د ژوند لګښت پوښي.'
    ),
    description: i18n(
      '<h3>What it is</h3><p>Erasmus+ Joint Master Degrees are prestigious international study programmes jointly delivered by consortia of European universities.</p><h4>Scholarship covers</h4><ul><li>Participation costs</li><li>Monthly allowance of €1,400</li><li>Travel and installation allowance</li></ul><h4>Application notes</h4><p>Each consortium runs its own call with deadlines typically between October and January.</p>',
      '<h3>این چیست</h3><p>ماستری‌های مشترک اِراسموس+ برنامه‌های معتبر بین‌المللی هستند که از سوی کنسرسیوم‌های پوهنتون‌های اروپایی عرضه می‌شوند.</p><h4>بورس شامل</h4><ul><li>هزینه‌های شرکت</li><li>تنخواه ماهانه ۱٬۴۰۰ یورو</li><li>تنخواه سفر و استقرار</li></ul><h4>نکات درخواست</h4><p>هر کنسرسیوم کال خود را دارد؛ ددلاین‌ها معمولاً بین اکتوبر و جنوری است.</p>',
      '<h3>دا څه شی دی</h3><p>د اریسموس+ ګډې ماسټرۍ معتبرې نړیوالې پروګرامونه دي چې د اروپايي پوهنتونونو له کنسرسیومونو څخه وړاندې کیږي.</p><h4>بورس پوښي</h4><ul><li>د ګډون لګښتونه</li><li>میاشتنۍ ۱,۴۰۰ یورو تنخواه</li><li>د سفر او استوګنې تنخواه</li></ul><h4>د غوښتنې یادونې</h4><p>هر کنسرسیوم خپله کال لري؛ نیټې معمولاً د اکتوبر او جنوري ترمنځ دي.</p>'
    ),
    tags: i18n(['scholarship', 'Europe', 'masters'], ['بورس', 'اروپا', 'ماستری'], ['بورس', 'اروپا', 'ماسټري']),
  },
  {
    slug: 'afghan-youth-english-writing-fellowship',
    title: i18n('Youth Writing Fellowship — English Journalism', 'فلوشیپ نویسندگی جوانان — ژورنالیسم انگلیسی', 'د ځوانانو لیکلو فلوشیپ — انګلیسي ژورنالیزم'),
    organization: 'Afghan Investigative Reporters\u2019 Fellowship',
    country: 'Afghanistan',
    deadline: FUTURE(15), featured: false, jobType: 'fellowship', jobTypeT: i18n('Fellowship', 'فلوشیپ', 'فلوشیپ'),
    categorySlug: 'fellowships', salary: i18n('500 USD project grant', '۵۰۰ دالر گرانت پروژه', '۵۰۰ ډالره پروژې بورس'),
    educationReq: null, experience: i18n('Published writing samples', 'نمونه نوشته‌های منتشرشده', 'خپاره شوي د لیکلو نمونې'),
    summary: i18n(
      'Six-month fellowship for Afghan writers producing English-language reporting on social issues.',
      'فلوشیپ شش‌ماهه برای نویسندگان افغان برای تولید گزارش‌های انگلیسی درباره مسائل اجتماعی.',
      'د افغان لیکوالو لپاره شپږ میاشتنی فلوشیپ چې په انګلیسي د ټولنیزو مسلو راپورونه جوړوي.'
    ),
    description: i18n(
      '<h3>Fellowship package</h3><p>Fellows receive mentorship from senior journalists, a project grant, and publication support in partner outlets.</p><h4>Commitments</h4><ul><li>One long-form piece per month</li><li>Weekly online editorial sessions</li></ul>',
      '<h3>بسته فلوشیپ</h3><p>فلوشیپ‌گیران رهنمایی ژورنالیستان ارشد، گرانت پروژه و پشتیبانی نشر در رسانه‌های شریک فارسیافت می‌کنند.</p><h4>تعهدات</h4><ul><li>یک نوشته مفصل در ماه</li><li>نشست‌های هفتگی آنلاین تحریریه</li></ul>',
      '<h3>د فلوشیپ بنډل</h3><p>فلوشیپ اخیستونکي له مشهور ژورنالیستانو لارښوونه، د پروژې بورس او د شریکه رسنیو په خپرونو کې ملاتړ ترلاسه کوي.</p><h4>ژمنې</h4><ul><li>په میاشت کې یوه مفصله لیکنه</li><li>اونیزې آنلاین ادیتوریال ناستې</li></ul>'
    ),
    tags: i18n(['fellowship', 'writing', 'media'], ['فلوشیپ', 'نویسندگی', 'رسانه'], ['فلوشیپ', 'لیکل', 'رسنۍ']),
  },
  {
    slug: 'digital-skills-bootcamp-women-remote',
    title: i18n('Digital Skills Bootcamp for Women (Online)', 'بوکمپ مهارت‌های دیجیتال برای زنان (آنلاین)', 'د ښځو لپاره دیجیټال مهارتونو بوټکمپ (آنلاین)'),
    organization: 'Code to Inspire',
    country: 'Remote',
    deadline: FUTURE(11), featured: false, jobType: 'training', jobTypeT: i18n('Training', 'آموزش', 'روزنه'),
    categorySlug: 'trainings', salary: null, educationReq: null, experience: i18n('None', 'لازم نیست', 'نه ده ته اړتیا'),
    summary: i18n(
      'Free 16-week online bootcamp in web development for Afghan women, with mentorship and job placement support.',
      'بوکمپ رایگان ۱۶‌هفته‌ای توسعه وب برای زنان افغان همراه با رهنمایی و کمک به کاریابی.',
      'د افغان ښځو لپاره د ویب پراختیا وړیا ۱۶ اونیزه بوټکمپ، له لارښوونې او د کار موندنې ملاتړ سره.'
    ),
    description: i18n(
      '<h3>Curriculum</h3><p>HTML, CSS, JavaScript and React over 16 weeks, taught in small cohorts with weekly mentor reviews.</p><h4>Benefits</h4><ul><li>Certificate of completion</li><li>Freelancing onboarding</li><li>Laptop loan scheme for qualifying students</li></ul>',
      '<h3>منهج</h3><p>HTML، CSS، جاوااسکریپت و ری‌اکت در ۱۶ هفته، در گروه‌های کوچک با بازبینی هفتگی رهنما.</p><h4>مزایا</h4><ul><li>گواهی ختم دوره</li><li>معرفی به فریلنسینگ</li><li>برنامه عاریت لپ‌تاپ برای محصلان واجد شرایط</li></ul>',
      '<h3>درسی نصاب</h3><p>HTML، CSS، جاوااسکریپټ او React په ۱۶ اونیو کې، په کوچنیو ډلو کې د اونیزې لارښوونې سره.</p><h4>ګټې</h4><ul><li>د بشپړولو سند</li><li>فریلانسینګ ته پیل</li><li>د وړ محصلانو لپاره د لپټاپ پور پروګرام</li></ul>'
    ),
    tags: i18n(['training', 'women', 'coding'], ['آموزش', 'زنان', 'کودنویسی'], ['روزنه', 'ښځې', 'کوډ لیکل']),
  },
  {
    slug: 'expired-ngo-finance-manager-2025',
    title: i18n('Finance Manager — Kabul (closed)', 'آمر مالی — کابل (ختم شده)', 'مالي آمر — کابل (بند)'),
    organization: 'Medica Afghanistan',
    country: 'Afghanistan',
    deadline: new Date(Date.now() - 40 * 86400000).toISOString(), featured: false, jobType: 'job', jobTypeT: i18n('Job', 'کار', 'دنده'),
    categorySlug: 'jobs', salary: i18n('AFN 110,000 / month', '۱۱۰٬۰۰۰ افغانی در ماه', 'په میاشت کې ۱۱۰,۰۰۰ افغانۍ'),
    educationReq: i18n('ACCA/CPA preferred', 'ACCA/CPA ارجحیت دارد', 'ACCA/CPA لومړیتوب لري'),
    experience: i18n('5 years NGO finance', '۵ سال مالی موسسات', 'د بنسټونو مالي ۵ کاله'),
    summary: i18n(
      'Recruitment closed — kept for archive. See current openings in our Jobs section.',
      'استخدام ختم شده — برای آرشیو نگهداری می‌شود. بست‌های فعال را در بخش کارها ببینید.',
      'ګمارنه بنده — د آرشیف لپاره خوندي ده. فعالې څوکۍ په دندو برخه کې وګورئ.'
    ),
    description: i18n(
      '<h3>Note</h3><p>This position closed on its deadline date. It remains visible so users can study the profile of NGO finance roles.</p>',
      '<h3>یادداشت</h3><p>این بست در تاریخ ددلاین ختم شد. برای مطالعه پروفایل بست‌های مالی موسسات قابل مشاهده باقی است.</p>',
      '<h3>یادونه</h3><p>دا څوکۍ په خپله نیټه بنده شوه. د بنسټونو د مالي څوکیو د پروفایل مطالعې لپاره ښکاره پاتې کیږي.</p>'
    ),
    tags: i18n(['finance', 'closed'], ['مالی', 'ختم شده'], ['مالي', 'بند']),
  },
  {
    slug: 'kauffman-global-scholar-fellowship',
    title: i18n('Global Scholar Fellowship for Social Entrepreneurs', 'فلوشیپ محصلان جهانی برای کارآفرینان اجتماعی', 'د ټولنیزو کاروباریانو لپاره نړیوال پوهه فلوشیپ'),
    organization: 'Kauffman Foundation',
    country: 'United States',
    deadline: FUTURE(50), featured: false, jobType: 'fellowship', jobTypeT: i18n('Fellowship', 'فلوشیپ', 'فلوشیپ'),
    categorySlug: 'fellowships', salary: null, educationReq: null, experience: i18n('2 years entrepreneurship', '۲ سال کارآفرینی', 'د کاروبار ۲ کاله'),
    summary: i18n(
      'Residency for founders building education or livelihood ventures in fragile contexts.',
      'اقامت برای بنیان‌گذارانی که در بافت‌های شکننده برای تعلیم یا معیشت کار می‌کنند.',
      'د هغو بنسټ ایښودونکو لپاره استوګنه چې په نازکو شرایطو کې تعلیم یا معیشت کاروبار جوړوي.'
    ),
    description: i18n(
      '<h3>Programme</h3><p>A 12-week residency in Kansas City with capital-readiness training and mentor matching.</p><h4>Includes</h4><ul><li>Travel and accommodation</li><li>Seed grant for the venture</li><li>Alumni network access</li></ul>',
      '<h3>برنامه</h3><p>اقامت ۱۲‌هفته‌ای در کانزاس‌سیتی همراه با آموزش آمادگی سرمایه و تطبیق رهنما.</p><h4>شامل</h4><ul><li>سفر و اقامت</li><li>گرانت آغازین برای کار</li><li>دسترسی به شبکه فارغان</li></ul>',
      '<h3>پروګرام</h3><p>په کانساس سیټي کې د ۱۲ اونیو استوګنه، د پانګې چمتووالي روزنه او د لارښود سموونې سره.</p><h4>پکې شامل</h4><ul><li>سفر او استوګنه</li><li>د کاروبار لپاره پیل بورس</li><li>د پخوانیو فارغانو شبکې لاسرسی</li></ul>'
    ),
    tags: i18n(['fellowship', 'entrepreneurship'], ['فلوشیپ', 'کارآفرینی'], ['فلوشیپ', 'کاروبار']),
  },
  {
    slug: 'radio-producer-traineeship-mazar',
    title: i18n('Radio Producer Traineeship — Mazar-e-Sharif', 'کارآموزی تولیدکننده رادیویی — مزار شریف', 'د راډیو پروډیوسر کارآموزي — مزار شریف'),
    organization: 'Radio Azadi (RFE/RL)',
    country: 'Afghanistan',
    deadline: FUTURE(8), featured: false, jobType: 'internship', jobTypeT: i18n('Internship', 'کارآموزی', 'کارآموزي'),
    categorySlug: 'internships', salary: i18n('AFN 30,000 stipend', 'تنخواه ۳۰٬۰۰۰ افغانی', '۳۰,۰۰۰ افغانۍ تنخواه'),
    educationReq: null, experience: i18n('Interest in journalism', 'علاقه به ژورنالیسم', 'ژورنالیزم ته لېوالتیا'),
    summary: i18n(
      'Four-month traineeship producing youth-focused radio segments in Farsi and Pashto.',
      'کارآموزی چهارماهه برای تولید برنامه‌های رادیویی جوانان به زبان‌های فارسی و پشتو.',
      'څلور میاشتنۍ کارآموزي چې په دري او پښتو د ځوانانو راډیویي برخې جوړوي.'
    ),
    description: i18n(
      '<h3>Training plan</h3><p>Rotations across scriptwriting, field recording, editing and live show production.</p><h4>Outcome</h4><ul><li>Portfolio of produced segments</li><li>Priority consideration for vacancies</li></ul>',
      '<h3>پلان آموزشی</h3><p>چرخش میان نوشتن سکریپت، ضبط میدانی، ادیت و تولید برنامه زنده.</p><h4>نتیجه</h4><ul><li>پورټفولیوی برنامه‌های تولیدشده</li><li>اولویت در بست‌های خالی آینده</li></ul>',
      '<h3>د روزنې پلان</h3><p>د سکریپټ لیکلو، ساحلي ثبت، ایډیټ او ژوندي شویو برنامه‌و ترمنځ څرخېدنه.</p><h4>پایله</h4><ul><li>د جوړو شویو برخو پورټفولیو</li><li>راتلونکو څوکیو کې لومړیتوب</li></ul>'
    ),
    tags: i18n(['media', 'internship', 'Balkh'], ['رسانه', 'کارآموزی', 'بلخ'], ['رسنۍ', 'کارآموزي', 'بلخ']),
  },];

async function main() {
  console.log('Seeding sample opportunities (LOCAL DB ONLY)...');

  // categories
  const catIds: Record<string, string> = {};
  for (const c of CATS) {
    const cat = await db.opportunityCategory.upsert({
      where: { slug: c.slug },
      update: { nameI18n: c.name as object, icon: c.icon, order: c.order },
      create: { name: c.name.en, nameI18n: c.name as object, slug: c.slug, icon: c.icon, order: c.order },
    });
    catIds[c.slug] = cat.id;
  }

  let created = 0, updated = 0, skipped = 0;
  for (const r of ROWS) {
    if (!r.title.en || r.title.en.startsWith('Placeholder')) { skipped++; continue; }
    const data = {
      title: r.title.en,
      titleI18n: r.title as object,
      organization: r.organization,
      country: r.country,
      deadline: r.deadline ? new Date(r.deadline) : null,
      featured: r.featured,
      status: 'published',
      jobType: r.jobType,
      jobTypeI18n: r.jobTypeT as object,
      categoryId: catIds[r.categorySlug],
      salary: r.salary ? r.salary.en : null,
      salaryI18n: (r.salary ?? undefined) as object | undefined,
      educationReq: r.educationReq ? r.educationReq.en : null,
      educationReqI18n: (r.educationReq ?? undefined) as object | undefined,
      experience: r.experience ? r.experience.en : null,
      experienceI18n: (r.experience ?? undefined) as object | undefined,
      aiSummary: r.summary.en,
      aiSummaryI18n: r.summary as object,
      description: r.description.en,
      descriptionI18n: r.description as object,
      tags: JSON.stringify((r.tags as { en: string[] }).en),
      tagsI18n: r.tags as object,
      translationStatus: 'complete',
      importStatus: null,
      sourceName: null,
      sourceUrl: null,
      originalUrl: null,
    };
    const existing = await db.opportunity.findUnique({ where: { slug: r.slug } });
    if (existing) {
      await db.opportunity.update({ where: { slug: r.slug }, data });
      updated++;
    } else {
      await db.opportunity.create({ data: { slug: r.slug, ...data } });
      created++;
    }
  }

  const total = await db.opportunity.count();
  console.log(`Sample opportunities: created=${created} updated=${updated} skipped=${skipped} (total in DB: ${total})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
