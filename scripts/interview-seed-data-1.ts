/**
 * Interview seed data — part 1: categories + scholarship/visa/job questions.
 * All content is trilingual: { en, fa (Dari), ps (Pashto) }.
 */
import type { Trilingual, TrilingualList } from './interview-seed-types';

export interface SeedQuestion {
  categorySlug: string;
  question: Trilingual;
  difficulty: 'beginner' | 'medium' | 'hard';
  sampleAnswer: Trilingual;
  strongExample: Trilingual;
  weakExample: Trilingual;
  tips: Trilingual;
  commonMistakes: TrilingualList;
  followUps: TrilingualList;
  expectedDuration: string;
}

export const SEED_CATEGORIES: {
  slug: string;
  name: Trilingual;
  description: Trilingual;
  icon: string;
  order: number;
}[] = [
  {
    slug: 'scholarship-interviews',
    name: { en: 'Scholarship Interviews', fa: 'مصاحبه‌های بورسیه', ps: 'د بورسۍ مرکې' },
    description: {
      en: 'Master the questions scholarship committees ask Afghan applicants and learn how to present your story convincingly.',
      fa: 'با سوالاتی که کمیسیون‌های بورسیه از متقاضیان افغان می‌پرسند آشنا شوید و یاد بگیرید داستان خود را قانع‌کننده ارائه کنید.',
      ps: 'د هغو پوښتنو سره بل شو چې د بورسیو کمیسیونونه له افغان کاندیدانو کوي، او زده کړه چې خپله کیسه باوري ډول وړاندې کړه.',
    },
    icon: 'GraduationCap',
    order: 1,
  },
  {
    slug: 'visa-interviews',
    name: { en: 'Visa Interviews', fa: 'مصاحبه‌های ویزا', ps: 'د ویزې مرکې' },
    description: {
      en: 'Consular interviews are short and decisive. Practice the exact questions visa officers ask and how to answer with confidence.',
      fa: 'مصاحبه‌های کنسولی کوتاه و تعیین‌کننده هستند. سوالات دقیق افسران ویزا را تمرین کنید و با اعتماد پاسخ دهید.',
      ps: 'کونسولي مرکې لنډې او پرېکونکې وي. هغه پوښتنې چې د ویزې افسران کوي تمرین کړه او با اعتماد ځواب ورکړه.',
    },
    icon: 'Plane',
    order: 2,
  },
  {
    slug: 'job-interviews',
    name: { en: 'Job Interviews', fa: 'مصاحبه‌های کاریابی', ps: 'د کار مرکې' },
    description: {
      en: 'From national organizations to international companies — practice the interview questions that decide who gets hired.',
      fa: 'از سازمان‌های ملی تا شرکت‌های بین‌المللی — سوالاتی که تعیین می‌کند چه کسی استخدام می‌شود را تمرین کنید.',
      ps: 'له ملي بنسټونو څخه تر نړیوالو شرکتونو پورې — هغه مرکې وګوره چې پرېکوي څوک ګمارل کیږي.',
    },
    icon: 'Briefcase',
    order: 3,
  },
  {
    slug: 'exchange-fellowships',
    name: { en: 'Exchange & Fellowship Programs', fa: 'برنامه‌های تبادلی و فلوشیپ', ps: 'د تبادلې او فلوشیپ پروګرامونه' },
    description: {
      en: 'Programs like Fulbright, YES and community exchanges look for leadership and impact. Practice what they really ask.',
      fa: 'برنامه‌هایی مانند فلبرایت، YES و تبادلات جامعه‌محور به دنبال رهبری و تأثیرگذاری هستند. آنچه واقعاً می‌پرسند را تمرین کنید.',
      ps: 'د فلبراټ، YES او ټولنیزو تبادلو پروګرامونه مشرتوب او اغېز لټوي. هغه څه چې رښتیا پوښتي تمرین کړه.',
    },
    icon: 'Globe2',
    order: 4,
  },
  {
    slug: 'graduate-admissions',
    name: { en: 'University Admissions', fa: 'پذیرش دانشگاهی', ps: 'پوهنتوني شاملېدنه' },
    description: {
      en: 'Admission interviews for bachelor and master programs — present your academic goals clearly and memorably.',
      fa: 'مصاحبه‌های پذیرش برای لیسانس و ماستری — اهداف تحصیلی خود را واضح و به‌یادماندنی ارائه کنید.',
      ps: 'د لیسانس او ماسټر پروګرامونو د شاملولو مرکې — خپل تحصیلي موخې روښانه او هېروونکې وړاندې کړه.',
    },
    icon: 'BookOpen',
    order: 5,
  },
  {
    slug: 'ngo-humanitarian',
    name: { en: 'NGO & Humanitarian Sector', fa: 'سازمان‌های مردم‌نهاد', ps: 'نادولتي او بشري بنسټونه' },
    description: {
      en: 'The humanitarian sector is one of Afghanistan\u2019s largest employers. Learn the values-based questions NGOs ask.',
      fa: 'بخش بشردوستانه یکی از بزرگ‌ترین بخش‌های استخدام‌کننده در افغانستان است. سوالات ارزش‌محور مردم‌نهادها را بیاموزید.',
      ps: 'بشري سکتور په افغانستان کې تر ټولو لوی ګمارونکې دی. د نادولتو ارزښتناکې پوښتنې زده کړه.',
    },
    icon: 'HeartHandshake',
    order: 6,
  },
];

export const SEED_QUESTIONS_PART1: SeedQuestion[] = [
  // ─── Scholarship interviews ───
  {
    categorySlug: 'scholarship-interviews',
    question: {
      en: 'Why do you want to study in this country instead of staying in Afghanistan or going to a neighboring country?',
      fa: 'چرا می‌خواهید در این کشور درس بخوانید، نه این‌که در افغانستان بمانید یا به کشور همسایه بروید؟',
      ps: 'ولې غواړې پدې هېواد کې ولولې، نه دا چې په افغانستان کې پاتې شې یا ګاونډي هېواد ته لاړ شې؟',
    },
    difficulty: 'medium',
    sampleAnswer: {
      en: 'Afghanistan has talented young people but limited advanced programs in my field. This country offers a curriculum and laboratory experience that simply does not exist at home. My goal is to master skills that are transferable: I chose this program because its graduates have built institutions back in developing countries, and I intend to do the same. Studying close to home would keep me within the same constraints I am trying to overcome.',
      fa: 'افغانستان جوانان بااستعداد دارد، اما برنامه‌های پیشرفته در رشته من محدود است. این کشور سرفصل‌ها و تجربه آزمایشگاهی را ارائه می‌کند که در وطن ما وجود ندارد. هدف من تسلط بر مهارت‌های قابل انتقال است: این برنامه را انتخاب کردم زیرا فارغان آن در کشورهای در حال توسعه نهادسازی کرده‌اند و من نیز همین قصد را دارم. درس خواندن در نزدیکی وطن مرا در همان محدودیت‌هایی نگه می‌دارد که تلاش می‌کنم از آن‌ها عبور کنم.',
      ps: 'افغانستان وروڼه ځوانان لري، خو زما په څانګه کې پرمختللي پروګرامونه لږ دي. دا هېواد هغه درسي پروګرام او لابراتواري تجربه وړاندې کوي چې په کور کې نشته. زما موخه د لېږد وړ مهارتونو ترلاسه کول دي: دا پروګرام مې ځکه غوره کړ چې فارغان یې په مخ پر ودې هېوادونو کې بنسټونه جوړ کړي، او زه هم همدا نیت لرم. نږدې کور لوستل به ما په هغو محدودیتونو کې وساتي چې غواړم ورهاخله.',
    },
    strongExample: {
      en: '\u201CI chose this program because its water-engineering lab directly matches the irrigation problems of my province, and I plan to return and work with the Ministry of Energy and Water.\u201D',
      fa: '\u00ABاین برنامه را انتخاب کردم زیرا آزمایشگاه مهندسی آب آن مستقیماً با مشکلات آبیاری ولایت من مرتبط است و قصد دارم بازگردم و با وزارت انرژی و آب کار کنم.\u00BB',
      ps: '\u00ABدا پروګرام مې ځکه غوره کړ چې د اوبو انجینري لابراتوار یې مستقیماً د زما ولایت د آبیاري ستونزو سره تړلی دی، او غواړم راستون شم او د انرژۍ او اوبو وزارت سره کار وکړم.\u00BB',
    },
    weakExample: {
      en: '\u201CBecause your country is developed and life is better there. There are no opportunities in Afghanistan.\u201D',
      fa: '\u00ABچون کشور شما پیشرفته است و زندگی بهتری دارد. در افغانستان هیچ فرصتی وجود ندارد.\u00BB',
      ps: '\u00ABځکه چې ستاسو هېواد پرمختللی دی او ژوند یې غوره دی. په افغانستان کې هېڅ فرصت نشته.\u00BB',
    },
    tips: {
      en: 'Never criticize Afghanistan — committees want future contributors, not refugees from their own country. Name the specific program strength and connect it to a concrete problem back home.',
      fa: 'هرگز از افغانستان انتقاد نکنید — کمیسیون‌ها به دنبال کسانی هستند که در آینده خدمت کنند، نه کسانی که از کشور خود بگریزند. نقطه قوت مشخص برنامه را نام ببرید و آن را به یک مشکل مشخص در وطن پیوند دهید.',
      ps: 'له افغانستان هېڅکله نیوکه مه کوه — کمیسیونونه هغه کسان غواړي چې راتلونکې کې خدمت وکړي، نه هغه چې له خپل هېواده وتښتي. د پروګرام ځانګړی ځواک نوم بوه او هغه د کور د یوې ځانګړې ستونزې سره وتړه.',
    },
    commonMistakes: {
      en: ['Criticizing Afghanistan or calling it hopeless', 'Giving a generic answer that fits any country', 'Not mentioning any plan to return or contribute'],
      fa: ['انتقاد از افغانستان یا ناامید نشان دادن آن', 'پاسخ کلی که برای هر کشوری مناسب باشد', 'اشتراک نکردن هیچ برنامه برای بازگشت یا خدمت'],
      ps: ['له افغانستان نیوکه کول یا یې بې‌هیلې ښودل', 'عمومي ځواب چې هر هېواد ته مناسب وي', 'د راستنېدو یا خدمت کوم پلان نه یادول'],
    },
    followUps: {
      en: ['Which specific course or lab attracted you to this program?', 'What problems in your field does Afghanistan face right now?'],
      fa: ['کدام درس یا آزمایشگاه خاص شما را به این برنامه جذب کرد؟', 'افغانستان اکنون با چه مشکلاتی در رشته شما روبه‌روست؟'],
      ps: ['کوم ځانګړی مضمون یا لابراتوار تا دې پروګرام ته راجذب کړ؟', 'افغانستان اوس په ستا څانګه کې له کومو ستونزو سره مخامخ دی؟'],
    },
    expectedDuration: '2-3 mins',
  },
  {
    categorySlug: 'scholarship-interviews',
    question: {
      en: 'Who is funding your education, and how will you cover costs that the scholarship does not include?',
      fa: 'چه کسی هزینه تحصیل شما را تأمین می‌کند و چگونه هزینه‌هایی را که بورسیه شامل نمی‌شود می‌پردازید؟',
      ps: 'څوک د ستا زده‌کړې لګښت پرغاړه اخلي، او هغه لګښتونه چې بورسۍ ورک نه کوي څنګه پرې کوې؟',
    },
    difficulty: 'medium',
    sampleAnswer: {
      en: 'The scholarship covers my tuition, a monthly stipend, health insurance and one round-trip ticket. My family has set aside a small emergency fund for costs like winter clothing or personal expenses, and I plan to work part-time on campus if the visa rules allow. I have already prepared a monthly budget so that no unexpected cost becomes a problem during my studies.',
      fa: 'بورسیه شهریه، مکافات ماهانه، بیمه صحی و یک بلیت رفت‌وبرگشت را پوشش می‌دهد. خانواده من برای هزینه‌هایی مانند لباس زمستانی یا مصارف شخصی یک اندوخته اضطراری کوچک کنار گذاشته است و اگر قوانین ویزا اجازه دهد، در دانشکاه کار نیمه‌وقت خواهم کرد. بودجه ماهانه‌ام را از قبل تهیه کرده‌ام تا هیچ هزینه غیرمنتظره‌ای در دوران تحصیل مشکل‌ساز نشود.',
      ps: 'بورسۍ فیس، میاشتنی لگښت، روغتیایي بیمه او یو د رفت‌وبرګشت ټکټ پر غاړه لري. زما کورنۍ د ژمني جامو یا شخصي لګښتونو لپاره یو کوچنی بېړنی پیسې برابروي، او که د ویزې قوانین اجازه ورکړي، په پوهنتون کې نیم‌وخته کار به وکړم. میاشتنی بودجه مې دمخه جوړ کړی چې هیڅ ناڅاپي لګښت زما د لوستلو په وخت کې ستونزه جوړه نه کړي.',
    },
    strongExample: {
      en: '\u201CThe scholarship covers tuition and living costs. I have a written budget and a small family fund as backup — I will not need to work illegally or drop out.\u201D',
      fa: '\u00ABبورسیه شهریه و هزینه زندگی را پوشش می‌دهد. بودجه مشخص و یک اندوخته کوچک خانوادگی به‌عنوان پشتوانه دارم — نیازی به کار غیرقانونی یا ترک تحصیل نخواهم داشت.\u00BB',
      ps: '\u00ABبورسۍ فیس او د ژوند لګښت پر غاړه لري. مشخص بودجه او د کورنۍ کوچنې مالۍ مې شته — غیرقانوني کار یا لوستل پرېښودو ته به اړ نه شم.\u00BB',
    },
    weakExample: {
      en: '\u201CI will find work immediately and send money home while studying full-time.\u201D',
      fa: '\u00ABبلافاصله کار پیدا می‌کنم و در کنار تحصیل تمام‌وقت به خانه پول می‌فرستم.\u00BB',
      ps: '\u00ABسمدلاسه کار به پیدا کړم او تر څنګ یې بشپړ وخت لوستلو په مهال کور ته به پیسې ولېږم.\u00BB',
    },
    tips: {
      en: 'Show that you have done the math: know exactly what the scholarship covers and what it does not. Officers worry about students who will overwork or violate visa terms for money.',
      fa: 'نشان دهید که حساب‌کتاب کرده‌اید: دقیقاً بدانید بورسیه چه چیزهایی را پوشش می‌دهد و چه چیزهایی را نه. افسران نگران دانشجویانی هستند که برای پول زیاد کار می‌کنند یا قوانین ویزا را نقض می‌کنند.',
      ps: 'ښکاره کړه چې حساب دې کړی: پوهه شه چې بورسۍ څه پر غاړه لري او څه نه. افسران له هغو زده‌کوونکو اندېښمن وي چې د پیسو لپاره ډېر کار کوي یا د ویزې قوانین ماتوي.',
    },
    commonMistakes: {
      en: ['Saying \u201CI will work to cover everything\u201D without a plan', 'Not knowing what the scholarship actually covers', 'Asking the committee for extra money'],
      fa: ['گفتن \u201Cبرای همه‌چیز کار می‌کنم\u201D بدون داشتن برنامه', 'ندانستن اینکه بورسیه واقعاً چه چیزهایی را پوشش می‌دهد', 'درخواست پول اضافه از کمیسیون'],
      ps: ['وایل \u00ABد هر څه لپاره کار به کوم\u00BB بې پلانه', 'نه پوهېدل چې بورسۍ رښتیا څه پر غاړه لري', 'له کمیسیون څخه اضافي پیسو غوښتل'],
    },
    followUps: {
      en: ['What is your monthly budget for accommodation and food?', 'Are you allowed to work part-time with this visa type?'],
      fa: ['بودجه ماهانه شما برای مسکن و خوراک چقدر است؟', 'با این نوع ویزا اجازه کار نیمه‌وقت دارید؟'],
      ps: ['د کور او خواړو لپاره ستا میاشتنی بودجه څومره دی؟', 'پدې ویزې سره نیم‌وخته کار کولو اجازه لرې؟'],
    },
    expectedDuration: '2-3 mins',
  },
  {
    categorySlug: 'scholarship-interviews',
    question: {
      en: 'What will you contribute to Afghanistan after you complete your studies?',
      fa: 'پس از پایان تحصیل، چه سهمی برای افغانستان خواهید داشت؟',
      ps: 'له لوستلو وروسته به افغانستان ته څه ونډه لرې؟',
    },
    difficulty: 'beginner',
    sampleAnswer: {
      en: 'My field is public health, and Afghanistan suffers from one of the highest maternal mortality rates in the region. After graduating I will join a national health organization and work on training midwives in rural provinces. In five years I want to lead a program that reduces maternal deaths in at least three provinces. I also plan to mentor younger students from my province who want to enter this field.',
      fa: 'رشته من صحت عامه است و افغانستان یکی از بالاترین نرخ‌های مرگ‌ومیر مادران در منطقه را دارد. پس از فراغت به یک سازمان صحی ملی می‌پیوندم و روی تربیه قابله‌ها در ولایات دورافتاده کار می‌کنم. در پنج سال آینده می‌خواهم برنامه‌ای را رهبری کنم که مرگ‌ومیر مادران را دست‌کم در سه ولایت کاهش دهد. همچنین قصد دارم از دانشجویان جوان ولایت خود که می‌خواهند وارد این رشته شوند، راهنمایی کنم.',
      ps: 'زما څانګه عامه روغتیا ده او افغانستان په سیمه کې د مېندلو د مړینې تر ټولو لوړې کچې سره مخامخ دی. له فراغت وروسته یوې ملي روغتیایي ادارې سره یوځای شم او په لرې پرتو ولایتونو کې د قابله ګانو روزنې پرې کار کووم. په پنځو کلونو کې غواړم داسې یو پروګرام مشري وکړم چې لږ تر لږه په درې ولایتونو کې د مېندلو مړینه کمه کړي. همدارنګه غواړم د خپل ولایت هغو ځوانانو ته لارښوونه وکړم چې غواړي پدې څانګه راشي.',
    },
    strongExample: {
      en: '\u201CI will return with skills in data analysis for health programs — my province has no specialists in this, so even one trained person changes how decisions are made.\u201D',
      fa: '\u00ABبا مهارت تحلیل معلومات برای برنامه‌های صحی بازمی‌گردم — ولایت من در این بخش متخصص ندارد، پس حتی یک نفر آموزش‌دیده نحوه تصمیم‌گیری را تغییر می‌دهد.\u00BB',
      ps: '\u00ABد روغتیایي پروګرامونو لپاره د معلوماتو تحلیل مهارت سره راستون شم — زما ولایت پدې برخه کې متخصص نه لري، نو یو روزل شوی کس هم د پرېکړو طریقه بدلوي.\u00BB',
    },
    weakExample: {
      en: '\u201CI will do anything my country needs. I love Afghanistan and I will help in every possible way.\u201D',
      fa: '\u00ABهر چیزی که کشورم نیاز داشته باشد انجام می‌دهم. افغانستان را دوست دارم و به هر شکل ممکن کمک خواهم کرد.\u00BB',
      ps: '\u00ABهر څه چې زما هېواد ورته اړتیا لري ترسره به کړم. افغانستان مې ډېر مینه وال یم او په هر ممکن ډول به مرسته وکړم.\u00BB',
    },
    tips: {
      en: 'Be specific: name a sector, a problem and a realistic first step. Committees hear \u201CI will help my country\u201D a hundred times a day — a concrete plan is what they remember.',
      fa: 'مشخص صحبت کنید: یک بخش، یک مشکل و یک قدم واقع‌بینانه اول را نام ببرید. کمیسیون‌ها روزانه صد بار جمله \u201Cبه کشورم کمک می‌کنم\u201D را می‌شنوند — یک برنامه مشخص است که در ذهن می‌ماند.',
      ps: 'ځانګړې وینا وکړه: یو سکتور، یوه ستونزه او یو واقعي لومړی ګام ونوموه. کمیسیونونه ورځ سلی ځله د \u00ABخپل هېواد ته به مرسته وکړم\u00BB جمله اوري — ځانګړی پلان هغه څه دی چې په یاد پاتې کیږي.',
    },
    commonMistakes: {
      en: ['Vague promises without any concrete field or plan', 'Suggesting you will stay abroad permanently', 'Overpromising \u201CI will become president\u201D-style answers'],
      fa: ['وعده‌های کلی بدون ذکر رشته یا برنامه مشخص', 'اشاره به ماندگاری دائمی در خارج', 'وعده‌های غیرواقعی از نوع \u201Cریس جمهور می‌شوم\u201D'],
      ps: ['تورې وعدي بې ځانګړي سکتور یا پلانه', 'دایمي بهر پاتې کېدو ته اشاره کول', 'غیر واقعي غټې وعدي لکه \u00ABولسمشر به شم\u00BB'],
    },
    followUps: {
      en: ['What is the biggest obstacle to that plan right now?', 'Which organizations in Afghanistan are already working on this?'],
      fa: ['بزرگ‌ترین موانع این برنامه اکنون چیست؟', 'کدام سازمان‌ها در افغانستان هم‌اکنون روی این موضوع کار می‌کنند؟'],
      ps: ['د دې پلان تر ټولو لویه خنډ اوس څه ده؟', 'په افغانستان کې کوم بنسټونه اوس پر دې کار کوي؟'],
    },
    expectedDuration: '2-3 mins',
  },
  {
    categorySlug: 'scholarship-interviews',
    question: {
      en: 'Describe a significant challenge you faced in your education and how you overcame it.',
      fa: 'یکی از بزرگ‌ترین چالش‌های تحصیلی خود را توضیح دهید و بگویید چگونه از آن عبور کردید.',
      ps: 'د خپلو زده‌کړو یوه لویه ننګونه بیان کړه او ووایه چې څنګه ورهاخله شوه.',
    },
    difficulty: 'medium',
    sampleAnswer: {
      en: 'During grade 11 our province experienced weeks of school closures. I organized five classmates to study together at home and we shared one textbook between us. When exams were announced with only two weeks\u2019 notice, we had covered the entire syllabus. That experience taught me that resources are often a matter of organization, not just access — and it is why I later started a free English study circle for younger students.',
      fa: 'در صنف یازدهم، ولایت ما چندین هفته شاید را تجربه کرد. من پنج همصنفی خود را سازماندهی کردم تا در خانه با هم درس بخوانیم و یک کتاب را بین خود تقسیم کردیم. وقتی امتحانات با دو هفته اطلاع‌رسانی اعلام شد، تمام سرفصل‌ها را پوشانده بودیم. آن تجربه به من آموخت که منابع اغلب مسئله سازماندهی هستند نه فقط دسترسی — و به همین دلیل بعداً یک حلقه مطالعاتی رایگان انگلیسی برای دانش‌آموزان کوچک‌تر راه‌اندازی کردم.',
      ps: 'په ۱۱ ټولګي کې زموږ ولایت تر څو اونیو د ښوونځیو تړل تجربه کړل. ما پنځه ټولګیوال سره راټول کړل چې په کور کې یوځای ولولو او یو کتاب مو ووېشو. کله چې ازموینې یوازې په دوه اونیو خبرتیا اعلان شوې، موږ بشپړ نصاب لوستی و. دغه تجربه راته وښوده چې سرچینې ډېری د تنظیم مسئله ده، نه یوازې لاسرسی — او همدا لامل و چې وروسته مې د کوچنیانو لپاره د انګلیسي وړیا مطالعاتي ډله پیل کړه.',
    },
    strongExample: {
      en: '\u201CWhen the internet was cut, I printed materials from a friend\u2019s phone, organized a study group, and we all passed — two of us with the highest marks in the district.\u201D',
      fa: '\u00ABوقتی انترنت قطع شد، از تلفن یک دوست مطالب را چاپ کردم، گروه مطالعاتی تشکیل دادم و همه قبول شدیم — دو نفر ما بالاترین نمرات ولسوالی را گرفتند.\u00BB',
      ps: '\u00ABکله چې انټرنټ پرې شو، د یو ملګري له تلیفون څخه مواد چاپ کړل، مطالعاتي ډله مې جوړه کړه او موږ ټولو بریالی شو — دوه تنه مو د ولسوالۍ لوړې نمرې اخیستې.\u00BB',
    },
    weakExample: {
      en: '\u201CWe are poor and everything is difficult in Afghanistan. Life is very hard for us.\u201D',
      fa: '\u00ABما فقیر هستیم و در افغانستان همه‌چیز سخت است. زندگی برای ما بسیار دشوار است.\u00BB',
      ps: '\u00ABموږ غریب یو او په افغانستان کې هر څه ستوندی دي. ژوند موږ ته ډېر سخت دی.\u00BB',
    },
    tips: {
      en: 'Use the STAR structure: Situation, Task, Action, Result. Committees want evidence of resilience and initiative — end every story with a measurable outcome.',
      fa: 'از ساختار STAR استفاده کنید: موقعیت، وظیفه، اقدام، نتیجه. کمیسیون‌ها به شواهد تاب‌آوری و ابتکار عمل نیاز دارند — هر داستان را با یک نتیجه قابل اندازه‌گیری به پایان برسانید.',
      ps: 'د STAR جوړښت وکاروه: حالت، دنده، اقدام، پایله. کمیسیونونه د زغمال او ابتکار شواهد غواړي — هره کیسه د یوې اندازه کېدونکې پایلې سره پای ته ورسوه.',
    },
    commonMistakes: {
      en: ['Telling a sad story with no personal action', 'Choosing a challenge too small to be credible', 'Forgetting to state the result'],
      fa: ['تعریف یک داستان غم‌انگیز بدون اقدام شخصی', 'انتخاب چالش بسیار کوچک و باورنکردنی', 'فراموش کردن بیان نتیجه'],
      ps: ['د یوې خواشینې کیسې ویل بې شخصي اقدام', 'د ډېرې کوچنۍ او باوري نه کېدونکې ننګونې غوره کول', 'د پایلې بیانول هېرول'],
    },
    followUps: {
      en: ['What would you do differently if it happened again?', 'How did that experience change the way you study?'],
      fa: ['اگر دوباره اتفاق می‌افتاد، چه چیزی را متفاوت انجام می‌دادید؟', 'آن تجربه چگونه روش درس خواندن شما را تغییر داد؟'],
      ps: ['که بیا پېښ شوه، څه به یې بېل ډول ترسره کړې؟', 'هغه تجربه د ستا د لوستلو طریقه څنګه بدله کړه؟'],
    },
    expectedDuration: '2-3 mins',
  },

  // ─── Visa interviews ───
  {
    categorySlug: 'visa-interviews',
    question: {
      en: 'What is the purpose of your trip?',
      fa: 'هدف سفر شما چیست؟',
      ps: 'د ستا د سفر موخه څه ده؟',
    },
    difficulty: 'beginner',
    sampleAnswer: {
      en: 'I am traveling to begin a two-year master\u2019s program in civil engineering at [University], which starts on [date]. I have the admission letter and scholarship confirmation with me. After completing the program I will return to Afghanistan, where I have a job offer waiting at a construction company.',
      fa: 'برای شروع برنامه دو ساله ماستری مهندسی عمر در [دانشگاه] سفر می‌کنم که از تاریخ [تاریخ] آغاز می‌شود. نامه پذیرش و تأییدیه بورسیه را همراه دارم. پس از اتمام برنامه به افغانستان بازمی‌گردم، جایی که پیشنهاد کار یک شرکت ساختمانی برایم آماده است.',
      ps: 'د [پوهنتون] په [نېټه] پیلېدونکي دوه کلن ماسټر پروګرام ته ځم چې د ملکي انجینرۍ څانګه ده. د شاملولو لیک او د بورسۍ تصدیق سره لرم. له پروګرام وروسته افغانستان ته راستون شم چې هلته د یوې ساختماني شرکت د کار وړاندیز راتلونکی دی.',
    },
    strongExample: {
      en: '\u201CI will start the master\u2019s program in Computer Science at X University in September — here is my I-20 and scholarship letter. I return after graduation to work in Afghanistan\u2019s telecom sector.\u201D',
      fa: '\u00ABدر سپتامبر برنامه ماستری علوم کمپیوتر در دانشگاه X را آغاز می‌کنم — این I-20 و نامه بورسیه من است. پس از فراغت برای کار در بخش مخابرات افغانستان برمی‌گردم.\u00BB',
      ps: '\u00ABپه سپتمبر کې د X پوهنتون د کمپیوټر ساینس ماسټر پروګرام پیلوم — دا زما I-20 او د بورسۍ لیک دی. له فراغت وروسته د افغانستان د مخابراتو سکتور کې د کار لپاره راستون شم.\u00BB',
    },
    weakExample: {
      en: '\u201CI want to go and see the country, maybe study, maybe work — I will decide there.\u201D',
      fa: '\u00ABمی‌خواهم بروم و کشور را ببینم، شاید درس بخوانم، شاید کار کنم — آنجا تصمیم می‌گیرم.\u00BB',
      ps: '\u00ABغواړم لاړ شم او هېواد ووینم، کېدا شي ولولم، کېدا شي کار وکړم — هلته به پرېکړه وکړم.\u00BB',
    },
    tips: {
      en: 'Answer in one clear sentence, then offer the document. Consular officers spend 2-3 minutes per applicant — vagueness reads as deception. Never say \u201Cwork\u201D on a student visa.',
      fa: 'در یک جمله واضح پاسخ دهید، سپس سند را ارائه کنید. افسران کنسولی ۲-۳ دقیقه به هر متقاضی وقت می‌دهند — مبهم‌گویی دروغ تلقی می‌شود. در ویزای تحصیلی هرگز نگویید \u201Cکار\u201D.',
      ps: 'په یوه روښانه جمله ځواب ورکړه، بیا سند وښيه. کونسولي افسران هر کاندید ته ۲-۳ دقیقې ورکوي — تردید دروغ ښکاري. په تحصیلي ویزه کې هېڅکله \u00ABکار\u00BB مه وایه.',
    },
    commonMistakes: {
      en: ['Rambling or giving an unprepared long story', 'Mentioning work or immigration intentions', 'Not knowing your own program start date'],
      fa: ['پرحرف بودن یا تعریف داستان طولانی و بی‌آمادگی', 'اشاره به قصد کار یا مهاجرت', 'ندانستن تاریخ شروع برنامه خود'],
      ps: ['ډېر خبرې کول یا بې چمتووالي اوږده کیسه کول', 'د کار یا مهاجرت نیت یادول', 'د خپل پروګرام د پیل نېټه نه پوهېدل'],
    },
    followUps: {
      en: ['Why this university?', 'What will you do during the summer break?'],
      fa: ['چرا این دانشگاه؟', 'در تعطیلات تابستانی چه خواهید کرد؟'],
      ps: ['ولې دا پوهنتون؟', 'په اوړي رخصتۍ کې به څه کوې؟'],
    },
    expectedDuration: '1-2 mins',
  },
  {
    categorySlug: 'visa-interviews',
    question: {
      en: 'How do I know you will return to Afghanistan after your program?',
      fa: 'از کجا معلوم که پس از پایان برنامه به افغانستان بازخواهید گشت؟',
      ps: 'له چېرې وپوهېږم چې له پروګرام وروسته افغانستان ته به راستون شې؟',
    },
    difficulty: 'hard',
    sampleAnswer: {
      en: 'Three reasons. First, my entire family — my parents and four siblings — lives in Kabul and my role in the household is real. Second, my career plan only works in Afghanistan: I want to join the expanding construction sector, where my degree is rare and valuable. Third, I already have concrete commitments — a ministry supervisor has agreed to host my thesis fieldwork, and my return connects to an actual job market, not a hope.',
      fa: 'سه دلیل. نخست، تمام خانواده من — پدر و مادر و چهار خواهر و برادرم — در کابل زندگی می‌کنند و نقش من در خانواده واقعی است. دوم، برنامه کاری من فقط در افغانستان جواب می‌دهد: می‌خواهم به سکتور رو به رشد ساختمانی بپیوندم، جایی که رشته من کمیاب و ارزشمند است. سوم، تعهدات مشخص دارم — یک مسئول وزارت برای پژوهش میدانی تیزس من موافقت کرده و بازگشت من به یک بازار کار واقعی وصل است، نه یک امید.',
      ps: 'درې دلیلونه. لومړی، زما ټوله کورنۍ — پلار، مور او څلور خویندې وروڼه — په کابل کې ژوند کوي او په کور کې زما واقعي دنده ده. دویم، زما د کار پلان یوازې په افغانستان کې جوړیږي: غواړم د پراخېدونکي ساختماني سکتور سره یوځای شم چیرته چې زما څانګه کمه او ارزښتناکه ده. درېیم، ځانګړې ژمنې لرم — د یو وزارت مسؤل زما د تیزس میداني څېړنې لپاره موافقه کړې او راستنېدنه مې د یو حقیقي کار بازار سره تړلې ده، نه یوازې هیله.',
    },
    strongExample: {
      en: '\u201CMy father\u2019s business is transferring a branch to me, my scholarship contract includes a two-year home-service clause, and my wife and daughter remain in Kabul.\u201D',
      fa: '\u00ABتجارت پدرم یک شعبه را به من می‌سپارد، قرارداد بورسیه من دو سال خدمت در وطن را الزامی می‌کند، و همسر و دخترم در کابل می‌مانند.\u00BB',
      ps: '\u00ABزما پلار یوه څانګه ما ته سپاري، د زما بورسۍ قرارداد دوه کاله کورنی خدمت الزامی کوي، او مېرمنې او لور مې په کابل کې پاتې کیږي.\u00BB',
    },
    weakExample: {
      en: '\u201CI promise I will return. Afghanistan is my country and I love it.\u201D',
      fa: '\u00ABقول می‌دهم که بازگردم. افغانستان کشور من است و آن را دوست دارم.\u00BB',
      ps: '\u00ABژمنه کوم چې راستون به شم. افغانستان زما هېواد دی او ورسره مینه لرم.\u00BB',
    },
    tips: {
      en: 'Officers assess \u201Cties\u201D: family, property, job prospects, community role. Present two or three verifiable ties calmly. Emotional promises without evidence convince no one.',
      fa: 'افسران \u201Cپیوندها\u201D را ارزیابی می‌کنند: خانواده، ملکیت، چشم‌انداز شغلی، نقش اجتماعی. دو سه پیوند قابل راستی‌آزمایی را با آرامش ارائه کنید. وعده‌های احساسی بدون سند هیچ‌کس را قانع نمی‌کند.',
      ps: 'افسران \u00ABتړاونې\u00BB ارزوي: کورنۍ، ملکیت، د کار امکانات، ټولنیزه ونډه. دوه یا درې تړاونې چې ثابتېدلی شي په ارامه وړاندې کړه. احساساتي ژمنې بې شواهد چا نه قانعوي.',
    },
    commonMistakes: {
      en: ['Only emotional arguments with no evidence', 'Saying \u201CI will earn a lot and settle abroad\u201D even jokingly', 'Arguing when the officer expresses doubt'],
      fa: ['استدلال صرفاً احساسی بدون سند', 'گفتن \u201Cپول زیاد به دست می‌آورم و خارج می‌مانم\u201D حتی به شوخی', 'بحث کردن وقتی افسر تردید می‌کند'],
      ps: ['یوازې احساساتي استدلال بې شواهد', 'وایل \u00ABډېرې پیسې به پیدا کړم او بهر به پاتې شم\u00BB حتی په مسخره ډول', 'کله چې افسر شک ښيي، په جدل پیل کول'],
    },
    followUps: {
      en: ['What job exactly will you return to?', 'Do you have family members who already migrated abroad?'],
      fa: ['دقیقاً به چه کاری برمی‌گردید؟', 'آیا اقوامی دارید که قبلاً به خارج مهاجرت کرده باشند؟'],
      ps: ['په ځانګړي ډول به کوم کار ته راستون شې؟', 'کورنۍ غړي لرې چې پخوا بهر مهاجر شوي وي؟'],
    },
    expectedDuration: '2-3 mins',
  },
  {
    categorySlug: 'visa-interviews',
    question: {
      en: 'Who is sponsoring your trip, and what do they do for a living?',
      fa: 'چه کسی هزینه سفر شما را تأمین می‌کند و شغل او چیست؟',
      ps: 'څوک د ستا د سفر لګښت پر غاړه اخلي، او د هغه کار څه دی؟',
    },
    difficulty: 'medium',
    sampleAnswer: {
      en: 'My sponsorship comes from two places. The scholarship covers tuition and a monthly stipend — the award letter is in my file. My uncle, who owns a hardware import business in Kabul, covers the remaining travel and settlement costs; his bank statement and sponsorship letter are also included. I can explain exactly how each cost is covered if helpful.',
      fa: 'هزینه‌های من از دو جا تأمین می‌شود. بورسیه شهریه و مکافات ماهانه را پوشش می‌دهد — نامه بورسیه در فایل من است. دایي من که یک تجارت واردات مصالح ساختمانی در کابل دارد، هزینه‌های باقی‌مانده سفر و اسکان را می‌پردازد؛ صورت‌حساب بانکی و نامه کفالت او نیز ضمیمه است. اگر لازم باشد، می‌توانم دقیقاً توضیح دهم که هر هزینه چگونه پوشش داده می‌شود.',
      ps: 'زما لګښت له دوه ځایونو رارسېږي. بورسۍ فیس او میاشتنی لگښت پر غاړه لري — د بورسۍ لیک زما په فایل کې دی. زما ماما چې په کابل کې د ساختماني توکو سوداګري لري، د سفر او استوګنې پاتې لګښت پرې کوي؛ د هغه بانکي سټیټمینټ او د کفالت لیک هم ضمیمه دی. که اړتیا وي، کولی شم په ډاډ سره ووایم چې هر لګښت څنګه پوښل کیږي.',
    },
    strongExample: {
      en: '\u201CThe Fulbright program covers tuition and living; my father, a government doctor, pays only the visa fee. Documents are here — tuition letter first, family statement second.\u201D',
      fa: '\u00ABبرنامه فلبرایت شهریه و زندگی را پوشش می‌دهد؛ پدرم که داکتر دولت است فقط هزینه ویزا را می‌پردازد. اسناد اینجا هستند — نامه شهریه اول، صورت‌حساب خانواده دوم.\u00BB',
      ps: '\u00ABفلبراټ پروګرام فیس او ژوند پر غاړه لري؛ زما پلار چې دولتي ډاکټر دی یوازې د ویزې فیس ورکوي. اسناد دلته دي — د فیس لیک لومړی، د کورنۍ سټیټمینټ دویم.\u00BB',
    },
    weakExample: {
      en: '\u201CMy family will pay. We have money, don\u2019t worry about it.\u201D',
      fa: '\u00ABخانواده‌ام می‌پردازد. ما پول داریم، نگران نباشید.\u00BB',
      ps: '\u00ABزما کورنۍ پرې کوي. موږ پیسې لرو، اندېښنه مه کوه.\u00BB',
    },
    tips: {
      en: 'Know your sponsor\u2019s occupation, monthly income and relationship to you — officers verify consistency between your words and the documents. Hesitation here is the most common cause of refusal.',
      fa: 'شغل، درآمد ماهانه و نسبت حامی مالی خود را بدانید — افسران تطابق کلام شما با اسناد را بررسی می‌کنند. تردید در این بخش شایع‌ترین دلیل رد شدن است.',
      ps: 'د خپل سپانسر کار، میاشتنی عاید او اړیکه په ښه یاد لره — افسران ستا د ویناوو او اسنادو سمون ګوري. پدې برخه کې تردید تر ټولو عام د رد کېدو لامل دی.',
    },
    commonMistakes: {
      en: ['Not knowing the sponsor\u2019s exact occupation or income', 'Sponsor documents that contradict your statements', 'Changing your answer when asked twice'],
      fa: ['ندانستن شغل یا درآمد دقیق حامی مالی', 'اسنادی که با گفته‌های شما تناقض دارند', 'تغییر پاسخ هنگام پرسش دوباره'],
      ps: ['د سپانسر ځانګړی کار یا عاید نه پوهېدل', 'داسې اسناد چې ستا د ویناوو سره ټکر ولري', 'په دویم پوښتنه کې ځواب بدلول'],
    },
    followUps: {
      en: ['How much does your sponsor transfer annually?', 'Will your sponsor continue supporting you next year?'],
      fa: ['حامی مالی شما سالانه چقدر پول ارسال می‌کند؟', 'آیا حامی شما سال آینده هم حمایت خواهد کرد؟'],
      ps: ['ستا سپانسر کال کې څومره پیسې لېږي؟', 'ستا سپانسر راتلونکی کال هم مرسته به کوي؟'],
    },
    expectedDuration: '1-2 mins',
  },
  {
    categorySlug: 'visa-interviews',
    question: {
      en: 'What will you do if your visa application is refused?',
      fa: 'اگر درخواست ویزای شما رد شود، چه خواهید کرد؟',
      ps: 'که ستا د ویزې غوښتنه رد شي، څه به کوې؟',
    },
    difficulty: 'medium',
    sampleAnswer: {
      en: 'I would ask for the refusal reason in writing, correct the specific weakness — whether a document gap or a funding question — and reapply with a stronger file. If the timing no longer works for this intake, I will keep my admission for the next cycle and use the time to gain professional experience here. A refusal would disappoint me, but it would not end my plan.',
      fa: 'ابتدا دلیل رد شدن را کتباً می‌پرسم، ضعف مشخص را برطرف می‌کنم — چه کمبود سند باشد چه سوال بودجه — و با فایل قوی‌تر دوباره درخواست می‌دهم. اگر وقت برای این نوبت مناسب نباشد، پذیرش خود را برای دوره بعد نگه می‌دارم و از این زمان برای کسب تجربه حرفه‌ای اینجا استفاده می‌کنم. رد شدن ناامیدم می‌کند، اما برنامه‌ام را پایان نمی‌دهد.',
      ps: 'لومړی به د رد کېدو دلیل په لیکلي ډول پوښتم، ځانګړی ضعف به سموم — که سند کم وي که د بودجې پوښتنه — او په قوي فایل سره به بیا غوښتنه کوم. که وخت دې نوبت ته مناسب نه وي، شاملولو به راتلونکې دوره لپاره وساتم او دا مهال به د مسلکي تجربې لپاره وکاروم. رد کېدل به ناامیدم کړي، خو زما پلان به نه پای ته رسوي.',
    },
    strongExample: {
      en: '\u201CI would read the refusal reason carefully, fix exactly that gap, and reapply — my university also allows deferral for one year, so the plan survives either way.\u201D',
      fa: '\u00ABدلیل رد شدن را دقیق می‌خوانم، همان کمبود را برطرف می‌کنم و دوباره درخواست می‌دهم — دانشگاه من همچنین امکان تعویق یک ساله دارد، پس برنامه در هر حال باقی می‌ماند.\u00BB',
      ps: '\u00ABد رد کېدو دلیل به په دقت ولولم، هماغه کمښت به سم کړم او بیا به غوښتنه وکړم — زما پوهنتون د یو کال ځنډ هم اجازه ورکوي، نو پلان په هر حالت کې ژوندی پاتې کیږي.\u00BB',
    },
    weakExample: {
      en: '\u201CI will try through another country or another passport route.\u201D',
      fa: '\u00ABاز طریق کشور دیگر یا مسیر پاسپورت دیگری تلاش خواهم کرد.\u00BB',
      ps: '\u00ABله بل هېواد یا بل پاسپورټ لارې به هڅه وکړم.\u00BB',
    },
    tips: {
      en: 'This question tests maturity, not ties. Show a calm, lawful, plan-B mindset. Never suggest illegal migration routes — it is an automatic refusal.',
      fa: 'این سوال بلوغ شما را می‌سنجد، نه پیوندهایتان را. ذهنیت آرام، قانونی و دارای پلان جایگزین را نشان دهید. هرگز مسیرهای غیرقانونی مهاجرت را مطرح نکنید — رد فوری در پی دارد.',
      ps: 'دا پوښتنه د سړي پختوالی ګوري، نه تړاونې. ارام، قانوني او د پلان-B ذهنیت وښيه. هېڅکله غیرقانوني مهاجرت لارې مه یادوه — سمدلاسه رد کېدو لامل ګرځي.',
    },
    commonMistakes: {
      en: ['Becoming emotional or pleading', 'Mentioning illegal or irregular migration options', 'Saying \u201Cmy life will be ruined\u201D'],
      fa: ['احساساتی یا التماس‌آمیز شدن', 'اشاره به مسیرهای غیرقانونی مهاجرت', 'گفتن \u201Cزندگی‌ام نابود می‌شود\u201D'],
      ps: ['احساساتي کېدل یا لاسي راکول', 'غیرقانوني مهاجرت لارې یادول', 'وایل \u00ABژوند مې تباه شي\u00BB'],
    },
    followUps: {
      en: ['Have you applied for a visa before?', 'What was the outcome of that application?'],
      fa: ['قبلاً درخواست ویزا داده‌اید؟', 'نتیجه آن درخواست چه شد؟'],
      ps: ['پخوا د ویزې غوښتنه کړې ده؟', 'د هغې غوښتنې پایله څه شوه؟'],
    },
    expectedDuration: '1-2 mins',
  },

  // ─── Job interviews ───
  {
    categorySlug: 'job-interviews',
    question: {
      en: 'Tell me about yourself and your professional background.',
      fa: 'کمی درباره خود و سوابق حرفه‌ای خود بگویید.',
      ps: 'لږ د ځان او مسلکي تجربې په اړه ووایه.',
    },
    difficulty: 'beginner',
    sampleAnswer: {
      en: 'I am an administrative professional with three years of experience in NGO operations in Herat. I currently manage procurement and reporting for a health project serving 40,000 people. My strengths are documentation, donor compliance and Excel-based reporting systems. I am looking for a role where I can grow into project administration while bringing my compliance experience to a larger team.',
      fa: 'یک متخصص اداری با سه سال تجربه در عملیات مردم‌نهاد در هرات هستم. در حال حاضر خریدها و گزارش‌دهی یک پروژه صحی را که به ۴۰ هزار نفر خدمات می‌دهد، مدیریت می‌کنم. نقاط قوت من مستندسازی، رعایت شرایط تمویل‌کنندگان و سیستم‌های گزارش‌دهی با اکسل است. به دنبال جایگاهی هستم که بتوانم به سمت اداره پروژه رشد کنم و تجربه رعایت مقرراتم را به تیمی بزرگ‌تر بیاورم.',
      ps: 'زه په هرات کې د نادولتو عملیاتو کې درې کلنه تجربه لرونکی مسلکي اداري کس یم. اوس د یو روغتیایي پروژې چې ۴۰ زره کسانو ته خدمت کوي، تدارکات او رپوټونه اداره کوم. زما ځواکمنې خواوې سند جوړول، د تمویل کوونکو مقرراتو رعایت او د اکسل رپوټيټ سیسټمونه دي. داسې مقام لټوم چې په کې پروژه ادارې ته وده وکړم او خپله تجربه یو لوی ټیم ته راوړم.',
    },
    strongExample: {
      en: '\u201CI\u2019m a finance officer with 3 years in donor-funded projects — I introduced a monthly reconciliation system that cut reporting errors by 60% — and now I want to bring that discipline to your logistics team.\u201D',
      fa: '\u00ABیک مسؤول مالی با سه سال تجربه در پروژه‌های تمویل‌شده هستم — سیستم تسویه ماهانه‌ای معرفی کردم که خطاهای گزارش‌دهی را ۶۰٪ کاهش داد — و اکنون می‌خواهم این نظم را به تیم لجستیک شما بیاورم.\u00BB',
      ps: '\u00ABزه درې کلنه تجربه لرونکی مالي مسؤل یم — میاشتنی سمون سیسټم مې پیل کړ چې د رپوټ تېروتنې ۶۰٪ کمې کړې — او اوس غواړم دا نظم ستا د لوجستیک ټیم ته راوړم.\u00BB',
    },
    weakExample: {
      en: '\u201CMy name is Ahmad, I am from Kabul, I finished school in 2018 and I am married with two children.\u201D',
      fa: '\u00ABمن احمد هستم، از کابل، در سال ۲۰۱۸ مکتب را تمام کردم و متأهل با دو فرزند هستم.\u00BB',
      ps: '\u00ABزه احمد یم، له کابل څخه، په ۲۰۱۸ کې مې ښوونځی بشپړ کړ او واده کړی یم دوه اولادونه لرم.\u00BB',
    },
    tips: {
      en: 'Use Present–Past–Future: what you do now, key past achievements with numbers, why this role is your logical next step. Keep it under 90 seconds and end pointing at the job.',
      fa: 'از ساختار حال–گذشته–آینده استفاده کنید: اکنون چه می‌کنید، دستاوردهای کلیدی گذشته با اعداد، و چرا این جایگاه قدم منطقی بعدی شماست. زیر ۹۰ ثانیه نگه دارید و با اشاره به همین شغل تمام کنید.',
      ps: 'اوس–تېر–راتلونکی جوړښت وکاروه: اوس څه کوې، په تېرو کې مهم لاسته راوړنې شمېرې سره، او ولې دا مقام ستا منطقي ګام دی. تر ۹۰ ثانیو لاندې یې وکړه او د دې دندې په اشاره پای ته ورسوه.',
    },
    commonMistakes: {
      en: ['Reciting your biography instead of your professional value', 'Going over three minutes', 'No numbers or concrete achievements'],
      fa: ['بازگو کردن زندگی‌نامه به جای ارزش حرفه‌ای', 'بیش از سه دقیقه صحبت کردن', 'نبود اعداد یا دستاورد مشخص'],
      ps: ['د مسلکي ارزښت پر ځای ژوندلیک تکرارول', 'له درې دقیقو زیاتې خبرې', 'شمېرې یا ځانګړې لاسته راوړنې نه لرل'],
    },
    followUps: {
      en: ['Which of those achievements are you most proud of?', 'Why are you leaving your current organization?'],
      fa: ['به کدام دستاورد بیشتر افتخار می‌کنید؟', 'چرا سازمان فعلی خود را ترک می‌کنید؟'],
      ps: ['په کومې لاسته راوړنې ډېر ویاړ کوې؟', 'ولې خپله اوسنۍ اداره پرېږدې؟'],
    },
    expectedDuration: '2 mins',
  },
  {
    categorySlug: 'job-interviews',
    question: {
      en: 'Why should we hire you over candidates with more experience?',
      fa: 'چرا باید شما را به جای کاندیداهای باتجربه‌تر استخدام کنیم؟',
      ps: 'ولې تا وګمارو نه هغه کاندیدان چې ډېره تجربه لري؟',
    },
    difficulty: 'medium',
    sampleAnswer: {
      en: 'Experience matters, but this role needs someone who can work with your new digital reporting system — that is exactly where I am strongest. I also bring three years of working directly with communities in Badakhshan, which means fewer field mistakes and faster trust-building with beneficiaries. Experienced candidates may match you on years; I match you on the exact skills this project will use every week.',
      fa: 'تجربه مهم است، اما این جایگاه به کسی نیاز دارد که با سیستم جدید گزارش‌دهی دیجیتال شما کار کند — دقیقاً همان‌جا نقطه قوت من است. همچنین سه سال کار مستقیم با جوامع در بدخشان دارم، یعنی خطاهای میدانی کمتر و اعتمادسازی سریع‌تر با مستفیدکنندگان. کاندیداهای باتجربه ممکن است در سال‌های کار با شما برابر باشند؛ من در مهارت‌هایی با شما همخوانم که این پروژه هر هفته از آن‌ها استفاده می‌کند.',
      ps: 'تجربه مهمه، خو دا مقام هغه چا ته اړتیا لري چې ستا د نوي ډیجیټل رپوټيټ سیسټم سره کار وکړي — همدلته زما تر ټولو قوي خوا ده. همدارنګه په بدخشان کې د ټولنو سره درې کلنه مستقیمه تجربه لرم، یعنی کمې میداني تېروتنې او ژر د ګټه اخیستونکو باور. باتجربه کاندیدان په کلونو کې ستا سره برابر وي؛ زه په هغو مهارتونو کې ستا سره سم یم چې دا پروژه هره اونۍ کاروي.',
    },
    strongExample: {
      en: '\u201CThe job ad stresses Kobo Toolbox and community mobilization. I have deployed 12 Kobo surveys in the field and mobilized 30 village volunteers — those two needs are exactly my track record.\u201D',
      fa: '\u00ABدر اعلان شغلی بر Kobo Toolbox و بسیج جامعه تأکید شده است. من ۱۲ نظرسنجی Kobo در میدان اجرا کرده‌ام و ۳۰ داوطلب دهاتی را بسیج کرده‌ام — این دو نیاز دقیقاً سابقه کار من است.\u00BB',
      ps: '\u00ABد دندې اعلان پر Kobo Toolbox او ټولنیز راټولولو ټینګار کوي. ما ۱۲ Kobe سروې په میدان کې پلي کړې او ۳۰ کليوال رضاکاران راټول کړي — دا دوه اړتیاوې رښتیا زما کارنامې دي.\u00BB',
    },
    weakExample: {
      en: '\u201CI am a fast learner and I will work harder than anyone. Please give me a chance.\u201D',
      fa: '\u00ABسریع یاد می‌گیرم و از همه بیشتر کار می‌کنم. لطفاً به من فرصت بدهید.\u00BB',
      ps: '\u00ABژر زده کړه کوم او له هر چا زیات کار به کوم. مهرباني وکړه فرصت راکړه.\u00BB',
    },
    tips: {
      en: 'Never argue against experience — reframe. Map the job ad\u2019s top three requirements to your specific evidence, and let the comparison be implicit.',
      fa: 'هرگز با تجربه بحث نکنید — چارچوب را عوض کنید. سه نیاز اصلی اعلان شغلی را به شواهد مشخص خود نگاشت کنید و مقایسه را ضمنی بگذارید.',
      ps: 'له تجربې هېڅکله جدل مه کوه — چوکاټ بدل کړه. د دندې اعلان درې اصلي اړتیاوې خپلو ځانګړو شواهدو سره ونښلوه او پرتله کول ترخه پرېښوده.',
    },
    commonMistakes: {
      en: ['Criticizing the other candidates', 'Begging or \u201Cgive me a chance\u201D language', 'Ignoring the job requirements entirely'],
      fa: ['انتقاد از کاندیداهای دیگر', 'التماس یا زبان \u201Cفرصت بدهید\u201D', 'نادیده گرفتن کامل نیازمندی‌های شغل'],
      ps: ['له نورو کاندیدانو نیوکه کول', 'لاسي راکول یا \u00ABفرصت راکړه\u00BB ژبه', 'د دندې اړتیاوو بشپړ نه پام کول'],
    },
    followUps: {
      en: ['What is your weakest area for this role?', 'How long would you need to be fully independent here?'],
      fa: ['ضعیف‌ترین بخش شما برای این شغل چیست؟', 'چقدر زمان لازم دارید تا کاملاً مستقل کار کنید؟'],
      ps: ['د دې دندې لپاره ستا تر ټولو کمزورې خوا څه ده؟', 'تر کومه وخت لري چې بشپړ مستقل کار وکړې؟'],
    },
    expectedDuration: '2 mins',
  },
  {
    categorySlug: 'job-interviews',
    question: {
      en: 'What are your salary expectations?',
      fa: 'انتظار حقوقی شما چقدر است؟',
      ps: 'د معاش تمه دې څومره ده؟',
    },
    difficulty: 'medium',
    sampleAnswer: {
      en: 'Based on the market range for this role in Kabul and my three years of experience, I understand positions like this typically pay between 45,000 and 60,000 AFN. I am flexible within your organization\u2019s structure — the total package, including learning opportunities and contract stability, matters more to me than the top of the range. What range did you have budgeted for this position?',
      fa: 'بر اساس بازاره حقوق این شغل در کابل و تجربه سه ساله من، درک می‌کنم که چنین جایگاه‌هایی معمولاً بین ۴۵ تا ۶۰ هزار افغانی پرداخت می‌شود. در چارچوب ساختار سازمان شما منعطف هستم — بسته کلی، شامل فرصت‌های یادگیری و ثبات قرارداد، برایم مهم‌تر از سقف بازه است. چه بازه‌ای برای این جایگاه در بودجه دارید؟',
      ps: 'د کابل کې د دې دندې د معاش له سلسلې او زما د درې کلنې تجربې پر بنسټ، پوهېږم چې داسې مقامونه معمولاً له ۴۵ تر ۶۰ زرو افغانیو پورې ورکوي. ستا د ادارې جوړښت ته انعطاف لرم — بشپړ بنډل، د زده‌کړې فرصتونو او د قرارداد ثبات په شمول، له سلسلې تر ټولو لوړې کچې زیات مهم دی. ستا د دې مقام لپاره په بودجه کې کومه سلسله ده؟',
    },
    strongExample: {
      en: '\u201CI know the standard band for NGO monitoring officers here is 50–70k AFN. I am comfortable anywhere in that band given your training budget — may I ask what you have allocated?\u201D',
      fa: '\u00ABمی‌دانم که بازه استاندارد افسران مانیتورینگ مردم‌نهاد در اینجا ۵۰ تا ۷۰ هزار افغانی است. با توجه به بودجه آموزش شما، در هر نقطه این بازه را می‌پذیرم — اجازه بدهید بپرسم چه چیزی در نظر گرفته‌اید؟\u00BB',
      ps: '\u00ABپوهېږم چې دلته د نادولتو د مانېټرینګ افسرانو معیاري سلسله ۵۰–۷۰ زره افغانیه ده. ستا د روزنې بودجه په نظر کې نیولو سره په دې سلسله کې هر چېرې راضی یم — اجازه راکړه وپوښتم څه درنظر لرې؟\u00BB',
    },
    weakExample: {
      en: '\u201CWhatever you give is fine. I just really need this job.\u201D',
      fa: '\u00ABهرچه بدهید کافی است. فقط به این کار شدیداً نیاز دارم.\u00BB',
      ps: '\u00ABڅه چې ورکړې کافي دي. زما یوازې دې دندې ته ډېره اړتیا ده.\u00BB',
    },
    tips: {
      en: 'Never name a number first without market research; give a researched range and end by asking their budget. Saying \u201Canything\u201D signals desperation and hurts you in both salary and credibility.',
      fa: 'بدون تحقیق بازار هرگز اول عدد نگیرید؛ یک بازه تحقیق‌شده بدهید و با پرسیدن بودجه آن‌ها تمام کنید. گفتن \u201Cهر چیزی\u201D ناامیدی را نشان می‌دهد و هم در حقوق و هم در اعتبارتان ضربه می‌زند.',
      ps: 'بې د بازار څېړنې هېڅکله لومړی عدد مه وایه؛ څېړلې سلسله ورکړه او د هغوی د بودجې پوښتنې سره پای ته ورسوه. د \u00ABهر څه\u00BB ویل بې‌وسي ښیي او په معاش او باور دواړو کې تا ضربه کوي.',
    },
    commonMistakes: {
      en: ['Saying \u201Cany amount is fine\u201D', 'Naming an unrealistic number with no justification', 'Refusing to answer at all'],
      fa: ['گفتن \u201Cهر مقداری کافی است\u201D', 'ذکر عدد غیرواقعی بدون توجیه', 'سر باز زدن از پاسخ دادن'],
      ps: ['وایل \u00ABهر کچه وي کافي ده\u00BB', 'بې دلیل غیر واقعي عدد ویل', 'بشپړ له ځواب ورکولو ډډه کول'],
    },
    followUps: {
      en: ['What is your current salary?', 'Would you accept a lower start with a review after 6 months?'],
      fa: ['حقوق فعلی شما چقدر است؟', 'شروع کمتر با بازبینی بعد از ۶ ماه را می‌پذیرید؟'],
      ps: ['ستا اوسنی معاش څومره دی؟', 'لږ ټیټ پیل چې له ۶ میاشتو وروسته بیاکتنه وي منې؟'],
    },
    expectedDuration: '1-2 mins',
  },
  {
    categorySlug: 'job-interviews',
    question: {
      en: 'Describe a time you handled a disagreement with a colleague.',
      fa: 'زمانی را توصیف کنید که با یک همکار اختلاف‌نظر داشتید.',
      ps: 'یو وخت بیان کړه چې له یو همکار سره د نظر اختلاف درلودې.',
    },
    difficulty: 'medium',
    sampleAnswer: {
      en: 'In our distribution team, a colleague wanted to complete registration by evening; I insisted we re-verify two villages because the data showed duplicate beneficiaries. Rather than arguing, I proposed we split the work: he continued registration while I spot-checked the duplicates. We found 14 repeated entries before payment day. Afterward we agreed on a joint checklist, and duplication errors dropped to zero in the next cycle.',
      fa: 'در تیم توزیع ما، یک همکار می‌خواست ثبت‌نامی را تا شب تمام کند؛ من اصرار داشتم که دو قریه را دوباره راستی‌آزمایی کنیم چون معلومات نشان می‌داد مستفیدکنندگان تکراری وجود دارد. به جای بحث، پیشنهاد دادم کار را تقسیم کنیم: او ثبت‌نام را ادامه داد و من تکراری‌ها را بررسی کردم. پیش از روز پرداخت ۱۴ ثبت تکراری پیدا کردیم. سپس یک چک‌لیست مشترک توافق کردیم و خطاهای تکرار در دوره بعد به صفر رسید.',
      ps: 'زموږ په وېش ټیم کې یو همکار غوښتل تر ماښامه نوم لیکلو بشپړول؛ زه ټینګار کوم چې دوه کلي به بیا تاییدو ځکه معلوماتو تکراري ګټه اخیستونکي ښودل. د شخړې پر ځای مې وړاندیز وکړ چې کار ووېشو: هغه نوم لیکلو ته دوام ورکړ او زه تکراریان مې وګورلم. له تادیې مخکې مو ۱۴ تکراري نومونه پیدا کړل. وروسته مو پر ګډ چک‌لیست هوکړه وکړه او په راتلونکې دوره کې تکراري تېروتنې صفر شوې.',
    },
    strongExample: {
      en: '\u201CWe disagreed on distribution priorities. I asked to see his data, shared mine, and we agreed on one combined list — the supervisor later adopted it as the standard.\u201D',
      fa: '\u00ABدر اولویت‌های توزیع اختلاف داشتیم. درخواست کردم معلومات او را ببینم، معلومات خود را به اشتراک گذاشتم و بر یک فهرست مشترک موافقت کردیم — مسؤول ما بعداً آن را به‌عنوان معیار پذیرفت.\u00BB',
      ps: '\u00ABپه وېش لومړیتوبونو کې مو اختلاف درلود. مې وغوښتل د هغه معلومات ووینم، خپل یم شریک کړل او پر یو ګډ لست مو هوکړه وکړه — مسؤل وروسته دا معیاري کړ.\u00BB',
    },
    weakExample: {
      en: '\u201CI never have conflicts with anyone. I always agree with my colleagues.\u201D',
      fa: '\u00ABمن هیچ‌وقت با کسی اختلاف ندارم. همیشه با همکارانم موافقم.\u00BB',
      ps: '\u00ABزه له چا سره شخړه نه لرم. تل له همکارانو سره موافقم.\u00BB',
    },
    tips: {
      en: 'Show conflict maturity: focus on facts, propose a process, and end with the improved result. \u201CI never disagree\u201D tells the interviewer you avoid problems rather than solve them.',
      fa: 'بلوغ در اختلاف را نشان دهید: روی واقعیت‌ها تمرکز کنید، یک فرایند پیشنهاد دهید و با نتیجه بهبودیافته تمام کنید. جمله \u201Cمن هیچ‌وقت اختلاف نظر ندارم\u201D به مصاحبه‌گر می‌گوید که شما از مشکلات فرار می‌کنید نه حلشان.',
      ps: 'د شخړې پختوالی وښيه: پر شریکو ټکي تمرکز وکړه، یوه طریقه وړاندیز کړه او په ښه شوې پایله پای ته ورسوه. \u00ABزه هېڅکله اختلاف نه لرم\u00BB مصاحبه کوونکي ته وایي چې تا ستونزو ته ځان نه حلوي، راښکېلوي.',
    },
    commonMistakes: {
      en: ['Claiming you never have disagreements', 'Blaming the colleague personally', 'Ending the story without a resolution'],
      fa: ['ادعای اینکه هیچ‌وقت اختلاف ندارید', 'شخصی‌سازی و مقصر دانستن همکار', 'پایان داستان بدون حل مسئله'],
      ps: ['دعوه چې هېڅکله اختلاف نه لري', 'همکار شخصي تورنول', 'کیسه بې د حل پای ته رسول'],
    },
    followUps: {
      en: ['What would you do if the colleague still disagreed?', 'How do you handle disagreement with a supervisor?'],
      fa: ['اگر همکار باز هم مخالفت می‌کرد چه می‌کردید؟', 'با مسؤول خود اختلاف‌نظر را چگونه مدیریت می‌کنید؟'],
      ps: ['که همکار بیا هم مخالفت کوله څه به کوې؟', 'له خپل مسؤل سره اختلاف څنګه اداره کوې؟'],
    },
    expectedDuration: '2-3 mins',
  },
];
