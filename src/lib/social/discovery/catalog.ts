import type { Lang } from '@/lib/lang-route';
import { AF_PROVINCES } from '@/lib/geo/provinces';
import { localizeLocation } from '@/lib/opportunity-facts';
import { toEasternDigits, formatGregorianLong } from '@/lib/date-format';

export type DiscoveryKind = 'jobs' | 'scholarships' | 'internships' | 'fellowships' | 'ngo' | 'remote' | 'graduates';
export type DiscoveryStyle = 'atlas' | 'ledger' | 'signal';
export type DiscoverySpec = { id: string; kind: DiscoveryKind; province?: string };
export type DiscoverySnapshot = { spec: DiscoverySpec; count: number; capturedAt: string; fingerprint: string };
const kinds: DiscoveryKind[] = ['jobs', 'scholarships', 'internships', 'fellowships', 'ngo', 'remote', 'graduates'];
export const DISCOVERY_MINIMUM = 5;
export const DISCOVERY_COOLDOWN_DAYS = 7;
export const DISCOVERY_STYLES: DiscoveryStyle[] = ['atlas', 'ledger', 'signal'];
export const DISCOVERY_SPECS: DiscoverySpec[] = [
  ...AF_PROVINCES.map(province => ({ id: 'jobs-' + province.toLowerCase().replace(/\s+/g, '-'), kind: 'jobs' as const, province })),
  ...kinds.map(kind => ({ id: kind, kind })),
];
export function discoverySpec(id: unknown): DiscoverySpec | null {
  return typeof id === 'string' ? DISCOVERY_SPECS.find(s => s.id === id) ?? null : null;
}
export const DISCOVERY_COPY = {
  en: { series: 'THE OPPORTUNITY EDIT', open: 'Available listings', explore: 'Explore all opportunities', supporting: 'Find your next move. Start with the details.', asof: 'Count checked', changes: 'Listings change. Check eligibility and deadlines online.', jobs: 'job opportunities', scholarships: 'scholarships', internships: 'internships', fellowships: 'fellowships', ngo: 'NGO job opportunities', remote: 'remote job opportunities', graduates: 'entry-level opportunities', latest: 'View current listings', signup: 'Create your free account', noResults: 'No active listings match this collection right now.', listing: 'View opportunity' },
  fa: { series: 'مجموعهٔ فرصت‌های آریا هاب', open: 'فرصت‌های موجود', explore: 'همهٔ فرصت‌ها را ببینید', supporting: 'گام بعدی شما از یک فرصت آغاز می‌شود.', asof: 'زمان بررسی تعداد', changes: 'فرصت‌ها تغییر می‌کنند؛ شرایط و مهلت‌ها را در سایت بررسی کنید.', jobs: 'فرصت کاری', scholarships: 'بورسیهٔ تحصیلی', internships: 'فرصت کارآموزی', fellowships: 'فرصت فلوشیپ', ngo: 'فرصت کاری در مؤسسات غیردولتی', remote: 'فرصت کار از راه دور', graduates: 'فرصت کاری بدون سابقهٔ ضروری', latest: 'فرصت‌های فعلی را ببینید', signup: 'حساب رایگان بسازید', noResults: 'در حال حاضر فرصت فعالی در این مجموعه موجود نیست.', listing: 'مشاهدهٔ فرصت' },
  ps: { series: 'د آریا هاب د فرصتونو ټولګه', open: 'شته فرصتونه', explore: 'ټول فرصتونه وګورئ', supporting: 'ستاسو راتلونکی ګام له یوه فرصت څخه پیلېږي.', asof: 'د شمېر د کتنې وخت', changes: 'فرصتونه بدلېږي؛ شرایط او وروستۍ نېټې په وېبپاڼه کې وګورئ.', jobs: 'کاري فرصتونه', scholarships: 'تحصیلي بورسونه', internships: 'د کار زده کړې فرصتونه', fellowships: 'د فیلوشپ فرصتونه', ngo: 'په نادولتي ادارو کې کاري فرصتونه', remote: 'له لرې د کار فرصتونه', graduates: 'له اړینې تجربې پرته کاري فرصتونه', latest: 'اوسني فرصتونه وګورئ', signup: 'وړیا حساب جوړ کړئ', noResults: 'اوس په دې ټولګه کې فعال فرصت نشته.', listing: 'فرصت وګورئ' },
};
export function discoveryNumber(count: number, lang: Lang) {
  const grouped=String(count).replace(/\B(?=(\d{3})+(?!\d))/g,lang==='en'?',':'٬');
  return toEasternDigits(grouped,lang);
}
export function discoveryTimestamp(iso:string,lang:Lang) {
  const aft=new Date(Date.parse(iso)+270*60000);
  const hm=String(aft.getUTCHours()).padStart(2,'0')+':'+String(aft.getUTCMinutes()).padStart(2,'0');
  return formatGregorianLong(aft,lang)+' · '+toEasternDigits(hm,lang);
}
export function discoveryLocation(spec: DiscoverySpec, lang: Lang): string {
  if (!spec.province) return '';
  const name = localizeLocation(spec.province, lang);
  return lang === 'en' ? `in ${name} province` : lang === 'fa' ? `در ولایت ${name}` : `په ${name} ولایت کې`;
}
export function discoveryHeadline(snapshot: DiscoverySnapshot, lang: Lang) {
  return [discoveryNumber(snapshot.count, lang), DISCOVERY_COPY[lang][snapshot.spec.kind], discoveryLocation(snapshot.spec, lang)].filter(Boolean).join(' ');
}
export function discoveryUrl(spec: DiscoverySpec, lang: Lang, queueId?: string, platform = 'studio') {
  const url = new URL(`/${lang}/discover/${spec.id}`, 'https://www.myariahub.com');
  if (queueId) { url.searchParams.set('campaign', queueId); url.searchParams.set('utm_source', platform); url.searchParams.set('utm_medium', 'organic_social'); url.searchParams.set('utm_campaign', `discovery_${spec.id}`); }
  return url.toString();
}
export function discoveryCaption(snapshot: DiscoverySnapshot, lang: Lang, queueId?: string, platform = 'studio') {
  const c = DISCOVERY_COPY[lang];
  const stamp = discoveryTimestamp(snapshot.capturedAt,lang);
  return `${discoveryHeadline(snapshot, lang)}\n\n${c.explore} → myariahub.com\n🔗 ${discoveryUrl(snapshot.spec, lang, queueId, platform)}\n\n${c.asof}: ${stamp} (AFT)\n${c.changes}\n\n#ARIAHUB #${snapshot.spec.kind === 'scholarships' ? 'Scholarships' : 'Opportunities'}`;
}
