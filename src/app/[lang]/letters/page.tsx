import type { Metadata } from 'next';
import { PageShell } from '@/components/site/page-shell';
import { isLang, type Lang } from '@/lib/lang-route';
import { LETTER_TEMPLATES, type LetterKind } from './letter-templates';
import { LetterBuilderClient } from './client';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const title = lang === 'fa' ? 'سازنده نامه و قالب‌های درخواست | آریا هاب' : lang === 'ps' ? 'د غوښتنلیک لیکونو جوړوونکی | آریا هاب' : 'Cover Letters, Recommendations & Application Letters | ARIA HUB';
  const description = lang === 'fa' ? 'نامه پوششی، توصیه‌نامه، انگیزه‌نامه و نامه‌های درخواست را با پیش‌نمایش زنده بسازید.' : lang === 'ps' ? 'د غوښتنلیک، سپارښتنې او انګېزې لیکونه له ژوندۍ مخکتنې سره جوړ کړئ.' : 'Create cover letters, recommendation letters, statements of purpose, and other application letters with editable templates.';
  return { title, description, alternates: { canonical: `/${lang}/letters`, languages: { en: '/en/letters', fa: '/fa/letters', ps: '/ps/letters' } } };
}

export default async function LettersPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ type?: string }> }) {
  const [{ lang: rawLang }, query] = await Promise.all([params, searchParams]);
  const lang: Lang = isLang(rawLang) ? rawLang : 'fa';
  const requested = query.type;
  const initialKind: LetterKind = LETTER_TEMPLATES.some(item => item.id === requested) ? requested as LetterKind : 'cover';
  return <PageShell lang={lang} backTo="start" className="pt-24 print:bg-white print:p-0"><LetterBuilderClient lang={lang} initialKind={initialKind} /></PageShell>;
}
