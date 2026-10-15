'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, DollarSign, Calendar, ArrowRight, Plane, FileText, CheckCircle2, MapPin, ListChecks } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/site/section-heading';
import { SmartImage } from '@/components/site/smart-image';
import { DetailModal } from '@/components/site/detail-modal';
import { useT } from '@/hooks/use-t';
import { useEffectiveLang } from '@/components/site/lang-context';
import { SitePagination } from '@/components/site/page-navigation';
import { getLocalizedContent, getLocalizedArray } from '@/lib/i18n-content';
import type { Visa } from '@/lib/types';
import { cn } from '@/lib/utils';

function parseArr(v: string | null): string[] {
  if (!v) return [];
  try { return JSON.parse(v); } catch { return []; }
}

export function VisasClient({
  visas,
  currentPage,
  totalPages,
}: {
  visas: Visa[];
  currentPage: number;
  totalPages: number;
}) {
  const t = useT();
  const lang = useEffectiveLang();
  const [selected, setSelected] = useState<Visa | null>(null);

  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('visas.eyebrow') || 'Visas'}
          title={t('visas.title') || 'Travel & Visas'}
          subtitle={t('visas.subtitle') || 'Explore all visa opportunities.'}
        />

        {visas.length === 0 ? (
          <div className="mt-14 grid place-items-center py-16 text-muted-foreground">{t('empty.visas') || 'No visas found.'}</div>
        ) : (
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visas.map((v, i) => (
                <motion.div
                  key={v.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: (i % 3) * 0.05 }}
                >
                  <VisaCard visa={v} t={t} onOpen={() => setSelected(v)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <SitePagination lang={lang} page={currentPage} totalPages={totalPages} previousHref={currentPage>1?`/${lang}/visas?page=${currentPage-1}`:undefined} nextHref={currentPage<totalPages?`/${lang}/visas?page=${currentPage+1}`:undefined}/>
      </div>

      <DetailModal open={!!selected} onClose={() => setSelected(null)}>
        {selected && <VisaDetail visa={selected} t={t} />}
      </DetailModal>
    </section>
  );
}

function VisaCard({ visa, t, onOpen }: { visa: Visa; t: (k: string) => string; onOpen: () => void }) {
  const lang = useEffectiveLang();

  const country = getLocalizedContent(visa.country, visa.countryI18n as any, lang);
  const visaType = getLocalizedContent(visa.visaType, visa.visaTypeI18n as any, lang);

  return (
    <Card className="group relative overflow-hidden border-border/60 p-0 shadow-premium transition-all duration-500 hover:-translate-y-1.5 hover:shadow-float h-full flex flex-col">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-[16/10] overflow-hidden">
          <SmartImage
            src={visa.image}
            alt={country}
            className="absolute inset-0 h-full w-full"
            imgClassName="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            gradient="from-primary/40 via-chart-2/25 to-chart-3/25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div>
              <h3 className="text-xl font-bold text-white drop-shadow">{country}</h3>
              <p className="text-sm text-white/80">{visaType}</p>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {visa.countryCode?.toUpperCase()}
            </span>
          </div>
        </div>
      </button>
      <div className="p-5 flex-1 flex flex-col">
        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div>
            <Calendar className="mx-auto mb-1 h-4 w-4 text-primary" />
            <p className="text-[11px] font-medium text-muted-foreground">{t('visas.duration') || 'Duration'}</p>
            <p className="text-xs font-bold">{visa.duration || '—'}</p>
          </div>
          <div className="border-x border-border/60">
            <Clock className="mx-auto mb-1 h-4 w-4 text-chart-2" />
            <p className="text-[11px] font-medium text-muted-foreground">{t('visas.processing') || 'Processing'}</p>
            <p className="text-xs font-bold">{visa.processingTime || '—'}</p>
          </div>
          <div>
            <DollarSign className="mx-auto mb-1 h-4 w-4 text-chart-3" />
            <p className="text-[11px] font-medium text-muted-foreground">{t('visas.fee') || 'Fee'}</p>
            <p className="text-xs font-bold">{visa.fee || '—'}</p>
          </div>
        </div>
        <div className="mt-auto pt-2 border-t border-border/50">
          <Button onClick={onOpen} variant="ghost" className="w-full text-xs font-semibold group-hover:text-primary">
            {t('common.viewDetails')} <ArrowRight className="ms-2 h-3.5 w-3.5 rtl-flip transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function VisaDetail({ visa, t }: { visa: Visa; t: (k: string) => string }) {
  const lang = useEffectiveLang();
  const isRtl = lang === 'fa' || lang === 'ps';

  const country = getLocalizedContent(visa.country, visa.countryI18n as any, lang);
  const visaType = getLocalizedContent(visa.visaType, visa.visaTypeI18n as any, lang);
  const description = getLocalizedContent(visa.description, visa.descriptionI18n as any, lang);

  const reqsRaw = getLocalizedArray(visa.requirements, visa.requirementsI18n as any, lang);
  const requirements = Array.isArray(reqsRaw) ? reqsRaw : parseArr(reqsRaw as unknown as string);

  return (
    <div>
      <div className="relative aspect-[21/9] w-full overflow-hidden">
        <SmartImage src={visa.image} alt={country} className="absolute inset-0 h-full w-full" imgClassName="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 text-white sm:bottom-6 sm:left-6 sm:right-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-primary/90 px-2.5 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">{visa.countryCode}</span>
            <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">{visaType}</span>
          </div>
          <h2 dir="auto" className="text-3xl font-bold tracking-tight drop-shadow-md sm:text-4xl">{country}</h2>
        </div>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-primary">{t('common.overview')}</h3>
            {description && (
              <div dir="auto" className="prose prose-sm max-w-none text-muted-foreground prose-p:leading-relaxed">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{description}</ReactMarkdown>
              </div>
            )}

            {requirements.length > 0 && (
              <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-foreground">
                  <ListChecks className="h-5 w-5 text-chart-2" />
                  {t('common.documents')}
                </h3>
                <ul className="space-y-3">
                  {requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span dir="auto" className="text-sm font-medium text-foreground/80">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-accent/30 p-5">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('detail.details')}</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background text-primary shadow-sm"><Calendar className="h-5 w-5" /></div>
                  <div><p className="text-[10px] uppercase text-muted-foreground">{t('visas.duration')}</p><p className="text-sm font-bold">{visa.duration || '—'}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background text-chart-2 shadow-sm"><Clock className="h-5 w-5" /></div>
                  <div><p className="text-[10px] uppercase text-muted-foreground">{t('visas.processing')}</p><p className="text-sm font-bold">{visa.processingTime || '—'}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background text-chart-3 shadow-sm"><DollarSign className="h-5 w-5" /></div>
                  <div><p className="text-[10px] uppercase text-muted-foreground">{t('visas.fee')}</p><p className="text-sm font-bold">{visa.fee || '—'}</p></div>
                </div>
                {(visa as any).embassyRequired && (
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background text-chart-4 shadow-sm"><MapPin className="h-5 w-5" /></div>
                    <div><p className="text-[10px] uppercase text-muted-foreground">{t('common.embassy')}</p><p className="text-sm font-bold">{t('visas.visitRequired')}</p></div>
                  </div>
                )}
              </div>
              <Button className="mt-6 w-full rounded-xl bg-primary font-bold shadow-float" size="lg">
                <Plane className="me-2 h-4 w-4" />{t('common.bookCall')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
