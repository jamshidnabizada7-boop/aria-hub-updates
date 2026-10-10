'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';
import { ARI_COPY, ARI_ENABLED, ariContext, ariVariant, type AriContext, type AriVariant } from '@/lib/ari';
import type { Lang } from '@/lib/lang-route';
import { AriAvatar } from './ari-avatar';

export function AriTip({ lang, context, deadline, cvHref, tip, variant }: { lang: Lang; context: AriContext; deadline?: string | null; cvHref?: string; tip?: string; variant?: AriVariant }) {
  const [dismissed, setDismissed] = useState(false);
  if (!ARI_ENABLED || dismissed) return null;
  const c = ARI_COPY[lang];
  const href = context === 'detail' ? cvHref || `/${lang}/cv-builder` : context === 'employer' ? `/${lang}/employers/post` : context === 'services' ? `/${lang}/services` : `/${lang}/opportunities`;
  const label = context === 'detail' ? c.cv : context === 'employer' ? c.employerAction : context === 'services' ? c.servicesAction : c.action;
  return <aside data-ari-tip={context} dir={lang === 'en' ? 'ltr' : 'rtl'} className="ari-tip relative my-6 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/[0.035] p-4 text-start print:hidden">
    <div className="shrink-0"><AriAvatar variant={variant || ariVariant(context)} size={64} /></div>
    <div className="min-w-0 flex-1 pe-7">
      <p className="text-sm font-semibold">{context === 'detail' ? c.checklist : c.guide}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{tip || c.contexts[context]}</p>
      {context === 'detail' ? <ul className="mt-3 list-disc space-y-2 ps-4 text-sm text-muted-foreground">
        <li>{c.eligibility}</li><li>{c.documents}</li><li>{c.official}</li><li>{deadline ? `${c.deadline} ${new Date(deadline).toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'fa' ? 'fa-AF' : 'ps-AF')}` : c.noDeadline}</li>
      </ul> : null}
      {!['cv', 'letter', 'matcher', 'interview', 'track', 'submit', 'contact'].includes(context) ? <Link href={href} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">{label}<ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /></Link> : null}
    </div>
    <button type="button" onClick={() => setDismissed(true)} aria-label={c.dismiss} className="absolute end-1 top-1 grid h-11 w-11 place-items-center rounded-xl text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"><X size={16} aria-hidden="true" /></button>
  </aside>;
}

/** Used inside shared page chrome; content pages get a subtle footer tip. */
export function AriPageTip({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const context = ariContext(pathname);
  return context ? <div className="mx-auto max-w-5xl px-4"><AriTip key={pathname} lang={lang} context={context} /></div> : null;
}
