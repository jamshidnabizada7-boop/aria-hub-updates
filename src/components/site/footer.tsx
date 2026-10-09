'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MapPin, Phone, Mail, Loader2, Shield, Award, Globe2, MessageCircle, Facebook, Instagram, Linkedin, Youtube, CheckCircle2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/use-t';
import { useToast } from '@/hooks/use-toast';
import { useLangStore } from '@/lib/lang-store';
import { useLangHref } from '@/hooks/use-lang-href';
import { resolveAnchorUrl } from '@/lib/anchor-routes';
import { getLocalizedContent } from '@/lib/i18n-content';
import type { SiteSettings, SocialLink, FooterLink } from '@/lib/types';
import { Confetti } from './confetti';

export function Footer({
  settings,
  footer,
  socialLinks,
}: {
  settings: SiteSettings | null;
  footer: Record<string, FooterLink[]>;
  socialLinks: SocialLink[];
}) {
  const t = useT();
  const lang = useLangStore((s) => s.code);
  const hrefFn = useLangHref();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  async function subscribe(e: React.FormEvent) {
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
      toast({ title: t('newsletter.success') });
      setEmail('');
      setName('');
      setTimeout(() => setDone(false), 4000);
    } catch {
      toast({ title: t('footer.subscriptionFailed'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  const cols = [
    { key: 'quickLinks', label: t('footer.quickLinks') },
    { key: 'services', label: t('footer.services') },
    { key: 'opportunities', label: t('footer.opportunities') },
  ].filter((c) => footer[c.key]?.length);

  return (
    <footer className="mt-auto relative overflow-hidden border-t border-border/60 bg-card/40 print:hidden">
      <div className="absolute inset-0 -z-10 bg-grid opacity-[0.03]" />
      <div className="absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      {/* Newsletter band */}
      <div className="border-b border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:px-8">
          <div className="text-center lg:text-left">
            <h3 className="flex items-center gap-2 text-2xl font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('newsletter.title')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('newsletter.subtitle')}</p>
          </div>
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="relative flex items-center gap-3 overflow-visible rounded-xl border border-chart-3/40 bg-chart-3/10 px-5 py-4 text-chart-3"
                >
                  <Confetti active={done} />
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.1 }}
                  >
                    <CheckCircle2 className="h-6 w-6" />
                  </motion.div>
                  <div>
                    <p className="font-semibold">{t('newsletter.success')}</p>
                    <p className="text-xs text-muted-foreground">{t('footer.welcome')}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={subscribe}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('footer.nameOptional')}
                    aria-label={t('footer.nameOptional')}
                    className="h-12 rounded-xl sm:w-40"
                  />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('newsletter.placeholder')}
                    aria-label={t('newsletter.placeholder')}
                    className="h-12 rounded-xl"
                  />
                  <Button type="submit" disabled={loading} aria-label={t('newsletter.subscribe')} className="h-12 shrink-0 rounded-xl bg-gradient-to-r from-primary to-chart-2 px-5 shadow-float">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl-flip" />}
                    <span className="ms-2 hidden sm:inline">{t('newsletter.subscribe')}</span>
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-6">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href={hrefFn('/')} className="flex min-h-11 items-center gap-2.5" aria-label={settings?.siteName || 'ARIA HUB'}>
              {settings?.logoUrl ? (
                <Image src={settings.logoUrl} alt={settings.siteName} width={36} height={36} className="h-9 w-9 rounded-xl object-cover" unoptimized={settings.logoUrl.startsWith('http') && !settings.logoUrl.startsWith('https://www.myariahub.com')} />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-2 text-sm font-black text-primary-foreground">A</div>
              )}
              <span className="text-lg font-bold">
                {settings?.siteName?.split(' ')[0] || 'ARIA'}
                <span className="text-gradient-static"> {(settings?.siteName?.split(' ')[1]) || 'HUB'}</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {getLocalizedContent(settings?.description, settings?.descriptionI18n, lang) || t('footer.aboutDesc')}
            </p>
            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
              {settings?.address && (
                <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span dir="auto">{getLocalizedContent(settings.address, settings.addressI18n, lang)}</span></p>
              )}
              {settings?.phone && (
                <a href={`tel:${settings.phone}`} className="flex items-center gap-2 py-1 transition-colors hover:text-foreground"><Phone className="h-4 w-4 shrink-0 text-primary" /> <span dir="auto">{settings.phone}</span></a>
              )}
              {settings?.email && (
                <a href={`mailto:${settings.email}`} className="flex items-center gap-2 py-1 transition-colors hover:text-foreground"><Mail className="h-4 w-4 shrink-0 text-primary" /> <span dir="auto">{settings.email}</span></a>
              )}
            </div>
          </div>

          {/* Link columns */}
          {cols.map((c) => (
            <div key={c.key}>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-wider">{c.label}</h4>
              <ul className="space-y-2.5">
                {footer[c.key]?.map((link) => (
                  <li key={link.id}>
                    <a href={hrefFn(resolveAnchorUrl(link.url, link.label))} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                      {getLocalizedContent(link.label, link.labelI18n, lang)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Social + certificates */}
          <div className="col-span-2 md:col-span-2 lg:col-span-2">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wider">{t('footer.followUs')}</h4>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const list = [...(socialLinks || [])];
                const hasP = (p: string) => list.some((l) => l.platform?.toLowerCase() === p);
                if (!hasP('x') && !hasP('twitter')) {
                  list.push({ id: 'footer-def-x', platform: 'x', label: 'X (Twitter)', url: 'https://x.com/myariahub', icon: null, color: '#000000', order: 99 });
                }
                if (!hasP('youtube')) {
                  list.push({ id: 'footer-def-yt', platform: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@myariahub', icon: null, color: '#FF0000', order: 100 });
                }
                return list.map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid h-11 w-11 min-h-[44px] min-w-[44px] place-items-center rounded-xl border border-border/60 bg-card/50 text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground"
                    style={s.color ? { ['--tw-shadow-color' as any]: s.color } : undefined}
                    title={s.label || s.platform}
                    aria-label={`Follow ARIA HUB on ${s.label || s.platform}`}
                  >
                    <SocialIcon platform={s.platform} />
                  </a>
                ));
              })()}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { icon: Shield, labelKey: 'footer.sslSecured' },
                { icon: Award, labelKey: 'footer.isoCertified' },
                { icon: Globe2, labelKey: 'footer.globalTrust' },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                  <c.icon className="h-3.5 w-3.5 text-primary" />
                  {t(c.labelKey)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} {settings?.siteName || 'ARIA HUB'}. {t('footer.rights')}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {footer['legal'] && footer['legal'].length > 0 ? (
              footer['legal'].map((link, idx, arr) => (
                <React.Fragment key={link.id}>
                  <Link href={hrefFn(resolveAnchorUrl(link.url, link.label))} className="inline-flex min-h-[44px] items-center px-2 py-1 transition-colors hover:text-foreground">
                    {getLocalizedContent(link.label, link.labelI18n, lang)}
                  </Link>
                  {idx < arr.length - 1 && <span className="text-border">·</span>}
                </React.Fragment>
              ))
            ) : (
              <>
                <Link href={hrefFn('/privacy-policy')} className="inline-flex min-h-[44px] items-center px-2 py-1 transition-colors hover:text-foreground">{t('footer.privacy')}</Link>
                <span className="text-border">·</span>
                <Link href={hrefFn('/terms-of-service')} className="inline-flex min-h-[44px] items-center px-2 py-1 transition-colors hover:text-foreground">{t('footer.terms')}</Link>
                <span className="text-border">·</span>
                <Link href={hrefFn('/about')} className="inline-flex min-h-[44px] items-center px-2 py-1 transition-colors hover:text-foreground">{t('footer.aboutUs')}</Link>
                <span className="text-border">·</span>
                <Link href={hrefFn('/contact')} className="inline-flex min-h-[44px] items-center px-2 py-1 transition-colors hover:text-foreground">{t('footer.contactUs')}</Link>
                <span className="text-border">·</span>
                <Link href={hrefFn('/blog')} className="inline-flex min-h-[44px] items-center px-2 py-1 transition-colors hover:text-foreground">{t('footer.blog')}</Link>
                <span className="text-border">·</span>
                <Link href={hrefFn('/success-stories')} className="inline-flex min-h-[44px] items-center px-2 py-1 transition-colors hover:text-foreground">{t('stories.eyebrow')}</Link>
                <span className="text-border">·</span>
                <Link href={hrefFn('/employers')} className="inline-flex min-h-[44px] items-center px-2 py-1 transition-colors hover:text-foreground">{t('employers.eyebrow')}</Link>
                <span className="text-border">·</span>
                <Link href={hrefFn('/advertise')} className="inline-flex min-h-[44px] items-center px-2 py-1 font-semibold transition-colors hover:text-foreground">{t('footer.advertise')}</Link>
                <span className="text-border">·</span>
                <Link href={hrefFn('/track')} className="inline-flex min-h-[44px] items-center px-2 py-1 transition-colors hover:text-foreground">{t('track.title')}</Link>
                <span className="text-border">·</span>
                <Link href={hrefFn('/partners')} className="inline-flex min-h-[44px] items-center px-2 py-1 font-semibold transition-colors hover:text-foreground">{t('footer.partners')}</Link>
                <span className="text-border">·</span>
                <Link href={hrefFn('/press')} className="inline-flex min-h-[44px] items-center px-2 py-1 transition-colors hover:text-foreground">{t('footer.press')}</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ platform }: { platform: string }) {
  const cls = 'h-4 w-4';
  switch (platform) {
    case 'whatsapp': return <MessageCircle className={cls} />;
    case 'phone': return <Phone className={cls} />;
    case 'email': return <Mail className={cls} />;
    case 'facebook': return <Facebook className={cls} />;
    case 'instagram': return <Instagram className={cls} />;
    case 'telegram': return <Send className={cls} />;
    case 'linkedin': return <Linkedin className={cls} />;
    case 'youtube': return <Youtube className={cls} />;
    case 'x':
    case 'twitter':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    default: return <Send className={cls} />;
  }
}

