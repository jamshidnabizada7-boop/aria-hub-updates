'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { LETTER_TEMPLATES, type LetterKind, type LetterLanguage, type LetterLayout } from './letter-templates';
import { WritingAssistant } from '@/components/tools/writing-assistant';

interface Draft {
  kind: LetterKind;
  layout: LetterLayout;
  sender: string;
  senderContact: string;
  recipient: string;
  date: string;
  salutation: string;
  subject: string;
  body: string;
  closing: string;
}

const UI: Record<LetterLanguage, Record<string, string>> = {
  en: { title: 'Letter builder', intro: 'Choose a letter, edit the sample with your real details, and preview the finished page.', kind: 'Letter type', design: 'Page design', classic: 'Classic', modern: 'Modern', formal: 'Formal', sender: 'Your name / recommender', senderContact: 'Email, phone or address', recipient: 'Recipient / organization', date: 'Date', salutation: 'Greeting', subject: 'Subject', body: 'Letter text', closing: 'Closing', preview: 'Live preview', print: 'Print / save PDF', download: 'Download text', saved: 'Saved on this device', note: 'Replace every [bracketed detail] with a real fact before sending.', reset: 'Use sample text', resetConfirm: 'Replace the current text with the sample for this letter?', placeholder: 'Enter details', letterLanguage: 'The text uses the selected site language. You can edit every sentence.', designs: 'Choose how the finished page looks.' },
  fa: { title: 'سازنده نامه', intro: 'نوع نامه را انتخاب کنید، متن نمونه را با اطلاعات واقعی ویرایش کنید و صفحه نهایی را ببینید.', kind: 'نوع نامه', design: 'طرح صفحه', classic: 'کلاسیک', modern: 'مدرن', formal: 'رسمی', sender: 'نام شما / توصیه‌کننده', senderContact: 'ایمیل، تلفن یا نشانی', recipient: 'گیرنده / سازمان', date: 'تاریخ', salutation: 'خطاب', subject: 'موضوع', body: 'متن نامه', closing: 'پایان نامه', preview: 'پیش‌نمایش زنده', print: 'چاپ / ذخیره PDF', download: 'دانلود متن', saved: 'روی این دستگاه ذخیره شد', note: 'همه بخش‌های [داخل کروشه] را پیش از ارسال با اطلاعات واقعی جایگزین کنید.', reset: 'استفاده از متن نمونه', resetConfirm: 'متن فعلی با نمونه این نامه جایگزین شود؟', placeholder: 'جزئیات را وارد کنید', letterLanguage: 'متن به زبان انتخابی سایت است و همه جمله‌ها قابل ویرایش‌اند.', designs: 'ظاهر صفحه نهایی را انتخاب کنید.' },
  ps: { title: 'د لیک جوړوونکی', intro: 'د لیک ډول وټاکئ، بېلګه له خپلو رښتینو معلوماتو سره سمه کړئ او وروستۍ پاڼه وګورئ.', kind: 'د لیک ډول', design: 'د پاڼې بڼه', classic: 'کلاسیک', modern: 'عصري', formal: 'رسمي', sender: 'ستاسو نوم / سپارښتونکی', senderContact: 'برېښنالیک، تلیفون یا پته', recipient: 'ترلاسه کوونکی / اداره', date: 'نېټه', salutation: 'سلام', subject: 'موضوع', body: 'د لیک متن', closing: 'پای', preview: 'ژوندۍ مخکتنه', print: 'چاپ / PDF خوندي کول', download: 'متن ډاونلوډ', saved: 'په دې وسیله کې خوندي شو', note: 'له لېږلو مخکې ټول [په قوسونو کې معلومات] له رښتینو معلوماتو سره بدل کړئ.', reset: 'د بېلګې متن وکاروئ', resetConfirm: 'اوسنی متن د دې لیک له بېلګې سره بدل شي؟', placeholder: 'معلومات ولیکئ', letterLanguage: 'متن د ټاکل شوې وېبپاڼې په ژبه دی او هره جمله سمولای شئ.', designs: 'د وروستۍ پاڼې بڼه وټاکئ.' },
};

function freshDraft(kind: LetterKind, lang: LetterLanguage): Draft {
  const template = LETTER_TEMPLATES.find(item => item.id === kind)!;
  return {
    kind, layout: 'classic', sender: '', senderContact: '', recipient: '',
    date: '',
    salutation: lang === 'fa' ? 'با سلام،' : lang === 'ps' ? 'په درنښت،' : 'Dear [name or committee],',
    subject: template.subject[lang], body: template.body[lang],
    closing: lang === 'fa' ? 'با احترام،' : lang === 'ps' ? 'په درنښت،' : 'Sincerely,',
  };
}

function storageKey(kind: LetterKind, lang: LetterLanguage) { return `aria-letter-v1-${kind}-${lang}`; }

export function LetterBuilderClient({ lang, initialKind }: { lang: LetterLanguage; initialKind: LetterKind }) {
  const [kind, setKind] = useState<LetterKind>(initialKind);
  const [draft, setDraft] = useState<Draft>(() => freshDraft(initialKind, lang));
  const [ready, setReady] = useState(false);
  const template = LETTER_TEMPLATES.find(item => item.id === kind)!;
  const c = UI[lang];
  const rtl = lang !== 'en';

  useEffect(() => {
    const base = freshDraft(kind, lang);
    let next = base;
    try {
      const saved = localStorage.getItem(storageKey(kind, lang));
      const parsed = saved ? JSON.parse(saved) as Partial<Draft> : null;
      if (parsed && parsed.kind === kind) next = { ...base, ...parsed };
    } catch { /* Use the sample when storage is unavailable. */ }
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setDraft(next);
      setReady(true);
    });
    return () => { active = false; };
  }, [kind, lang]);

  useEffect(() => {
    if (!ready || draft.kind !== kind) return;
    try { localStorage.setItem(storageKey(kind, lang), JSON.stringify(draft)); } catch { /* Browsers may disable storage. */ }
  }, [draft, kind, lang, ready]);

  const update = (field: keyof Draft, value: string) => setDraft(current => ({ ...current, [field]: value }));
  const chooseKind = (value: LetterKind) => {
    setKind(value);
    window.history.replaceState(null, '', `/${lang}/letters?type=${value}`);
  };
  const download = () => {
    const text = [draft.sender, draft.senderContact, draft.date, draft.recipient, draft.subject, draft.salutation, draft.body, draft.closing, draft.sender].filter(Boolean).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${draft.kind}-letter.txt`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 print:max-w-none print:p-0" dir={rtl ? 'rtl' : 'ltr'} data-clarity-mask="true">
      <div className="print:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">ARIA HUB · Tools</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.title}</h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">{c.intro}</p>
        <a href="#letter-preview" className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline lg:hidden">{c.preview} ↓</a>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] print:mt-0 print:block">
        <section className="space-y-4 print:hidden" aria-label={c.title}>
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <label className="block text-sm font-semibold" htmlFor="letter-kind">{c.kind}</label>
            <select id="letter-kind" value={kind} onChange={event => chooseKind(event.target.value as LetterKind)} className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm">
              {LETTER_TEMPLATES.map(item => <option key={item.id} value={item.id}>{item.title[lang]}</option>)}
            </select>
            <p className="mt-2 text-xs text-muted-foreground">{template.description[lang]}</p>
            <h2 className="mt-4 text-sm font-semibold">{c.design}</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['classic', 'modern', 'formal'] as const).map(layout => (
                <button key={layout} type="button" onClick={() => update('layout', layout)} aria-pressed={draft.layout === layout} className={`min-h-10 rounded-lg border px-2 text-center text-xs font-medium ${draft.layout === layout ? 'border-primary bg-primary/10 ring-1 ring-ring' : ''}`}>
                  {c[layout]}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold">{c.body}</h2>
              <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => { if (window.confirm(c.resetConfirm)) setDraft(current => ({ ...current, subject: template.subject[lang], body: template.body[lang] })); }}>{c.reset}</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(['sender', 'senderContact', 'recipient', 'date', 'salutation', 'subject'] as const).map(field => (
                <label key={field} className={field === 'subject' ? 'sm:col-span-2' : ''}>
                  <span className="mb-1.5 block text-xs font-medium">{c[field]}</span>
                  <input type={field === 'date' ? 'date' : 'text'} value={draft[field]} onChange={event => update(field, event.target.value)} placeholder={c.placeholder} className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
                </label>
              ))}
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium">{c.body}</span>
                <textarea value={draft.body} onChange={event => update('body', event.target.value)} rows={7} className="w-full resize-y rounded-lg border bg-background p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring" />
              </label>
              <div className="sm:col-span-2"><WritingAssistant key={`${kind}-${lang}`} tool="letter" lang={lang} text={draft.body} documentType={template.title.en} onApply={value => update('body', value)} /></div>
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium">{c.closing}</span>
                <input value={draft.closing} onChange={event => update('closing', event.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </label>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{c.note} {c.letterLanguage}</p>
            {template.note && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">{template.note[lang]}</p>}
          </div>
        </section>

        <section id="letter-preview" className="scroll-mt-24 lg:sticky lg:top-24 print:static" aria-label={c.preview}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
            <h2 className="flex items-center gap-2 font-semibold"><FileText className="size-4" />{c.preview}</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={download} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-accent"><Download className="size-4" />{c.download}</button>
              <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Printer className="size-4" />{c.print}</button>
            </div>
          </div>
          <article className={`letter-sheet letter-layout-${draft.layout} mx-auto min-h-[560px] w-full max-w-[794px] border bg-white p-5 text-sm text-slate-900 shadow-xl sm:min-h-[720px] sm:p-12 sm:text-base print:min-h-0 print:max-w-none print:border-0 print:p-0 print:text-base print:shadow-none`} lang={lang} dir={rtl ? 'rtl' : 'ltr'}>
            <header className="letter-heading mb-10">
              {draft.sender && <p className="text-xl font-bold">{draft.sender}</p>}
              {draft.senderContact && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{draft.senderContact}</p>}
            </header>
            {draft.date && <p className="mb-6 text-sm">{draft.date}</p>}
            {draft.recipient && <p className="mb-6 whitespace-pre-line text-sm font-medium">{draft.recipient}</p>}
            {draft.subject && <h3 className="letter-subject mb-7 text-lg font-bold">{draft.subject}</h3>}
            {draft.salutation && <p className="mb-5">{draft.salutation}</p>}
            <div className="whitespace-pre-wrap break-words leading-7">{draft.body}</div>
            <footer className="mt-9 whitespace-pre-line">{draft.closing}{draft.sender ? `\n${draft.sender}` : ''}</footer>
          </article>
          <p className="mt-3 text-center text-xs text-muted-foreground print:hidden">{c.saved}</p>
        </section>
      </div>
    </div>
  );
}
