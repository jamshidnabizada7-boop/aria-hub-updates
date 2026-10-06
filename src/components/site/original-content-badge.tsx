import { Languages } from 'lucide-react';

/**
 * Visible indicator for original-language content (audit §7): rendered when a
 * record has no translation in the page language yet and the visitor is
 * reading the original source text. Localized to the page language so the
 * badge itself never reads as a foreign string.
 */
const LABELS: Record<string, string> = {
  en: 'Original-language content — not yet translated',
  fa: 'محتوای به زبان اصلی — هنوز ترجمه نشده است',
  ps: 'په اصلي ژبه منځپانګه — لا ژباړه شوې نه ده',
};

export function OriginalContentBadge({ lang }: { lang: string }) {
  const label = LABELS[lang] ?? LABELS.en;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
      dir={lang === 'en' ? 'ltr' : 'rtl'}
    >
      <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
