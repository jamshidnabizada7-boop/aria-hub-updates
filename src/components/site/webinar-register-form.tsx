'use client';

import React, { useState } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/use-t';

/**
 * Webinar registration form — joins the existing newsletter subscriber list
 * (POST /api/newsletter), which is the consented follow-up channel for the
 * webinar invitation, joining link and reminder.
 */
export function WebinarRegisterForm() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      setEmail('');
      setName('');
    } catch {
      // keep the form visible so the visitor can retry
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-4 text-foreground" dir="auto">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
        <span>{t('newsletter.success')}</span>
      </div>
    );
  }

  return (
    <form onSubmit={register} className="flex flex-col gap-3 sm:flex-row" dir="auto">
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('footer.nameOptional')}
        maxLength={100}
        className="sm:max-w-[220px]"
      />
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('placeholder.enterEmail')}
        maxLength={200}
        className="flex-1"
      />
      <Button type="submit" disabled={loading} className="shrink-0">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        <span>{t('newsletter.title')}</span>
      </Button>
    </form>
  );
}
