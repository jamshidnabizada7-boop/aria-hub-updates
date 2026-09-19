/**
 * Built-in trilingual fallback content for static pages (about / privacy / terms).
 *
 * WHY: the `Page` CMS table may be empty (fresh DB / import pending). Without
 * this, the pages rendered hardcoded ENGLISH sections for every language —
 * Persian/Pashto users saw an untranslated page. These built-in docs are the
 * canonical copy; a published `Page` row (admin-editable) always overrides it,
 * picked via `getLocalizedContent` (row titleI18n/contentI18n → base → here).
 *
 * Structure is intentionally simple (heading / paragraphs / bullets) so it
 * renders with the existing prose styles and stays RTL-safe.
 */

export type Tril = { en: string; fa: string; ps: string };

export type LocalSection = {
  heading: Tril;
  paragraphs?: Tril[];
  bullets?: Tril[];
  /** Render a bullet as a link — { href, label uses Tril text } */
  bulletLinks?: { href: string; label: Tril }[];
};

export type LocalDoc = {
  title: Tril;
  sections: LocalSection[];
};

export const pickTril = (t: Tril | undefined, lang: string): string =>
  !t ? '' : (t[lang as keyof Tril] ?? t.en);

export const ABOUT_DOC: LocalDoc = {
  title: { en: 'About ARIA HUB', fa: 'درباره آریا هاب', ps: 'د آریا هاب په اړه' },
  sections: [
    {
      heading: { en: 'Our Mission', fa: 'مأموریت ما', ps: 'زموږ مأموریت' },
      paragraphs: [
        {
          en: 'At ARIA HUB, our mission is to empower individuals and businesses by connecting them with premium global opportunities. We believe that access to the right information and professional guidance is the key to international success. Whether you are looking for educational scholarships, business consulting, or visa services, we are here to bridge the gap.',
          fa: 'مأموریت ما در آریا هاب این است که افراد و کسب‌وکارها را با فرصت‌های ممتاز جهانی پیوند دهیم و به آن‌ها توانمندی ببخشیم. ما باور داریم که دسترسی به اطلاعات درست و راهنمایی حرفه‌ای، کلید موفقیت بین‌المللی است. چه در جستجوی بورسیه تحصیلی باشید، چه مشاوره کسب‌وکار یا خدمات ویزا، ما اینجا هستیم تا این شکاف را پر کنیم.',
          ps: 'زموږ مأموریت په آریا هاب کې دا دی چې افراد او سوداګرۍ د نړیوالو غوره فرصتونو سره ونښلوو او ورته واک ورکړو. باور لرو چې سم معلوماتو او مسلکي لارښود ته لاسرسی د نړیوال بریا کیلي دی. که تاسو د تحصیلي بورسونو، سوداګریزې مشورې یا د ویزې خدمتونو په لټون کې یاست، موږ دلته یو چې دا فاصله ډکه کړو.',
        },
      ],
    },
    {
      heading: { en: 'What We Do', fa: 'چه کاری انجام می‌دهیم', ps: 'موږ څه کوو' },
      paragraphs: [
        {
          en: 'We curate and provide high-quality resources, actionable advice, and professional services across several domains:',
          fa: 'منابع باکیفیت، مشوره‌های عملی و خدمات حرفه‌ای را در چند حوزه گردآوری و ارائه می‌کنیم:',
          ps: 'موږ په څو برخو کې با کیفیت سرچینې، عملي مشورې او مسلکي خدمتونه راټولو او وړاندې کوو:',
        },
      ],
      bullets: [
        {
          en: 'Opportunities & Scholarships: We aggregate and analyze the best global opportunities to help students and professionals advance their careers.',
          fa: 'فرصت‌ها و بورسیه‌ها: بهترین فرصت‌های جهانی را گردآوری و تحلیل می‌کنیم تا محصلان و متخصصان بتوانند مسیر کاری خود را پیش ببرند.',
          ps: 'فرصتونه او بورسونه: غوره نړیوال فرصتونه راټولو او تحلیل کوو چې زده کوونکي او مسلکي کسان خپل مسلک وړاندې بوځي.',
        },
        {
          en: 'Visa Preparation: Expert guidance on navigating complex immigration and visa processes.',
          fa: 'آمادگی ویزا: راهنمایی تخصصی برای پیمودن پروسه‌های پیچیده مهاجرت و ویزا.',
          ps: 'د ویزې چمتووالی: د کډوالي او ویزې پېچلو پروسو لپاره مسلکي لارښوونه.',
        },
        {
          en: 'Business Services: Comprehensive consulting for businesses looking to expand internationally.',
          fa: 'خدمات کسب‌وکار: مشاوره جامع برای کسب‌وکارهایی که به دنبال گسترش بین‌المللی هستند.',
          ps: 'سوداګریز خدمتونه: د هغو سوداګریو لپاره بشپړه مشوره چې نړیواله پراختیا غواړي.',
        },
      ],
    },
    {
      heading: { en: 'Why Choose Us?', fa: 'چرا ما را انتخاب کنید؟', ps: 'ولې موږ غوره کړئ؟' },
      paragraphs: [
        {
          en: "Unlike standard opportunity aggregators, we provide deep insights, customized resources (such as CV builders and interview prep tools), and personalized consulting to ensure our users don't just find an opportunity, but successfully secure it.",
          fa: 'برخلاف گردآورنده‌های معمول فرصت‌ها، ما بینش عمیق، منابع سفارشی (مانند سازنده رزومه و ابزارهای آمادگی مصاحبه) و مشاوره شخصی‌سازی‌شده ارائه می‌کنیم تا کاربران ما نه‌تنها فرصتی را بیابند، بلکه آن را با موفقیت از آنِ خود کنند.',
          ps: 'له عادي فرصت راټولوونکو سره پرتله، موږ ژورې لیدلوري، ځانګړې سرچینې (لکه د سی وي جوړونکی او د مرکې چمتووالو وسایل) او شخصي مشوره وړاندې کوو چې کاروونکي مو یوازې فرصت پیدا نه کړي، بلکې په بریالیتوب سره یې ترلاسه کړي.',
        },
      ],
    },
  ],
};

export const PRIVACY_DOC: LocalDoc = {
  title: { en: 'Privacy Policy', fa: 'سیاست حفظ حریم خصوصی', ps: 'د محرمیت تګلاره' },
  sections: [
    {
      heading: { en: '1. Introduction', fa: '۱. مقدمه', ps: '۱. پېژندنه' },
      paragraphs: [
        {
          en: 'Welcome to ARIA HUB ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.',
          fa: 'به آریا هاب خوش آمدید («ما»). ما به حریم خصوصی شما احترام می‌گذاریم و متعهد به حفاظت از داده‌های شخصی شما هستیم. این سیاست حریم خصوصی توضیح می‌دهد که هنگام بازدید شما از وب‌سایت ما، چگونه از داده‌های شخصی‌تان مراقبت می‌کنیم و حقوق شما در این زمینه و حمایت قانونی از آن چگونه است.',
          ps: 'آریا هاب ته ښه راغلاست («موږ»). موږ ستاسو محرمیت ته درناوی کوو او ستاسو د شخصي معلوماتو د خوندیتوب ژمن یو. دا محرمیت تګلاره تشریح کوي چې کله تاسو زموږ وېبسایته راځۍ، موږ ستاسو شخصي معلوماتو ته څنګه پاملرنه کوو، ستاسو حقوق څه دي او قانون څنګه ستاسو ملاتړ کوي.',
        },
      ],
    },
    {
      heading: { en: '2. The Data We Collect About You', fa: '۲. داده‌هایی که درباره شما جمع‌آوری می‌کنیم', ps: '۲. هغه معلومات چې موږ یې ستاسو په اړه راټولوو' },
      paragraphs: [
        {
          en: 'We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:',
          fa: 'انواع داده‌های شخصی که ممکن است درباره شما جمع‌آوری، استفاده، ذخیره و منتقل کنیم، به شرح زیر گروه‌بندی شده است:',
          ps: 'د شخصي معلوماتو هغه ډولونه چې ممکن یې ستاسو په اړه راټول، کارول، ذخیره او انتقال کړو، په لاندې ډول ډلبندي شوي دي:',
        },
      ],
      bullets: [
        {
          en: 'Identity Data includes first name, last name, username or similar identifier.',
          fa: 'داده‌های هویتی: شامل نام، تخلص، نام کاربری یا شناسه مشابه.',
          ps: 'د هویت معلومات: لومړی نوم، تخلص، د کاروونکی نوم یا ورته پیژندنه په بر کې نیسي.',
        },
        {
          en: 'Contact Data includes billing address, delivery address, email address and telephone numbers.',
          fa: 'داده‌های تماس: شامل نشانی صورتحساب، نشانی فارسیافت، ایمیل و شماره‌های تلفن.',
          ps: 'د اړیکې معلومات: د بل پته، د رسېدو پته، بریښنالیک او تلیفون شمېرې په بر کې نیسي.',
        },
        {
          en: 'Technical Data includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.',
          fa: 'داده‌های فنی: شامل نشانی پروتکل انترنت (IP)، داده‌های ورود، نوع و نسخه مرورگر، تنظیمات منطقه زمانی و موقعیت، افزونه‌های مرورگر، سیستم عامل و پلتفرم، و سایر فناوری‌های دستگاه‌هایی که برای دسترسی به این وب‌سایت به کار می‌برید.',
          ps: 'تخنیکي معلومات: د انټرنټ پروټوکول پته (IP)، د ننوتلو معلومات، د براوزر ډول او نسخه، د وخت زون او موقعیت تنظیمات، د براوزر افزونې، د عامل سیستم او پلیټفارم، او د هغو وسیلو نورې ټیکنالوژۍ چې د دې وېبسایت د لاسرسي لپاره یې کاروئ.',
        },
        {
          en: 'Usage Data includes information about how you use our website, products and services.',
          fa: 'داده‌های استفاده: اطلاعاتی درباره اینکه چگونه از وب‌سایت، محصولات و خدمات ما استفاده می‌کنید.',
          ps: 'د کارونې معلومات: دا چې تاسو زموږ له وېبسایت، محصولاتو او خدمتونو څنګه کار اخلئ.',
        },
      ],
    },
    {
      heading: { en: '3. Google AdSense & Cookies', fa: '۳. گوگل ادسنس و کوکی‌ها', ps: '۳. ګوګل ایډسنس او کوکیان' },
      paragraphs: [
        {
          en: 'We use Google AdSense to publish ads on this site. When you view or click on an ad, a cookie will be set to help better provide advertisements that may be of interest to you on this and other websites.',
          fa: 'برای انتشار تبلیغات در این سایت از گوگل ادسنس استفاده می‌کنیم. هنگام مشاهده یا کلیک روی یک آگهی، یک کوکی تنظیم می‌شود تا ارائه تبلیغات موردعلاقه شما در این و سایت‌های دیگر بهتر انجام شود.',
          ps: 'موږ پدې سایټ کې د اعلانونو خپرولو لپاره ګوګل ایډسنس کاروو. کله چې تاسو اعلان وګورئ یا پری کلیک کوئ، یو کوکی ټاکل کیږي چې پدې او نورو وېبسایټونو کې د ستاسو د لېوالتیا وړ اعلانونه ښه وړاندې کړي.',
        },
      ],
      bullets: [
        {
          en: "Third party vendors, including Google, use cookies to serve ads based on a user's prior visits to your website or other websites.",
          fa: 'فروشندگان شخص ثالث از جمله گوگل از کوکی‌ها برای نمایش آگهی‌ها بر اساس بازدیدهای قبلی کاربر از وب‌سایت شما یا سایر وب‌سایت‌ها استفاده می‌کنند.',
          ps: 'درېیمګړي پلورونکي، په شمول ګوګل، د کاروونکو پخوانیو لیدنو پر بنسټ د اعلانونو ښودلو لپاره کوکیان کاروي.',
        },
        {
          en: "Google's use of advertising cookies enables it and its partners to serve ads to your users based on their visit to your sites and/or other sites on the Internet.",
          fa: 'استفاده گوگل از کوکی‌های تبلیغاتی به آن و شرکای آن امکان می‌دهد بر اساس بازدید کاربران از سایت‌های شما و/یا سایر سایت‌های انترنت، آگهی ارائه کنند.',
          ps: 'د ګوګل د اعلاني کوکیانو کارول دا شونې کوي چې هغه او شریکان یې د کاروونکو ستاسو سایټونو او/یا نورو انټرنټ سایټونو لیدنو پر بنسټ اعلانونه وښیي.',
        },
      ],
      bulletLinks: [
        {
          href: 'https://www.google.com/settings/ads',
          label: {
            en: 'Users may opt out of personalized advertising by visiting Ads Settings.',
            fa: 'کاربران می‌توانند با مراجعه به تنظیمات تبلیغات، از تبلیغات شخصی‌سازی‌شده انصراف دهند.',
            ps: 'کاروونکي کولی شي د اعلانونو د تنظیماتو په لیدو سره له شخصي شویو اعلانونو څخه لاس واخلي.',
          },
        },
      ],
      // extra closing paragraph with the second external link is rendered from `paragraphsAfter`
    },
    {
      heading: { en: '4. Data Security', fa: '۴. امنیت داده‌ها', ps: '۴. د معلوماتو خونديتوب' },
      paragraphs: [
        {
          en: 'We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed.',
          fa: 'برای جلوگیری از دست‌یابی، استفاده یا افشای غیرمجاز، تغییر یا از دست رفتن تصادفی داده‌های شخصی شما، تدابیر امنیتی مناسب را در نظر گرفته‌ایم.',
          ps: 'ستاسو د شخصي معلوماتو د ناڅاپي له لاسه ورکولو، غیر مجاز کارونې یا لاسرسي، بدلون او افشا مخنیوي لپاره مو مناسب خونديتوب تدابیر نیولي دي.',
        },
      ],
    },
    {
      heading: { en: '5. Contact Us', fa: '۵. تماس با ما', ps: '۵. زموږ سره اړیکه' },
      paragraphs: [
        {
          en: 'If you have any questions about this privacy policy or our privacy practices, please contact us.',
          fa: 'اگر درباره این سیاست حریم خصوصی یا رویه‌های ما پرسشی دارید، لطفاً با ما تماس بگیرید.',
          ps: 'که د دې محرمیت تګلارې یا زموږ د کړنو په اړه پوښتنه لرئ، مهرباني وکړئ زموږ سره اړیکه ونیسئ.',
        },
      ],
    },
  ],
};

/** Extra trailing paragraph (with link) for the AdSense section — kept separate to avoid inline-HTML in copy. */
export const PRIVACY_ADSENSE_TAIL: { text: Tril; linkHref: string; linkLabel: Tril } = {
  text: {
    en: "For more information on how Google uses data when you use our partners' sites or apps, please visit:",
    fa: 'برای اطلاعات بیشتر درباره اینکه گوگل هنگام استفاده از سایت‌ها یا اپ‌های شرکای ما چگونه از داده‌ها استفاده می‌کند، به اینجا مراجعه کنید:',
    ps: 'د ګوګل د معلوماتو د کارونې په اړه نور معلومات — کله چې تاسو زموږ د شریکانو سایټونه یا اپلیکېشنونه کاروئ — لپاره دلته وګورئ:',
  },
  linkHref: 'https://policies.google.com/technologies/partner-sites',
  linkLabel: { en: 'How Google uses data', fa: 'نحوه استفاده گوگل از داده‌ها', ps: 'ګوګل معلومات څنګه کاروي' },
};

export const TERMS_DOC: LocalDoc = {
  title: { en: 'Terms of Service', fa: 'شرایط خدمات', ps: 'د خدمتونو شرایط' },
  sections: [
    {
      heading: { en: '1. Acceptance of Terms', fa: '۱. پذیرش شرایط', ps: '۱. د شرایطو منل' },
      paragraphs: [
        {
          en: 'By accessing and using ARIA HUB, you accept and agree to be bound by the terms and provision of this agreement.',
          fa: 'با دسترسی و استفاده از آریا هاب، شما می‌پذیرید که تابع شرایط و مفاد این توافق‌نامه باشید.',
          ps: 'د آریا هاب ته د لاسرسي او کارولو په واسطه، تاسو منئ چې د دې تړون شرایطو او مفادو تابع اوسئ.',
        },
      ],
    },
    {
      heading: { en: '2. Description of Service', fa: '۲. شرح خدمات', ps: '۲. د خدمت تشریح' },
      paragraphs: [
        {
          en: 'ARIA HUB provides business consulting, visa services, and an aggregation of global opportunities. We strive to ensure the accuracy of the information provided on our platform, but we do not guarantee the completeness or reliability of external job postings or scholarship listings.',
          fa: 'آریا هاب مشاوره کسب‌وکار، خدمات ویزا و گردآوری فرصت‌های جهانی را ارائه می‌کند. ما می‌کوشیم دقت اطلاعات ارائه‌شده در پلتفورم خود را تضمین کنیم، اما کامل بودن یا قابلیت اطمینان آگهی‌های شغلی و فهرست‌های بورسیه خارجی را تضمین نمی‌کنیم.',
          ps: 'آریا هاب سوداګریزه مشوره، د ویزې خدمتونه او د نړیوالو فرصتونو راټولول وړاندې کوي. هڅه کوو چې په خپل پلیټفارم کې د ورکړل شویو معلوماتو سمون ډامن کړو، خو د بهرنیو د کار اعلانونو یا د بورسونو د لیستونو بشپړتیا یا باور وړتیا تضمین نه کوو.',
        },
      ],
    },
    {
      heading: { en: '3. User Conduct', fa: '۳. رفتار کاربران', ps: '۳. د کاروونکو چلند' },
      paragraphs: [
        {
          en: 'You agree to use our services only for lawful purposes. You are prohibited from violating or attempting to violate the security of the website, including, without limitation:',
          fa: 'می‌پذیرید که از خدمات ما فقط برای مقاصد قانونی استفاده کنید. نقض یا تلاش برای نقض امنیت وب‌سایت، از جمله موارد زیر، ممنوع است:',
          ps: 'منئ چې زموږ خدمتونه یوازې د قانوني موخو لپاره وکاروئ. د وېبسایت د خونديتوب نقض کول یا هڅه کول، په شمول د لاندې مواردو، منع دي:',
        },
      ],
      bullets: [
        {
          en: 'Accessing data not intended for you or logging into a server or account which you are not authorized to access.',
          fa: 'دسترسی به داده‌هایی که برای شما در نظر گرفته نشده یا ورود به سرور و حسابی که مجاز به آن نیستید.',
          ps: 'د هغو معلوماتو ته لاسرسي چې ستاسو لپاره نه دي ټاکل شوي، یا هغه سرور او حساب ته ننوتل چې اجازه نه لرئ.',
        },
        {
          en: 'Attempting to probe, scan or test the vulnerability of a system or network or to breach security or authentication measures without proper authorization.',
          fa: 'تلاش برای بررسی، اسکن یا آزمایش آسیب‌پذیری یک سیستم یا شبکه، یا نقض تدابیر امنیتی و احراز هویت بدون مجوز مناسب.',
          ps: 'د یو سیستم یا شبکې د زیانمنونکتیا پلټنه، سکین یا ازموینه، یا بې مناسبې اجازې د خونديتوب او تصدیق تدابیرو نقض هڅه کول.',
        },
        {
          en: 'Attempting to interfere with service to any user, host or network.',
          fa: 'تلاش برای ایجاد مزاحمت در خدمات به هر کاربر، میزبان یا شبکه.',
          ps: 'هر کاروونکي، کوربه یا شبکې ته د خدمت په چارو کې مداخله یا مزاحمت هڅه کول.',
        },
      ],
    },
    {
      heading: { en: '4. External Links', fa: '۴. پیوندهای خارجی', ps: '۴. بهرني لینکونه' },
      paragraphs: [
        {
          en: 'Our website may contain links to third-party websites or services that are not owned or controlled by ARIA HUB. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third party web sites or services.',
          fa: 'وب‌سایت ما ممکن است شامل پیوندهایی به وب‌سایت‌ها یا خدمات شخص ثالث باشد که متعلق به آریا هاب نیست یا تحت کنترل آن نیست. ما هیچ کنترلی بر محتوا، سیاست‌های حریم خصوصی یا رویه‌های هیچ وب‌سایت یا خدمات شخص ثالث نداریم و مسئولیتی نمی‌پذیریم.',
          ps: 'زموږ وېبسایت کې ممکن د درېیمګړو وېبسایتونو یا خدمتونو لینکونه وي چې د آریا هاب ملکیت یا تر کنټرول لاندې نه دي. موږ پر هېڅ درېیمګړي وېبسایت یا خدمت د محتوا، محرمیت تګلارو یا کړنو باندې کنټرول نه لرو او مسئولیت نه منو.',
        },
      ],
    },
    {
      heading: { en: '5. Modifications to Terms', fa: '۵. تغییر شرایط', ps: '۵. په شرایطو کې بدلونونه' },
      paragraphs: [
        {
          en: 'ARIA HUB reserves the right to modify these terms at any time. We will do our best to notify users of any significant changes, but it is your responsibility to review these terms periodically.',
          fa: 'آریا هاب حق دارد این شرایط را در هر زمان تغییر دهد. تلاش می‌کنیم کاربران را از تغییرات مهم آگاه سازیم، اما بازبینی دوره‌ای این شرایط بر عهده خود شماست.',
          ps: 'آریا هاب دا حق لري چې دا شرایط په هر وخت کې بدل کړي. هڅه کوو کاروونکي د مهمو بدلونونو څخه خبر کړو، خو دا شرایط په منظم ډول بیا کتل ستاسو دنده ده.',
        },
      ],
    },
  ],
};

/** Localized "Last updated: <date>" line (Eastern digits for fa/ps). */
export function lastUpdatedLine(lang: string, date: Date): string {
  const label = lang === 'fa' ? 'آخرین به‌روزرسانی:' : lang === 'ps' ? 'وروستی تازه:' : 'Last updated:';
  const locale = lang === 'en' ? 'en-US' : lang === 'fa' ? 'fa-AF' : 'ps-AF';
  let formatted: string;
  try {
    formatted = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  } catch {
    formatted = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  }
  return `${label} ${formatted}`;
}
