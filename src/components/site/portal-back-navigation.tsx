'use client';

import { usePathname } from 'next/navigation';
import { useEffectiveLang } from './lang-context';
import { PageBackLink } from './page-navigation';

export function PortalBackNavigation() {
  const lang = useEffectiveLang();
  const pathname = usePathname();
  const isDashboard = pathname.replace(/\/$/, '') === `/${lang}/portal`;
  return <div className="mx-auto max-w-6xl px-5 pt-6 sm:px-8"><PageBackLink lang={lang} to={isDashboard ? 'home' : 'dashboard'} /></div>;
}
