'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, User, Clock, Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '../section-heading';
import { SmartImage } from '../smart-image';
import { DetailModal } from '../detail-modal';
import { useT } from '@/hooks/use-t';
import { useLangStore } from '@/lib/lang-store';
import { getLocalizedContent } from '@/lib/i18n-content';
import type { News } from '@/lib/types';

function parseTags(v: string | null): string[] {
  if (!v) return [];
  try { return JSON.parse(v); } catch { return []; }
}

export function NewsSection({ news }: { news: News[] }) {
  const t = useT();
  const lang = useLangStore((s) => s.code);
  const [selected, setSelected] = useState<News | null>(null);
  if (!news.length) return null;
  const [featured, ...rest] = news;
  
  // Get localized content for featured news
  const featuredTitle = featured ? getLocalizedContent(featured.title, featured.titleI18n as any, lang) : '';
  const featuredExcerpt = featured ? getLocalizedContent(featured.excerpt, featured.excerptI18n as any, lang) : '';

  return (
    <section id="news" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHeading
            align="left"
            eyebrow={t('news.eyebrow')}
            title={t('news.title')}
            subtitle={t('news.subtitle')}
          />
          <Button asChild variant="outline" className="shrink-0 rounded-xl">
            <a href="#contact">{t('section.viewAll')}<ArrowRight className="ms-2 h-4 w-4 rtl-flip" /></a>
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Featured */}
          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px' }}
              transition={{ duration: 0.5 }}
              className="lg:row-span-2"
            >
              <Card className="group h-full overflow-hidden border-border/60 p-0 shadow-premium transition-all duration-500 hover:shadow-float">
                <button onClick={() => setSelected(featured)} className="block w-full text-left">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <SmartImage
                      src={featured.image}
                      alt={featuredTitle}
                      className="absolute inset-0 h-full w-full"
                      imgClassName="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      gradient="from-primary/30 via-chart-2/20 to-chart-3/20"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {featured.category && (
                      <span className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {featured.category.name}
                      </span>
                    )}
                  </div>
                </button>
                <div className="p-6">
                  <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(featured.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {featured.author && <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{featured.author}</span>}
                  </div>
                  <button onClick={() => setSelected(featured)} className="block text-left">
                    <h3 className="text-xl font-bold leading-snug transition-colors group-hover:text-primary">{featuredTitle}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{featuredExcerpt}</p>
                  </button>
                  <Button onClick={() => setSelected(featured)} variant="link" className="mt-4 h-auto p-0 text-primary">
                    {t('news.readMore')}<ArrowRight className="ms-1 h-4 w-4 rtl-flip" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Rest */}
          {rest.slice(0, 4).map((n, i) => {
            const title = getLocalizedContent(n.title, n.titleI18n as any, lang);
            const excerpt = getLocalizedContent(n.excerpt, n.excerptI18n as any, lang);
            
            return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <button onClick={() => setSelected(n)} className="block w-full text-left">
                <Card className="group flex h-full items-center gap-4 overflow-hidden border-border/60 p-3 shadow-premium transition-all duration-500 hover:-translate-y-0.5 hover:shadow-float">
                  <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl">
                    <SmartImage
                      src={n.image}
                      alt={title}
                      className="absolute inset-0 h-full w-full"
                      imgClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      gradient="from-primary/25 via-chart-2/20 to-chart-3/20"
                    />
                  </div>
                  <div className="min-w-0 flex-1 p-1">
                    <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">{n.category?.name}</span>
                      <span>{new Date(n.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <h3 className="line-clamp-2 text-sm font-bold leading-snug transition-colors group-hover:text-primary">{title}</h3>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{excerpt}</p>
                  </div>
                </Card>
              </button>
            </motion.div>
          )})}
        </div>
      </div>

      <DetailModal open={!!selected} onClose={() => setSelected(null)}>
        {selected && <NewsDetail news={selected} t={t} />}
      </DetailModal>
    </section>
  );
}

function NewsDetail({ news, t }: { news: News; t: (k: string) => string }) {
  const lang = useLangStore((s) => s.code);
  
  // Get localized content
  const title = getLocalizedContent(news.title, news.titleI18n as any, lang);
  const excerpt = getLocalizedContent(news.excerpt, news.excerptI18n as any, lang);
  const content = getLocalizedContent(news.content, news.contentI18n as any, lang);
  
  const tags = parseTags(news.tags);
  const readTime = Math.max(1, Math.ceil(content.split(/\s+/).length / 200));
  return (
    <div>
      <div className="relative aspect-[16/9] overflow-hidden">
        <SmartImage src={news.image} alt={title} className="absolute inset-0 h-full w-full" imgClassName="h-full w-full object-cover" gradient="from-primary/30 via-chart-2/20 to-chart-3/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 text-white">
          {news.category && (
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold">{news.category.name}</span>
          )}
          <h2 className="mt-2 text-2xl font-bold drop-shadow sm:text-3xl">{title}</h2>
        </div>
      </div>

      <div className="max-h-[55vh] overflow-y-auto p-6 sm:p-8">
        {/* Meta */}
        <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(news.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          {news.author && <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{news.author}</span>}
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{readTime} {t('common.minRead')}</span>
        </div>

        <p className="mb-4 text-base font-medium text-foreground/90">{excerpt}</p>
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-line leading-relaxed text-foreground/80">{content}</p>
        </div>

        {tags.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            {tags.map((tag, i) => (
              <span key={i} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
