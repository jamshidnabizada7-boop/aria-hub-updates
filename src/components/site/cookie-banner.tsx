'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/use-t';

const KEY = 'aria-cookie-consent';

export function CookieBanner() {
  const [show, setShow] = useState(false);
  const t = useT();

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) {
        const id = setTimeout(() => setShow(true), 1800);
        return () => clearTimeout(id);
      }
    } catch {}
  }, []);

  const dismiss = (value: string) => {
    try { localStorage.setItem(KEY, value); } catch {}
    window.dispatchEvent(new Event('aria-cookie-consent'));
    if (value !== 'all') void fetch('/api/discovery/track', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({kind:'revoke',consent:true}) }).catch(()=>{});
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl print:hidden"
        >
          <div className="glass-card flex flex-col items-start gap-4 rounded-2xl border border-border/60 p-5 shadow-premium sm:flex-row sm:items-center">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t('cookie.title')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('cookie.desc')}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => dismiss('essential')}>
                {t('cookie.essentialOnly')}
              </Button>
              <Button size="sm" className="rounded-lg bg-gradient-to-r from-primary to-chart-2 text-xs" onClick={() => dismiss('all')}>
                <ShieldCheck className="me-1.5 h-3.5 w-3.5" /> {t('cookie.acceptAll')}
              </Button>
              <button onClick={() => dismiss('closed')} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent" aria-label={t('cookie.dismiss')}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
