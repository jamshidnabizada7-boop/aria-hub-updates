'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, CreditCard, QrCode } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '../section-heading';
import { useT } from '@/hooks/use-t';
import type { PaymentMethod } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function PaymentsSection({ methods }: { methods: PaymentMethod[] }) {
  const t = useT();
  return (
    <section id="payments" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-accent/30 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('payments.eyebrow')}
          title={t('payments.title')}
          subtitle={t('payments.subtitle')}
        />
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px' }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            >
              <PaymentCard method={m} t={t} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PaymentCard({ method, t }: { method: PaymentMethod; t: (k: string) => string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast({ title: t('payments.copied') });
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: t('contact.error'), variant: 'destructive' });
    }
  };

  return (
    <Card className="group relative overflow-hidden border-border/60 p-6 shadow-premium transition-all duration-500 hover:-translate-y-1 hover:shadow-float">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground shadow-float">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold">{method.name}</h3>
            {method.accountTitle && <p className="text-xs text-muted-foreground">{method.accountTitle}</p>}
          </div>
        </div>
        {method.qrCode && (
          method.qrCode.startsWith('/') || method.qrCode.startsWith('http') ? (
            <img src={method.qrCode} alt="QR code" className="h-16 w-16 rounded-lg border border-border bg-background object-contain p-1" />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-background">
              <QrCode className="h-5 w-5 text-muted-foreground" />
            </div>
          )
        )}
      </div>

      {method.description && <p className="mb-4 text-sm text-muted-foreground">{method.description}</p>}

      <div className="space-y-2.5">
        {method.accountNumber && (
          <CopyRow label={t('payments.account')} value={method.accountNumber} onCopy={() => copy(method.accountNumber!, 'acc')} copied={copied === 'acc'} />
        )}
        {method.iban && (
          <CopyRow label={t('payments.iban')} value={method.iban} onCopy={() => copy(method.iban!, 'iban')} copied={copied === 'iban'} mono />
        )}
      </div>

      {method.instructions && (
        <div className="mt-4 rounded-xl bg-accent/50 p-3">
          <p className="text-xs font-semibold text-muted-foreground">{t('payments.instructions')}</p>
          <p className="mt-1 text-xs leading-relaxed">{method.instructions}</p>
        </div>
      )}
    </Card>
  );
}

function CopyRow({ label, value, onCopy, copied, mono }: { label: string; value: string; onCopy: () => void; copied: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn('truncate text-sm font-medium', mono && 'font-mono')}>{value}</p>
      </div>
      <button
        onClick={onCopy}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
        aria-label="Copy"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
