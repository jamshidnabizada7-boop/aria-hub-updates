'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { SectionHeading } from '../section-heading';
import { useT } from '@/hooks/use-t';
import { useLangStore } from '@/lib/lang-store';
import { getLocalizedContent } from '@/lib/i18n-content';
import type { Faq } from '@/lib/types';
import { LifeBuoy, Search, HelpCircle } from 'lucide-react';

export const DEFAULT_FAQS: Faq[] = [
  {
    id: 'faq-1',
    question: 'How do I find and apply for scholarships on ARIA HUB?',
    questionI18n: {
      en: 'How do I find and apply for scholarships on ARIA HUB?',
      fa: 'چگونه می‌توانم بورسیه‌های تحصیلی را در آریا هاب پیدا کرده و اپلای کنم؟',
      ps: 'څنګه کولی شم په آریا هاب کې تحصیلي بورسونه ومومم او غوښتنلیک وسپارم؟',
    },
    answer: 'To find and apply for international scholarships on ARIA HUB, browse our verified opportunities directory filtered by degree level, host country, and funding type. Each listing provides detailed eligibility requirements, deadline countdowns, required documentation, and direct official application portal links translated into English, Persian (Afghanistan), and Pashto to support Afghan students worldwide.',
    answerI18n: {
      en: 'To find and apply for international scholarships on ARIA HUB, browse our verified opportunities directory filtered by degree level, host country, and funding type. Each listing provides detailed eligibility requirements, deadline countdowns, required documentation, and direct official application portal links translated into English, Persian (Afghanistan), and Pashto to support Afghan students worldwide.',
      fa: 'برای یافتن و درخواست بورسیه‌های بین‌المللی در آریا هاب، فهرست فرصت‌های تأییدشده ما را بر اساس مقطع تحصیلی، کشور میزبان و نوع تمویل جستجو کنید. هر آگهی شامل شرایط واجد شرایط بودن، شمارش معکوس ددلاین، اسناد لازم و لینک‌های مستقیم ثبت‌نام رسمی به زبان‌های فارسی، پشتو و انگلیسی برای حمایت از دانشجویان است.',
      ps: 'په آریا هاب کې د نړیوالو تحصیلي بورسونو موندلو لپاره، زموږ د تایید شویو فرصتونو نوملړ د زده کړې کچې، کوربه هیواد او د تمویل ډول له مخې وپلټئ. هر اعلان د شرایطو، د ضرب الاجل شمیرنې، اړینو اسنادو او رسمي غوښتنلیک مستقیم لینکونه په انګلیسي، دري او پښتو ژبو وړاندې کوي.',
    },
    category: 'scholarships',
    order: 1,
    status: 'published',
  },
  {
    id: 'faq-2',
    question: 'Is posting jobs and scholarships on ARIA HUB free for employers?',
    questionI18n: {
      en: 'Is posting jobs and scholarships on ARIA HUB free for employers?',
      fa: 'آیا ثبت وظایف و بورسیه‌ها در آریا هاب برای کارفرمایان رایگان است؟',
      ps: 'ایا په آریا هاب کې د دندو او بورسونو اعلانول د کارفرما لپاره وړیا دي؟',
    },
    answer: 'Yes, posting verified job vacancies, internships, fellowships, and scholarship programs on ARIA HUB is completely free for reputable employers and academic institutions. Submissions are subject to automated and editorial quality checks, and key listing details are provided in Persian (Afghanistan), Pashto, and English.',
    answerI18n: {
      en: 'Yes, posting verified job vacancies, internships, fellowships, and scholarship programs on ARIA HUB is completely free for reputable employers and academic institutions. Submissions are subject to automated and editorial quality checks, and key listing details are provided in Persian (Afghanistan), Pashto, and English.',
      fa: 'بله، ثبت فرصت‌های شغلی، کارآموزی، فلوشیپ‌ها و بورسیه‌های تحصیلی تأییدشده در آریا هاب برای کارفرمایان و نهادهای تحصیلی معتبر کاملاً رایگان است. تیم تحریریه ما هر درخواست را از نظر اعتبار بررسی کرده و جزئیات آن را ظرف ۲۴ ساعت به فارسی، پشتو و انگلیسی ترجمه می‌کند تا به بیشترین مخاطب برسد.',
      ps: 'هو، په آریا هاب کې د باوري کاري فرصتونو، انټرنشیپونو، فیلوشپونو او تحصیلي بورسونو ثبتول د باوري کارګمارونکو او علمي بنسټونو لپاره په بشپړ ډول وړیا دي. زموږ اداري ډله هر اعلان د اعتبار له مخې ارزوي او په ۲۴ ساعتونو کې یې ټول جزییات په دري، پښتو او انګلیسي ژباړي.',
    },
    category: 'employers',
    order: 2,
    status: 'published',
  },
  {
    id: 'faq-3',
    question: 'What languages and localization features does ARIA HUB offer?',
    questionI18n: {
      en: 'What languages and localization features does ARIA HUB offer?',
      fa: 'آریا هاب از چه زبان‌ها و امکانات بومی‌سازی پشتیبانی می‌کند؟',
      ps: 'آریا هاب له کومو ژبو او ځانګړتیاوو ملاتړ کوي؟',
    },
    answer: "ARIA HUB is Afghanistan's premier trilingual career and educational gateway, offering complete native support across English, Persian (Afghanistan), and Pashto. Users can seamlessly switch languages with full RTL layout support, localized Gregorian calendar dates, Eastern Arabic numerals, and culturally tailored interfaces designed for desktop and mobile devices.",
    answerI18n: {
      en: "ARIA HUB is Afghanistan's premier trilingual career and educational gateway, offering complete native support across English, Persian (Afghanistan), and Pashto. Users can seamlessly switch languages with full RTL layout support, localized Gregorian calendar dates, Eastern Arabic numerals, and culturally tailored interfaces designed for desktop and mobile devices.",
      fa: 'آریا هاب اولین درگاه سه زبانه کاریابی و تحصیلی افغانستان است که از زبان‌های انگلیسی، فارسی دری و پشتو به صورت کامل پشتیبانی می‌کند. کاربران می‌توانند به سادگی زبان را تغییر داده و از چیدمان راست‌چین (RTL)، تقویم میلادی بومی‌سازی‌شده، ارقام شرقی و رابط‌های واکنش‌گرا در موبایل و کامپیوتر بهره‌مند شوند.',
      ps: 'آریا هاب د افغانستان لومړنۍ درې ژبنیز کاري او تحصیلي پورټل دی چې په انګلیسي، دري (فارسي) او پښتو ژبو بشپړ ملاتړ کوي. کاروونکي کولی شي ژبه بدله کړي او د ښي اړخ (RTL) بڼې، د میلادي تقویم نېټو، ختیځو عربي عددونو او په موبایل او کمپیوټر کې له اسانه انټرفیس څخه ګټه واخلي.',
    },
    category: 'general',
    order: 3,
    status: 'published',
  },
  {
    id: 'faq-4',
    question: 'How often are new job vacancies and educational deadlines updated?',
    questionI18n: {
      en: 'How often are new job vacancies and educational deadlines updated?',
      fa: 'فرصت‌های شغلی و مهلت‌های ثبت‌نام بورسیه‌ها هر چند وقت یک‌بار به‌روزرسانی می‌شوند؟',
      ps: 'کاري فرصتونه او د تحصیلي بورسونو ضرب‌الاجلونه څو ځله تازه کېږي؟',
    },
    answer: 'The ARIA HUB database is updated multiple times daily with verified international scholarships, remote work positions, local employment opportunities, and training programs. We provide automated deadline reminders, application tracking tools, and direct email alerts so Afghan candidates never miss critical submission dates for high-impact educational and professional opportunities.',
    answerI18n: {
      en: 'The ARIA HUB database is updated multiple times daily with verified international scholarships, remote work positions, local employment opportunities, and training programs. We provide automated deadline reminders, application tracking tools, and direct email alerts so Afghan candidates never miss critical submission dates for high-impact educational and professional opportunities.',
      fa: 'پایگاه داده آریا هاب چندین بار در روز با بورسیه‌های بین‌المللی معتبر، موقعیت‌های کار از راه دور، فرصت‌های شغلی داخلی و دوره‌های آموزشی به‌روز می‌شود. ما یادآورهای خودکار ددلاین، ابزار پیگیری غوښتنلیک و هشدارهای ایمیلی ارائه می‌دهیم تا متقاضیان افغان هرگز مهلت‌های مهم را از دست ندهند.',
      ps: 'د آریا هاب ډیټابیس هره ورځ څو ځله د باوري نړیوالو بورسونو، لیرې کاري دندو، کورنیو فرصتونو او روزنیزو پروګرامونو سره تازه کیږي. موږ د وروستۍ نیټې اتومات یادونه، د غوښتنلیک تعقیب او ایمیل خبرتیاوې چمتو کوو ترڅو غوښتونکي هیڅکله مهم فرصتونه له لاسه ورنکړي.',
    },
    category: 'updates',
    order: 4,
    status: 'published',
  },
];

export function FaqsSection({ faqs }: { faqs: Faq[] }) {
  const t = useT();
  const lang = useLangStore((s) => s.code);
  const [query, setQuery] = useState('');

  const effectiveFaqs = faqs && faqs.length > 0 ? faqs : DEFAULT_FAQS;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return effectiveFaqs;
    return effectiveFaqs.filter((f) => {
      const question = getLocalizedContent(f.question, f.questionI18n as any, lang);
      const answer = getLocalizedContent(f.answer, f.answerI18n as any, lang);
      return question.toLowerCase().includes(q) || answer.toLowerCase().includes(q);
    });
  }, [effectiveFaqs, query, lang]);

  return (
    <section id="faqs" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('faqs.eyebrow')}
          title={t('faqs.title')}
          subtitle={t('faqs.subtitle')}
        />

        {/* Search */}
        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative mx-auto mt-10 max-w-lg"
        >
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('faqs.searchPlaceholder')}
            aria-label={t('faqs.searchPlaceholder')}
            className="h-12 rounded-xl border-border/60 bg-card/50 ps-11 shadow-premium backdrop-blur-sm"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label={t('faqs.clearSearch')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent">
              {t('faqs.clear')}
            </button>
          )}
        </motion.div>

        <motion.div
          initial={false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px' }}
          transition={{ duration: 0.5 }}
          className="mt-8"
        >
          <AnimatePresence mode="popLayout">
            {filtered.length > 0 ? (
              <Accordion type="single" collapsible defaultValue="item-0" className="space-y-3">
                {filtered.map((f, i) => {
                  const question = getLocalizedContent(f.question, f.questionI18n as any, lang);
                  const answer = getLocalizedContent(f.answer, f.answerI18n as any, lang);
                  return (
                    <AccordionItem
                      key={f.id}
                      value={`item-${i}`}
                      className="overflow-hidden rounded-2xl border border-border/60 bg-card/50 px-5 backdrop-blur-sm transition-colors data-[state=open]:border-primary/40 data-[state=open]:shadow-float"
                    >
                      <AccordionTrigger className="faq-question py-5 text-left text-base font-semibold hover:no-underline">
                        {question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                        <p className="faq-answer leading-relaxed">{answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 py-12 text-center"
              >
                <HelpCircle className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{t('faqs.noMatch', { query })}</p>
                <button onClick={() => setQuery('')} className="mt-2 text-sm font-semibold text-primary hover:underline">
                  {t('faqs.clearSearch')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="mt-10 flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-accent/40 p-4 text-center text-sm">
          <LifeBuoy className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">{t('faqs.stillHave')}</span>
          <a href="#contact" className="font-semibold text-primary hover:underline">{t('faqs.contactTeam')}</a>
        </div>
      </div>
    </section>
  );
}
