'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, X, MessageCircle, Phone, Mail, Facebook, Instagram, Send, Linkedin, Youtube } from 'lucide-react';
import type { SocialLink, SiteSettings } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ARI_ENABLED } from '@/lib/ari';
import { useEffectiveLang } from './lang-context';
import { isLang } from '@/lib/lang-route';

export function FloatingSocial({ socials, settings, embedded = false, forceClosed = false, onExpand }: { socials: SocialLink[]; settings: SiteSettings | null; embedded?: boolean; forceClosed?: boolean; onExpand?: () => void }) {
  const language = useEffectiveLang();
  const lang = isLang(language) ? language : 'en';
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const position = settings?.socialPosition === 'left' ? 'left' : 'right';
  const hideOnScroll = settings?.socialHideOnScroll ?? false;

  useEffect(() => {
    if (!forceClosed) return;
    const frame = requestAnimationFrame(() => setOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [forceClosed]);

  useEffect(() => {
    if (!hideOnScroll) return;
    const onScroll = () => setHidden(settings?.socialHideOnScroll ? window.scrollY > 600 : false);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hideOnScroll]);

  if (!socials.length || (ARI_ENABLED && !embedded)) return null;
  const [primary, ...rest] = socials;

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className={cn(
            embedded ? 'relative flex flex-col items-center gap-3 print:hidden' : 'fixed bottom-5 z-50 flex flex-col items-center gap-3 print:hidden',
            !embedded && (position === 'left' ? 'left-5' : 'right-5')
          )}
        >
          <AnimatePresence>
            {open && !forceClosed && (
              <>
                {rest.map((s, i) => (
                  <motion.a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={reducedMotion ? false : { opacity: 0, scale: 0, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0, y: 10 }}
                    transition={{ delay: reducedMotion ? 0 : i * 0.05, duration: reducedMotion ? 0 : .2 }}
                    aria-label={s.label || s.platform}
                    className="group relative grid h-12 w-12 place-items-center rounded-full text-white shadow-float transition-transform hover:scale-110"
                    style={{ backgroundColor: s.color || 'var(--primary)' }}
                  >
                    <SocialIcon platform={s.platform} />
                    <Tooltip label={s.label || ''} position={position} />
                  </motion.a>
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Primary (WhatsApp) - always visible */}
          <motion.a
            aria-label={primary.label || primary.platform}
            href={primary.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="group relative grid h-14 w-14 place-items-center rounded-full text-white shadow-float"
            style={{ backgroundColor: primary.color || 'var(--primary)' }}
          >
            <span className="absolute inset-0 rounded-full" style={{ backgroundColor: primary.color || 'var(--primary)', animation: reducedMotion ? 'none' : 'pulse-ring 2s ease-out infinite' }} />
            <SocialIcon platform={primary.platform} className="relative h-6 w-6" />
            <Tooltip label={primary.label || ''} position={position} />
          </motion.a>

          {/* Toggle button */}
          {rest.length > 0 && (
            <motion.button
              onClick={() => { if (!open || forceClosed) onExpand?.(); setOpen(!open || forceClosed); }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-float backdrop-blur-sm"
              aria-label={lang === 'fa' ? 'نمایش پیوندهای اجتماعی' : lang === 'ps' ? 'ټولنیزې اړیکې ښکاره کړئ' : 'Toggle social links'} aria-expanded={open && !forceClosed}
            >
              {open && !forceClosed ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Tooltip({ label, position }: { label: string; position: string }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-premium transition-all duration-200 group-hover:opacity-100',
        position === 'left' ? 'left-full ms-2' : 'right-full me-2'
      )}
    >
      {label}
    </span>
  );
}

function SocialIcon({ platform, className = 'h-5 w-5' }: { platform: string; className?: string }) {
  switch (platform) {
    case 'whatsapp': return <MessageCircle className={className} />;
    case 'phone': return <Phone className={className} />;
    case 'email': return <Mail className={className} />;
    case 'facebook': return <Facebook className={className} />;
    case 'instagram': return <Instagram className={className} />;
    case 'telegram': return <Send className={className} />;
    case 'linkedin': return <Linkedin className={className} />;
    case 'youtube': return <Youtube className={className} />;
    case 'x':
    case 'twitter':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    default: return <Send className={className} />;
  }
}
