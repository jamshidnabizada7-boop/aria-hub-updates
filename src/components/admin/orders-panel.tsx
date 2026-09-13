'use client';

/**
 * OrdersPanel — admin monetization pipeline (advertise-page requests).
 *
 * Flow: requested → payment_claimed → paid → active → delivered (| declined).
 * Marking paid/active with an attached listing AUTO-FEATURES that listing
 * (the API handles it); delivered/declined clears the feature flag.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  BadgeDollarSign, CheckCircle2, ChevronDown, Copy, ExternalLink,
  Inbox, Loader2, Mail, Phone, RefreshCw, ThumbsDown, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/hooks/use-t';
import { cn } from '@/lib/utils';
import { PRODUCT_CATALOG, type ProductKey } from '@/lib/monetization';

interface OrderRow {
  id: string;
  referenceCode: string;
  product: string;
  status: string;
  amountUsd: number;
  amountAfn: number;
  buyerName: string;
  buyerOrg: string | null;
  buyerEmail: string;
  buyerPhone: string | null;
  buyerLang: string;
  message: string | null;
  opportunityId: string | null;
  opportunity: { id: string; title: string; slug: string; featured: boolean } | null;
  paymentMethod: string | null;
  paymentRef: string | null;
  paidAt: string | null;
  verifiedAt: string | null;
  featuredUntil: string | null;
  adminNote: string | null;
  createdAt: string;
}

const STATUSES = ['all', 'requested', 'payment_claimed', 'paid', 'active', 'delivered', 'declined'] as const;
type StatusFilter = (typeof STATUSES)[number];

const STATUS_STYLES: Record<string, string> = {
  requested: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
  payment_claimed: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  paid: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  delivered: 'bg-muted text-muted-foreground border-border',
  declined: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
};

const NEXT_ACTIONS: Record<string, { to: string; labelKey: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  requested: [
    { to: 'payment_claimed', labelKey: 'admin.orders.claim', icon: Wallet },
    { to: 'declined', labelKey: 'admin.orders.decline', icon: ThumbsDown },
  ],
  payment_claimed: [
    { to: 'paid', labelKey: 'admin.orders.verify', icon: CheckCircle2 },
    { to: 'declined', labelKey: 'admin.orders.decline', icon: ThumbsDown },
  ],
  paid: [{ to: 'active', labelKey: 'admin.orders.activate', icon: BadgeDollarSign }],
  active: [{ to: 'delivered', labelKey: 'admin.orders.deliver', icon: CheckCircle2 }],
  delivered: [{ to: 'requested', labelKey: 'admin.orders.reopen', icon: RefreshCw }],
  declined: [{ to: 'requested', labelKey: 'admin.orders.reopen', icon: RefreshCw }],
};

export function OrdersPanel() {
  const { toast } = useToast();
  const t = useT();

  const [items, setItems] = useState<OrderRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [revenue, setRevenue] = useState({ usd: 0, afn: 0, orders: 0 });
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [refDraft, setRefDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  const fetchItems = useCallback(async (status: StatusFilter) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders?status=${status}`, { cache: 'no-store' });
      const data = await res.json();
      setItems(data.items || []);
      setCounts(data.counts || {});
      if (data.revenue) setRevenue(data.revenue);
    } catch {
      // network error — keep previous list
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(filter);
  }, [filter, fetchItems]);

  function openDetail(o: OrderRow) {
    setExpanded(expanded === o.id ? null : o.id);
    setRefDraft(o.paymentRef || '');
    setNoteDraft(o.adminNote || '');
  }

  async function patch(id: string, body: Record<string, unknown>, successKey = 'admin.orders.saved') {
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({ title: 'Error', description: data.error || 'Action failed', variant: 'destructive' });
        return;
      }
      toast({ title: t(successKey) });
      fetchItems(filter);
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* summary strip */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{t('admin.orders.totals')}</p>
              <p className="truncate text-lg font-black">
                ${revenue.usd.toLocaleString('en-US')}
                <span className="ms-1 text-xs font-semibold text-muted-foreground">
                  · {revenue.afn.toLocaleString('en-US')} AFN · {revenue.orders} {t('admin.orders.filter.delivered')}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Inbox className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{t('admin.orders.pipeline')}</p>
              <p className="truncate text-lg font-black">
                {(counts.requested || 0) + (counts.payment_claimed || 0)}
                <span className="ms-1 text-xs font-semibold text-muted-foreground">
                  · {t('admin.orders.filter.requested')} {counts.requested || 0} / {t('admin.orders.filter.payment_claimed')} {counts.payment_claimed || 0}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* status filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors',
              filter === s
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            {s === 'all' ? t('admin.orders.filter.all') : t(`admin.orders.filter.${s}`)}
            {s !== 'all' && counts[s] ? (
              <span className={cn('rounded-full px-1.5 text-[10px]', filter === s ? 'bg-primary-foreground/20' : 'bg-muted')}>
                {counts[s]}
              </span>
            ) : null}
          </button>
        ))}
        <Button variant="ghost" size="icon" className="ms-auto h-9 w-9" aria-label="Refresh" onClick={() => fetchItems(filter)}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
        </Button>
      </div>

      {/* list */}
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          {t('admin.orders.empty')}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((o) => {
            const isOpen = expanded === o.id;
            const def = PRODUCT_CATALOG[o.product as ProductKey];
            return (
              <Card key={o.id} className={cn('overflow-hidden', isOpen && 'border-primary/40')}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-3 p-4 text-start sm:flex-row sm:items-center"
                  onClick={() => openDetail(o)}
                  aria-expanded={isOpen}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <code dir="ltr" className="shrink-0 rounded bg-muted px-2 py-1 font-mono text-xs font-bold tracking-wider">
                      {o.referenceCode}
                    </code>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {t(`advertise.products.${o.product}.name`)}
                        {o.opportunity ? (
                          <span className="ms-2 inline-flex items-center gap-1 text-xs font-medium text-chart-2">
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            {o.opportunity.title.slice(0, 40)}
                            {o.opportunity.featured ? ' ★' : ''}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {o.buyerName}{o.buyerOrg ? ` · ${o.buyerOrg}` : ''} · {o.buyerEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <span className="text-sm font-black text-primary" dir="ltr">
                      ${o.amountUsd}
                    </span>
                    <Badge variant="outline" className={cn('text-[11px]', STATUS_STYLES[o.status])}>
                      {t(`admin.orders.status.${o.status}`)}
                    </Badge>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} aria-hidden="true" />
                  </div>
                </button>

                {isOpen ? (
                  <div className="border-t bg-muted/30 p-4">
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{t('admin.orders.product')}</p>
                        <p className="mt-0.5 font-semibold">
                          {t(`advertise.products.${o.product}.name`)}
                          {def ? ` · ${def.days}d${def.telegram ? ' · TG' : ''}` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{t('admin.orders.amount')}</p>
                        <p className="mt-0.5 font-semibold" dir="ltr">
                          ${o.amountUsd} · {o.amountAfn.toLocaleString('en-US')} AFN
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{t('admin.orders.buyer')}</p>
                        <p className="mt-0.5 font-semibold">
                          {o.buyerName}
                          {o.buyerOrg ? ` — ${o.buyerOrg}` : ''}
                          <span className="ms-1 text-[10px] font-bold uppercase text-muted-foreground">{o.buyerLang}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">{t('admin.orders.created')}</p>
                        <p className="mt-0.5 font-semibold" dir="ltr">
                          {new Date(o.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                      <div>
                        <Label htmlFor={`ref-${o.id}`} className="text-xs font-medium text-muted-foreground">
                          {t('admin.orders.paymentRef')}
                        </Label>
                        <Input
                          id={`ref-${o.id}`}
                          value={refDraft}
                          onChange={(e) => setRefDraft(e.target.value)}
                          placeholder={t('admin.orders.paymentRefPlaceholder')}
                          className="mt-1 h-9"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`note-${o.id}`} className="text-xs font-medium text-muted-foreground">
                          {t('admin.orders.adminNote')}
                        </Label>
                        <Textarea
                          id={`note-${o.id}`}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          rows={2}
                          className="mt-1"
                          dir="auto"
                        />
                      </div>
                      {o.message ? (
                        <div className="sm:col-span-2">
                          <p className="text-xs font-medium text-muted-foreground">{t('admin.orders.message')}</p>
                          <p className="mt-1 whitespace-pre-wrap rounded-lg border bg-background p-3 text-xs leading-relaxed" dir="auto">
                            {o.message}
                          </p>
                        </div>
                      ) : null}
                      {o.opportunity ? (
                        <div className="sm:col-span-2">
                          <p className="text-xs font-medium text-muted-foreground">{t('admin.orders.attachOpp')}</p>
                          <p className="mt-0.5 flex items-center gap-2 text-xs">
                            <ExternalLink className="h-3.5 w-3.5 text-chart-2" aria-hidden="true" />
                            <a href={`/en/opportunities/${o.opportunity.slug}`} target="_blank" rel="noreferrer" className="truncate underline-offset-2 hover:underline">
                              {o.opportunity.title}
                            </a>
                            {o.featuredUntil ? (
                              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400" dir="ltr">
                                ★ {t('admin.orders.featuredUntil')} {new Date(o.featuredUntil).toLocaleDateString('en-GB')}
                              </span>
                            ) : null}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(NEXT_ACTIONS[o.status] || []).map((a) => (
                        <Button
                          key={a.to}
                          type="button"
                          size="sm"
                          variant={a.to === 'declined' ? 'outline' : 'default'}
                          className={cn('h-10', a.to === 'declined' && 'border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400')}
                          disabled={busyId === o.id}
                          onClick={() => patch(o.id, { status: a.to, paymentRef: refDraft || o.paymentRef, adminNote: noteDraft || o.adminNote })}
                        >
                          {busyId === o.id ? (
                            <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <a.icon className="me-2 h-4 w-4" aria-hidden="true" />
                          )}
                          {t(a.labelKey)}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-10"
                        disabled={busyId === o.id}
                        onClick={() => patch(o.id, { paymentRef: refDraft, adminNote: noteDraft })}
                      >
                        {t('admin.orders.save')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-10"
                        asChild
                      >
                        <a href={`mailto:${o.buyerEmail}?subject=${encodeURIComponent(`ARIA HUB — ${o.referenceCode}`)}`}>
                          <Mail className="me-2 h-4 w-4" aria-hidden="true" />
                          {t('admin.orders.contact')}
                        </a>
                      </Button>
                      {o.buyerPhone ? (
                        <Button type="button" size="sm" variant="ghost" className="h-10" asChild>
                          <a href={`https://wa.me/${o.buyerPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                            <Phone className="me-2 h-4 w-4" aria-hidden="true" />
                            WhatsApp
                          </a>
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-10"
                        onClick={() => {
                          navigator.clipboard?.writeText(o.referenceCode);
                          toast({ title: o.referenceCode });
                        }}
                      >
                        <Copy className="me-2 h-4 w-4" aria-hidden="true" />
                        {o.referenceCode}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
