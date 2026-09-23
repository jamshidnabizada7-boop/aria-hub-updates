import type { Lang } from './lang-route';

export interface PageSeoEntry {
  title: Record<Lang, string>;
  description: Record<Lang, string>;
}

export const SEO_PAGE_DATA: Record<string, PageSeoEntry> = {
  services: {
    title: {
      en: 'Professional Services & Career Solutions | ARIA HUB',
      fa: 'خدمات تخصصی، مشاوره تحصیلی و کاری | ARIA HUB',
      ps: 'مسلکي، مشورتي او تحصیلي خدمتونه | ARIA HUB',
    },
    description: {
      en: 'Explore professional services at ARIA HUB: CV creation, scholarship application reviews, visa interview prep, and certified trilingual document translation.',
      fa: 'خدمات تخصصی آریا هاب: ساخت رزومه و سی‌وی مسلکی، بررسی درخواست‌های بورسیه، راهنمایی ویزا و ترجمه رسمی اسناد به زبان‌های دری، پشتو و انگلیسی برای ارتقای شما.',
      ps: 'د آریا هاب مسلکي خدمتونه: مسلکي سي وي جوړول، د بورسونو د اسنادو بیاکتنه، د ویزې مرکو لارښوونه او رسمي درې ژبې ژباړه چې ستاسو نړیوالو موخو ته لاره هواره کړي.',
    },
  },
  contact: {
    title: {
      en: 'Contact Us & Support Locations | ARIA HUB',
      fa: 'تماس با ما و دفاتر پشتیبانی | ARIA HUB',
      ps: 'له موږ سره اړیکه او د ملاتړ دفترونه | ARIA HUB',
    },
    description: {
      en: 'Get in touch with the ARIA HUB team for consultations, support, advertising, and partnership inquiries. Trilingual support in Dari, Pashto, and English.',
      fa: 'با تیم آریا هاب برای مشاوره تحصیلی، فرصت‌های شغلی، ثبت اعلان و همکاری در تماس شوید. پشتیبانی کامل به زبان‌های فارسی دری، پشتو و انگلیسی در خدمت شماست.',
      ps: 'د تحصیلي مشورې، کاري فرصتونو، اعلانونو او همکارۍ لپاره د آریا هاب ټیم سره اړیکه ونیسئ. بشپړ ملاتړ په دري، پښتو او انګلیسي ژبو ستاسو په خدمت کې دی.',
    },
  },
  deadlines: {
    title: {
      en: 'Upcoming Application Deadlines | ARIA HUB',
      fa: 'تقویم ددلاین‌ها و آخرین مهلت‌ها | ARIA HUB',
      ps: 'د غوښتنلیکونو او بورسونو مهلتونه | ARIA HUB',
    },
    description: {
      en: 'Never miss an opportunity with ARIA HUB deadline calendar. Filter verified scholarships, jobs, and fellowship application deadlines sorted by urgency.',
      fa: 'تقویم کامل ددلاین‌های آریا هاب: آخرین مهلت‌های ثبت‌نام بورسیه‌ها، فرصت‌های شغلی و فلوشیپ‌ها را به ترتیب فوریت بررسی کنید و هیچ موقعیتی را از دست ندهید.',
      ps: 'د آریا هاب د مهلتونو تقویم سره هېڅ فرصت له لاسه مه ورکوئ. د باوري تحصیلي بورسونو، کاري اعلانونو او فیلوشیپونو وروستۍ نېټې د بیړنتوب له مخې وڅارئ.',
    },
  },
  visas: {
    title: {
      en: 'Global Visas & Immigration Pathways | ARIA HUB',
      fa: 'ویزاهای بین‌المللی و خدمات مهاجرت | ARIA HUB',
      ps: 'نړیوالې ویزې او د کډوالۍ خدمتونه | ARIA HUB',
    },
    description: {
      en: 'Explore student, work, tourist, and immigration visa pathways with ARIA HUB. Verified requirements, embassy interview guides, and processing assistance.',
      fa: 'راهنمای جامع انواع ویزاهای تحصیلی، کاری، سیاحتی و اقامتی در آریا هاب. بررسی شرایط مدارک، مدارک مورد نیاز و نکات قبولی مصاحبه در سفارتخانه‌ها.',
      ps: 'په آریا هاب کې د تحصیلي، کاري، سیاحتي او کډوالۍ ویزو بشپړ لارښود. د اړینو اسنادو شرایط او د سفارت د مرکو د بریا مهمې سپارښتنې ترلاسه کړئ.',
    },
  },
  employers: {
    title: {
      en: 'Hire Proven Talent in Afghanistan | ARIA HUB',
      fa: 'استخدام استعدادهای برجسته در افغانستان | ARIA HUB',
      ps: 'په افغانستان کې باوري استعدادونه وګمارئ | ARIA HUB',
    },
    description: {
      en: 'Post your job on ARIA HUB to reach thousands of qualified jobseekers in Afghanistan. 24-hour review with trilingual publication in Dari, Pashto & English.',
      fa: 'آگهی شغلی خود را در آریا هاب منتشر کنید و به هزاران جوینده کار افغان برسید — به فارسی، پشتو و انگلیسی. بررسی سریع و انتشار حداکثر ظرف ۲۴ ساعت.',
      ps: 'خپله دنده په آریا هاب کې خپره کړئ او په افغانستان کې زرګونو کار غوښتونکو ته ورسېږئ — په فارسي، پښتو او انګلیسي. په ۲۴ ساعتو کې کره بیاکتنه او خپرونه.',
    },
  },
  employersPost: {
    title: {
      en: 'Post a Job & Hire Top Talent | ARIA HUB',
      fa: 'ثبت آگهی شغلی و استخدام استعدادها | ARIA HUB',
      ps: 'د کار اعلان خپرول او استخدام | ARIA HUB',
    },
    description: {
      en: 'Post open positions on ARIA HUB to recruit qualified Afghan talent. Reviewed and published within 24 hours with trilingual reach in Dari, Pashto, and English.',
      fa: 'آگهی شغلی خود را در آریا هاب منتشر کنید و به هزاران متخصص و جوینده کار افغان برسید — بررسی، ویرایش و ترجمه سه‌زبانه ظرف ۲۴ ساعت انجام می‌شود.',
      ps: 'خپل کاري اعلان په آریا هاب کې خپور کړئ او زرګونو افغان مسلکي کسانو ته ورسېږئ — په ۲۴ ساعتو کې کره کتنه او په دري، پښتو او انګلیسي ژباړل کیږي.',
    },
  },
  blog: {
    title: {
      en: 'Career Guides, Visa Tips & Blog | ARIA HUB',
      fa: 'مقالات آموزشی، نکات ویزا و راهنمای شغلی | ARIA HUB',
      ps: 'ښوونیزې مقالې، د ویزې لارښوونې او بلاګ | ARIA HUB',
    },
    description: {
      en: 'Read actionable guides on scholarship applications, visa interview preparation, career development, and CV writing for Afghan students and jobseekers.',
      fa: 'مقالات و راهنماهای کاربردی درباره اخذ بورسیه تحصیلی، آمادگی مصاحبه ویزا، نگارش رزومه و موفقیت شغلی به سه زبان در وبلاگ تخصصی آریا هاب.',
      ps: 'د تحصیلي بورسونو د ترلاسه کولو، د ویزې د مرکې چمتووالي، د سي وي جوړولو او مسلکي بریا لپاره ګټورې او عملي مقالې په آریا هاب کې ولولئ.',
    },
  },
  about: {
    title: {
      en: 'About Us — Mission & Vision | ARIA HUB',
      fa: 'درباره ما — مأموریت و چشم‌انداز | ARIA HUB',
      ps: 'زموږ په اړه — زموږ مأموریت او لیدلوری | ARIA HUB',
    },
    description: {
      en: 'Learn about ARIA HUB: our mission to connect Afghan youth and professionals with verified global scholarships, employment, and educational opportunities.',
      fa: 'با آریا هاب آشنا شوید: مأموریت ما ایجاد دسترسی شفاف به بورسیه‌های معتبر تحصیلی، فرصت‌های شغلی بین‌المللی و توانمندسازی نسل جوان افغانستان است.',
      ps: 'د آریا هاب په اړه معلومات: زموږ هدف نړیوالو باوري بورسونو، کاري فرصتونو او روزنیزو پروګرامونو ته د افغان ځوانانو او مسلکي کسانو رسول دي.',
    },
  },
  advertise: {
    title: {
      en: 'Advertise With Us & Sponsored Listings | ARIA HUB',
      fa: 'تبلیغات، اسپانسرشیپ و معرفی خدمات | ARIA HUB',
      ps: 'اعلانونو خپرول او د خدماتو معرفي | ARIA HUB',
    },
    description: {
      en: 'Promote your organization, jobs, or programs on ARIA HUB. Reach Afghanistan leading trilingual audience with targeted banners, digests, and sponsored posts.',
      fa: 'خدمات، فرصت‌های شغلی و برنامه‌های خود را در آریا هاب معرفی کنید. دسترسی به گسترده‌ترین مخاطبان سه‌زبانه در افغانستان با قیمت‌های شفاف و فعال‌سازی سریع.',
      ps: 'خپل خدمتونه، کاري اعلانونه او پروګرامونه په آریا هاب کې وړاندې کړئ. په روڼ بیو او چټک نشر سره د افغانستان تر ټولو پراخه درې ژبې لیدونکو ته ورسېږئ.',
    },
  },
  cvBuilder: {
    title: {
      en: 'Free Online CV Builder & Resume Maker | ARIA HUB',
      fa: 'سی‌وی ساز آنلاین و رزومه مسلکی رایگان | ARIA HUB',
      ps: 'وړیا آنلاین سي وي او مسلکي رزومه جوړونکی | ARIA HUB',
    },
    description: {
      en: 'Create professional academic and job resumes for international scholarships and careers. Download print-ready PDFs formatted to global recruitment standards.',
      fa: 'سی‌وی و رزومه معیاری خود را برای بورسیه‌های تحصیلی و فرصت‌های شغلی بین‌المللی آنلاین بسازید و فایل پی‌دی‌اف معیاری را به صورت رایگان دریافت کنید.',
      ps: 'د نړیوالو تحصیلي بورسونو او مسلکي دندو لپاره خپله معیاري سي وي آنلاین جوړه کړئ او د چاپ لپاره چمتو PDF فایل په وړیا توګه ډاونلوډ کړئ.',
    },
  },
  opportunityMatcher: {
    title: {
      en: 'Smart Opportunity Matcher & Finder | ARIA HUB',
      fa: 'موقعیت‌یاب هوشمند و تطبیق‌دهنده فرصت‌ها | ARIA HUB',
      ps: 'د هوښیار فرصتونو موندونکی او سمونګر | ARIA HUB',
    },
    description: {
      en: 'Match your profile, education, and career aspirations with ideal global scholarships, fellowships, and jobs using ARIA HUB smart opportunity finder.',
      fa: 'با سامانه هوشمند تطبیق فرصت‌های آریا هاب، بورسیه‌ها و موقعیت‌های شغلی متناسب با تحصیلات، مهارت‌ها و اهداف کاری خود را به سرعت کشف کنید.',
      ps: 'د آریا هاب د هوښیار فرصت سمونګر له لارې د خپلو زده کړو، مهارتونو او مسلکي اهدافو سره سم غوره نړیوال تحصیلي بورسونه او دندې په اسانۍ ومومئ.',
    },
  },
  privacyPolicy: {
    title: {
      en: 'Privacy Policy & Data Protection | ARIA HUB',
      fa: 'سیاست حریم خصوصی و حفاظت از داده‌ها | ARIA HUB',
      ps: 'د محرمیت تګلاره او د معلوماتو ساتنه | ARIA HUB',
    },
    description: {
      en: 'Read ARIA HUB Privacy Policy to learn how we protect your personal information, manage cookies, and maintain data security across all our online services.',
      fa: 'سیاست حفظ حریم خصوصی آریا هاب: آگاهی از نحوه جمع‌آوری، حفاظت از اطلاعات شخصی کاربران، کوکی‌ها و رعایت کامل استانداردهای بین‌المللی امنیت داده‌ها.',
      ps: 'د آریا هاب د محرمیت تګلاره: پوه شئ چې موږ څنګه ستاسو شخصي معلومات، کوکیز او د خوندیتوب معیارونه زموږ په ټولو آنلاین خدماتو کې ساتو.',
    },
  },
  termsOfService: {
    title: {
      en: 'Terms of Service & User Agreement | ARIA HUB',
      fa: 'شرایط خدمات و توافق‌نامه کاربری | ARIA HUB',
      ps: 'د خدمت شرایط او د کاروونکي تړون | ARIA HUB',
    },
    description: {
      en: 'Understand the terms and conditions governing the use of ARIA HUB website, tools, services, and opportunity listings for candidates and employers.',
      fa: 'شرایط و ضوابط استفاده از وب‌سایت، ابزارها و خدمات آریا هاب را مطالعه فرمایید. حقوق و تعهدات کاربران، کارفرمایان و متقاضیان فرصت‌ها.',
      ps: 'د آریا هاب د ویب پاڼې، وسایلو او خدمتونو د کارولو شرایط او اصول ولولئ. د کاروونکو، کارګمارونکو او غوښتونکو حقوق او مسؤلیتونه دلته بیان شوي.',
    },
  },
  visaPrep: {
    title: {
      en: 'Visa Interview Preparation & Practice | ARIA HUB',
      fa: 'آمادگی مصاحبه ویزا و تمرین هوشمند | ARIA HUB',
      ps: 'د ویزې مرکې چمتووالی او هوښیار تمرین | ARIA HUB',
    },
    description: {
      en: 'Prepare for embassy visa interviews with real consular questions, AI mock interviews, document checklists, and rejection prevention strategies on ARIA HUB.',
      fa: 'آمادگی همه‌جانبه برای مصاحبه سفارت: تمرین با هوش مصنوعی، سوالات واقعی کنسولگری، چک‌لیست اسناد و راهکارهای جلوگیری از رد ویزا در آریا هاب.',
      ps: 'د سفارت د ویزې مرکو لپاره بشپړ چمتووالی: د مصنوعي استخباراتو ازموینې، د کنسولګرۍ پوښتنې او د رد کېدو مخنیوي لارښود په آریا هاب کې ترلاسه کړئ.',
    },
  },
  interviewPrep: {
    title: {
      en: 'Scholarship & Job Interview Prep | ARIA HUB',
      fa: 'آمادگی مصاحبه بورسیه و استخدام شغلی | ARIA HUB',
      ps: 'د بورسونو او کاري مرکو بشپړ چمتووالی | ARIA HUB',
    },
    description: {
      en: 'Master scholarship, job, and fellowship interviews with curated question banks, high-scoring sample answers, expert tips, and AI evaluation on ARIA HUB.',
      fa: 'بانک سوالات متداول مصاحبه‌های بورسیه، شغلی و فلوشیپ همراه با نمونه پاسخ‌های عالی، اشتباهات رایج و تمرین با هوش مصنوعی در پلتفرم تخصصی آریا هاب.',
      ps: 'د تحصیلي بورسونو، کار او فیلوشیپ د مرکو پوښتنې له غوره ځوابونو، عامو غلطیو او د هوښیار ارزونې سره په آریا هاب کې ومومئ او ځان پوره چمتو کړئ.',
    },
  },
  track: {
    title: {
      en: 'Track Opportunity Submission Status | ARIA HUB',
      fa: 'پیگیری وضعیت فرصت ارسال‌شده | ARIA HUB',
      ps: 'د سپارل شوي فرصت د حالت تعقیب | ARIA HUB',
    },
    description: {
      en: 'Check the review, translation, and publication status of your submitted opportunity using your unique tracking reference code and email on ARIA HUB.',
      fa: 'وضعیت بررسی، ترجمه و انتشار فرصت ثبت‌شده خود را با وارد کردن کد رهگیری و ایمیل در سامانه پیگیری لحظه‌ای آریا هاب مشاهده کنید.',
      ps: 'په آریا هاب کې د خپل ثبت شوي فرصت د کتنې، ژباړې او خپرېدو حالت د خپل ځانګړي تعقیب کوډ او برېښنالیک په داخلولو سره وڅارئ.',
    },
  },
  templates: {
    title: {
      en: 'Application Document Templates & Guides | ARIA HUB',
      fa: 'قالب‌های آماده مدارک بورسیه و اپلای | ARIA HUB',
      ps: 'د بورسونو او دندو د اسنادو چمتو فارمټونه | ARIA HUB',
    },
    description: {
      en: 'Download verified templates for Statements of Purpose, motivation letters, recommendation letters, and academic CVs optimized for international applications.',
      fa: 'دانلود قالب‌ها و نمونه‌های استاندارد انگیزه نامه، توصیه‌نامه، سی‌وی و بیانیه هدف برای قبولی در بورسیه‌های معتبر تحصیلی و استخدام در آریا هاب.',
      ps: 'د نړیوالو بورسونو او استخدام لپاره د موټیویشن لیټر، سپارښت لیکونو، تحصیلي سي وي او اهدافو بیان چمتو او باوري نمونې په آریا هاب کې ډاونلوډ کړئ.',
    },
  },
  successStories: {
    title: {
      en: 'Doors That Opened — Success Stories | ARIA HUB',
      fa: 'داستان‌های موفقیت و قبولی‌ها | ARIA HUB',
      ps: 'د بریالیتوب کیسې او ترلاسه شوي فرصتونه | ARIA HUB',
    },
    description: {
      en: 'Real wins from students, professionals, and families across Afghanistan — scholarships landed, jobs signed, and visas approved. Told by those who lived them.',
      fa: 'داستان‌های واقعی موفقیت محصلان، متخصصان و خانواده‌های افغانستان — بورسیه‌های دریافت‌شده، شغل‌های استخدام‌شده و ویزاهای اخذشده در آریا هاب.',
      ps: 'د افغانستان د زده‌کوونکو، مسلکي کسانو او کورنیو ریښتینې بریاوې — ترلاسه شوي بورسونه، لاسلیک شوې دندې او تصدیق شوې ویزې په آریا هاب کې.',
    },
  },
  submitOpportunity: {
    title: {
      en: 'Submit an Opportunity for Free | ARIA HUB',
      fa: 'ثبت رایگان فرصت جدید و بورسیه | ARIA HUB',
      ps: 'نوې دنده او بورس وړیا ثبت کړئ | ARIA HUB',
    },
    description: {
      en: 'Share scholarships, employment, fellowships, or educational programs with Afghanistan largest opportunity network. Verified and published within 24 hours.',
      fa: 'بورسیه‌ها، آگهی‌های استخدامی و برنامه‌های آموزشی معتبر را با بزرگ‌ترین شبکه فرصت‌های افغانستان به اشتراک بگذارید — بررسی و انتشار در ۲۴ ساعت.',
      ps: 'باوري بورسونه، کاري اعلانونه او روزنیز پروګرامونه د افغانستان د فرصتونو تر ټولو لویې شبکې سره شریک کړئ — په ۲۴ ساعتونو کې بیاکتنه او خپرېدل.',
    },
  },
};

export function getPageSeo(pageKey: keyof typeof SEO_PAGE_DATA, lang: Lang) {
  const entry = SEO_PAGE_DATA[pageKey];
  if (!entry) {
    return {
      title: 'ARIA HUB | Jobs, Scholarships & Opportunities in Afghanistan',
      description: 'Discover verified scholarships, international jobs, fellowships, training programs, and career opportunities for Afghans with real-time updates.',
    };
  }
  const l: Lang = ['en', 'fa', 'ps'].includes(lang) ? lang : 'fa';
  return {
    title: entry.title[l] || entry.title.en,
    description: entry.description[l] || entry.description.en,
  };
}

/**
 * Ensures any dynamic or article description is within Bing's recommended 120-160 characters.
 * Guarantees output is strictly between 120 and 160 characters across all languages and inputs.
 */
export function ensureSeoDescription(
  rawDesc: string | null | undefined,
  lang: Lang,
  contextNote?: string
): string {
  const clean = (rawDesc || '').replace(/\s+/g, ' ').trim();
  if (clean.length >= 120 && clean.length <= 160) {
    return clean;
  }
  if (clean.length > 160) {
    const truncated = clean.slice(0, 157);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace >= 117 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }

  const fragments: Record<Lang, string[]> = {
    fa: [
      contextNote || '',
      'جزئیات کامل، شرایط ثبت‌نام و راهنمای اپلای آنلاین در پلتفرم تخصصی آریا هاب.',
      'مرجع معتبر جدیدترین بورسیه‌ها و فرصت‌های شغلی بین‌المللی برای جوانان افغانستان.',
    ],
    ps: [
      contextNote || '',
      'بشپړ معلومات، د نوم لیکنې شرایط او د آنلاین غوښتنلیک لارښود په آریا هاب کې.',
      'په افغانستان کې د باوري تحصیلي بورسونو او نړیوالو دندو بشپړ او معتبر لارښود.',
    ],
    en: [
      contextNote || '',
      'Discover verified eligibility guidelines, deadlines, and application steps on ARIA HUB.',
      'Find top international scholarships, fellowships, and career opportunities for Afghans.',
    ],
  };

  const pool = (fragments[lang] || fragments.en).filter(Boolean);
  let combined = clean;

  for (const frag of pool) {
    if (combined.length >= 120) break;
    combined = combined ? `${combined} ${frag}` : frag;
  }

  while (combined.length < 120) {
    const extra = (fragments[lang] || fragments.en)[1];
    combined = combined ? `${combined} ${extra}` : extra;
  }

  if (combined.length > 160) {
    const truncated = combined.slice(0, 157);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace >= 117 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }

  return combined;
}
