import { getLocalizedContent } from './i18n-content';
import { normalizeProvince } from './geo/provinces';

type Lang = 'en' | 'fa' | 'ps';
type JsonObject = Record<string, unknown>;
type Labels = [string, string, string];
export interface OpportunityFact {
  key: string;
  label: string;
  value: string;
  original: boolean;
}
interface Definition {
  key: string;
  labels: Labels;
  aliases: string[];
  code?: boolean;
}

// Only deliberately supported applicant-facing fields reach the public page.
// Technical IDs, feed tags, adapters, URLs and future unknown scraper keys
// remain available internally without becoming public labels or AI input.
const DEFINITIONS: Definition[] = [
  { key: 'organization', labels: ['Organization', 'سازمان', 'اداره'], aliases: ['company', 'organizer'] },
  { key: 'location', labels: ['Location', 'موقعیت', 'ځای'], aliases: ['country', 'city', 'host country'] },
  { key: 'jobType', labels: ['Opportunity type', 'نوع فرصت', 'د فرصت ډول'], aliases: ['opportunity button'] },
  { key: 'salary', labels: ['Salary', 'معاش', 'معاش'], aliases: ['salary range'] },
  { key: 'educationReq', labels: ['Education', 'تحصیلات', 'زده کړې'], aliases: ['education', 'education level', 'degree required'] },
  { key: 'experience', labels: ['Experience', 'سابقه کاری', 'کاري تجربه'], aliases: ['experience required', 'years of experience'] },
  { key: 'deadline', labels: ['Deadline', 'مهلت', 'وروستۍ نېټه'], aliases: ['closing date', 'application deadline'] },
  { key: 'posted', labels: ['Published', 'منتشر شده', 'خپور شوی'], aliases: ['published', 'published date'] },
  { key: 'reference', labels: ['Vacancy reference', 'شماره اعلان', 'د بست شمېره'], aliases: ['reference number', 'vacancy number', 'vacancyNumber'], code: true },
  { key: 'vacancies', labels: ['Available positions', 'تعداد بست‌ها', 'د بستونو شمېر'], aliases: ['number of vacancies', 'no of job', 'no of jobs'] },
  { key: 'workType', labels: ['Work schedule', 'نوع کار', 'د کار ډول'], aliases: ['employment type', 'type'] },
  { key: 'contractType', labels: ['Contract type', 'نوع قرارداد', 'د قرارداد ډول'], aliases: [] },
  { key: 'contractDuration', labels: ['Contract duration', 'مدت قرارداد', 'د قرارداد موده'], aliases: [] },
  { key: 'extendable', labels: ['Contract extension', 'امکان تمدید قرارداد', 'د قرارداد د تمدید امکان'], aliases: ['contract extension'] },
  { key: 'probationPeriod', labels: ['Probation period', 'دوره آزمایشی', 'ازمایښتي موده'], aliases: [] },
  { key: 'gender', labels: ['Eligible gender', 'جنسیت متقاضی', 'د غوښتونکي جنسیت'], aliases: ['eligible gender'] },
  { key: 'nationality', labels: ['Eligible nationality', 'تابعیت متقاضی', 'د غوښتونکي تابعیت'], aliases: [] },
  { key: 'languages', labels: ['Languages', 'زبان‌ها', 'ژبې'], aliases: [] },
  { key: 'functionalAreas', labels: ['Professional fields', 'حوزه‌های کاری', 'کاري برخې'], aliases: ['functional area', 'category'] },
  { key: 'travelRequired', labels: ['Travel required', 'نیاز به سفر', 'سفر ته اړتیا'], aliases: [] },
  { key: 'submission', labels: ['Application method', 'روش درخواست', 'د غوښتنلیک طریقه'], aliases: [] },
  { key: 'salaryGrade', labels: ['Salary grade', 'درجه معاش', 'د معاش درجه'], aliases: [], code: true },
  { key: 'degree', labels: ['Study level', 'مقطع تحصیلی', 'د زده کړو کچه'], aliases: ['study level'] },
  { key: 'fundingType', labels: ['Funding', 'نوع تمویل', 'تمویل'], aliases: ['scholarship type', 'opportunity type'] },
  { key: 'applicationFee', labels: ['Application fee required', 'نیاز به هزینه درخواست', 'د غوښتنلیک فیس ته اړتیا'], aliases: ['application fee required'] },
  { key: 'languageOfInstruction', labels: ['Program language', 'زبان برنامه', 'د پروګرام ژبه'], aliases: ['program language'] },
  { key: 'languageRequirement', labels: ['Language requirement', 'شرط زبان', 'د ژبې شرط'], aliases: [] },
  { key: 'duration', labels: ['Program duration', 'مدت برنامه', 'د پروګرام موده'], aliases: ['program duration'] },
  { key: 'fieldsOfStudy', labels: ['Fields of study', 'رشته‌های تحصیلی', 'د زده کړو څانګې'], aliases: ['field', 'fields'] },
  { key: 'eligibleCountries', labels: ['Eligible countries', 'کشورهای واجد شرایط', 'وړ هېوادونه'], aliases: [] },
  { key: 'targetGroup', labels: ['Eligible applicants', 'متقاضیان واجد شرایط', 'وړ غوښتونکي'], aliases: ['age group', 'eligibility criteria'] },
  { key: 'hostInstitution', labels: ['Host institution', 'نهاد میزبان', 'کوربه بنسټ'], aliases: ['host university', 'university'] },
  { key: 'opportunities', labels: ['Available awards', 'تعداد فرصت‌ها', 'د فرصتونو شمېر'], aliases: ['no of opportunity', 'number of opportunities', 'number of scholarships', 'number of fellowships'] },
  { key: 'applicationDeadlines', labels: ['Application deadlines', 'مهلت‌های درخواست', 'د غوښتنلیک وروستۍ نېټې'], aliases: [] },
  { key: 'focusAreas', labels: ['Focus areas', 'حوزه‌های تمرکز', 'د تمرکز برخې'], aliases: ['focus area'] },
  { key: 'programStarts', labels: ['Program starts', 'شروع برنامه', 'د پروګرام پیل'], aliases: ['start date'] },
  { key: 'results', labels: ['Results announced', 'اعلام نتایج', 'د پایلو اعلان'], aliases: ['result announcement dates'] },
  { key: 'interview', labels: ['Interview', 'مصاحبه', 'مرکه'], aliases: [] },
  { key: 'training', labels: ['Preparatory training', 'آموزش آمادگی', 'چمتووالی روزنه'], aliases: ['pre academic training'] },
];
export const normalizeFactKey = (key: string): string => key.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const definitionByKey = new Map(DEFINITIONS.flatMap(d => [d.key, ...d.aliases].map(k => [normalizeFactKey(k), d] as const)));
const EMPTY = /^(?:[-–—]+|n\/?a|none|null|undefined|not specified|not available|unknown|tbd)$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function factText(value: unknown): string {
  if (Array.isArray(value)) {
    return [...new Set(value.map(v => factText(v)).filter(Boolean))].join(', ');
  }
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return '';
  const text = String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (!text || EMPTY.test(text) || UUID.test(text) || text.length > 4000) return '';
  return text;
}
export function factObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}
export interface FactSource { key: string; sourceKey: string; value: string; code: boolean }
export function publicFactSources(raw: unknown): FactSource[] {
  const facts = new Map<string, FactSource>();
  for (const [sourceKey, source] of Object.entries(factObject(raw))) {
    const def = definitionByKey.get(normalizeFactKey(sourceKey));
    const value = factText(source);
    if (!def || !value || facts.has(def.key)) continue;
    // Zero vacancies and malformed URL values are not usable key information.
    if (def.key === 'vacancies' && /^0+$/.test(value)) continue;
    if (/https?:\/\//i.test(value) && def.key !== 'applicationDeadlines') continue;
    facts.set(def.key, { key: def.key, sourceKey, value, code: !!def.code });
  }
  return DEFINITIONS.flatMap(d => facts.has(d.key) ? [facts.get(d.key)!] : []);
}

// Controlled vocabularies are translated immediately, with no provider cost.
const WORDS: Record<string, [string, string]> = {
  job: ['وظیفه', 'دنده'], scholarship: ['بورسیه', 'بورس'], scholarships: ['بورسیه‌ها', 'بورسونه'], fellowship: ['فلوشیپ', 'فلوشپ'], internship: ['کارآموزی', 'کار زده کړه'], grant: ['کمک مالی', 'مالي مرسته'], training: ['آموزش', 'روزنه'], conference: ['کنفرانس', 'کنفرانس'], competition: ['رقابت', 'سیالي'], consultancy: ['مشاوره', 'مشوره'], volunteer: ['داوطلبانه', 'رضاکارانه'],
  'full time': ['تمام‌وقت', 'بشپړ وخت'], 'part time': ['نیمه‌وقت', 'نیمه وخت'], permanent: ['دایمی', 'دایمي'], temporary: ['موقت', 'لنډمهاله'], contractor: ['قراردادی', 'قراردادي'], contract: ['قراردادی', 'قراردادي'], fixedterm: ['مدت معین', 'ټاکلې موده'], 'fixed term': ['مدت معین', 'ټاکلې موده'], remote: ['از راه دور', 'له لرې'], hybrid: ['حضوری و از راه دور', 'حضوري او له لرې'],
  yes: ['بلی', 'هو'], true: ['بلی', 'هو'], no: ['نخیر', 'نه'], false: ['نخیر', 'نه'], male: ['مرد', 'نارینه'], female: ['زن', 'ښځینه'], 'male/female': ['زن و مرد', 'ښځینه او نارینه'], both: ['زن و مرد', 'ښځینه او نارینه'], 'any gender': ['همه جنسیت‌ها', 'ټول جنسیتونه'], any: ['همه', 'ټول'], national: ['اتباع کشور', 'د هېواد اتباع'], international: ['بین‌المللی', 'نړیوال'], afghan: ['افغان', 'افغان'],
  dari: ['دری', 'دري'], persian: ['فارسی', 'فارسي'], farsi: ['فارسی', 'فارسي'], english: ['انگلیسی', 'انګلیسي'], pashto: ['پشتو', 'پښتو'], arabic: ['عربی', 'عربي'], french: ['فرانسوی', 'فرانسوي'], japanese: ['جاپانی', 'جاپاني'], german: ['آلمانی', 'الماني'],
  bachelor: ['لیسانس', 'لیسانس'], bachelors: ['لیسانس', 'لیسانس'], "bachelor's": ['لیسانس', 'لیسانس'], "bachelor’s": ['لیسانس', 'لیسانس'], "bachelor's degree": ['مدرک لیسانس', 'د لیسانس سند'], "bachelor’s degree": ['مدرک لیسانس', 'د لیسانس سند'], master: ['ماستری', 'ماسټري'], masters: ['ماستری', 'ماسټري'], "master's": ['ماستری', 'ماسټري'], "master’s": ['ماستری', 'ماسټري'], phd: ['دکترا', 'دوکتورا'], 'ph.d': ['دکترا', 'دوکتورا'], 'ph.d.': ['دکترا', 'دوکتورا'], undergraduate: ['لیسانس', 'لیسانس'], postgraduate: ['تحصیلات تکمیلی', 'لوړې زده کړې'], diploma: ['دیپلوم', 'دیپلوم'], 'high school': ['بکلوریا', 'دولسم ټولګی'],
  email: ['ایمیل', 'برېښنالیک'], link: ['آنلاین', 'انلاین'], online: ['آنلاین', 'انلاین'], 'fully funded': ['کاملاً تمویل شده', 'بشپړ تمویل'], 'partially funded': ['تمویل جزئی', 'جزوي تمویل'], 'self funded': ['با هزینه شخصی', 'په شخصي لګښت'], 'full and partial funding': ['تمویل کامل و جزئی', 'بشپړ او جزوي تمویل'], 'not required': ['لازم نیست', 'اړتیا نشته'], global: ['همه کشورها', 'ټول هېوادونه'], worldwide: ['همه کشورها', 'ټول هېوادونه'], 'all fields': ['همه رشته‌ها', 'ټولې څانګې'],
  engineering: ['مهندسی', 'انجنیري'], 'mechanical engineering': ['مهندسی مکانیک', 'میخانیکي انجنیري'], 'construction engineering': ['مهندسی ساختمان', 'ساختماني انجنیري'], 'civil engineering': ['مهندسی عمران', 'ملکي انجنیري'], 'customer service': ['خدمات مشتریان', 'د پېرودونکو خدمتونه'], sales: ['فروش', 'پلور'], finance: ['مالی', 'مالي'], accounting: ['حسابداری', 'حسابداري'], management: ['مدیریت', 'مدیریت'], education: ['آموزش', 'زده کړې'], health: ['صحت', 'روغتیا'], agriculture: ['زراعت', 'کرنه'], administration: ['اداری', 'اداري'], logistics: ['لوجستیک', 'لوژستیک'], 'human resources': ['منابع بشری', 'بشري سرچینې'],
  'as per company scale': ['مطابق مقررات معاش شرکت', 'د شرکت د معاش د اصولو له مخې'], 'as per organization salary scale': ['مطابق مقررات معاش سازمان', 'د ادارې د معاش د اصولو له مخې'], 'as per organization scale': ['مطابق مقررات معاش سازمان', 'د ادارې د معاش د اصولو له مخې'], 'as per salary scale': ['مطابق مقررات معاش', 'د معاش د اصولو له مخې'], negotiable: ['قابل مذاکره', 'د خبرو وړ'], competitive: ['معاش رقابتی', 'سیالي لرونکی معاش'],
};
const NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
function localizedDigits(text: string, lang: Lang): string {
  return lang === 'en' ? text : text.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}
function wordKey(value: string): string {
  return value.toLowerCase().replace(/[‐‑–—-]/g, ' ').replace(/\s+/g, ' ').trim();
}
export function translateFactValue(value: string, lang: Lang): string {
  if (lang === 'en') return value;
  const key = wordKey(value);
  const exact = WORDS[key];
  if (exact) return exact[lang === 'fa' ? 0 : 1];
  // Keep amounts and reference codes unchanged except localized numerals.
  if (!/\p{L}/u.test(value)) return localizedDigits(value, lang);
  const duration = value.toLowerCase().trim().match(/^(\d+(?:\s*[-–]\s*\d+)?|one|two|three|four|five|six|seven|eight|nine|ten|twelve)(\+)?\s+(years?|months?|weeks?|days?)(?:\s+(?:of\s+)?experience)?$/);
  if (duration) {
    const count = NUMBERS[duration[1]] ?? duration[1];
    const unit = duration[3].replace(/s$/, '');
    const names = lang === 'fa' ? { year: 'سال', month: 'ماه', week: 'هفته', day: 'روز' } : { year: Number(count) === 1 ? 'کال' : 'کاله', month: 'میاشتې', week: 'اونۍ', day: 'ورځې' };
    return `${localizedDigits(String(count), lang)} ${names[unit as keyof typeof names]}${duration[2] ? lang === 'fa' ? ' و بیشتر' : ' او زیات' : ''}`;
  }
  const parts = value.split(/\s*[,;]\s*/);
  if (parts.length > 1) return parts.map(p => translateFactValue(p, lang)).join(lang === 'fa' || lang === 'ps' ? '، ' : ', ');
  return value;
}

const COUNTRY_CODES: Record<string, string> = {
  afghanistan:'AF', germany:'DE', belgium:'BE', 'united kingdom':'GB', uk:'GB', 'united states':'US', usa:'US', france:'FR', 'united arab emirates':'AE', singapore:'SG', japan:'JP', switzerland:'CH', australia:'AU', 'saudi arabia':'SA', canada:'CA', estonia:'EE', thailand:'TH', iceland:'IS', vietnam:'VN', sweden:'SE', nigeria:'NG', russia:'RU', kyrgyzstan:'KG', mexico:'MX', ghana:'GH', italy:'IT', 'south korea':'KR', 'korea south':'KR', china:'CN', austria:'AT', 'new zealand':'NZ', denmark:'DK', netherlands:'NL', holland:'NL', indonesia:'ID', pakistan:'PK', hungary:'HU', portugal:'PT', spain:'ES', greece:'GR', turkey:'TR', india:'IN', norway:'NO', finland:'FI', ireland:'IE', malaysia:'MY', bangladesh:'BD', qatar:'QA', iran:'IR', tajikistan:'TJ', uzbekistan:'UZ',
};
const PROVINCES: Record<string, [string, string]> = {
  Badakhshan:['بدخشان','بدخشان'],Badghis:['بادغیس','بادغیس'],Baghlan:['بغلان','بغلان'],Balkh:['بلخ','بلخ'],Bamyan:['بامیان','بامیان'],Daykundi:['دایکندی','دایکندي'],Farah:['فراه','فراه'],Faryab:['فاریاب','فاریاب'],Ghazni:['غزنی','غزني'],Ghor:['غور','غور'],Helmand:['هلمند','هلمند'],Herat:['هرات','هرات'],Jowzjan:['جوزجان','جوزجان'],Kabul:['کابل','کابل'],Kandahar:['قندهار','کندهار'],Kapisa:['کاپیسا','کاپیسا'],Khost:['خوست','خوست'],Kunar:['کنر','کونړ'],Kunduz:['کندز','کندز'],Laghman:['لغمان','لغمان'],Logar:['لوگر','لوګر'],'Maidan Wardak':['میدان وردک','میدان وردګ'],Nangarhar:['ننگرهار','ننګرهار'],Nimruz:['نیمروز','نیمروز'],Nuristan:['نورستان','نورستان'],Paktia:['پکتیا','پکتیا'],Paktika:['پکتیکا','پکتیکا'],Panjshir:['پنجشیر','پنجشېر'],Parwan:['پروان','پروان'],Samangan:['سمنگان','سمنګان'],'Sar-e Pol':['سرپل','سرپل'],Takhar:['تخار','تخار'],Uruzgan:['ارزگان','ارزګان'],Zabul:['زابل','زابل'],
};
export function localizeLocation(value: string, lang: Lang): string {
  if (lang === 'en') return value;
  return value.split(/\s*(?:,|&|—)\s*/).map(part => {
    const province = normalizeProvince(part);
    if (province && PROVINCES[province]) return PROVINCES[province][lang === 'fa' ? 0 : 1];
    if (/^mazar[ -](?:i[ -])?sharif$/i.test(part)) return lang === 'fa' ? 'مزار شریف' : 'مزار شریف';
    if (/^multiple \(europe\)$/i.test(part)) return lang === 'fa' ? 'چند کشور اروپایی' : 'څو اروپايي هېوادونه';
    const code = COUNTRY_CODES[part.toLowerCase().replace(/\)$/, '')];
    if (!code) return part;
    try { return new Intl.DisplayNames([lang], { type: 'region' }).of(code) || part; } catch { return part; }
  }).filter(Boolean).join('، ');
}

export interface FactsInput {
  organization?: string | null;
  country?: string | null;
  jobType?: string | null; jobTypeI18n?: unknown;
  salary?: string | null; salaryI18n?: unknown;
  educationReq?: string | null; educationReqI18n?: unknown;
  experience?: string | null; experienceI18n?: unknown;
  extractedData?: unknown; extractedDataI18n?: unknown;
}
export function translatedFact(source: FactSource, translations: unknown, lang: Lang): string {
  const root = factObject(translations);
  const values = factObject(root[lang]);
  const autoSources = factObject(factObject(root._sources)[lang]);
  for (const [key, raw] of Object.entries(values)) {
    const def = definitionByKey.get(normalizeFactKey(key));
    if (def?.key !== source.key) continue;
    // Auto translations may only describe the same source. Manual values
    // without a recorded source keep their existing precedence.
    if (autoSources[key] !== undefined && autoSources[key] !== source.value) continue;
    const value = factText(raw);
    if (value) return value;
  }
  return source.value;
}
export function buildOpportunityFacts(
  row: FactsInput,
  lang: Lang,
  formatted: { location?: string; deadline?: string; posted?: string } = {},
): OpportunityFact[] {
  const rawSources = publicFactSources(row.extractedData);
  const sources = new Map(rawSources.map(s => [s.key, s]));
  const primary: Record<string, string> = {
    organization: row.organization || '', location: formatted.location || row.country || '',
    jobType: row.jobType || '', salary: row.salary || '', educationReq: row.educationReq || '', experience: row.experience || '',
    deadline: formatted.deadline || '', posted: formatted.posted || '',
  };
  const facts: OpportunityFact[] = [];
  for (const def of DEFINITIONS) {
    const source = sources.get(def.key);
    const base = factText(primary[def.key]) || source?.value || '';
    if (!base) continue;
    let value = base;
    const i18n = (row as unknown as JsonObject)[`${def.key}I18n`];
    if (i18n) value = getLocalizedContent(base, i18n, lang);
    if (source && (!primary[def.key] || source.value === base) && value === base) value = translatedFact(source, row.extractedDataI18n, lang);
    value = def.key === 'location' || def.key === 'eligibleCountries' ? localizeLocation(value, lang) : def.code ? value : translateFactValue(value, lang);
    // Employment schedule is not a second opportunity category.
    if (def.key === 'workType' && wordKey(base) === wordKey(primary.jobType || '')) continue;
    const properName = ['organization', 'hostInstitution'].includes(def.key);
    const original = lang !== 'en' && !def.code && !properName && !['deadline', 'posted'].includes(def.key) && /[a-z]{3}/i.test(value);
    facts.push({ key: def.key, label: def.labels[lang === 'en' ? 0 : lang === 'fa' ? 1 : 2], value, original });
  }
  return facts;
}

const preservedName = (s: FactSource) => ['organization', 'hostInstitution'].includes(s.key);
const controlled = (s: FactSource, lang: Exclude<Lang, 'en'>) => ['location', 'eligibleCountries'].includes(s.key) ? localizeLocation(s.value, lang) : translateFactValue(s.value, lang);

export function factNeedsTranslation(source: FactSource, i18n: unknown, lang: Exclude<Lang, 'en'>, sourceLang?: string | null): boolean {
  if (source.code || preservedName(source) || !/\p{L}/u.test(source.value)) return false;
  const current = translatedFact(source, i18n, lang);
  if (current !== source.value) return false;
  const value = controlled(source, lang);
  if (value !== source.value && !/[a-z]{3}/i.test(value)) return false;
  if (!/[a-z]{3}/i.test(source.value)) return sourceLang !== lang && sourceLang !== null && sourceLang !== undefined;
  return true;
}

/** Cheap, idempotent vocabulary backfill. Never replaces a supplied translation. */
export function materializeFactTranslations(raw: unknown, current: unknown): Record<string, unknown> | null {
  const root = factObject(current);
  const allSources = { ...factObject(root._sources) };
  const next = { ...root };
  let changed = false;
  for (const lang of ['fa', 'ps'] as const) {
    const values = { ...factObject(root[lang]) };
    const sources = { ...factObject(allSources[lang]) };
    for (const source of publicFactSources(raw)) {
      if (translatedFact(source, root, lang) !== source.value) continue;
      const value = source.code || preservedName(source) ? source.value : controlled(source, lang);
      if (value === source.value && /\p{L}/u.test(value) && !source.code && !preservedName(source)) continue;
      if (values[source.key] === value && sources[source.key] === source.value) continue;
      values[source.key] = value;
      sources[source.key] = source.value;
      changed = true;
    }
    next[lang] = values;
    allSources[lang] = sources;
  }
  if (!changed) return null;
  next._sources = allSources;
  return next as Record<string, unknown>;
}
