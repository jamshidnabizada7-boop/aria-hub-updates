/**
 * Built-in trilingual fallback content for the growth pages added by the
 * 2026 visibility & growth roadmap: /press, /partners, /webinar, /ambassador.
 *
 * Same contract as static-page-content.ts (LocalDoc/LocalSection): a published
 * `Page` CMS row overrides these docs; `pickTril` falls back to English.
 * Facts stated here are deliberately conservative — no audience numbers unless
 * a dated analytics export backs them (see docs/growth/claims-audit.md).
 */
import type { LocalDoc } from './static-page-content';

export const PRESS_DOC: LocalDoc = {
  title: { en: 'Press & Media Kit', fa: 'کیت مطبوعاتی و رسانه‌ای', ps: 'د مطبوعاتو او میډیا کټ' },
  sections: [
    {
      heading: { en: 'About ARIA HUB', fa: 'درباره آریا هاب', ps: 'د آریا هاب په اړه' },
      paragraphs: [
        {
          en: 'One sentence: ARIA HUB is a multilingual opportunity platform that helps people from Afghanistan discover jobs, scholarships, internships and global programs with clear summaries and direct official application routes.',
          fa: 'یک جمله: آریا هاب یک پلتفرم چندزبانهٔ فرصت‌هاست که به مردم افغانستان کمک می‌کند شغل‌ها، بورسیه‌ها، کارآموزی‌ها و برنامه‌های جهانی را با خلاصه‌های روشن و لینک‌های رسمی درخواست کشف کنند.',
          ps: 'یوه جمله: آریا هاب یو څو ژبی فرصتونو پلیټفارم دی چې د افغانستان خلکو سره دندې، بورسونه، د کار روزنې او نړیوال پروګرامونه د روښانه لنډیزونو او رسمي د غوښتنلیک لینکونو په مرسته پیدا کولو کې مرسته کوي.',
        },
        {
          en: 'Short description (50 words): ARIA HUB gathers current jobs, scholarships, internships and training programs in one searchable platform. Listings are reviewed, summarized and published in English, Persian (Afghanistan) and Pashto, always linking to the official application route. Employers and organizations can submit opportunities for free during the launch phase.',
          fa: 'توضیح کوتاه (۵۰ کلمه): آریا هاب شغل‌های روز، بورسیه‌ها، کارآموزی‌ها و برنامه‌های آموزشی را در یک پلتفرم جستجوپذیر گردآوری می‌کند. هر آگهی بررسی، خلاصه و به زبان‌های انگلیسی، دری و پشتو منتشر می‌شود و همیشه به مسیر رسمی درخواست لینک می‌دهد. کارفرمایان و مؤسسات در دورهٔ آغاز می‌توانند فرصت‌های خود را رایگان ثبت کنند.',
          ps: 'لنډې شننې (۵۰ کلمې): آریا هاب ورځې دندې، بورسونه، د کار روزنې او زده کړې پروګرامونه په یو لټون وړ پلیټفارم کې راټولوي. هر اعلان بیاکتنه کیږي، لنډیز او په انګلیسي، دري او پښتو خپریږي او تل رسمي د غوښتنلیک لارې ته لینک لري. کارګمارنان او ادارې کولی شي د پیل په دوره کې خپل فرصتونه وړیا ثبت کړي.',
        },
        {
          en: 'Long description (150 words): ARIA HUB organizes current jobs, scholarships, internships, fellowships, training programs and selected international opportunities into one searchable platform. Listings are reviewed, summarized and made available across English, Persian (Afghanistan) and Pashto, with direct application routes wherever available. ARIA HUB also provides career and application tools for users and a submission pathway for employers and partner organizations.',
          fa: 'توضیح بلند (۱۵۰ کلمه): آریا هاب شغل‌های روز، بورسیه‌ها، کارآموزی‌ها، فلوشیپ‌ها، برنامه‌های آموزشی و فرصت‌های برگزیدهٔ بین‌المللی را در یک پلتفرم جستجوپذیر سازمان‌دهی می‌کند. هر آگهی بررسی، خلاصه و به زبان‌های انگلیسی، دری (فارسی) و پشتو عرضه می‌شود و هرجا ممکن باشد مسیر رسمی درخواست ارائه می‌گردد. آریا هاب در کنار آن، ابزارهای حرفه‌ای و درخواست برای کاربران و مسیر ثبت فرصت برای کارفرمایان و مؤسسات همکار فراهم می‌کند.',
          ps: 'اوږده شننه (۱۵۰ کلمې): آریا هاب ورځې دندې، بورسونه، د کار روزنې، فلوشیپونه، روزنیز پروګرامونه او ټاکلي نړیوال فرصتونه په یو لټون وړ پلیټفارم کې تنظیموي. هر اعلان بیاکتنه کیږي، لنډیز او په انګلیسي، دري (فارسي) او پښتو چمتو کیږي او هرچیرې چې وي، رسمي د غوښتنلیک لارې ورسره وي. آریا هاب د کاروونکو لپاره مسلکي او د غوښتنلیک وسایل او د کارګمارنانو او شریکه ادارو لپاره د فرصت ثبت لار هم برابروي.',
        },
      ],
    },
    {
      heading: { en: 'Logo & brand assets', fa: 'لوگو و دارایی‌های برند', ps: 'لوګو او د برانډ شتمنۍ' },
      bulletLinks: [
        { href: '/logo.svg', label: { en: 'Logo — SVG (vector)', fa: 'لوگو — SVG (وکتور)', ps: 'لوګو — SVG (وېکتور)' } },
        { href: '/logo.jpg', label: { en: 'Logo — JPG', fa: 'لوگو — JPG', ps: 'لوګو — JPG' } },
        { href: '/og-image.png', label: { en: 'Social share image (Open Graph)', fa: 'تصویر اشتراک اجتماعی (Open Graph)', ps: 'د ټولنیزې شریکولو انځور (Open Graph)' } },
      ],
    },
    {
      heading: { en: 'Facts editors can use', fa: 'حقایق قابل استفاده برای سردبیران', ps: 'د مدیرانو لپاره کارېدونکې حقیقتونه' },
      bullets: [
        {
          en: 'A reviewed catalog of jobs, scholarships, internships, fellowships and trainings — every listing passes editorial review before publication.',
          fa: 'کاتالوگ بررسی‌شده‌ای از شغل‌ها، بورسیه‌ها، کارآموزی‌ها، فلوشیپ‌ها و دوره‌های آموزشی — هر آگهی پیش از انتشار بازبینی تحریریه را می‌گذراند.',
          ps: 'د دندو، بورسونو، د کار روزنې، فلوشیپونو او روزنیزو دوره‌و یو بیاکتنی کتلاګ — هر اعلان د خپرولو دمخه د مدیرې ټیم بیاکتنه تېروي.',
        },
        {
          en: 'Trilingual publishing in English, Persian (Afghanistan) and Pashto with full right-to-left support.',
          fa: 'انتشار سه‌زبانه به انگلیسی، دری (فارسی) و پشتو با پشتیبانی کامل از راست‌به‌چپ.',
          ps: 'په انګلیسي، دري (فارسي) او پښتو درې ژبو خپرونه، د ښي-څخه-کیڼ بشپړ ملاتړ سره.',
        },
        {
          en: 'Direct official application routes: ARIA HUB links to the official source instead of re-routing applicants.',
          fa: 'مسیرهای رسمی و مستقیم درخواست: آریا هاب به منبع رسمی لینک می‌دهد و متقاضیان را از مسیر دیگری عبور نمی‌دهد.',
          ps: 'رسمي او مستقیم د غوښتنلیک لارې: آریا هاب رسمي سرچینې ته لینک ورکوي او غوښتونکي پر بلې لارې نه باسي.',
        },
        {
          en: 'Free opportunity posting for employers and organizations during the launch phase, including review and translation.',
          fa: 'ثبت رایگان فرصت برای کارفرمایان و مؤسسات در دورهٔ آغاز، همراه با بررسی و ترجمه.',
          ps: 'د کارګمارنانو او ادارو لپاره د پیل په دوره کې وړیا د فرصت ثبت، د بیاکتنې او ژباړې په شمول.',
        },
        {
          en: 'A public RSS feed of the newest opportunities for syndication and embedding by partners.',
          fa: 'فید RSS عمومی تازه‌ترین فرصت‌ها برای بازنشر و جاسازی توسط شرکا.',
          ps: 'د نویو فرصتونو عامه RSS فیډ چې شریکان یې د بیا خپرولو او ښکاره کولو لپاره کاروي.',
        },
        {
          en: 'Audience metrics are shared only as dated analytics exports. Ask us for the current figure and its source; we do not quote unverified numbers.',
          fa: 'آمار مخاطبان تنها به‌صورت خروجی تحلیلی با تاریخ ارائه می‌شود. برای رقم فعلی و منبع آن با ما تماس بگیرید؛ از اعداد راستی‌آزمایی‌نشده استفاده نمی‌کنیم.',
          ps: 'د اورېدونکو احصایې یوازې د نېټې سره د تحلیلي راپور په بڼه شریکول کیږي. د اوسني شمېرې او سرچینې لپاره موږ ته خبر راکړئ؛ موږ بې تصدیقه شمېرې نه وایو.',
        },
      ],
    },
    {
      heading: { en: 'Media & partnership contact', fa: 'تماس مطبوعاتی و همکاری', ps: 'د مطبوعاتو او همکارۍ اړیکه' },
      paragraphs: [
        {
          en: 'For interviews, data requests, fact-checking or partnership inquiries, email info@myariahub.com or use our contact page. We answer media requests as a priority.',
          fa: 'برای مصاحبه، درخواست داده، راستی‌آزمایی یا همکاری، به info@myariahub.com ایمیل بزنید یا از صفحهٔ تماس استفاده کنید. درخواست‌های رسانه‌ای در اولویت پاسخ داده می‌شوند.',
          ps: 'د مرکې، د ډاټا غوښتنې، د حقیقت تایید یا د همکارۍ پوښتنو لپاره info@myariahub.com ته بریښنالیک ولېږئ یا زموږ د اړیکې پاڼه وکاروئ. د میډیا غوښتنې په لومړیتوب ځوابول کیږي.',
        },
      ],
    },
    {
      heading: { en: 'Coverage & press releases', fa: 'پوشش رسانه‌ای و بیانیه‌های مطبوعاتی', ps: 'د رسنیو پوښښ او مطبوعاتي اعلامیې' },
      paragraphs: [
        {
          en: 'Independent coverage and official press releases are listed here as they accumulate. Nothing on this page should be read as an endorsement by any third party.',
          fa: 'پوشش مستقل و بیانیه‌های رسمی مطبوعاتی با مرور زمان در این بخش فهرست می‌شوند. هیچ بخش از این صفحه نباید تأیید یا حمایت یک شخص ثالث تلقی شود.',
          ps: 'خپلواک پوښښ او رسمي مطبوعاتي اعلامیې د وخت په تېرېدو سره دلته لیست کیږي. ددې پاڼې هېڅ برخه نه ده د درېیمې ډلې تایید ګڼل کېږي.',
        },
      ],
    },
  ],
};

export const PARTNERS_DOC: LocalDoc = {
  title: { en: 'Partner with ARIA HUB', fa: 'با آریا هاب همکاری کنید', ps: 'له آریا هاب سره همکاري وکړئ' },
  sections: [
    {
      heading: { en: 'Why partner with us', fa: 'چرا با ما همکاری کنید', ps: 'ولې له موږ سره همکاري وکړئ' },
      paragraphs: [
        {
          en: 'ARIA HUB helps people from Afghanistan find jobs, scholarships and global opportunities with clear multilingual summaries and direct official application routes. Partnering means your community gets a continuously updated opportunity resource — without your team rebuilding one yourself.',
          fa: 'آریا هاب به مردم افغانستان کمک می‌کند شغل‌ها، بورسیه‌ها و فرصت‌های جهانی را با خلاصه‌های چندزبانهٔ روشن و مسیرهای رسمی درخواست پیدا کنند. همکاری یعنی جامعهٔ شما منبعی از فرصت‌های به‌روز و پیوسته دریافت می‌کند — بدون آنکه تیم شما خودش چنین منبعی بسازد.',
          ps: 'آریا هاب د افغانستان خلکو سره دندې، بورسونه او نړیوال فرصتونه د روښانه څو ژبو لنډیزونو او رسمي د غوښتنلیک لارو په مرسته پیدا کولو کې مرسته کوي. همکاري دا ده چې ستاسو ټولنه د تل لپاره تازه فرصتونو سرچینه ترلاسه کوي — پرته له دې چې ستاسو ټیم پخپله دا کار وکړي.',
        },
        {
          en: 'Every partner link is tracked with UTM parameters, so both sides can see what actually works. We report clicks and subscribers honestly — no vanity numbers.',
          fa: 'هر لینک همکاری با پارامترهای UTM ردیابی می‌شود تا هر دو طرف ببینند چه چیزی واقعاً جواب می‌دهد. کلیک‌ها و مشترکان را صادقانه گزارش می‌کنیم — بدون اعداد نمایشی.',
          ps: 'هر شریکه لینک د UTM پارامیټرونو سره تعقیبیږي چې دواړه خواوې وګوري کومه کار واقعاً نتیجه لري. کلیکونه او اشتراکونه مو رښتیا راپور کوو — پرته له ښکاره شمېرو.',
        },
      ],
    },
    {
      heading: { en: 'Ways to work together', fa: 'شیوه‌های همکاری', ps: 'د همکارۍ لارې' },
      bullets: [
        {
          en: 'Co-post partnership — we share 3–5 vetted opportunities per week with your community, with attribution and tracked links.',
          fa: 'همکاری انتشار مشترک — هر هفته ۳ تا ۵ فرصت بررسی‌شده را با attribution و لینک ردیابی‌شده با جامعهٔ شما به اشتراک می‌گذاریم.',
          ps: 'ګډ خپرونه همکاري — هره اونۍ موږ ۳ تر ۵ بیاکتني شوي فرصتونه ستاسو ټولنې سره د نوم او تعقیبي لینکونو سره شریکوو.',
        },
        {
          en: 'Co-hosted webinar — you bring the audience, we teach opportunity verification and the application workflow; both sides collect opt-in registrations.',
          fa: 'وبینار مشترک — شما مخاطب می‌آورید، ما راستی‌آزمایی فرصت‌ها و روند درخواست را آموزش می‌دهیم؛ هر دو طرف ثبت‌نام داوطلبانه جمع می‌کنند.',
          ps: 'ګډ ویبنار — تاسو اورېدونکي راوړئ، موږ د فرصتونو تایید او د غوښتنلیک بهیر ښیو؛ دواړه خواوې خپل سري ثبتنامې راټولوي.',
        },
        {
          en: 'Opportunity feed — embed the latest-opportunities widget, RSS or JSON feed on your resource page.',
          fa: 'فید فرصت‌ها — ویجت تازه‌ترین فرصت‌ها، RSS یا فید JSON را در صفحهٔ منابع خود جاسازی کنید.',
          ps: 'د فرصتونو فیډ — د نویو فرصتونو ویجټ، RSS یا JSON فیډ په خپله د سرچینو پاڼه کې ښکاره کړئ.',
        },
        {
          en: 'Co-branded landing page — a dedicated page on myariahub.com with curated opportunities for your community and source attribution.',
          fa: 'صفحهٔ فرود مشترک — صفحه‌ای اختصاصی در myariahub.com با فرصت‌های منتخب جامعهٔ شما و ذکر منبع.',
          ps: 'ګډه نښلونې پاڼه — په myariahub.com کې ځانګړې پاڼه ستاسو ټولنې لپاره ټاکل شویو فرصتونو او د سرچینې یادونې سره.',
        },
        {
          en: 'Referral resource — add ARIA HUB to your permanent scholarships/jobs/resources page.',
          fa: 'منبع ارجاع — آریا هاب را به صفحهٔ دائمی بورسیه‌ها/شغل‌ها/منابع خود اضافه کنید.',
          ps: 'د سپارښتنې سرچینه — آریا هاب خپلې دایمي د بورسونو/دندو/سرچینو پاڼې ته ورزیات کړئ.',
        },
        {
          en: 'Employer pathway — your organization submits vacancies directly; ARIA HUB handles review, translation and distribution.',
          fa: 'مسیر کارفرما — مؤسسهٔ شما آگهی‌ها را مستقیم ثبت می‌کند؛ آریا هاب بررسی، ترجمه و انتشار را انجام می‌دهد.',
          ps: 'د کارګمارنې لار — ستاسو اداره خپل اعلانونه مستقیم لېږي؛ آریا هاب بیاکتنه، ژباړه او خپرونه پر غاړه اخلي.',
        },
      ],
    },
    {
      heading: { en: 'Free partner opportunity feed', fa: 'فید رایگان فرصت‌ها برای شرکا', ps: 'د شریکانو وړیا د فرصتونو فیډ' },
      paragraphs: [
        {
          en: 'Partners can display live ARIA HUB opportunities on their own website for free, in three ways:',
          fa: 'شرکا می‌توانند فرصت‌های زندهٔ آریا هاب را به سه روش رایگان در سایت خود نمایش دهند:',
          ps: 'شریکان کولی شي ژوندي آریا هاب فرصتونه په درېو لارو په خپله وېبپاڼه وړیا وښيي:',
        },
      ],
      bullets: [
        {
          en: 'RSS — subscribe at https://www.myariahub.com/rss.xml (the 50 newest opportunities).',
          fa: 'RSS — از https://www.myariahub.com/rss.xml مشترک شوید (۵۰ تازه‌ترین فرصت).',
          ps: 'RSS — په https://www.myariahub.com/rss.xml کې اشتراک وکړئ (۵۰ نوي فرصتونه).',
        },
        {
          en: 'JSON for developers — call /api/partners/feed with optional filters: limit, category, country, province, deadlineDays and partner (your name, used for attribution).',
          fa: 'JSON برای توسعه‌دهندگان — /api/partners/feed را با فیلترهای اختیاری فراخوانی کنید: limit، category، country، province، deadlineDays و partner (نام شما، برای attribution).',
          ps: 'د پراختیاګرو لپاره JSON — /api/partners/feed د اختیاري فلټرونو سره وګورئ: limit، category، country، province، deadlineDays او partner (ستاسو نوم، د نوم یادونې لپاره).',
        },
        {
          en: 'No-code embed — paste one script tag: <script src="https://www.myariahub.com/embed/opportunities-widget.js" data-aria-partner="your-name"></script>',
          fa: 'جاسازی بدون کد — فقط یک تگ اسکریپت بچسبانید: <script src="https://www.myariahub.com/embed/opportunities-widget.js" data-aria-partner="your-name"></script>',
          ps: 'بې کوډ ښکاره کول — یوازې یو سکریپټ ټګ paste کړئ: <script src="https://www.myariahub.com/embed/opportunities-widget.js" data-aria-partner="your-name"></script>',
        },
      ],
    },
    {
      heading: { en: 'Measurement & transparency', fa: 'سنجش و شفافیت', ps: 'کچه او روڼتیا' },
      paragraphs: [
        {
          en: 'Every partnership uses a unique UTM link. On request we send a simple monthly recap: clicks to ARIA HUB from your channel and new subscribers. We never present self-reported reach as independent fact.',
          fa: 'هر همکاری از لینک UTM یکتا استفاده می‌کند. بنا بر درخواست، خلاصهٔ ماهانهٔ ساده‌ای می‌فرستیم: کلیک‌های ارسالی از کانال شما به آریا هاب و مشترکان جدید. هرگز دسترسی اعلامی خودمان را به‌عنوان واقعیت مستقل ارائه نمی‌کنیم.',
          ps: 'هره همکاري ځانګړی UTM لینک کاروي. په غوښتنه مو ساده میاشتنی لنډیز لېږو: ستاسو چنل څخه آریا هاب ته کلیکونه او نوي اشتراکونه. موږ هیڅکله خپل ځان اعلان شوې رسېدنه خپلواکه حقیقت نه ګڼو.',
        },
      ],
    },
    {
      heading: { en: 'Get started', fa: 'شروع کنید', ps: 'پیل وکړئ' },
      paragraphs: [
        {
          en: 'Email info@myariahub.com with one sentence about your organization and the format you prefer. We prepare the first version within days so your team can evaluate it before committing to anything.',
          fa: 'به info@myariahub.com ایمیل بزنید؛ یک جمله دربارهٔ مؤسسه‌تان و قالب موردعلاقه‌تان بنویسید. نسخهٔ اول را ظرف چند روز آماده می‌کنیم تا تیم شما پیش از هر تعهدی آن را ارزیابی کند.',
          ps: 'info@myariahub.com ته بریښنالیک ولېږئ؛ یوه جمله د خپلې ادارې او خوښې فورمې په اړه ولیکئ. موږ لومړۍ نسخه په څو ورځو کې چمتو کوو چې ستاسو ټیم یې د هر ډول ژمنې دمخه وګوري.',
        },
      ],
    },
  ],
};

export const WEBINAR_DOC: LocalDoc = {
  title: {
    en: 'How to Find and Verify Scholarships and Jobs Without Missing Deadlines',
    fa: 'چگونه بورسیه‌ها و شغل‌ها را پیدا و راستی‌آزمایی کنیم و ددلاین‌ها را از دست ندهیم',
    ps: 'څنګه بورسونه او دندې پیدا او تایید کړو او مهلونه له لاسه نه ورکړو',
  },
  sections: [
    {
      heading: { en: 'What you will learn', fa: 'چه چیزهایی یاد می‌گیرید', ps: 'څه به زده کړئ' },
      bullets: [
        {
          en: 'How to verify an opportunity’s official source before you apply.',
          fa: 'چگونه پیش از درخواست، منبع رسمی یک فرصت را راستی‌آزمایی کنیم.',
          ps: 'څنګه د غوښتنلیک دمخه د یو فرصت رسمي سرچینه تایید کړو.',
        },
        {
          en: 'How to spot misleading application links and fake postings.',
          fa: 'چگونه لینک‌های گمراه‌کنندهٔ درخواست و آگهی‌های جعلی را تشخیص دهیم.',
          ps: 'څنګه د غوښتنلیک ګمراه کوونکي لینکونه او جعلي اعلانونه وپیژنو.',
        },
        {
          en: 'A simple deadline system so you never miss a submission date.',
          fa: 'یک سیستم سادهٔ ددلاین تا هیچ مهل ارسالی را از دست ندهید.',
          ps: 'یو ساده د مهلو سیستم چې هیڅ د سپارلو نېټه له لاسه نه ورکوئ.',
        },
        {
          en: 'How to use ARIA HUB’s verified summaries and direct official application links.',
          fa: 'چگونه از خلاصه‌های راستی‌آزمایی‌شده و لینک‌های رسمی آریا هاب استفاده کنیم.',
          ps: 'څنګه د آریا هاب تایید شوي لنډیزونه او رسمي د غوښتنلیک لینکونه وکاروو.',
        },
      ],
    },
    {
      heading: { en: 'Format', fa: 'قالب جلسه', ps: 'د ناسته بڼه' },
      paragraphs: [
        {
          en: 'A free online session — 45 minutes plus live Q&A — co-hosted with a partner education organization. The date will be announced soon; everyone registered here receives the invitation and a reminder. The session is recorded only with participant notice and consent. Educational first: the method works anywhere, with or without ARIA HUB.',
          fa: 'یک جلسهٔ آنلاین رایگان — ۴۵ دقیقه به‌همراه پرسش‌وپاسخ زنده — با همکاری یک مؤسسهٔ آموزشی شریک برگزار می‌شود. تاریخ به‌زودی اعلام می‌شود؛ همهٔ ثبت‌نام‌شدگان دعوت‌نامه و یادآور دریافت می‌کنند. ضبط جلسه فقط با اطلاع و رضایت شرکت‌کنندگان انجام می‌شود. اول آموزش: این روش همه‌جا کار می‌کند، با یا بدون آریا هاب.',
          ps: 'یوه وړیا آنلاین ناسته — ۴۵ دقیقې او ژوندې پوښتنو ځوابونو سره — د یوې شریکې تعلیمي ادارې په همکارۍ جوړیږي. نېټه ژر اعلانیږي؛ ټول ثبت شوي کسان بلنه او یادونه ترلاسه کوي. ناسته یوازې د ګډونوالو خبرتیا او رضایت سره ثبت کیږي. لومړی زده کړه: دا طریقه هرچیرې کار کوي، له آریا هاب سره یا پرته.',
        },
      ],
    },
    {
      heading: { en: 'Register for the invitation', fa: 'برای دریافت دعوت‌نامه ثبت‌نام کنید', ps: 'د بلنې لپاره ثبت نوم وکړئ' },
      paragraphs: [
        {
          en: 'Add your email below. We will send you the date, the joining link and one reminder — nothing else.',
          fa: 'ایمیل خود را در زیر وارد کنید. تاریخ، لینک ورود و یک یادآور برایتان می‌فرستیم — چیزی جز این نه.',
          ps: 'خپل بریښنالیک لاندې ولیکئ. نېټه، د ګډون لینک او یوه یادونه درلېږو — بل څه نه.',
        },
      ],
    },
  ],
};

export const AMBASSADOR_DOC: LocalDoc = {
  title: { en: 'Campus & Community Ambassador Program', fa: 'برنامهٔ سفیران دانشگاهی و اجتماعی', ps: 'د پوهنتون او ټولنې سفیرانو پروګرام' },
  sections: [
    {
      heading: { en: 'The pilot cohort', fa: 'دورهٔ آزمایشی', ps: 'ازموینې ډله' },
      paragraphs: [
        {
          en: 'We are selecting a small pilot group of students and young professionals who already help their communities find credible opportunities. Ambassadors share selected relevant opportunities, collect feedback, support one learning session and connect ARIA HUB with useful student and employer networks. This is not a spam role and there are no copy-paste posting quotas — activity is measured by useful outcomes, and recognition is based on real contribution.',
          fa: 'گروه کوچکی از محصلان و جوانان حرفه‌ای را انتخاب می‌کنیم که هم‌اکنون به جامعه‌شان در یافتن فرصت‌های معتبر کمک می‌کنند. سفیران فرصت‌های منتخب مرتبط را به اشتراک می‌گذارند، بازخورد جمع می‌کنند، از یک جلسهٔ یادگیری پشتیبانی می‌کنند و آریا هاب را با شبکه‌های مفید محصلان و کارفرمایان پیوند می‌دهند. این نقش اسپم نیست و سهمیهٔ کپی-پیست ندارد — فعالیت با نتایج مفید سنجیده می‌شود و قدردانی بر اساس سهم واقعی است.',
          ps: 'موږ د زده کوونکو او ځوانانو مسلکي یوه کوچنې ازموینې ډله ټاکو چې اوس هم خپلو ټولنو سره د باوري فرصتونو په موندلو کې مرسته کوي. سفیران ټاکلي فرصتونه شریکوي، فیډبیک راټولوي، یوه زده کړې ناسته ملاتړ کوي او آریا هاب د زده کوونکو او کارګمارنانو ګټورو شبکو سره نښلوي. دا سپام دنده نه ده او کاپي-پیست کوټه نه لري — فعالیت ګټورو نتیجو په اندازه کیږي او قدردانی پر ریښتینې ونډه ده.',
        },
      ],
    },
    {
      heading: { en: 'What ambassadors do', fa: 'سفیران چه می‌کنند', ps: 'سفیران څه کوي' },
      bullets: [
        {
          en: 'Share selected opportunities with relevant groups and communities.',
          fa: 'به اشتراک‌گذاری فرصت‌های منتخب با گروه‌ها و جامعه‌های مرتبط.',
          ps: 'ټاکلي فرصتونه اړوندو ډلو او ټولنو سره شریکول.',
        },
        {
          en: 'Host one small info session per month (online or on campus).',
          fa: 'برگزاری یک نشست اطلاعاتی کوچک در ماه (آنلاین یا در دانشگاه).',
          ps: 'په میاشت کې یوه کوچنۍ د معلوماتو ناسته جوړول (آنلاین یا په پوهنتون کې).',
        },
        {
          en: 'Collect honest user feedback and report listing errors.',
          fa: 'جمع‌آوری بازخورد صادقانهٔ کاربران و گزارش خطاهای آگهی‌ها.',
          ps: 'د کاروونکو رښتینی فیډبیک راټولول او د اعلانونو تېروتنې راپورل.',
        },
        {
          en: 'Refer employers, partners and useful networks to ARIA HUB.',
          fa: 'معرفی کارفرمایان، شرکا و شبکه‌های مفید به آریا هاب.',
          ps: 'کارګمارنان، شریکان او ګټورې شبکې آریا هاب ته سپارل.',
        },
        {
          en: 'Produce one useful local guide per month (a short post is enough).',
          fa: 'تهیهٔ یک راهنمای مفید محلی در ماه (یک پست کوتاه کافی است).',
          ps: 'په میاشت کې یو ګټور سیمه‌ییز لارښود جوړول (یو لنډ پوسټ کافي دی).',
        },
      ],
    },
    {
      heading: { en: 'What ambassadors do NOT do', fa: 'سفیران چه نمی‌کنند', ps: 'سفیران څه نه کوي' },
      bullets: [
        {
          en: 'No mass-messaging strangers or pasting the same link everywhere.',
          fa: 'پیام انبوه به غریبه‌ها یا چسباندن یک لینک در همه‌جا ممنوع.',
          ps: 'نا بلونو ته ډله‌ییز پیغام یا یو لینک هرچیرې کېښودل نه.',
        },
        {
          en: 'No visa, admission or employment guarantees — ever.',
          fa: 'هیچ‌گاه تضمین ویزا، پذیرش یا اشتغال ارائه نمی‌دهند.',
          ps: 'هیڅکله د ویزې، داخلې یا دندې تضمین نه ورکوي.',
        },
        {
          en: 'No invented metrics or fake testimonials.',
          fa: 'اعداد ساختگی یا توصیه‌نامه‌های جعلی ممنوع.',
          ps: 'جعل شمېرې یا درغلی سپارښتنې نه.',
        },
        {
          en: 'No impersonation — ambassadors never claim to be ARIA HUB employees.',
          fa: 'بدون معرفی نادرست — سفیران هرگز خود را کارمند آریا هاب معرفی نمی‌کنند.',
          ps: 'غلطه پېژندنه نه — سفیران هیڅکله ځان د آریا هاب کارکوونکي نه بولي.',
        },
        {
          en: 'No sharing anyone’s story or data without consent.',
          fa: 'به‌اشتراک‌گذاری داستان یا دادهٔ هر شخص بدون رضایت ممنوع.',
          ps: 'د چا کیسه یا ډاټا پرته له رضایت شریکول نه.',
        },
      ],
    },
    {
      heading: { en: 'Tracking & recognition', fa: 'ردیابی و قدردانی', ps: 'تعقیب او قدرداني' },
      bullets: [
        {
          en: 'Every ambassador gets a unique tracked link/code and a monthly activity log.',
          fa: 'هر سفیر لینک/کد ردیابی یکتا و گزارش فعالیت ماهانه دریافت می‌کند.',
          ps: 'هر سفیر ځانګړی تعقیبي لینک/کوډ او میاشتنی د فعالیت راپور ترلاسه کوي.',
        },
        {
          en: 'Recognition is contribution-based: a certificate, a public profile, recommendations based on real work, and speaking opportunities at events.',
          fa: 'قدردانی بر پایهٔ سهم است: گواهی، پروفایل عمومی، توصیه‌نامه بر اساس کار واقعی و فرصت سخنرانی در رویدادها.',
          ps: 'قدرداني پر ونډه ده: سند، عامه پروفایل، پر ریښتینې کار پر بنسړ سپارښتنې او په پیښو کې د وینا فرصتونه.',
        },
        {
          en: 'Ambassadors whose activity creates no qualified traffic or community value are rotated out of the pilot.',
          fa: 'سفیرانی که فعالیت‌شان ترافیک هدفمند یا ارزش اجتماعی ایجاد نکند، از دورهٔ آزمایشی کنار گذاشته می‌شوند.',
          ps: 'هغه سفیران چې فعالیت یې موخه لرونکی ترافیک یا ټولنیزه ارزښت نه جوړوي له ازموینې ډلې ایستل کیږي.',
        },
      ],
    },
    {
      heading: { en: 'Code of conduct', fa: 'منشور رفتاری', ps: 'د چلند منشور' },
      bullets: [
        {
          en: 'Be accurate: never change deadlines, eligibility or requirements when sharing a listing.',
          fa: 'دقیق باشید: هنگام اشتراک آگهی، هرگز ددلاین، شرایط یا الزامات را تغییر ندهید.',
          ps: 'سم وي: د اعلان د شریکولو پر مهال هیڅکله مهلت، وړتیا یا اړتیاوې نه بدلوئ.',
        },
        {
          en: 'Respect privacy: collect only necessary information and explain consent for follow-up.',
          fa: 'به حریم خصوصی احترام بگذارید: فقط اطلاعات ضروری جمع کنید و رضایت برای پیگیری را توضیح دهید.',
          ps: 'محرمیت ته درناوی وکړئ: یوازې اړین معلومات راټول کړئ او د تعقیب لپاره رضایت روښانه کړئ.',
        },
        {
          en: 'No spam, fake testimonials, impersonation or misleading institutional affiliation.',
          fa: 'بدون اسپم، توصیه‌نامهٔ جعلی، جعل هویت یا وابستگی مؤسسه‌ای گمراه‌کننده.',
          ps: 'سپام، درغلې سپارښتنې، د هویت جعل یا ګمراه کوونکې اداري تړاو نه.',
        },
        {
          en: 'Keep the official application route intact — always share the direct official link.',
          fa: 'مسیر رسمی درخواست را دست‌نخورده نگه دارید — همیشه لینک رسمی مستقیم را به اشتراک بگذارید.',
          ps: 'رسمي د غوښتنلیک لار نه اړوئ — تل مستقیم رسمي لینک شریک کړئ.',
        },
      ],
    },
    {
      heading: { en: 'Apply', fa: 'درخواست دهید', ps: 'غوښتنه وکړئ' },
      paragraphs: [
        {
          en: 'Email info@myariahub.com with the subject “Ambassador pilot”. Tell us your name, your university or community, your city, and one sentence about how you already help people find opportunities.',
          fa: 'به info@myariahub.com با موضوع «Ambassador pilot» ایمیل بزنید. نام، دانشگاه یا جامعه، شهر و یک جمله دربارهٔ اینکه چگونه اکنون به مردم در یافتن فرصت‌ها کمک می‌کنید را بنویسید.',
          ps: 'info@myariahub.com ته د «Ambassador pilot» د موضوع سره بریښنالیک ولېږئ. خپل نوم، پوهنتون یا ټولنه، ښار او یوه جمله ولیکئ چې څنګه اوس خلکو سره د فرصتونو په موندلو کې مرسته کوئ.',
        },
      ],
    },
  ],
};
