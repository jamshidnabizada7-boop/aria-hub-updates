/**
 * Success Stories seed — 6 realistic trilingual exemplar stories.
 *
 * GUARD: refuses to run against any non-local database (fake community
 * content must never reach production). Use --force ONLY if you accept
 * seeding exemplar content into a remote DB deliberately.
 *
 *   DATABASE_URL="postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable" bun scripts/seed-success-stories.ts
 *
 * Idempotent: keyed on title (en). --verify asserts all rows complete.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const db = new PrismaClient();

const LOCAL_PATTERNS = [/^postgresql:\/\/postgres@127\.0\.0\.1:5433\//, /^postgresql:\/\/postgres@localhost[:\/]/];

function isLocalDb(url: string | undefined): boolean {
  if (!url) return false;
  return LOCAL_PATTERNS.some((p) => p.test(url));
}

type Story = {
  key: string;
  title: { en: string; fa: string; ps: string };
  storyType: string;
  country: string;
  program: string;
  visaType?: string;
  year: number;
  content: { en: string; fa: string; ps: string };
  authorAlias: string;
  featured: boolean;
  status: string;
};

const STORIES: Story[] = [
  {
    key: 'chevening-herat-london',
    title: {
      en: 'From Herat to a fully-funded master’s in London',
      fa: 'از هرات تا ماستری کامل‌بودجه در لندن',
      ps: 'له هرات څخه تر لندن بشپړې تمویل شوې ماسټرۍ پورې',
    },
    storyType: 'scholarship',
    country: 'United Kingdom',
    program: 'Chevening Scholarship',
    year: 2025,
    content: {
      en: 'I applied to Chevening three times. The first two rejections hurt, but each year I improved one weak part. Year one: my essays were generic. Year two: I had no leadership examples with real numbers. Year three I led a 12-volunteer literacy program in Herat that taught 240 women basic reading — and I wrote every essay around that.\n\nWhat made the difference: (1) I picked universities and a course that clearly connected to Afghanistan\'s needs, (2) I asked two supervisors for recommendation letters four months early, (3) I practiced interview questions in front of a mirror in English, Dari, and even recorded myself. The interview is 40% of your fate — they ask about your leadership, not your grades.\n\nMy advice: start 8 months before the deadline, and write your leadership stories before you touch the application form.',
      fa: 'سه بار برای Chevening درخواست دادم. دو رد اول سخت بود، اما هر سال یک بخش ضعیف را بهتر کردم. سال اول: انشاهایم عمومی بود. سال دوم: مثال‌های رهبری با اعداد واقعی نداشتم. سال سوم یک برنامه سوادآموزی با ۱۲ داوطلب در هرات رهبری کردم که ۲۴۰ زن را با خواندن و نوشتن پایه آموزش داد — و همه انشاهایم را حول همان نوشتم.\n\nچه چیزی تفاوت ایجاد کرد: (۱) دانشگاه‌ها و رشته‌ای انتخاب کردم که به نیازهای افغانستان ارتباط روشن داشت، (۲) چهار ماه زودتر از دو استادم درخواست توصیه‌نامه کردم، (۳) سوالات مصاحبه را جلوی آینه به انگلیسی و دری تمرین کردم و حتی از خودم ویدیو گرفتم. مصاحبه ۴۰٪ سرنوشت شماست — از رهبری می‌پرسند، نه از نمرات.\n\nتوصیه من: ۸ ماه قبل از ددلاین شروع کنید، و داستان‌های رهبری‌تان را قبل از باز کردن فورم بنویسید.',
      ps: 'درې ځله Chevening ته غوښتنه وکړه. لومړني دوه رد کیدل سخت وه، خو هر کال مې یو کمزوری برخه ښه کړ. لومړی کال: مې لیکنې عمومي وې. دویم کال: ریښتیني شمېرې لرونکي د مشرتابه مثالونه مې نه وو. درېیم کال مې په هرات کې د ۱۲ رضاکارانو د لوستون پروګرام رهبري کړ چې ۲۴۰ ښځینه ته یې لومړني لوست-لیک زده کړل — او ټولې لیکنې مې پر همدې ولیکلې.\n\nڅه توپیر راوست: (۱) پوهنتونونه او رښته یې غوره کړل چې د افغانستان اړتیاوو سره روښانه تړاو درلود، (۲) څلور میاشتې وخته له دوو ښوونکو مې د سپارښتنې لیک غوښت، (۳) د مرکې پوښتنې مې د آینې مخې ته په انګلیسي او دري تمرین کړې او حتی ځان مې ویډیو کړ. مرکې ستاسو د برخلیک ۴۰٪ برخه ده — دوی د نمرودو نه د مشرتابه په اړه پوښتنه کوي.\n\nزما مشوره: له نېټې ۸ میاشتې مخکې پیل وکړئ، او د فورم پرانیستلو دمخه خپلې د مشرتابه کیسې ولیکئ.',
    },
    authorAlias: 'Freshta, from Herat',
    featured: true,
    status: 'published',
  },
  {
    key: 'acbar-ngo-job-kabul',
    title: {
      en: 'How I beat 300 applicants to an NGO officer job in Kabul',
      fa: 'چگونه از ۳۰۰ متقاضی دیگر جلو زدم و در کابل در NGO استخدام شدم',
      ps: 'څنګه مې له ۳۰۰ غوښتونکو څخه مخکې شه او په کابل کې په NGO کې دنده واخیسته',
    },
    storyType: 'job',
    country: 'Afghanistan',
    program: 'Program Officer — international NGO',
    year: 2025,
    content: {
      en: 'ACBAR listings felt like a lottery until I changed my method. Instead of sending the same CV everywhere, I built one CV per job family (M&E, program, admin) and rewrote the top third for every application — that is all recruiters read first.\n\nThree things got me shortlisted: (1) a two-line professional summary with a concrete result ("managed distributions reaching 18,000 households"), (2) Dari + Pashto + English clearly marked with levels, (3) a short customized cover letter that named the NGO\'s actual project in that province.\n\nThe interview: I prepared answers for the classic NGO questions — humanitarian principles, safeguarding, how I handle pressure — and I brought printed examples of my reports. They hired me as Program Officer at nearly double my previous salary. Don\'t apply to 40 jobs in one night; apply to 5 carefully and follow up after one week.',
      fa: 'تبلیغ‌های ACBAR شبیه بخت‌آزمایی بود تا وقتی روشم را عوض کردم. به جای ارسال یک سی‌وی برای همه، برای هر خانواده شغلی (M&E، برنامه، اداری) یک سی‌وی جدا ساختم و یک‌سوم بالای آن را برای هر درخواست بازنویسی کردم — همان بخشی است که کارفرما اول می‌خواند.\n\nسه چیز مرا به لیست کوتاه برد: (۱) خلاصه دوسطری حرفه‌ای با یک نتیجه مشخص («مدیریت توزیعات برای ۱۸٬۰۰۰ خانواده»)، (۲) دری + پشتو + انگلیسی با سطح مشخص، (۳) یک کوورلتر کوتاه و سفارشی که نام پروژه واقعی همان نهاد در آن ولایت را می‌برد.\n\nمصاحبه: برای سوالات کلاسیک NGO آماده شدم — اصول بشردوستانه، حفاظت، مدیریت فشار — و نمونه گزارش‌هایم را چاپ‌شده بردم. مرا به عنوان آفیسر برنامه با نزدیک به دو برابر حقوق قبلی استخدام کردند. در یک شب به ۴۰ جا درخواست ندهید؛ به ۵ جا دقیق بدهید و بعد از یک هفته پیگیری کنید.',
      ps: 'د ACBAR اعلانونه تر هغه چې مې طریقه بدله کړه د قمار په څېر وه. د یو CV ټولو ته د لېږلو پر ځای، د هرې دندې کورنۍ (M&E، برنامه، اداري) لپاره جلا CV جوړ کړ او پورتنۍ درېیمه برخه مې د هرې غوښتنې لپاره بیا ولیکله — دا هغه برخه ده چې کار ګمارونکی لومړی یې لولي.\n\nدرې شیان ما لنډ لیست ته راووست: (۱) دوه-کرښېز مسلکي لنډیز د یو ځانګړي پایلې سره («د ۱۸۰۰۰ کورنیو د وېش مدیریت»)، (۲) دري + پښتو + انګلیسي په څرګندو کچو سره، (۳) لنډ ځانګړی کوور لټر چې د همدې بنسټ ریښتینې پروژه یې په هغه ولایت کې نوموله.\n\nمرکه: د کلاسیکو NGO پوښتنو لپاره چمتو شوم — بشردوستانه اصول، خونديتوب، د فشار اداره — او چاپ شوې راپورونه مې سره بوښتل. دوه چنده د پخوانۍ معاش په تناسوب د برنامه آفیسر په توګه وګمارلم. په یوه شپه ۴۰ ځایو ته غوښتنه مه کوئ؛ په ۵ ځایو دقیق وکړئ او یوه اونۍ وروسته تعقیب یې کړئ.',
    },
    authorAlias: 'Ahmad Zia, Kabul',
    featured: false,
    status: 'published',
  },
  {
    key: 'f1-visa-kabul-consular',
    title: {
      en: 'F1 student visa approved after one 221(g) delay — my exact timeline',
      fa: 'ویزای تحصیلی F1 پس از یک تأخیر 221(g) تأیید شد — جدول زمانی دقیق من',
      ps: 'د F1 زده‌کړې ویزه له یوې 221(g) ځنډ وروسته تصدیق شوه — زما دقیق وخت',
    },
    storyType: 'visa',
    country: 'United States',
    program: 'F1 — computer engineering',
    visaType: 'F1',
    year: 2024,
    content: {
      en: 'My first interview ended with a 221(g) yellow slip — administrative processing. I panicked and almost rebooked everything. Instead I waited, checked my email weekly, and prepared a clean folder for the second call: admission letter, funded I-20, bank statements covering two full years, my father\'s employment letter, and property documents.\n\nSix weeks later they cleared me without a second interview. Lessons that matter for Afghan applicants: (1) your funding story must be consistent — the bank statement, the sponsor letter, and your answers must match exactly, (2) know your university, your city, and your course by heart, (3) have a clear post-study plan that mentions returning with skills Afghanistan needs. Say it simply; they hear hundreds of answers a day.\n\nTotal cost: SEVIS fee, visa fee, one trip to the embassy city, and a lot of patience. Prepare documents in a folder in this order: passport, I-20, admission, financials, ties to home.',
      fa: 'مصاحبه اولم با برگه زرد 221(g) — بررسی اداری — تمام شد. وحشت کردم و تقریباً همه را دوباره زمان‌بندی کردم. به جایش صبر کردم، هر هفته ایمایلم را چک کردم و برای تماس دوم یک پوشه مرتب آماده کردم: نامه پذیرش، I-20 بودجه‌دار، پرینت بانکی برای دو سال کامل، نامه کاری پدرم و اسناد ملکیت.\n\nشش هفته بعد پرونده‌ام بدون مصاحبه دوم تصویب شد. درس‌هایی که برای متقاضیان افغان مهم است: (۱) داستان تمویل شما باید یکدست باشد — پرینت بانکی، نامه اسپانسر و پاسخ‌هایتان باید دقیقاً همخوانی داشته باشند، (۲) دانشگاه، شهر و رشته‌تان را حفظ باشید، (۳) یک برنامه روشن پس از تحصیل داشته باشید که به بازگشت با مهارت‌های مورد نیاز افغانستان اشاره می‌کند. ساده بگویید؛ آن‌ها روزانه صدها پاسخ می‌شنوند.\n\nهزینه کل: فیس SEVIS، فیس ویزه، یک سفر به شهر سفارت و بسیار صبر. اسناد را به این ترتیب در پوشه بگذارید: پاسپورت، I-20، پذیرش، اسناد مالی، پیوندهای داخل کشور.',
      ps: 'زما لومړنې مرکې د 221(g) زېړ ورقې — اداري کتنې — سره پای ته ورسېده. واوچېدم او نږدې وه ټول بیا وخت ټاکم. پر ځای مې صبر وکړ، هره اونۍ مې برېښنالیک وګاړه او دویمې غوښتنې لپاره یو سم فولډر چمتو کړ: د داخلولو لیک، تمویل شوی I-20، د دوو بشپړو کالونو بانکي پرنټ، د پلار د کار لیک او د ملکیت اسناد.\n\nشپږ اونۍ وروسته پرته له دویمې مرکې تصدیق شو. هغه درسونه چې د افغان غوښتونکو لپاره مهم دي: (۱) ستاسو د تمویل کیسه باید یو شان وي — بانکي پرنټ، د سپانسر لیک او ستاسو ځوابونه باید دقیقاً برابر وي، (۲) خپل پوهنتون، ښار او رښته په زړه ولرئ، (۳) د زده‌کړو وروسته روښانه پلان ولرئ چې د افغانستان اړتیاوو مهارتونو سره بېرته تړاو لري. ساده یې ووایاست؛ دوی په ورځ سلیونه ځوابونه اوریدلی شي.\n\nټول لګښت: د SEVIS فیس، د ویزې فیس، یو سفردوم او ډېر صبر. اسناد د همدې ترتیب سره فولډر کې کېږدئ: پاسپورټ، I-20، داخلولو، مالي اسناد، د هېواد تړاوونه.',
    },
    authorAlias: 'Anonymous',
    featured: false,
    status: 'published',
  },
  {
    key: 'remote-job-balkh-berlin',
    title: {
      en: 'A remote design job from Mazar-e-Sharif — paid in euros',
      fa: 'یک کار ریموت طراحی از مزار شریف — با پرداخت یورو',
      ps: 'له مزار شریف څخه لرې د ډیزاین دنده — په یورو پیسو',
    },
    storyType: 'job',
    country: 'Germany (remote)',
    program: 'Product designer — Berlin startup',
    year: 2025,
    content: {
      en: 'I could not find a senior design job in Kabul, so I stopped applying locally and spent 5 months building proof instead of applications: redesigned 6 popular Afghan apps for free and published the case studies on LinkedIn in English.\n\nThe case studies did the applying for me. A Berlin startup recruiter messaged me. The interview was 4 rounds, all online. What helped: fast internet backup (I kept two mobile carriers plus a workable schedule around Kabul electricity), a quiet corner office at home, and honest answers about power cuts with my mitigation plan. They respected the preparation.\n\nThey pay in euros to a bank account that works in Afghanistan, almost 4× a local senior salary. My advice for remote seekers: English writing is 80% of the game — your portfolio text must be as good as your pictures. And never pay an "agent" for a remote job; real ones never ask.',
      fa: 'در کابل کار ارشد طراحی پیدا نمی‌کردم، پس درخواست‌دادن محلی را رها کردم و ۵ ماه به جای ارسال درخواست، مدرک ساختم: ۶ اپ محبوب افغانی را رایگان بازطراحی کردم و مطالعه مواردشان را به انگلیسی در لیست‌دین نشر کردم.\n\nهمان مطالعات برایم درخواست دادند. یک کارفرمای استارتاپ برلینی پیام داد. مصاحبه ۴ مرحله داشت، همه آنلاین. چه چیزی کمک کرد: بکاپ انترنت سریع (دو اپراتور موبایل به‌علاوه برنامه‌ای سازگار با برق کابل)، یک گوشه آرام در خانه، و پاسخ‌های صادقانه درباره قطعی برق با پلان مدیریتش. آن‌ها به آمادگی‌ام احترام گذاشتند.\n\nبه یورو به حسابی که در افغانستان کار می‌کند پرداخت می‌کنند، تقریباً ۴ برابر حقوق ارشد محلی. توصیه من برای جویندگان کار ریموت: نوشتن انگلیسی ۸۰٪ بازی است — متن پورتفولیوی شما باید به اندازه تصاویرش خوب باشد. و هرگز برای کار ریموت به «واسطه» پول ندهید؛ کارهای واقعی هرگز نمی‌پرسند.',
      ps: 'په کابل کې د سینئر ډیزاین دنده نه موندله، نو محلي غوښتنې پرېښودې او ۵ میاشتې مې د غوښتنو پر ځای د ثبوت جوړولو ته ولګولې: ۶ مشهور افغان اپونه وړیا بیا ډیزاین کړل او کیس studiې مې په انګلیسي په لینکډین خپرې کړې.\n\nهمدغو کیسو زما پر ځای غوښتنه وکړه. د برلین سټارټاپ کار ګمارونکي پیغام راولېږه. مرکې ۴ پړاوونه درلودل، ټول آنلاین. څه مرسته وکړه: د چټک انټرنټ بیک اپ (دوه موبایل شرکتونه د کابل د برېښنا پر وخت سمو شویو ساعتونو سربېره)، په کور کې یو آرام ګوټ، او د برېښنا د پرېکیدو په اړه ریښتیني ځوابونه د اداره کولو پلان سره. دوی چمتووالي ته درناوی وکړ.\n\nپه یورو پېسې به هغه بانکي حساب ته لېږي چې په افغانستان کار کوي، نږدې ۴ چنده د محلي سینئر معاش. زما مشوره د لرې دندو غوښتونکو ته: انګلیسي لیکل د لوبې ۸۰٪ برخه ده — ستاسو پورټفولیو متن باید د انځورونو په څېر ښه وي. او هیڅکله د لرې دندې لپاره «منځګړي» ته پیسې مه ورکوئ؛ ریښتیني هیڅکله نه غواړي.',
    },
    authorAlias: 'Sadaf, Mazar-e-Sharif',
    featured: false,
    status: 'published',
  },
  {
    key: 'ump-exchange-bamiyan',
    title: {
      en: 'One semester in Prague through an exchange program — from Bamiyan',
      fa: 'یک سمستر در پراگ از طریق برنامه تبادلی — از بامیان',
      ps: 'پرېګ کې یو سمسټر د تبادلې له برنامې — له بامیان څخه',
    },
    storyType: 'exchange',
    country: 'Czech Republic',
    program: 'Semester exchange — economics',
    year: 2024,
    content: {
      en: 'Exchange programs are the most underrated path for Afghan students — fully funded, shorter than a degree, and no embassy wait of years. I found mine through my university\'s international office and a Facebook group listing ERASMUS-linked calls.\n\nMy application won because of one page: a "return plan" describing the course I would teach at my home university with what I learned. The nomination committee later told me most applicants only wrote about wanting to see Europe.\n\nPractical notes: ask for the acceptance letter on university letterhead immediately (embassies ask), budget 6 weeks for the visa even with a scholarship letter, and connect with the Afghan student association in that city before you fly — they picked me up from the airport. One semester changed how my whole department sees international applications.',
      fa: 'برنامه‌های تبادلی کم‌استفاده‌ترین راه برای دانشجویان افغان است — کامل‌بودجه، کوتاه‌تر از یک مدرک، و بدون سال‌ها انتظار سفارت. برنامه‌ام را از دفتر بین‌المللی پوهنتونم و یک گروه فیسبوک که فراخوان‌های مرتبط با ERASMUS را لیست می‌کرد پیدا کردم.\n\nدرخواستم به خاطر یک صفحه برنده شد: «پلان بازگشت» که توضیح می‌داد با چه آموخته‌ای چه رشته‌ای را در پوهنتون خودم تدریس خواهم کرد. کمیته انتخاب بعداً گفت بیشتر متقاضیان فقط نوشته بودند می‌خواهند اروپا را ببینند.\n\nنکات عملی: نامه پذیرش را فوری با سربرگ پوهنتون بخواهید (سفارت می‌پرسد)، حتی با نامه بورسیه ۶ هفته برای ویزا وقت بگذارید، و قبل از پرواز با انجمن دانشجویان افغان در آن شهر ارتباط بگیرید — آن‌ها مرا از فرودگاه گرفتند. یک سمستر کافی بود تا نگاه کل بخش ما به درخواست‌های بین‌المللی عوض شود.',
      ps: 'تبادلې برنامې د افغان زده‌کوونکو لپاره تر ټولو کمه کارېدلې لار ده — بشپړه تمویل شوې، له سند څخه لنډه، او د سفارت کالونه انتظار نه لري. خپله برنامه مې د پوهنتون له نړیوال دفتر او د فیسبوک له یوې ډلې چې د ERASMUS اعلانونه لیستول پیدا کړه.\n\nزما غوښتنه د یوې مخې له امله بریالې شوه: «د بېرته راستنېدو پلان» چې تشریح کوله زما د کومې زده‌کړې سره به کوم رښته په خپل پوهنتون کې تدریس کړم. د ټاکنې کمیټې وروسته وویل چې ډېری غوښتونکو یوازې لیکی وه غواړي اروپا وګوري.\n\nعملي یادونې: د داخلولو لیک سمدلاسه په پوهنتون سربرګ وغواړئ (سفارت پوښتي)، حتی د بورس له لیک سره د ویزې لپاره ۶ اونۍ وخت کېږدئ، او د الوتنې دمخه په هغه ښار کې د افغان زده‌کوونکو ټولنې سره اړیکه ونیسئ — دوی ما له هوایي ډګر واخیست. یو سمسټر کافي وه چې زموږ ټولې څانګې نړیوالو غوښتنو ته د کتدو لید بدل کړي.',
    },
    authorAlias: 'Zahra, Bamiyan',
    featured: false,
    status: 'published',
  },
  {
    key: 'ielts-to-scholarship-kunduz',
    title: {
      en: 'Self-study IELTS 7.5 in 90 days while working full-time',
      fa: 'آیلتس ۷٫۵ با خودآموزی در ۹۰ روز، در کنار کار تمام‌وقت',
      ps: 'په ۹۰ ورځو کې په ځان-لوستلو سره آیلټس ۷٫۵، د بشپړ وخت دنده سره',
    },
    storyType: 'training',
    country: 'Afghanistan → applications abroad',
    program: 'IELTS Academic 7.5',
    year: 2025,
    content: {
      en: 'I had 2 free hours a day and a phone with 2GB of data. That was enough. My plan was boring on purpose: 40 minutes listening (one BBC or TED clip, twice), 40 minutes reading with a timer, 40 minutes writing — every single day for 90 days.\n\nThe two habits that raised my score from 6.0 to 7.5: recording my speaking answers daily and re-listening to catch filler words, and copying band-8 writing answers BY HAND to internalize their structure. I spent zero afghani on courses.\n\nExam-day notes: arrive early, bring the exact same passport photo format you registered with, and in writing Task 2 spend the first 4 minutes planning only — that plan is the difference between band 6.5 and 7.5. My 7.5 unlocked three scholarship shortlists within 5 months.',
      fa: 'روزانه ۲ ساعت آزاد و یک گوشی با ۲ گیگ بسته اینترنت داشتم. کافی بود. پلانم عمداً خسته‌کننده بود: ۴۰ دقیقه لیسننگ (یک کلیپ BBC یا TED، دو بار)، ۴۰ دقیقه ریدینگ با تایمر، ۴۰ دقیقه رایتینگ — هر روز، به مدت ۹۰ روز.\n\nدو عادتی که نمره‌ام را از ۶٫۰ به ۷٫۵ رساند: هر روز ضبط پاسخ‌های اسپیکینگ و دوباره گوش‌دادن برای یافتن کلمات پرکننده، و رونویسی دستی جواب‌های رایتینگ بند-۸ برای درونی‌کردن ساختارشان. حتی یک افغانی هم هزینه دوره نکردم.\n\nیادداشت روز آزمون: زود برسید، با همان فرمت عکس پاسپورتی که ثبت‌نام کردید بروید، و در رایتینگ تسک ۲ چهار دقیقه اول فقط پلان بنویسید — همان پلان تفاوت بند ۶٫۵ و ۷٫۵ است. نمره ۷٫۵ من ظرف ۵ ماه سه لیست کوتاه بورسیه باز کرد.',
      ps: 'ورځه کې مې ۲ فراغت ساعته او د ۲ ګیګ ډاټا سره یو تلیفون درلود. همدا کافي وه. زما پلان له مخکې څخه ستړی کوونکی وه: ۴۰ دقیقې غوږ نیول (یو BBC یا TED کلیپ، دوه ځله)، ۴۰ دقیقې لوستل د ټایمر سره، ۴۰ دقیقې لیکل — هره ورځ، ۹۰ ورځې.\n\nدوه عادتونه چې نمره مې له ۶٫۰ څخه ۷٫۵ ته ورسوله: هره ورځ د سپیکنېنګ ځوابونه ویډیو کول او د فیلر ټکو د موندلو لپاره بیا اوریدل، او د بند-۸ لیکلو ځوابونه په لاس کاپي کول ترڅو جوړښت یې په زړه کې کېږدم. په کورسونو مې صفر افغانۍ هم لګولې نه وې.\n\nد ازموینې ورځ یادونې: وخته ورشئ، د همدې پاسپورټ عکس فارمټ سره بوزئ چې ثبت شوې یې، او په لیکلو ټاسک ۲ کې لومړي ۴ دقیقې یوازې پلان وليکئ — همدا پلان د بند ۶٫۵ او ۷٫۵ توپیر دی. زما ۷٫۵ په ۵ میاشتو کې درې د بورسو لنډ لیستونه خلاص کړل.',
    },
    authorAlias: 'Bilal, Kunduz',
    featured: false,
    status: 'published',
  },
];

const PrismaAnyNull = Prisma.DbNull;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!isLocalDb(url) && !process.argv.includes('--force')) {
    console.error('REFUSED: DATABASE_URL is not the local sandbox postgres.');
    console.error('Exemplar community content must not reach production. Use --force to override deliberately.');
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  for (const s of STORIES) {
    const existing = await db.successStory.findFirst({
      where: { title: s.title.en },
      select: { id: true },
    });
    const data = {
      title: s.title.en,
      titleI18n: s.title,
      storyType: s.storyType,
      country: s.country,
      program: s.program,
      visaType: s.visaType ?? null,
      year: s.year,
      content: s.content.en,
      contentI18n: s.content,
      authorAlias: s.authorAlias,
      featured: s.featured,
      status: s.status,
    };
    if (existing) {
      await db.successStory.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await db.successStory.create({ data });
      created++;
    }
  }
  console.log(`seed-success-stories: created=${created} updated=${updated} total=${STORIES.length}`);

  if (process.argv.includes('--verify')) {
    const missing = await db.successStory.count({
      where: {
        OR: [
          { contentI18n: { equals: PrismaAnyNull } },
          { titleI18n: { equals: PrismaAnyNull } },
        ],
      },
    });
    if (missing > 0) throw new Error(`${missing} rows missing trilingual fields`);
    console.log('verify OK: all rows trilingual');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
