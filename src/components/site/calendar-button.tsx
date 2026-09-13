import { CalendarPlus } from 'lucide-react';
import { translate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Lang } from '@/lib/lang-route';

/**
 * "Add deadline to calendar" — a plain `<a download>` pointing at the ICS
 * endpoint. No JS needed: the server generates a valid RFC 5545 file per
 * request. Used on the opportunity detail page next to the ShareBar.
 */
export function CalendarButton({
  slug,
  lang,
  className,
}: {
  slug: string;
  lang: Lang;
  className?: string;
}) {
  const label = translate(lang, 'detail.addCalendar');
  return (
    <a
      href={`/api/opportunities/${slug}/calendar?lang=${lang}`}
      download={`${slug}-deadline.ics`}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 print:hidden',
        className
      )}
    >
      <CalendarPlus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span dir="auto">{label}</span>
    </a>
  );
}
