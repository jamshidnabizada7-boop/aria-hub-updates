'use client';

import { useState, type FormEvent } from 'react';
import { Send } from 'lucide-react';
import type { Lang } from '@/lib/lang-route';

const copy: Record<Lang, { title:string; description:string; email:string; subscribe:string; submitting:string; success:string; error:string }> = {
  en: { title:'Stay updated', description:'New opportunities and insights in your inbox. Newsletter updates are separate from personal matching alerts.', email:'Your email address', subscribe:'Subscribe', submitting:'Subscribing…', success:'Subscription recorded. Please follow any confirmation instructions sent to your email.', error:'Could not subscribe. Please try again.' },
  fa: { title:'باخبر بمانید', description:'فرصت‌ها و تازه‌ترین مطالب را از طریق ایمیل دریافت کنید. خبرنامه از هشدارهای شخصی جدا است.', email:'نشانی ایمیل شما', subscribe:'اشتراک', submitting:'در حال ثبت…', success:'درخواست اشتراک ثبت شد. اگر ایمیل تأیید دریافت کردید، مراحل آن را دنبال کنید.', error:'اشتراک ثبت نشد. دوباره تلاش کنید.' },
  ps: { title:'خبر اوسئ', description:'نوي فرصتونه او معلومات په خپل ایمیل کې ترلاسه کړئ. خبرپاڼه له شخصي خبرتیاوو جلا ده.', email:'ستاسو ایمیل', subscribe:'ګډون', submitting:'ثبتېږي…', success:'ستاسو د ګډون غوښتنه ثبت شوه. د تایید ایمیل لارښوونې تعقیب کړئ.', error:'ګډون ثبت نه شو. بیا هڅه وکړئ.' }
};

export function AriaNewsletter({lang}:{lang:Lang}) {
  const t = copy[lang];
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    setSuccess(false);
    try {
      const response = await fetch('/api/newsletter', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email:email.trim(), name:'' }),
      });
      if (!response.ok) throw new Error('request failed');
      setEmail('');
      setSuccess(true);
      setMessage(t.success);
    } catch {
      setMessage(t.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="aria-newsletter" aria-label={t.title}>
      <div>
        <h2>{t.title}</h2>
        <p>{t.description}</p>
      </div>
      <form onSubmit={submit} className="aria-newsletter-form">
        <label htmlFor="aria-v2-newsletter-email" className="sr-only">{t.email}</label>
        <input id="aria-v2-newsletter-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder={t.email} disabled={busy} />
        <button type="submit" className="aria-button aria-button--orange" disabled={busy}><Send size={14} aria-hidden="true"/>{busy?t.submitting:t.subscribe}</button>
      </form>
      {message && <p role="status" className={'aria-newsletter-status' + (success ? ' aria-newsletter-status--success' : '')}>{message}</p>}
    </section>
  );
}
