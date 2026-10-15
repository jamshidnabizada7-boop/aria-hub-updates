import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationCopy = {
  en: { home: 'Back to ARIA HUB', opportunities: 'Back to opportunities', organizations: 'All organizations', employers: 'Back to employers', stories: 'Back to success stories', templates: 'Back to templates', interview: 'Back to interview prep', visa: 'Back to visa prep', start: 'Back to get started', dashboard: 'Back to my dashboard', previous: 'Previous', next: 'Next', pagination: 'Pagination', page: 'Page', of: 'of' },
  fa: { home: 'بازگشت به آریا هاب', opportunities: 'بازگشت به فرصت‌ها', organizations: 'همۀ سازمان‌ها', employers: 'بازگشت به بخش کارفرمایان', stories: 'بازگشت به داستان‌های موفقیت', templates: 'بازگشت به قالب‌ها', interview: 'بازگشت به آمادگی مصاحبه', visa: 'بازگشت به آمادگی ویزه', start: 'بازگشت به آغاز', dashboard: 'بازگشت به داشبورد من', previous: 'قبلی', next: 'بعدی', pagination: 'صفحه‌بندی', page: 'صفحه', of: 'از' },
  ps: { home: 'آریا هاب ته ستنېدل', opportunities: 'فرصتونو ته ستنېدل', organizations: 'ټولې ادارې', employers: 'د کار ورکوونکو برخې ته ستنېدل', stories: 'د بریا کیسو ته ستنېدل', templates: 'فارمټونو ته ستنېدل', interview: 'د مرکې چمتووالي ته ستنېدل', visa: 'د ویزې چمتووالي ته ستنېدل', start: 'پیل ته ستنېدل', dashboard: 'خپل ډشبورډ ته ستنېدل', previous: 'مخکینی', next: 'راتلونکی', pagination: 'پاڼې', page: 'پاڼه', of: 'له' },
};

export type BackDestination = 'home' | 'opportunities' | 'organizations' | 'employers' | 'stories' | 'templates' | 'interview' | 'visa' | 'start' | 'dashboard';
const destinations: Record<BackDestination, string> = { home: '', opportunities: '/opportunities', organizations: '/organizations', employers: '/employers', stories: '/success-stories', templates: '/templates', interview: '/interview-prep', visa: '/visa-prep', start: '/get-started', dashboard: '/portal' };
const copyFor = (lang: string) => navigationCopy[lang === 'en' || lang === 'ps' ? lang : 'fa'];

/** Shared action treatment for links; body copy links keep their normal text style. */
export const secondaryActionClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

/** A predictable parent route also works when the visitor arrives from search. */
export function PageBackLink({ lang, to = 'home', className, inverse = false }: { lang: string; to?: BackDestination; className?: string; inverse?: boolean }) {
  return <Link href={`/${lang}${destinations[to]}`} className={cn(secondaryActionClass, 'print:hidden', inverse && 'border-primary-foreground/30 bg-transparent text-primary-foreground shadow-none hover:border-primary-foreground/60 hover:bg-primary-foreground/10', className)}>
    <ArrowLeft className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
    {copyFor(lang)[to]}
  </Link>;
}

/** Previous/next are real links; unavailable directions have no click target. */
export function SitePagination({ lang, page, totalPages, previousHref, nextHref, className }: { lang: string; page: number; totalPages: number; previousHref?: string; nextHref?: string; className?: string }) {
  if (totalPages <= 1 && page <= 1) return null;
  const c = copyFor(lang);
  const number = (value: number) => value.toLocaleString(lang === 'fa' ? 'fa-AF' : lang === 'ps' ? 'ps-AF' : 'en-GB');
  const previous = <><ChevronLeft className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden="true" />{c.previous}</>;
  const next = <>{c.next}<ChevronRight className="h-4 w-4 shrink-0 rtl:rotate-180" aria-hidden="true" /></>;
  const disabledClass = cn(secondaryActionClass, 'bg-muted/40 text-muted-foreground opacity-60 shadow-none');
  return <nav aria-label={c.pagination} dir={lang === 'en' ? 'ltr' : 'rtl'} className={cn('mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-6', className)}>
    {previousHref ? <Link rel="prev" href={previousHref} className={secondaryActionClass}>{previous}</Link> : <span aria-disabled="true" className={disabledClass}>{previous}</span>}
    <p aria-live="polite" className="order-last w-full text-center text-sm font-medium text-muted-foreground sm:order-none sm:w-auto sm:px-3">{c.page} {number(page)} {c.of} {number(Math.max(1, totalPages))}</p>
    {nextHref ? <Link rel="next" href={nextHref} className={cn(secondaryActionClass, 'border-primary bg-primary text-primary-foreground hover:border-primary hover:bg-primary/90')}>{next}</Link> : <span aria-disabled="true" className={disabledClass}>{next}</span>}
  </nav>;
}
