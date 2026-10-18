import Link from 'next/link';
import { ArrowUpRight, Building2, MapPin, CalendarDays } from 'lucide-react';
import { SaveButton } from '@/components/site/save-button';
import { formatDateShort } from '@/lib/date-format';
import { daysUntilDeadline, isOpportunityExpired, type OpportunityCardData } from '@/lib/opportunity-shared';
import type { Lang } from '@/lib/lang-route';

const words = {
  en: { promoted: 'Promoted', new: 'New', close: 'Closes', unknown: 'Deadline not listed', expired: 'Closed', last: 'Last day', left: 'days left', save: 'Save' },
  fa: { promoted: 'ویژه', new: 'تازه', close: 'مهلت', unknown: 'مهلت مشخص نیست', expired: 'پایان‌یافته', last: 'روز آخر', left: 'روز باقی', save: 'ذخیره' },
  ps: { promoted: 'ځانګړی', new: 'نوی', close: 'وروستۍ نېټه', unknown: 'نېټه نه ده ټاکل شوې', expired: 'تړل شوی', last: 'وروستۍ ورځ', left: 'ورځې پاتې', save: 'خوندي کړئ' },
} as const;

export function AriaOpportunityCard({
  item, lang, preview = true,
}: {
  item: OpportunityCardData; lang: Lang; preview?: boolean;
}) {
  const w = words[lang];
  const expired = isOpportunityExpired(item.status, item.deadline);
  const days = item.deadline ? daysUntilDeadline(item.deadline) : null;
  const created = new Date(item.createdAt);
  const isNew = !Number.isNaN(created.getTime()) && Date.now() - created.getTime() >= 0 &&
    Date.now() - created.getTime() < 7 * 86_400_000;
  const href = `/${lang}/${preview ? 'redesign-preview/opportunities' : 'opportunities'}/${encodeURIComponent(item.slug)}`;
  const dateLabel = expired ? w.expired :
    days !== null && days <= 0 ? w.last :
    days !== null && days <= 3 ? `${days} ${w.left}` :
    item.deadline ? `${w.close} ${formatDateShort(item.deadline, lang)}` : w.unknown;

  return (
    <article className="aria-result-card">
      <div className="aria-result-card__bookmark" aria-label={w.save}>
        <SaveButton slug={item.slug} />
      </div>
      <Link className="aria-result-card__link" href={href} aria-label={item.title}>
        <div className="aria-result-card__badges">
          <span className="aria-tag">{item.categoryLabel}</span>
          {item.featured ? <span className="aria-tag aria-tag--orange">{w.promoted}</span> : null}
          {isNew && !expired ? <span className="aria-tag aria-tag--new">{w.new}</span> : null}
        </div>
        <h3 dir="auto">{item.title}</h3>
        <div className="aria-result-card__meta">
          {item.organization ? <span><Building2 size={13} aria-hidden="true"/><span dir="auto">{item.organization}</span></span> : null}
          {item.country ? <span><MapPin size={13} aria-hidden="true"/><span dir="auto">{item.country}</span></span> : null}
        </div>
        {item.summary ? <p className="aria-result-card__summary" dir="auto">{item.summary}</p> : null}
        <div className="aria-result-card__bottom">
          <span className={expired ? 'aria-deadline--expired' : days !== null && days <= 3 ? 'aria-deadline--urgent' : ''}>
            <CalendarDays size={13} aria-hidden="true"/> {dateLabel}
          </span>
          <ArrowUpRight size={17} aria-hidden="true"/>
        </div>
      </Link>
    </article>
  );
}
