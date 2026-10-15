'use client';
import Link from 'next/link';
import { ArrowUpRight, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export type HiringLang = 'en' | 'fa' | 'ps';
export function HiringBrand({ lang }: { lang: HiringLang }) {
  return <Link href={'/' + lang} className="hiring-brand" aria-label="ARIA HUB"><img src="/images/logo-mark.webp" alt="" width={38} height={38} /><span>ARIA HUB<small>{lang === 'fa' ? 'بخش کارفرما' : lang === 'ps' ? 'د کار ورکوونکي برخه' : 'Employer workspace'}</small></span></Link>;
}
export function HiringLanguages({ lang, path }: { lang: HiringLang; path: string }) {
  return <nav className="hiring-languages" aria-label={lang === 'fa' ? 'زبان' : lang === 'ps' ? 'ژبه' : 'Language'}>{([['en', 'EN'], ['fa', 'فارسی'], ['ps', 'پښتو']] as const).map(([code, label]) => <a key={code} href={'/' + code + '/' + path} lang={code} aria-current={code === lang ? 'page' : undefined} onClick={event => {
    // Locale changes need a fresh document so the URL, language store and direction agree.
    const claim = new URLSearchParams(window.location.search).get('claim')?.slice(0, 200);
    if (claim) { event.preventDefault(); window.location.assign(event.currentTarget.href + '?claim=' + encodeURIComponent(claim)); }
  }}>{label}</a>)}</nav>;
}
export function HiringTheme({ lang }: { lang: HiringLang }) {
  const { resolvedTheme, setTheme } = useTheme();
  return <button type="button" className="hiring-theme" aria-label={lang === 'fa' ? 'تغییر روشنایی' : lang === 'ps' ? 'بڼه بدلول' : 'Change appearance'} onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}><Moon size={17} className="dark:hidden" aria-hidden="true"/><Sun size={17} className="hidden dark:block" aria-hidden="true"/></button>;
}
export function HiringEmpty({ icon, title, children, action }: { icon: React.ReactNode; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <div className="hiring-empty"><span className="hiring-empty-icon" aria-hidden="true">{icon}</span><h3>{title}</h3><p>{children}</p>{action}</div>;
}
export function HiringPublicLink({ lang, slug, children }: { lang: HiringLang; slug: string; children: React.ReactNode }) {
  return <Link href={'/' + lang + '/organizations/' + slug} className="hiring-external">{children}<ArrowUpRight size={16} aria-hidden="true" /></Link>;
}
