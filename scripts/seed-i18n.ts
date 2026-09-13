import { db } from '../src/lib/db';

async function main() {
  console.log('🌍 Seeding missing translations...');

  // 1. FAQs
  const faqs = await db.faq.findMany();
  for (const faq of faqs) {
    if (faq.question === 'What services does ARIA HUB offer?') {
      await db.faq.update({
        where: { id: faq.id },
        data: {
          questionI18n: { en: faq.question, fa: 'ARIA HUB چه خدماتی ارائه می‌دهد؟', ps: 'ARIA HUB کوم خدمات وړاندې کوي؟' },
          answerI18n: { en: faq.answer, fa: 'ما راه‌اندازی کسب‌وکار، خدمات حقوقی، ویزا و سفر، ترجمه، مشاوره استراتژیک و غیره را ارائه می‌دهیم.', ps: 'موږ د سوداګرۍ پیل، قانوني خدمات، ویزه او سفر، ژباړه، او ستراتیژیکې مشورې وړاندې کوو.' }
        }
      });
    } else if (faq.question.includes('processing take')) {
      await db.faq.update({
        where: { id: faq.id },
        data: {
          questionI18n: { en: faq.question, fa: 'پردازش ویزا چقدر طول می‌کشد؟', ps: 'د ویزې پروسس څومره وخت نیسي؟' },
          answerI18n: { en: faq.answer, fa: 'زمان پردازش بسته به کشور متفاوت است، معمولاً ۳ تا ۳۰ روز.', ps: 'د پروسس وخت د هیواد پورې اړه لري، معمولا ۳ څخه تر ۳۰ ورځو پورې.' }
        }
      });
    } else if (faq.question.includes('international clients')) {
      await db.faq.update({
        where: { id: faq.id },
        data: {
          questionI18n: { en: faq.question, fa: 'آیا به مشتریان بین‌المللی خدمات می‌دهید؟', ps: 'ایا تاسو نړیوالو پیرودونکو ته خدمات وړاندې کوئ؟' },
          answerI18n: { en: faq.answer, fa: 'بله، ما به مشتریان در سراسر جهان خدمات ارائه می‌دهیم.', ps: 'هو، موږ په ټوله نړۍ کې پیرودونکو ته خدمات وړاندې کوو.' }
        }
      });
    } else if (faq.question.includes('translations certified')) {
      await db.faq.update({
        where: { id: faq.id },
        data: {
          questionI18n: { en: faq.question, fa: 'آیا ترجمه‌ها تایید شده و رسمی هستند؟', ps: 'ایا ژباړې تصدیق شوي او رسمي دي؟' },
          answerI18n: { en: faq.answer, fa: 'بله، تمام ترجمه‌های ما رسمی و مورد تایید سفارت‌ها هستند.', ps: 'هو، زموږ ټولې ژباړې رسمي او د سفارتونو لخوا تایید شوي دي.' }
        }
      });
    } else if (faq.question.includes('payment methods')) {
      await db.faq.update({
        where: { id: faq.id },
        data: {
          questionI18n: { en: faq.question, fa: 'چه روش‌های پرداختی را قبول می‌کنید؟', ps: 'تاسو کوم د تادیې میتودونه منئ؟' },
          answerI18n: { en: faq.answer, fa: 'انتقال بانکی، کیف پول موبایل، کریپتو (USDT)، وایز و غیره.', ps: 'بانکي لیږد، د ګرځنده بټوه، کریپټو (USDT)، وایز او نور.' }
        }
      });
    } else if (faq.question.includes('get started')) {
      await db.faq.update({
        where: { id: faq.id },
        data: {
          questionI18n: { en: faq.question, fa: 'چگونه می‌توانم شروع کنم؟', ps: 'زه څنګه کولی شم پیل کړم؟' },
          answerI18n: { en: faq.answer, fa: 'از طریق فرم تماس، تماس تلفنی یا مراجعه به شعب ما با ما در ارتباط باشید.', ps: 'د اړیکې فورمې، تلیفون، یا زموږ څانګو ته د لیدنې له لارې اړیکه ونیسئ.' }
        }
      });
    }
  }

  // 2. Pricing Packages
  const packages = await db.pricingPackage.findMany();
  for (const pkg of packages) {
    if (pkg.slug === 'starter') {
      await db.pricingPackage.update({
        where: { id: pkg.id },
        data: {
          nameI18n: { en: pkg.name, fa: 'پایه', ps: 'بنسټیز' },
          descriptionI18n: { en: pkg.description, fa: 'مناسب برای افرادی که تازه شروع کرده‌اند.', ps: 'د هغو کسانو لپاره مناسب چې یوازې پیل کوي.' },
          featuresI18n: { en: JSON.parse(pkg.features || '[]'), fa: ['۱ سرویس انتخابی', 'بررسی مدارک', 'پشتیبانی ایمیل', 'پردازش ۵ روزه', 'مشاوره اولیه'], ps: ['۱ غوره شوی خدمت', 'د اسنادو بیاکتنه', 'د بریښنالیک ملاتړ', '۵ ورځنی پروسس', 'لومړنۍ مشوره'] }
        }
      });
    } else if (pkg.slug === 'professional') {
      await db.pricingPackage.update({
        where: { id: pkg.id },
        data: {
          nameI18n: { en: pkg.name, fa: 'حرفه‌ای', ps: 'مسلکي' },
          descriptionI18n: { en: pkg.description, fa: 'محبوب‌ترین بسته ما برای افراد حرفه‌ای و خانواده‌ها.', ps: 'د مسلکیانو او کورنیو لپاره زموږ ترټولو مشهوره کڅوړه.' },
          featuresI18n: { en: JSON.parse(pkg.features || '[]'), fa: ['تا ۳ سرویس', 'پردازش در اولویت', 'پشتیبانی تلفن و ایمیل', 'پردازش ۳ روزه', 'مشاوره تخصصی', 'قانونی‌سازی مدارک', 'هماهنگی سفارت'], ps: ['تر ۳ خدماتو پورې', 'د لومړیتوب پروسس', 'تلیفون او بریښنالیک ملاتړ', '۳ ورځنی پروسس', 'د متخصص مشوره', 'د اسنادو قانوني کول', 'د سفارت همغږي'] }
        }
      });
    } else if (pkg.slug === 'enterprise') {
      await db.pricingPackage.update({
        where: { id: pkg.id },
        data: {
          nameI18n: { en: pkg.name, fa: 'سازمانی', ps: 'سازماني' },
          descriptionI18n: { en: pkg.description, fa: 'راهکار جامع برای کسب‌وکارها و پرونده‌های پیچیده.', ps: 'د سوداګرۍ او پیچلو قضیو لپاره جامع حل.' },
          featuresI18n: { en: JSON.parse(pkg.features || '[]'), fa: ['خدمات نامحدود', 'مدیر حساب اختصاصی', 'پشتیبانی ۲۴/۷', 'پردازش سریع ۲۴ ساعته', 'مشاوره VIP', 'نمایندگی حقوقی', 'پشتیبانی چند کشوری', 'پیگیری مادام‌العمر'], ps: ['نامحدود خدمات', 'وقف شوی حساب مدیر', 'د ۲۴/۷ ملاتړ', '۲۴ ساعته چټک پروسس', 'د VIP مشوره', 'قانوني استازیتوب', 'د څو هیوادونو ملاتړ', 'د ټول عمر تعقیب'] }
        }
      });
    }
  }

  // 3. CTA Banners
  const ctas = await db.ctaBanner.findMany();
  for (const cta of ctas) {
    if (cta.title.includes('journey')) {
      await db.ctaBanner.update({
        where: { id: cta.id },
        data: {
          titleI18n: { en: cta.title, fa: 'آماده شروع سفر خود هستید؟', ps: 'ایا تاسو خپل سفر پیلولو ته چمتو یاست؟' },
          subtitleI18n: { en: cta.subtitle, fa: 'به ۹۸۰+ مشتری بپیوندید که اهدافشان را با ARIA HUB به دستاورد تبدیل کردند.', ps: 'له ۹۸۰+ پیرودونکو سره یوځای شئ چې د ARIA HUB سره یې خپل اهداف ترلاسه کړي دي.' },
          buttonTextI18n: { en: cta.buttonText, fa: 'رزرو مشاوره رایگان', ps: 'د وړیا مشورې بک کول' }
        }
      });
    }
  }

  // 4. Comparison Rows
  const comparisons = await db.comparisonRow.findMany();
  const translations = {
    'Dedicated case manager': { fa: 'مدیر پرونده اختصاصی', ps: 'د قضیې وقف شوی مدیر' },
    'Transparent fixed pricing': { fa: 'قیمت‌گذاری ثابت و شفاف', ps: 'ثابت او شفاف قیمت' },
    '24/7 priority support': { fa: 'پشتیبانی ۲۴/۷ در اولویت', ps: 'د ۲۴/۷ لومړیتوب ملاتړ' },
    'Multi-country expertise (50+)': { fa: 'تخصص در چند کشور (۵۰+)', ps: 'د څو هیوادونو تخصص (۵۰+)' },
    'Real-time progress tracking': { fa: 'پیگیری پیشرفت لحظه‌ای', ps: 'د ریښتیني وخت پرمختګ تعقیب' },
    'Bank-grade data encryption': { fa: 'رمزنگاری داده در سطح بانکی', ps: 'د بانک په کچه د معلوماتو کوډ کول' },
    'Legal representation included': { fa: 'شامل نمایندگی حقوقی', ps: 'قانوني استازیتوب پکې شامل دی' },
    'Success rate above 98%': { fa: 'نرخ موفقیت بالای ۹۸٪', ps: 'د بریا کچه له ۹۸٪ څخه پورته' }
  };
  
  for (const comp of comparisons) {
    const t = translations[comp.feature as keyof typeof translations];
    if (t) {
      let othersFa = comp.othersValue;
      let othersPs = comp.othersValue;
      if (comp.othersValue === 'Hidden fees') { othersFa = 'هزینه‌های پنهان'; othersPs = 'پټ فیسونه'; }
      if (comp.othersValue === 'Business hours') { othersFa = 'ساعات کاری'; othersPs = 'کاري ساعتونه'; }
      if (comp.othersValue === '1-3 countries') { othersFa = '۱-۳ کشور'; othersPs = '۱-۳ هیوادونه'; }
      if (comp.othersValue === 'Basic') { othersFa = 'پایه'; othersPs = 'بنسټیز'; }
      if (comp.othersValue === 'Extra cost') { othersFa = 'هزینه اضافی'; othersPs = 'اضافي لګښت'; }
      
      await db.comparisonRow.update({
        where: { id: comp.id },
        data: {
          featureI18n: { en: comp.feature, fa: t.fa, ps: t.ps },
          ariaValueI18n: { en: comp.ariaValue, fa: comp.ariaValue, ps: comp.ariaValue },
          othersValueI18n: { en: comp.othersValue, fa: othersFa, ps: othersPs }
        }
      });
    }
  }

  // 5. Add new Tools to Menu
  const toolsMenu = await db.menuItem.findFirst({ where: { url: null, label: 'Tools' } });
  if (toolsMenu) {
    const existingInterview = await db.menuItem.findFirst({ where: { url: '/interview-prep' } });
    if (!existingInterview) {
      await db.menuItem.create({
        data: {
          label: 'Scholarship Interview',
          labelI18n: { en: 'Scholarship Interview', fa: 'مصاحبه بورسیه', ps: 'د بورسونو مرکه' },
          url: '/interview-prep',
          parentId: toolsMenu.id,
          order: 3,
          visible: true,
        }
      });
    }

    const existingVisa = await db.menuItem.findFirst({ where: { url: '/visa-prep' } });
    if (!existingVisa) {
      await db.menuItem.create({
        data: {
          label: 'Visa Interview',
          labelI18n: { en: 'Visa Interview', fa: 'مصاحبه ویزا', ps: 'د ویزې مرکه' },
          url: '/visa-prep',
          parentId: toolsMenu.id,
          order: 4,
          visible: true,
        }
      });
    }

    const existingTemplates = await db.menuItem.findFirst({ where: { url: '/templates' } });
    if (!existingTemplates) {
      await db.menuItem.create({
        data: {
          label: 'Template Library',
          labelI18n: { en: 'Template Library', fa: 'کتابخانه الگوها', ps: 'د الګوګانو کتابتون' },
          url: '/templates',
          parentId: toolsMenu.id,
          order: 5,
          visible: true,
        }
      });
    }
  }

  console.log('✅ Translations seeded successfully!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
