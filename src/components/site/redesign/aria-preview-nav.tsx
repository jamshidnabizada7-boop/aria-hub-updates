'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, ChevronDown, Globe2, Menu, X } from 'lucide-react';
import type { Lang } from '@/lib/lang-route';

type NavGroup = { label: string; links: { label: string; path: string }[] };
const words: Record<Lang, {
  home: string; opportunities: string; tools: string; preparation: string; services: string;
  more: string; jobs: string; scholarships: string; deadlines: string; cv: string;
  matcher: string; applications: string; interview: string; visas: string; news: string;
  employers: string; browse: string; account: string; start: string; menu: string; language: string; notifications: string;
}> = {
  en: {home:'Home', opportunities:'Opportunities', tools:'Tools', preparation:'Preparation', services:'Services', more:'More',
    jobs:'Jobs', scholarships:'Scholarships', deadlines:'Deadlines', cv:'CV Builder', matcher:'Opportunity Matcher',
    applications:'Applications & Assistant', interview:'Interview preparation', visas:'Visa guidance', news:'News',
    employers:'Employers', browse:'Browse all', account:'My dashboard', start:'Get started', menu:'Open menu', language:'Language', notifications:'Notifications'},
  fa: {home:'خانه', opportunities:'فرصت‌ها', tools:'ابزارها', preparation:'آمادگی', services:'خدمات', more:'بیشتر',
    jobs:'وظایف', scholarships:'بورسیه‌ها', deadlines:'مهلت‌ها', cv:'ساخت سی‌وی', matcher:'پیداکنندۀ فرصت مناسب',
    applications:'درخواست‌ها و دستیار', interview:'آمادگی مصاحبه', visas:'رهنمای ویزه', news:'اخبار',
    employers:'کارفرمایان', browse:'همۀ فرصت‌ها', account:'داشبورد من', start:'شروع رایگان', menu:'باز کردن فهرست', language:'زبان', notifications:'اطلاع‌رسانی‌ها'},
  ps: {home:'کور', opportunities:'فرصتونه', tools:'وسیلې', preparation:'چمتووالی', services:'خدمتونه', more:'نور',
    jobs:'دندې', scholarships:'بورسونه', deadlines:'وروستۍ نېټې', cv:'سي وي جوړول', matcher:'مناسب فرصتونه',
    applications:'غوښتنلیکونه او مرستیال', interview:'د مرکې چمتووالی', visas:'د ویزې لارښوونې', news:'خبرونه',
    employers:'کار ورکوونکي', browse:'ټول فرصتونه', account:'زما ډشبورډ', start:'وړیا پیل', menu:'مینو پرانیزئ', language:'ژبه', notifications:'خبرتیاوې'}
};
const languages: { lang: Lang; label: string }[] = [
  { lang: 'en', label: 'English' }, { lang: 'fa', label: 'فارسی (افغانستان)' }, { lang: 'ps', label: 'پښتو' }
];

export function AriaPreviewNav({ lang, preview = true }: { lang: Lang; preview?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const w = words[lang];
  const href = (path: string) => `/${lang}${path}`;
  const groups: NavGroup[] = [
    { label: w.opportunities, links: [
      {label:w.browse,path:'/opportunities'},
      {label:w.jobs,path:'/opportunities?category=jobs'},
      {label:w.scholarships,path:'/opportunities?category=scholarships'},
      {label:w.deadlines,path:'/deadlines'}
    ]},
    { label: w.tools, links: [
      {label:w.cv,path:'/cv-builder'},
      {label:w.matcher,path:'/portal/matcher'},
      {label:w.applications,path:'/portal/career'}
    ]},
    { label: w.preparation, links: [
      {label:w.interview,path:'/services'},
      {label:w.visas,path:'/visas'}
    ]},
    { label: w.services, links: [{label:w.services,path:'/services'}]},
    { label: w.more, links: [
      {label:w.news,path:'/blog'}, {label:w.employers,path:'/employers/dashboard'}
    ]}
  ];
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/applicant/auth/me', { credentials:'same-origin', cache:'no-store', signal:controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!controller.signal.aborted) setAuthenticated(Boolean(data?.user)); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => { setMobileOpen(false); }, [lang, preview]);
  const langHref = (code: Lang) => `/${code}${preview ? '/redesign-preview' : ''}`;
  const accountPath = authenticated ? '/portal' : '/get-started';

  return (
    <header className="aria-topbar">
      <div className="aria-container aria-topbar__inner">
        <Link href={`/${lang}${preview ? '/redesign-preview' : ''}`} className="aria-logo" aria-label={'ARIA HUB — ' + w.home}>
          <span className="aria-logo-mark"><Image src="/images/logo-mark.webp" alt="" width={28} height={28}/></span>
          <span>ARIA <span style={{ color:'#f68b24' }}>HUB</span></span>
        </Link>

        <nav className="aria-nav" aria-label={w.opportunities}>
          {groups.map(g => (
            <details key={g.label} className="aria-nav-group">
              <summary>{g.label}<ChevronDown size={13} aria-hidden="true"/></summary>
              <div className="aria-nav-dropdown">
                {g.links.map(link => <Link key={link.path} href={href(link.path)}>{link.label}</Link>)}
              </div>
            </details>
          ))}
        </nav>

        <div className="aria-nav-actions">
          <details className="aria-nav-group aria-language">
            <summary aria-label={w.language}><Globe2 size={18} aria-hidden="true"/><span className="aria-language-code">{lang.toUpperCase()}</span></summary>
            <div className="aria-nav-dropdown aria-language-dropdown">
              {languages.map(l => <Link key={l.lang} lang={l.lang} href={langHref(l.lang)} aria-current={lang===l.lang ? 'page' : undefined}>{l.label}</Link>)}
            </div>
          </details>
          {authenticated && <Link href={href('/portal/notifications')} aria-label={w.notifications} className="aria-icon-action"><Bell size={18}/></Link>}
          <Link href={href(accountPath)} className="aria-button aria-header-cta">{authenticated ? w.account : w.start}</Link>
          <button type="button" className="aria-mobile-toggle" aria-label={mobileOpen ? w.menu : w.menu} aria-expanded={mobileOpen} aria-controls="aria-mobile-navigation" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={21}/> : <Menu size={21}/>}
          </button>
        </div>
      </div>

      {mobileOpen && <nav id="aria-mobile-navigation" className="aria-mobile-nav" aria-label={w.menu}>
        <div className="aria-container">
          {groups.map(g => (
            <details key={g.label} className="aria-mobile-group">
              <summary>{g.label}<ChevronDown size={16}/></summary>
              <div>
                {g.links.map(link => <Link key={link.path} onClick={() => setMobileOpen(false)} href={href(link.path)}>{link.label}</Link>)}
              </div>
            </details>
          ))}
          <Link className="aria-mobile-account" href={href(accountPath)} onClick={() => setMobileOpen(false)}>{authenticated ? w.account : w.start}</Link>
          <div className="aria-mobile-languages">
            {languages.map(l => <Link key={l.lang} href={langHref(l.lang)} onClick={() => setMobileOpen(false)} aria-current={l.lang===lang?'page':undefined}>{l.label}</Link>)}
          </div>
        </div>
      </nav>}
    </header>
  );
}
