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

export function FaqsSection({ faqs }: { faqs: Faq[] }) {
  const t = useT();
  const lang = useLangStore((s) => s.code);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((f) => {
      const question = getLocalizedContent(f.question, f.questionI18n as any, lang);
      const answer = getLocalizedContent(f.answer, f.answerI18n as any, lang);
      return question.toLowerCase().includes(q) || answer.toLowerCase().includes(q);
    });
  }, [faqs, query, lang]);

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
          initial={{ opacity: 0, y: 12 }}
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
            className="h-12 rounded-xl border-border/60 bg-card/50 ps-11 shadow-premium backdrop-blur-sm"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label={t('faqs.clearSearch')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent">
              {t('faqs.clear')}
            </button>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '0px' }}
          transition={{ duration: 0.5 }}
          className="mt-8"
        >
          <AnimatePresence mode="popLayout">
            {filtered.length > 0 ? (
              <Accordion type="single" collapsible className="space-y-3">
                {filtered.map((f, i) => {
                  const question = getLocalizedContent(f.question, f.questionI18n as any, lang);
                  const answer = getLocalizedContent(f.answer, f.answerI18n as any, lang);
                  return (
                    <AccordionItem
                      key={f.id}
                      value={`item-${i}`}
                      className="overflow-hidden rounded-2xl border border-border/60 bg-card/50 px-5 backdrop-blur-sm transition-colors data-[state=open]:border-primary/40 data-[state=open]:shadow-float"
                    >
                      <AccordionTrigger className="py-5 text-left text-base font-semibold hover:no-underline">
                        {question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                        {answer}
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
