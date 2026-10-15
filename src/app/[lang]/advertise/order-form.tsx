'use client';

/**
 * Advertise order form — creates a MonetizationOrder via
 * POST /api/monetization/orders and shows the buyer a phone-readable
 * reference code + amount. Payment itself happens offline (hawala/wallet/
 * bank/cash for locals, Payoneer/Wise for internationals) — the receipt is
 * then claimed via the contact channels.
 */

import { useMemo, useState } from 'react';
import { BadgeCheck, Building2, Copy, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/hooks/use-t';
import {
  PRODUCT_CATALOG, PRODUCT_KEYS, PAYMENT_RAILS,
  type ProductKey,
} from '@/lib/monetization';
import { toEasternDigits } from '@/lib/date-format';
import type { Lang } from '@/lib/lang-route';

interface SuccessInfo {
  referenceCode: string;
  amountUsd: number;
  amountAfn: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AdvertiseOrderForm({ lang }: { lang: Lang }) {
  const t = useT();
  const { toast } = useToast();

  const [buyerName, setBuyerName] = useState('');
  const [buyerOrg, setBuyerOrg] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [product, setProduct] = useState<ProductKey | ''>('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [oppRef, setOppRef] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<SuccessInfo | null>(null);
  const [error, setError] = useState('');

  const needsOpp = product === 'featured_7d';
  const quoted = useMemo(() => (product ? PRODUCT_CATALOG[product] : null), [product]);

  const fmtAfn = (n: number) =>
    lang === 'en' ? n.toLocaleString('en-US') : toEasternDigits(n.toLocaleString('en-US'), lang);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!buyerName.trim() || !buyerEmail.trim() || !product) {
      setError(t('advertise.form.errRequired'));
      return;
    }
    if (!EMAIL_RE.test(buyerEmail.trim())) {
      setError(t('advertise.form.errEmail'));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/monetization/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName,
          buyerOrg,
          buyerEmail,
          buyerPhone,
          buyerLang: lang,
          product,
          paymentMethod: paymentMethod || undefined,
          message: [oppRef ? `Listing: ${oppRef}` : '', message].filter(Boolean).join('\n'),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'failed');
      }
      setDone(data.order);
      toast({ title: t('advertise.success.title') });
    } catch {
      setError(t('advertise.form.errRequired'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <BadgeCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <h3 className="text-lg font-bold sm:text-xl">{t('advertise.success.title')}</h3>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t('advertise.success.body')}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs font-medium text-muted-foreground">{t('advertise.success.ref')}</p>
            <div className="mt-1 flex items-center gap-2">
              <code dir="ltr" className="rounded bg-muted px-2 py-1 font-mono text-sm font-bold tracking-wider">
                {done.referenceCode}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Copy reference code"
                onClick={() => {
                  navigator.clipboard?.writeText(done.referenceCode);
                  toast({ title: done.referenceCode });
                }}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="text-xs font-medium text-muted-foreground">{t('advertise.success.amount')}</p>
            <p className="mt-1 text-sm font-bold">
              {done.amountUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD
              <span className="mx-1 text-muted-foreground">·</span>
              <span dir={lang === 'en' ? 'ltr' : 'rtl'}>
                {fmtAfn(done.amountAfn)} AFN
              </span>
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" size="sm" className="h-10">
            <a href={`mailto:info@myariahub.com?subject=${encodeURIComponent(`Payment receipt — ${done.referenceCode}`)}`}>
              <Send className="me-2 h-4 w-4 rtl-flip" aria-hidden="true" />
              info@myariahub.com
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10"
            onClick={() => {
              setDone(null);
              setProduct('');
              setMessage('');
              setOppRef('');
            }}
          >
            {t('advertise.success.newOrder')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ad-name">{t('advertise.form.name')}</Label>
          <Input
            id="ad-name"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            autoComplete="name"
            className="h-11"
            dir="auto"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ad-org">{t('advertise.form.org')}</Label>
          <Input
            id="ad-org"
            value={buyerOrg}
            onChange={(e) => setBuyerOrg(e.target.value)}
            autoComplete="organization"
            className="h-11"
            dir="auto"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ad-email">{t('advertise.form.email')}</Label>
          <Input
            id="ad-email"
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            autoComplete="email"
            className="h-11"
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ad-phone">{t('advertise.form.phone')}</Label>
          <Input
            id="ad-phone"
            type="tel"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            autoComplete="tel"
            className="h-11"
            dir="ltr"
            placeholder="+93 7XX XXX XXX"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ad-product">{t('advertise.form.product')}</Label>
          <Select value={product} onValueChange={(v) => setProduct(v as ProductKey)}>
            <SelectTrigger id="ad-product" className="h-11 w-full">
              <SelectValue placeholder={t('advertise.form.productPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_KEYS.map((k) => (
                <SelectItem key={k} value={k}>
                  {t(`advertise.products.${k}.name`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ad-pay">{t('admin.orders.paymentMethod')}</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger id="ad-pay" className="h-11 w-full">
              <SelectValue placeholder={t('advertise.form.productPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_RAILS.map((k) => (
                <SelectItem key={k} value={k}>
                  {t(`advertise.pay.${k}.name`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {needsOpp ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ad-opp">{t('advertise.form.opp')}</Label>
            <Input
              id="ad-opp"
              value={oppRef}
              onChange={(e) => setOppRef(e.target.value)}
              className="h-11"
              dir="auto"
              placeholder="https://www.myariahub.com/…"
            />
            <p className="text-xs text-muted-foreground">{t('advertise.form.oppHint')}</p>
          </div>
        ) : null}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="ad-msg">{t('advertise.form.message')}</Label>
          <Textarea
            id="ad-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            dir="auto"
          />
        </div>
      </div>

      {quoted ? (
        <div className="mt-5 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/[0.06] px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
            {t(`advertise.products.${product}.name`)}
          </div>
          <div className="text-sm font-bold text-primary" dir={lang === 'en' ? 'ltr' : 'rtl'}>
            {quoted.usd} USD · <span>{fmtAfn(quoted.afn)}</span> AFN
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={busy}
        className="mt-6 h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-float hover:bg-primary/90 sm:w-auto sm:px-10"
      >
        {busy ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
            {t('advertise.form.submitting')}
          </>
        ) : (
          t('advertise.form.submit')
        )}
      </Button>
    </form>
  );
}
