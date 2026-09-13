'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Search, ChevronDown, Sun, Moon, Globe, ChevronRight } from 'lucide-react';
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
import { LANGS, sanitizeLangPath, withLangPrefix } from '@/lib/lang-route';
import type { MenuItem, Language } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SearchDialog } from './search-dialog';
import Image from 'next/image';
import { getLocalizedContent } from '@/lib/i18n-content';

function LogoMark({ src }: { src: string | null | undefined }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-2 text-sm font-black text-primary-foreground shadow-float">
        A
      </div>
    );
  }
  return <Image src={src} alt="Logo" width={72} height={72} onError={() => setErr(true)} className="h-9 w-9 rounded-xl object-cover" />;
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
        className="group relative flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:text-foreground"
      >
        {label}
        <span className="absolute inset-x-3 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-primary to-chart-2 transition-transform duration-300 group-hover:scale-x-100" />
      </a>
    );
  }

  return (
    <div className="group relative">
      <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:text-foreground">
        {label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-180" />
        <span className="absolute inset-x-3 -bottom-0.5 h-px origin-left scale-x-0 bg-gradient-to-r from-primary to-chart-2 transition-transform duration-300 group-hover:scale-x-100" />
      </button>
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
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
    <div className="group/nested relative">
      <button className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-accent hover:text-foreground">
        {label}
        <ChevronRight className="h-3.5 w-3.5 rtl-flip" />
      </button>
      <div className="invisible absolute left-full top-0 z-50 ml-1 opacity-0 transition-all duration-200 group-hover/nested:visible group-hover/nested:opacity-100 rtl:left-auto rtl:right-full rtl:ml-0 rtl:mr-1">
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
        className="block rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent"
        style={{ paddingInlineStart: `${depth * 12 + 12}px` }}
      >
        {label}
      </a>
    );
  }
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent"
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
  const router = useRouter();
  const pathname = usePathname();
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Secret admin access: click the logo 5 times within 2 seconds to open /admin
  // (not visible to regular visitors — no UI hint)
  const handleLogoClick = (e: React.MouseEvent) => {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 2000);
    if (clickCount.current >= 5) {
      clickCount.current = 0;
      if (clickTimer.current) clearTimeout(clickTimer.current);
      router.push('/admin');
      return;
    }
    // First 4 clicks: normal navigation to #home
    e.preventDefault();
    window.location.hash = 'home';
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              'flex items-center justify-between rounded-2xl px-4 transition-all duration-500 sm:px-5',
              scrolled
                ? 'glass border border-border/60 shadow-premium h-14'
                : 'border border-transparent h-16'
            )}
          >
            {/* Logo — click 5× quickly (within 2s) to open admin */}
            <button onClick={handleLogoClick} className="flex items-center gap-2.5" aria-label={siteName}>
              <LogoMark src={logoUrl} />
              <span className="text-lg font-bold tracking-tight">
                {siteName.split(' ')[0]}
                <span className="text-gradient-static"> {siteName.split(' ')[1]}</span>
              </span>
            </button>

            {/* Desktop nav */}
            <nav className="hidden items-center lg:flex">
              {menu.map((item) => (
                <DesktopMenuItem key={item.id} item={item} />
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-2 rounded-xl px-2.5"
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
                <kbd className="hidden ms-1 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                  <span className="text-[9px]">⌘</span>K
                </kbd>
              </Button>

              {/* Language switcher */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-1.5 rounded-xl px-2.5" aria-label={t('lang.switch')}>
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
                      className={cn('justify-between', l.code === code && 'bg-accent')}
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
                className="h-9 w-9 rounded-xl"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                aria-label={t('theme.toggle')}
              >
                <Sun className="hidden h-4 w-4 dark:block" />
                <Moon className="block h-4 w-4 dark:hidden" />
              </Button>

              <Button
                size="sm"
                className="hidden h-9 rounded-xl bg-gradient-to-r from-primary to-chart-2 px-4 text-sm font-semibold shadow-float hover:opacity-90 md:inline-flex"
                asChild
              >
                <a href={hrefFn('/contact')}>{t('nav.getStarted')}</a>
              </Button>

              {/* Mobile menu */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl lg:hidden" aria-label={t('nav.menu')}>
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[320px] overflow-y-auto p-0">
                  <SheetTitle className="sr-only">{t('nav.menu')}</SheetTitle>
                  <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                    <span className="text-lg font-bold">{siteName}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <nav className="space-y-1 p-3">
                    {menu.map((item) => (
                      <MobileMenuItem key={item.id} item={item} onNavigate={() => setMobileOpen(false)} />
                    ))}
                  </nav>
                  <div className="p-4">
                    <Button asChild className="w-full rounded-xl bg-gradient-to-r from-primary to-chart-2">
                      <a href={hrefFn('/contact')} onClick={() => setMobileOpen(false)}>{t('nav.getStarted')}</a>
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
