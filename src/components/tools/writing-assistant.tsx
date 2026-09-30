'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

type Lang = 'en' | 'fa' | 'ps';

const labels = {
  en: { title: 'AI writing help', context: 'Opportunity or recipient details (optional for improvement)', improve: 'Improve wording', tailor: 'Tailor to details', apply: 'Apply suggestion', review: 'Review and edit the suggestion before using it.', disclosure: 'Clicking a button sends this text and the details above to ARIA HUB’s configured AI provider.', empty: 'Write at least 20 characters first.', error: 'Could not generate a suggestion.', working: 'Writing…', placeholder: 'Paste the role, requirements, or recipient details here.' },
  fa: { title: 'کمک هوش مصنوعی برای نوشتن', context: 'جزئیات فرصت یا گیرنده (برای بهبود اختیاری)', improve: 'بهبود متن', tailor: 'متناسب‌سازی', apply: 'اعمال پیشنهاد', review: 'پیشنهاد را پیش از استفاده بررسی و ویرایش کنید.', disclosure: 'با کلیک روی دکمه، این متن و جزئیات بالا به ارائه‌دهنده هوش مصنوعی آریا هاب فرستاده می‌شود.', empty: 'ابتدا دست‌کم ۲۰ نویسه بنویسید.', error: 'پیشنهادی تولید نشد.', working: 'در حال نوشتن…', placeholder: 'نقش، شرایط یا جزئیات گیرنده را اینجا وارد کنید.' },
  ps: { title: 'د لیکلو لپاره د AI مرسته', context: 'د فرصت یا ترلاسه کوونکي معلومات (د ښه کولو لپاره اختیاري)', improve: 'متن ښه کړئ', tailor: 'له معلوماتو سره سمون', apply: 'وړاندیز وکاروئ', review: 'وړاندیز له کارولو مخکې وګورئ او سم یې کړئ.', disclosure: 'د تڼۍ په وهلو سره دا متن او پورته معلومات د آریا هاب AI خدمت ته لېږل کېږي.', empty: 'لومړی لږ تر لږه ۲۰ توري ولیکئ.', error: 'وړاندیز جوړ نه شو.', working: 'لیکل کېږي…', placeholder: 'د دندې، شرایطو یا ترلاسه کوونکي معلومات دلته ولیکئ.' },
};

export function WritingAssistant({ tool, lang, text, documentType, onApply }: {
  tool: 'cv' | 'letter'; lang: Lang; text: string; documentType?: string; onApply: (value: string) => void;
}) {
  const [context, setContext] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const c = labels[lang];

  async function generate(action: 'improve' | 'tailor') {
    if (text.trim().length < 20) { setError(c.empty); return; }
    setLoading(true);
    setError('');
    setSuggestion('');
    try {
      const response = await fetch('/api/tools/writing-assist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool, action, lang, text, context, documentType }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.text !== 'string') throw new Error(data.error || c.error);
      setSuggestion(data.text);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : c.error);
    } finally { setLoading(false); }
  }

  return (
    <details className="mt-3 rounded-xl border bg-muted/20 p-3 text-sm print:hidden">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Sparkles className="size-4 text-blue-600" />{c.title}</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-muted-foreground">{c.disclosure}</p>
        <label className="block text-xs font-medium">{c.context}
          <textarea value={context} onChange={event => setContext(event.target.value)} maxLength={1200} rows={2} placeholder={c.placeholder} className="mt-1 w-full resize-y rounded-lg border bg-background p-2 text-sm" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={loading} onClick={() => generate('improve')} className="min-h-9 rounded-lg border bg-background px-3 font-medium disabled:opacity-50">{loading ? c.working : c.improve}</button>
          <button type="button" disabled={loading || !context.trim()} onClick={() => generate('tailor')} className="min-h-9 rounded-lg border bg-background px-3 font-medium disabled:opacity-50">{c.tailor}</button>
        </div>
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {suggestion && <div className="space-y-2"><p className="text-xs text-muted-foreground">{c.review}</p><textarea value={suggestion} onChange={event => setSuggestion(event.target.value)} rows={tool === 'cv' ? 5 : 8} className="w-full resize-y rounded-lg border bg-background p-2 text-sm" /><button type="button" onClick={() => { onApply(suggestion); setSuggestion(''); }} className="min-h-9 rounded-lg bg-blue-600 px-3 font-semibold text-white">{c.apply}</button></div>}
      </div>
    </details>
  );
}
