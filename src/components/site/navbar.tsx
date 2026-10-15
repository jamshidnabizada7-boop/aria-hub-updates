'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, ChevronDown, Sun, Moon, Globe, ChevronRight, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { useLangStore } from '@/lib/lang-store';
import { useLangContext } from '@/components/site/lang-context';
import { useT } from '@/hooks/use-t';
import { useLangHref } from '@/hooks/use-lang-href';
import { resolveAnchorUrl } from '@/lib/anchor-routes';
import { cleanSiteNavigation } from '@/lib/site-navigation';
import { LANGS, sanitizeLangPath, withLangPrefix } from '@/lib/lang-route';
import type { MenuItem, Language } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SearchDialog } from './search-dialog';
import {AccountChoices} from './account-choices';
import Image from 'next/image';
import { getLocalizedContent } from '@/lib/i18n-content';

function LogoMark({ src }: { src: string | null | undefined }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[6px] bg-gradient-to-br from-primary to-chart-2 text-sm font-black text-primary-foreground shadow-float">
        A
      </div>
    );
  }
  return <Image src={src} alt="Logo" width={72} height={72} onError={() => setErr(true)} className="h-9 w-9 shrink-0 rounded-[6px] object-contain" />;
}

interface NavbarProps {
  menu: MenuItem[];
  languages: Language[];
  siteName: string;
  logoUrl: string | null;
}

// Recursive desktop dropdown
function DesktopMenuItem({ item }: { item: MenuItem }) {
  const t = useT();
  const storeCode = useLangStore((s) => s.code);
  const code = useLangContext() ?? storeCode;
  const hrefFn = useLangHref();
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  // Get localized label - correct parameter order: (baseValue, i18nValue, lang)
  const label = getLocalizedContent(item.label, item.labelI18n, code);

  // Legacy #anchor menu rows resolve to the page route that serves the
  // content; unmapped anchors keep the old language-home fallback; internal
  // /routes get a lang prefix.
  const raw = item.url ?? '';
  const resolved = resolveAnchorUrl(raw, item.label);
  const href = raw.startsWith('#') && resolved === raw
    ? `/${code}${raw}`
    : hrefFn(resolved);

  if (!hasChildren) {
    return (
      <a
        href={href}
        target={item.openInNewTab ? '_blank' : undefined}
        className="group relative flex items-center gap-1 px-2 xl:px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:text-foreground"
      >
        {label}
        <span className="absolute inset-x-3 -bottom-0.5 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
      </a>
    );
  }

  return (
    <div className="group relative" onMouseLeave={() => setExpanded(false)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setExpanded(false); }} onKeyDown={e => { if (e.key === 'Escape') { setExpanded(false); e.currentTarget.querySelector('button')?.focus(); } }}>
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="flex min-h-11 items-center gap-1 px-2 xl:px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:text-foreground">
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-300',expanded&&'rotate-180')} />
        <span className="absolute inset-x-3 -bottom-0.5 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100" />
      </button>
      <div hidden={!expanded} className="absolute start-0 top-full z-50 pt-2">
        <div className="min-w-56 overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-2 shadow-premium backdrop-blur-xl">
          {item.children.map((child) => (
            <NestedMenuItem key={child.id} item={child} />
          ))}
        </div>
      </div>
    </div>
  );
}

function NestedMenuItem({ item }: { item: MenuItem }) {
  const storeCode = useLangStore((s) => s.code);
  const code = useLangContext() ?? storeCode;
  const hrefFn = useLangHref();
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const label = getLocalizedContent(item.label, item.labelI18n, code);

  const raw = item.url ?? '';
  const resolved = resolveAnchorUrl(raw, item.label);
  const href = raw.startsWith('#') && resolved === raw
    ? `/${code}${raw}`
    : hrefFn(resolved);

  if (!hasChildren) {
    return (
      <a
        href={href}
        target={item.openInNewTab ? '_blank' : undefined}
        className="block rounded-xl px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
      >
        {label}
      </a>
    );
  }
  return (
    <div className="group/nested relative" onMouseLeave={() => setExpanded(false)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setExpanded(false); }}>
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-foreground">
        {label}
        <ChevronRight className="h-3.5 w-3.5 rtl-flip" />
      </button>
      <div hidden={!expanded} className="absolute left-full top-0 z-50 pl-1 rtl:left-auto rtl:right-full rtl:pl-0 rtl:pr-1">
        <div className="min-w-56 overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-2 shadow-premium backdrop-blur-xl">
          {item.children.map((child) => (
            <NestedMenuItem key={child.id} item={child} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Mobile recursive menu
function MobileMenuItem({ item, depth = 0, onNavigate }: { item: MenuItem; depth?: number; onNavigate?: () => void }) {
  const storeCode = useLangStore((s) => s.code);
  const code = useLangContext() ?? storeCode;
  const hrefFn = useLangHref();
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const label = getLocalizedContent(item.label, item.labelI18n, code);

  const raw = item.url ?? '';
  const resolved = resolveAnchorUrl(raw, item.label);
  const href = raw.startsWith('#') && resolved === raw
    ? `/${code}${raw}`
    : hrefFn(resolved);

  if (!hasChildren) {
    return (
      <a
        href={href}
        target={item.openInNewTab ? '_blank' : undefined}
        onClick={() => onNavigate?.()}
        className="flex min-h-[44px] items-center rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent"
        style={{ paddingInlineStart: `${depth * 12 + 12}px` }}
      >
        {label}
      </a>
    );
  }
  return (
    <div>
      <button
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent"
        style={{ paddingInlineStart: `${depth * 12 + 12}px` }}
      >
        {label}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {item.children.map((child) => (
              <MobileMenuItem key={child.id} item={child} depth={depth + 1} onNavigate={onNavigate} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar({ menu, languages, siteName, logoUrl }: NavbarProps) {

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [applicantSignedIn, setApplicantSignedIn] = useState(false);
  const [applicantAvailable,setApplicantAvailable] = useState(false);
  const [notificationsAvailable,setNotificationsAvailable] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const { setLang } = useLangStore();
  const storeCode = useLangStore((s) => s.code);
  const code = useLangContext() ?? storeCode;
  const hrefFn = useLangHref();
  const storeLanguages = useLangStore((s) => s.languages);
  // DB-driven languages when available, otherwise the URL-driven store list
  // (kept in sync by LangSync with a static fallback).
  const allLanguages = languages.length > 0 ? languages : storeLanguages;
  const t = useT();
  const pathname = usePathname();
  // Switch language: navigate to the same page under the new /{lang} prefix.
  // HARD navigation (window.location.assign), NOT router.push: mixing a zustand
  // store update and router.push in one handler raced the Next 16 concurrent
  // router — the push was silently dropped (URL kept the old lang while the UI
  // switched), and later switches compounded corrupted prefixes (/fa/ena → 404,
  // the bug the owner reported). A full reload guarantees server HTML always
  // matches the URL language and resyncs the store via LangSync.
  const handleSwitchLang = (rawCode: string) => {
    // Only ever navigate to a known language — never trust unknown codes.
    if (!(LANGS as readonly string[]).includes(rawCode)) return;
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const target =
      sanitizeLangPath(rawCode, withLangPrefix(rawCode, pathname || '/')) + search;
    if (typeof window !== 'undefined' && window.location.pathname + search === target) {
      setLang(rawCode); // already there — just resync the UI store
      return;
    }
    window.location.assign(target);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/applicant/auth/me', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
      .then(r => r.ok ? r.json() : { user: null })
      .then(body => { if (!controller.signal.aborted) {setApplicantAvailable(Boolean(body.authAvailable));setApplicantSignedIn(Boolean(body.user));setNotificationsAvailable(Boolean(body.notificationsAvailable));} })
      .catch(() => {});
    return () => controller.abort();
  }, [pathname]);

  // Keyboard shortcut: Cmd/Ctrl+K opens search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navigation = cleanSiteNavigation(menu);
  const currentLang = allLanguages.find((l) => l.code === code) || allLanguages[0];

  return (
    <>
      <motion.header
        // initial={false}: never render the navbar hidden. The old
        // initial={{ y: -100 }} shipped a translateY(-100px) style in the SSR
        // HTML, so users (and crawlers without full JS) saw a HEADLESS site
        // until/unless framer-motion hydrated and animated it in.
        initial={false}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed inset-x-0 top-0 z-50 print:hidden transition-all duration-500',
          scrolled ? 'py-2' : 'py-4'
        )}
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              'flex items-center justify-between rounded-2xl px-4 transition-all duration-500 sm:px-5',
              scrolled
                ? 'glass border border-border/60 shadow-premium h-14'
                : 'border border-border/60 bg-background/95 shadow-sm backdrop-blur-xl h-16'
            )}
          >
            {/* A predictable home link on every page. */}
            <a href={`/${code}`} className="flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-primary" aria-label={`${siteName} — ${code==='en'?'Home':code==='fa'?'خانه':'کور'}`}>
              <LogoMark src={logoUrl} />
              <span className="text-lg font-bold tracking-tight">
                {siteName.split(' ')[0]}
                <span className="text-gradient-static"> {siteName.split(' ')[1]}</span>
              </span>
            </a>

            {/* Desktop nav */}
            <nav aria-label={t('nav.menu')} className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
              {navigation.map((item) => (
                <DesktopMenuItem key={item.id} item={item} />
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 min-h-[44px] min-w-[44px] gap-2 rounded-xl px-2.5 sm:h-9"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
                <kbd className="hidden ms-1 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground xl:inline-flex">
                  <span className="text-[9px]">⌘</span>K
                </kbd>
              </Button>

              {/* Language switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 min-h-[44px] min-w-[44px] gap-1.5 rounded-xl px-2.5 sm:h-9" aria-label={t('lang.switch')}>
                    <Globe className="h-4 w-4" />
                    <span className="hidden text-xs font-semibold sm:inline">{(currentLang?.code || 'en').toUpperCase()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">{t('lang.switch')}</DropdownMenuLabel>
                  {allLanguages.map((l) => (
                    <DropdownMenuItem
                      key={l.code}
                      onClick={() => handleSwitchLang(l.code)}
                      className={cn('justify-between min-h-[44px]', l.code === code && 'bg-accent')}
                    >
                      <span className="flex items-center gap-2">
                        <span>{l.flag}</span>
                        <span>{l.nativeName}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{l.code.toUpperCase()}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Theme toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-xl sm:h-9 sm:w-9"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                aria-label={t('theme.toggle')}
              >
                <Sun className="hidden h-4 w-4 dark:block" />
                <Moon className="block h-4 w-4 dark:hidden" />
              </Button>

              {applicantSignedIn && notificationsAvailable && <a href={hrefFn('/portal/notifications')} aria-label={code==='fa'?'اطلاع‌رسانی‌ها':code==='ps'?'خبرتیاوې':'Notifications'} className="hidden items-center rounded-xl border border-border px-3 py-2 text-sm font-semibold lg:inline-flex"><Bell className="h-4 w-4" /></a>}
              <AccountChoices lang={code} signedIn={applicantSignedIn} />
              <Button
                size="sm"
                className="hidden min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold shadow-float hover:bg-primary/90 lg:inline-flex"
                asChild
              >
                <a href={hrefFn('/get-started')}>{t('nav.getStarted')}</a>
              </Button>

              {/* Mobile menu */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl lg:hidden" aria-label={t('nav.menu')}>
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side={code === 'en' ? 'right' : 'left'} className="w-[min(360px,90vw)] overflow-y-auto p-0 [&>button]:min-h-11 [&>button]:min-w-11 [&>button]:top-2 [&>button]:right-auto [&>button]:end-3">
                  <SheetTitle className="sr-only">{t('nav.menu')}</SheetTitle>
                  <div className="flex items-center justify-between border-b border-border/60 px-5 pe-16 py-4">
                    <span className="text-lg font-bold">{siteName}</span>

                  </div>
                  <nav className="space-y-1 p-3">
                    {navigation.map((item) => (
                      <MobileMenuItem key={item.id} item={item} onNavigate={() => setMobileOpen(false)} />
                    ))}
                  </nav>
                  <div className="p-4 space-y-3">
                    {applicantSignedIn && notificationsAvailable && <a href={hrefFn('/portal/notifications')} onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 rounded-xl border p-3 text-center text-sm font-semibold"><Bell className="h-4 w-4"/>{code==='fa'?'اطلاع‌رسانی‌های من':code==='ps'?'زما خبرتیاوې':'My Notifications'}</a>}
                    <AccountChoices lang={code} signedIn={applicantSignedIn} mobile />
                    <Button asChild className="min-h-[44px] w-full rounded-xl bg-primary">
                      <a href={hrefFn('/get-started')} onClick={() => setMobileOpen(false)}>{t('nav.getStarted')}</a>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </motion.header>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
