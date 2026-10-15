'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, Calendar, ArrowRight, Plane, FileText, CheckCircle2, MapPin, ListChecks } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '../section-heading';
import { SmartImage } from '../smart-image';
import { DetailModal } from '../detail-modal';
import { useT } from '@/hooks/use-t';
import { useLangHref } from '@/hooks/use-lang-href';
import {useEffectiveLang} from '@/components/site/lang-context';
import { getLocalizedContent, getLocalizedArray } from '@/lib/i18n-content';
import type { Visa } from '@/lib/types';

function parseArr(v: string | null): string[] {
  if (!v) return [];
  try { return JSON.parse(v); } catch { return []; }
}

export function VisasSection({ visas }: { visas: Visa[] }) {
  const t = useT();
  const hrefFn = useLangHref();
  const [selected, setSelected] = useState<Visa | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setVisibleCount(1);
    }
  }, []);

  const visibleVisas = visas.slice(0, visibleCount);

  return (
    <section id="visas" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.03] to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('visas.eyebrow')}
          title={t('visas.title')}
          subtitle={t('visas.subtitle')}
        />
        {visas.length === 0 ? (
          <div className="mt-14 grid place-items-center py-16 text-muted-foreground">{t('empty.visas')}</div>
        ) : (
          <>
            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleVisas.map((v, i) => (
                <motion.div
                  key={v.id}
                  initial={false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '0px' }}
                  transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                >
                  <VisaCard visa={v} t={t} onOpen={() => setSelected(v)} />
                </motion.div>
              ))}
            </div>

            {visas.length > visibleCount && (
              <div className="mt-12 flex justify-center">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-primary px-8 font-semibold shadow-float"
                >
                  <a href={hrefFn('/visas')} target="_blank" rel="noopener noreferrer">
                    {t('section.viewAll') || 'View All'}
                  </a>
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <DetailModal open={!!selected} onClose={() => setSelected(null)}>
        {selected && <VisaDetail visa={selected} t={t} />}
      </DetailModal>
    </section>
  );
}

function VisaCard({ visa, t, onOpen }: { visa: Visa; t: (k: string) => string; onOpen: () => void }) {
  const lang = useEffectiveLang();

  // Get localized content
  const country = getLocalizedContent(visa.country, visa.countryI18n as any, lang);
  const visaType = getLocalizedContent(visa.visaType, visa.visaTypeI18n as any, lang);

  return (
    <Card className="group relative overflow-hidden border-border/60 p-0 shadow-premium transition-all duration-500 hover:-translate-y-1.5 hover:shadow-float">
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
      <div className="p-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <Calendar className="mx-auto mb-1 h-4 w-4 text-primary" />
            <p className="text-[11px] font-medium text-muted-foreground">{t('visas.duration')}</p>
            <p className="text-xs font-bold">{visa.duration || '—'}</p>
          </div>
          <div className="border-x border-border/60">
            <Clock className="mx-auto mb-1 h-4 w-4 text-chart-2" />
            <p className="text-[11px] font-medium text-muted-foreground">{t('visas.processing')}</p>
            <p className="text-xs font-bold">{visa.processingTime || '—'}</p>
          </div>
          <div>
            <DollarSign className="mx-auto mb-1 h-4 w-4 text-chart-3" />
            <p className="text-[11px] font-medium text-muted-foreground">{t('visas.fee')}</p>
            <p className="text-xs font-bold">{visa.fee || '—'}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={onOpen} variant="outline" className="h-10 rounded-xl text-xs">
            <FileText className="me-1.5 h-3.5 w-3.5" />{t('detail.viewDetails')}
          </Button>
          <Button asChild className="h-10 rounded-xl bg-primary text-xs group-hover:shadow-float">
            <a href="#contact">
              <Plane className="me-1.5 h-3.5 w-3.5" />
              {t('visas.apply')}
            </a>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function VisaDetail({ visa, t }: { visa: Visa; t: (k: string) => string }) {
  const lang = useEffectiveLang();

  // Get localized content
  const country = getLocalizedContent(visa.country, visa.countryI18n as any, lang);
  const visaType = getLocalizedContent(visa.visaType, visa.visaTypeI18n as any, lang);
  const description = getLocalizedContent(visa.description, visa.descriptionI18n as any, lang);
  const eligibility = getLocalizedContent(visa.eligibility, visa.eligibilityI18n as any, lang);
  const applicationProcess = getLocalizedContent(visa.applicationProcess, visa.applicationProcessI18n as any, lang);

  const requirements = getLocalizedArray(visa.requirements, visa.requirementsI18n as any, lang);
  const documents = getLocalizedArray(visa.documents, visa.documentsI18n as any, lang);
  const processSteps = applicationProcess ? applicationProcess.split('\n').filter(Boolean) : [];

  return (
    <div>
      <div className="relative aspect-[16/9] overflow-hidden">
        <SmartImage src={visa.image} alt={country} className="absolute inset-0 h-full w-full" imgClassName="h-full w-full object-cover" gradient="from-primary/40 via-chart-2/25 to-chart-3/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-white">
          <div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">{visa.countryCode?.toUpperCase()}</span>
            <h2 className="mt-2 text-3xl font-bold drop-shadow">{country}</h2>
            <p className="text-white/85">{visaType}</p>
          </div>
          {visa.fee && (
            <span className="rounded-xl bg-white/15 px-3 py-1.5 text-sm font-bold backdrop-blur-sm">{visa.fee}</span>
          )}
        </div>
      </div>

      <div className="max-h-[55vh] overflow-y-auto p-6 sm:p-8">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Calendar, label: t('visas.duration'), value: visa.duration },
            { icon: Clock, label: t('visas.processing'), value: visa.processingTime },
            { icon: DollarSign, label: t('visas.fee'), value: visa.fee },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-accent/30 p-3 text-center">
              <s.icon className="mx-auto mb-1 h-4 w-4 text-primary" />
              <p className="text-[10px] font-medium uppercase text-muted-foreground">{s.label}</p>
              <p className="mt-0.5 text-xs font-bold">{s.value || '—'}</p>
            </div>
          ))}
        </div>

        {description && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Overview</h3>
            <p className="text-sm leading-relaxed text-foreground/80">{description}</p>
          </div>
        )}

        {eligibility && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">Eligibility</h3>
            <p className="text-sm leading-relaxed text-foreground/80">{eligibility}</p>
          </div>
        )}

        {requirements.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted-foreground"><ListChecks className="h-4 w-4 text-primary" />{t('visas.requirements')}</h3>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {requirements.map((r, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-border/50 bg-card/40 p-2.5 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-chart-3" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {documents.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-muted-foreground"><FileText className="h-4 w-4 text-primary" />Required Documents</h3>
            <ul className="flex flex-wrap gap-2">
              {documents.map((d, i) => (
                <li key={i} className="rounded-lg bg-accent/50 px-3 py-1.5 text-xs font-medium">{d}</li>
              ))}
            </ul>
          </div>
        )}

        {processSteps.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Application Process</h3>
            <ol className="relative space-y-3 border-s-2 border-primary/20 ps-5">
              {processSteps.map((s, i) => (
                <li key={i} className="relative">
                  <span className="absolute -start-[27px] grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-primary to-chart-2 text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                  <p className="text-sm text-foreground/80">{s.replace(/^\d+\.\s*/, '')}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {visa.embassyDetails && (
          <div className="mt-5 rounded-xl border border-border/60 bg-accent/30 p-4">
            <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold"><MapPin className="h-4 w-4 text-primary" />Embassy Details</h3>
            <p className="text-sm text-muted-foreground">{visa.embassyDetails}</p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="h-11 rounded-xl bg-primary">
            <a href="#contact"><Plane className="me-2 h-4 w-4" />{t('visas.apply')}<ArrowRight className="ms-2 h-4 w-4 rtl-flip" /></a>
          </Button>
        </div>
      </div>
    </div>
  );
}
