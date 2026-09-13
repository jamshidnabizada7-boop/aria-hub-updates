'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, MessageCircle, Phone, Mail, Facebook, Instagram, Send, Linkedin, Youtube } from 'lucide-react';
import type { SocialLink, SiteSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

export function FloatingSocial({ socials, settings }: { socials: SocialLink[]; settings: SiteSettings | null }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const position = settings?.socialPosition === 'left' ? 'left' : 'right';
  const hideOnScroll = settings?.socialHideOnScroll ?? false;

  useEffect(() => {
    if (!hideOnScroll) return;
    const onScroll = () => setHidden(settings?.socialHideOnScroll ? window.scrollY > 600 : false);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hideOnScroll]);

  if (!socials.length) return null;
  const [primary, ...rest] = socials;

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className={cn(
            'fixed bottom-5 z-50 flex flex-col items-center gap-3 print:hidden',
            position === 'left' ? 'left-5' : 'right-5'
          )}
        >
          <AnimatePresence>
            {open && (
              <>
                {rest.map((s, i) => (
                  <motion.a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0, y: 10 }}
                    transition={{ delay: i * 0.05 }}
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
            href={primary.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="group relative grid h-14 w-14 place-items-center rounded-full text-white shadow-float"
            style={{ backgroundColor: primary.color || 'var(--primary)' }}
          >
            <span className="absolute inset-0 rounded-full" style={{ backgroundColor: primary.color || 'var(--primary)', animation: 'pulse-ring 2s ease-out infinite' }} />
            <SocialIcon platform={primary.platform} className="relative h-6 w-6" />
            <Tooltip label={primary.label || ''} position={position} />
          </motion.a>

          {/* Toggle button */}
          {rest.length > 0 && (
            <motion.button
              onClick={() => setOpen(!open)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground shadow-float backdrop-blur-sm"
              aria-label="Toggle social links"
            >
              {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
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
    default: return <Send className={className} />;
  }
}

