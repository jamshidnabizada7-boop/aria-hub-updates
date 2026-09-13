'use client';

import React, { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Info, HelpCircle, XCircle, FileWarning, Briefcase, Users, Bot } from 'lucide-react';
import { useT } from '@/hooks/use-t';
import { getLocalizedContent } from '@/lib/i18n-content';

export interface RejectionItem {
  id: string;
  code: string;
  title: string;
  titleI18n?: unknown;
  description: string;
  descriptionI18n?: unknown;
  mitigation: unknown;      // string[] (EN)
  mitigationI18n?: unknown; // { en: [], fa: [], ps: [] }
  icon?: string | null;
}

const ICONS: Record<string, React.ReactNode> = {
  Users: <Users className="h-5 w-5 text-rose-500" />,
  FileWarning: <FileWarning className="h-5 w-5 text-amber-500" />,
  XCircle: <XCircle className="h-5 w-5 text-red-600" />,
  Briefcase: <Briefcase className="h-5 w-5 text-emerald-500" />,
  HelpCircle: <HelpCircle className="h-5 w-5 text-blue-500" />,
};

function localizedList(base: unknown, i18n: unknown, lang: string): string[] {
  const fromI18n =
    i18n && typeof i18n === 'object'
      ? ((i18n as Record<string, unknown>)[lang] as unknown)
      : undefined;
  if (Array.isArray(fromI18n) && fromI18n.length > 0) {
    return fromI18n.filter((x): x is string => typeof x === 'string');
  }
  if (Array.isArray(base)) return (base as unknown[]).filter((x): x is string => typeof x === 'string');
  return [];
}

export function RejectionsClient({
  lang,
  rejections,
}: {
  lang: string;
  rejections: RejectionItem[];
}) {
  const tFn = useT();
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const filteredRejections = rejections.filter((item) => {
    const q = searchQuery.toLowerCase();
    const title = String(getLocalizedContent(item.title, item.titleI18n, lang) || '').toLowerCase();
    const desc = String(getLocalizedContent(item.description, item.descriptionI18n, lang) || '').toLowerCase();
    return (
      item.code.toLowerCase().includes(q) ||
      title.includes(q) ||
      desc.includes(q)
    );
  });

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    setAiResponse(null);

    try {
      const res = await fetch('/api/visa-prep/ai-rejection-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery, lang }),
      });

      const data = await res.json();
      if (data.advice) {
        setAiResponse(data.advice);
      } else {
        setAiResponse(tFn('visaRej.aiFailed'));
      }
    } catch (error) {
      setAiResponse(tFn('visaRej.aiError'));
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* AI Assistant Section */}
      <Card className="relative overflow-hidden border-t-4 border-t-primary shadow-md">
        <div className="pointer-events-none absolute right-0 top-0 p-8 opacity-5">
          <Bot className="h-32 w-32" />
        </div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            {tFn('visaRej.aiTitle')}
          </CardTitle>
          <CardDescription>{tFn('visaRej.aiDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder={tFn('visaRej.aiPlaceholder')}
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="flex-grow"
              onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
            />
            <Button onClick={handleAiSearch} disabled={isAiLoading || !aiQuery.trim()}>
              {isAiLoading ? tFn('visaRej.analyzing') : tFn('visaRej.askAi')}
            </Button>
          </div>

          {aiResponse && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-slate-800 dark:text-slate-200">
              <div className="flex gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div
                  className="prose dark:prose-invert max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: aiResponse.replace(/\n/g, '<br/>') }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Search & Accordion */}
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <h2 className="text-2xl font-bold tracking-tight">{tFn('visaRej.dictionary')}</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tFn('visaRej.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filteredRejections.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center">
            <p className="text-muted-foreground">
              {tFn('visaRej.noResults')} &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-4">
            {filteredRejections.map((item) => {
              const title = getLocalizedContent(item.title, item.titleI18n, lang);
              const description = getLocalizedContent(item.description, item.descriptionI18n, lang);
              const mitigation = localizedList(item.mitigation, item.mitigationI18n, lang);
              return (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="overflow-hidden rounded-xl border bg-white px-2 shadow-sm dark:bg-slate-900"
                >
                  <AccordionTrigger className="px-2 py-4 hover:no-underline">
                    <div className="flex items-center gap-4 text-left">
                      <div className="shrink-0 rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                        {ICONS[item.icon || ''] || <Info className="h-5 w-5 text-slate-500" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{item.code}</h3>
                        <p className="text-sm font-normal text-muted-foreground">{title}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-6 pt-2">
                    <div className="space-y-4">
                      <div className="rounded-lg border bg-slate-50 p-4 dark:bg-slate-950">
                        <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                          <Info className="h-4 w-4 text-blue-500" />
                          {tFn('visaRej.meaning')}
                        </h4>
                        <p className="leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
                      </div>

                      <div>
                        <h4 className="mb-3 mt-4 font-semibold text-slate-900 dark:text-white">
                          {tFn('visaRej.mitigate')}
                        </h4>
                        <ul className="space-y-2">
                          {mitigation.map((tip, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                                {idx + 1}
                              </div>
                              <span className="text-slate-700 dark:text-slate-300">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}
