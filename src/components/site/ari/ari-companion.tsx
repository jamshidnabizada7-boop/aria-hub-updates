'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, EyeOff, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ARI_COPY, ARI_HIDDEN_KEY, ariContext, ariCanFloat, ariLinks } from '@/lib/ari';
import type { Lang } from '@/lib/lang-route';
import type { SocialLink, SiteSettings } from '@/lib/types';
import { FloatingSocial } from '../floating-social';
import { AriAvatar } from './ari-avatar';

function subscribeHidden(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener('ari-preference', listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener('ari-preference', listener); };
}
function hiddenSnapshot() { try { return localStorage.getItem(ARI_HIDDEN_KEY) === '1'; } catch { return false; } }

export function AriCompanion({ lang, socials, position = 'right', hideOnScroll = false }: { lang: Lang; socials: SocialLink[]; position?: string; hideOnScroll?: boolean }) {
  const path = usePathname();
  const context = ariContext(path);
  const hidden = useSyncExternalStore(subscribeHidden, hiddenSnapshot, () => true);
  const [sessionHidden, setSessionHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [obstructed, setObstructed] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const c = ARI_COPY[lang];

  // Coordinate with existing overlays instead of accumulating independent fixed stacks.
  useEffect(() => {
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const overlays = document.querySelectorAll<HTMLElement>('[aria-modal="true"], [role="dialog"][data-state="open"], [data-ari-obstruction]');
        const covered = Array.from(overlays).some(el => el.id !== 'ari-guide-panel' && el.getClientRects().length > 0);
        const keyboard = window.visualViewport ? window.innerHeight - window.visualViewport.height > 150 : false;
        setObstructed(covered || keyboard || (hideOnScroll && window.scrollY > 600));
      });
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'aria-modal', 'hidden', 'style', 'class'] });
    window.visualViewport?.addEventListener('resize', check);
    window.addEventListener('scroll', check, { passive: true });
    check();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.visualViewport?.removeEventListener('resize', check); window.removeEventListener('scroll', check); };
  }, [hideOnScroll]);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(false));
    return () => cancelAnimationFrame(id);
  }, [path]);
  useEffect(() => {
    if (!greeting) return;
    const id = setTimeout(() => setGreeting(false), 900);
    return () => clearTimeout(id);
  }, [greeting]);

  if (!ariCanFloat(context)) return null;
  const settings = { socialPosition: position, socialHideOnScroll: false } as SiteSettings;
  function hide() {
    try { localStorage.setItem(ARI_HIDDEN_KEY, '1'); } catch { /* Session still collapses when storage is unavailable. */ }
    window.dispatchEvent(new Event('ari-preference'));
    setSessionHidden(true);
    setOpen(false);
  }
  return <div data-ari-dock dir={lang === 'en' ? 'ltr' : 'rtl'} hidden={obstructed} className="ari-dock fixed z-40 flex items-end gap-3 print:hidden" style={{ [position === 'left' ? 'left' : 'right']: 'max(1rem, env(safe-area-inset-left))', bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
    {!hidden && !sessionHidden ? <Popover open={open && !obstructed} onOpenChange={value => { setOpen(value); if (value) setGreeting(true); }}>
      <PopoverTrigger asChild><button ref={launcher} type="button" aria-label={c.open} className="ari-launcher grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-card/95 shadow-float transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring" data-greeting={greeting}>
        <AriAvatar variant="classic" size={60} animated={!open} />
      </button></PopoverTrigger>
      <PopoverContent id="ari-guide-panel" role="dialog" aria-label={c.guide} align={position === 'left' ? 'start' : 'end'} side="top" sideOffset={12} collisionPadding={12} onCloseAutoFocus={() => launcher.current?.focus()} className="ari-panel w-[min(360px,calc(100vw-24px))] rounded-2xl p-4" dir={lang === 'en' ? 'ltr' : 'rtl'}>
        <div className="flex items-start gap-3"><AriAvatar variant="waving" size={56} /><div className="flex-1"><h2 className="font-bold">{c.name} · {c.guide}</h2><p className="mt-1 text-sm text-muted-foreground">{context ? c.contexts[context] : c.intro}</p></div><button type="button" aria-label={c.close} onClick={() => setOpen(false)} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg hover:bg-accent"><X size={18} /></button></div>
        <nav aria-label={c.guide} className="mt-4 grid gap-1.5">{ariLinks(lang).map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring">{link.label}<ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" /></Link>)}</nav>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{c.privacy}</p>
        <button type="button" onClick={hide} className="mt-2 flex min-h-11 items-center gap-2 text-xs text-muted-foreground underline underline-offset-4"><EyeOff size={14} aria-hidden="true" />{c.hide}</button>
      </PopoverContent>
    </Popover> : null}
    <FloatingSocial socials={socials} settings={settings} embedded forceClosed={open} onExpand={() => setOpen(false)} />
  </div>;
}

export function AriRestore({ lang }: { lang: Lang }) {
  const hidden = useSyncExternalStore(subscribeHidden, hiddenSnapshot, () => false);
  if (!hidden) return null;
  return <button type="button" className="min-h-11 px-2 text-xs text-muted-foreground underline print:hidden" onClick={() => { try { localStorage.removeItem(ARI_HIDDEN_KEY); } catch {} window.dispatchEvent(new Event('ari-preference')); }}>{ARI_COPY[lang].restore}</button>;
}
