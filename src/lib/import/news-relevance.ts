/**
 * News topical relevance engine (deterministic, zero AI calls).
 *
 * WHY: ARIA HUB is a jobs / scholarships / visas / opportunities platform.
 * General Afghan news feeds (ToloNews, Ariana, Amu TV, Etilaat Roz) publish
 * everything — war reports, crime, foreign conflicts, sport — which the
 * platform must NOT show. This module scores every RSS item BEFORE it reaches
 * the News table and keeps only platform-relevant items in English, Farsi/Farsi
 * and Pashto.
 *
 * RULE (tuned against the real 95-row R22 scrape):
 *   1. HARD BLOCK — war/security, crime/accidents, foreign conflicts,
 *      US politics, sport → reject when matched in the TITLE or CATEGORIES
 *      (body text is ignored here: a scholarship story mentioning an attack
 *      in its summary must survive).
 *   2. TOPICAL SCORE — strong platform topics (employment, education,
 *      visas/migration, training, economy/business, humanitarian aid, tech)
 *      score title=2, categories=2, summary=1.
 *      Weak context topics (women/youth, health, infrastructure, governance)
 *      score 1 and can only help, never qualify alone.
 *   3. KEEP when  strong >= 2   OR   (strong >= 1 AND weak >= 2).
 *
 * Everything is plain substring/word-boundary matching on normalized text
 * (ZWNJ stripped, Arabic/Y Kaf unified, lowercased) — no network, no model.
 */

// ─── Public types ────────────────────────────────────────────────────────────

export interface NewsRelevanceInput {
  title: string;
  categories?: string[];
  /** Short plain-text summary/excerpt — only used as a weak signal. */
  summary?: string;
}

export interface NewsRelevanceVerdict {
  relevant: boolean;
  /** Set when a hard-block category fired (war, crime, sport, …). */
  blockedBy: string | null;
  strongScore: number;
  weakScore: number;
  /** Strong topics that matched, e.g. ['education','visas-migration']. */
  matchedTopics: string[];
}

// ─── Text normalization (fa/ps/en) ───────────────────────────────────────────

/** Normalize for matching: unify script variants, drop ZWNJ, lowercase. */
export function normalizeNewsText(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/[\u200c\u200f\u200e\u00ad]/g, '') // ZWNJ/RLM/LRM/soft hyphen
    .replace(/[يﻱﻲ]/g, 'ی')
    .replace(/[كﮐﮑ]/g, 'ک')
    .replace(/[ۀة]/g, 'ه')
    .replace(/[أإآا]/g, 'ا')
    .replace(/[\u064b-\u065f\u0670]/g, '') // harakat
    .replace(/\s+/g, ' ')
    .trim();
}

/** Word-boundary-ish match so 'کار' hits standalone 'کار' but not 'پاکستان'. */
function containsTerm(haystack: string, term: string): boolean {
  const t = normalizeNewsText(term);
  if (!t) return false;
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, 'u');
  return re.test(haystack);
}

// ─── Hard blocks (title / categories only) ───────────────────────────────────

const HARD_BLOCKS: Array<{ topic: string; terms: string[] }> = [
  {
    topic: 'war-security',
    terms: [
      'war', 'wartime', 'attack', 'attacks', 'attacked', 'airstrike', 'airstrikes',
      'bombing', 'explosion', 'blast', 'blasts', 'suicide bomber', 'terror', 'terrorism',
      'terrorist', 'militant', 'militants', 'clash', 'clashes', 'missile', 'mortar',
      'drone strike', 'drones',
      'defense', 'defence', 'military', 'troops', 'security forces', 'insecurity',
      'jihad', '9/11', 'al-qaeda', 'isis', 'isil', 'is-k',
      'جنگ', 'حمله', 'حملهی', 'حملههای', 'حملات', 'ترور', 'تروریسم', 'تروریستی', 'انتحاری',
      'انفجار', 'ماین', 'راکت', 'نظامی', 'امنیت', 'ناامنی', 'وسله وال', 'وسلهوال',
      'جنګ', 'برید', 'پوځی', 'وسله والو', 'دفاع',
    ],
  },
  {
    topic: 'crime-accident',
    terms: [
      'murder', 'murdered', 'killed', 'killing', 'found dead', 'dead body', 'corpse',
      'kidnapped', 'abducted', 'traffic accident', 'road accident', 'crime', 'criminal',
      'rape', 'suicide',
      'قتل', 'کشته', 'جسد', 'ربایش', 'آدم‌ربایی', 'حادثه', 'جنایت', 'تجاوز',
      'ووژل', 'وژنی', 'قتلهای',
    ],
  },
  {
    topic: 'foreign-conflict-politics',
    terms: [
      'israel', 'israeli', 'gaza', 'west bank', 'houthis', 'houthi', 'yemen',
      'hezbollah', 'ukraine', 'zelensky', 'putin', 'kremlin', 'trump', 'biden',
      'white house', 'midterm', 'midterms', 'us election', 'u.s. election',
      'palestin', 'sudan', 'somalia',
      'اسرائیل', 'اسرائيل', 'غزه', 'فلسطین', 'حوثی', 'یمن', 'حزب‌الله', 'لبنان',
      'اوکراین', 'زلنسکی', 'پوتین', 'کرملین', 'ترامپ', 'بایدن', 'کاخ سفید',
      'شهرک‌سازی', 'کرانه باختری',
    ],
  },
  {
    topic: 'sports-entertainment',
    terms: [
      'football', 'soccer', 'cricket', 'sport', 'sports', 'champions league',
      'world cup', 'league', 'tournament', 'olympic', 'medal', 'match report',
      'فوتبال', 'کرکټ', 'کرکت', 'لیگ', 'ورزش', 'ورزشی', 'لوبډله', 'ټورنمنټ',
      'چمپیون',
    ],
  },
];

// ─── Strong platform topics ──────────────────────────────────────────────────

const STRONG_TOPICS: Array<{ topic: string; terms: string[] }> = [
  {
    topic: 'employment',
    terms: [
      'job', 'jobs', 'jobless', 'hiring', 'employment', 'unemployed', 'unemployment',
      'vacancy', 'vacancies', 'recruitment', 'workforce', 'labour', 'labor market',
      'career', 'careers', 'livelihood', 'livelihoods', 'wages', 'salary',
      'کار', 'کارمند', 'کارمندان', 'کارگر', 'کارگران', 'کارجو', 'کارکوونکی',
      'کارکوونکي', 'بیکار', 'بیکاری', 'استخدام', 'بازار کار', 'دنده', 'معاش',
      'روزګار', 'د کار',
    ],
  },
  {
    topic: 'education-scholarships',
    terms: [
      'scholarship', 'scholarships', 'fellowship', 'fellowships', 'education',
      'school', 'schools', 'university', 'universities', 'student', 'students',
      'teacher', 'teachers', 'exam', 'exams', 'kank', 'entrance exam', 'tuition',
      'academic', 'campus', 'literacy',
      'بورس', 'بورسیه', 'تحصیلی', 'تحصیل', 'آموزش', 'آموزشی', 'تعلیم', 'تعلیمی',
      'مکتب', 'مکاتب', 'پوهنتون', 'پوهنتونونه', 'پوهنځی', 'دانشگاه', 'دانشگاه‌ها',
      'دانشجو', 'دانشجویان', 'دانش‌آموز', 'دانش آموز', 'دانشاموز', 'محصل',
      'محصلین', 'محصلینو', 'معلم', 'معلمان', 'ښوونکی', 'ښوونکې', 'زده کړه',
      'کنکور', 'امتحان', 'درس',
    ],
  },
  {
    topic: 'visas-migration',
    terms: [
      'visa', 'visas', 'passport', 'passports', 'immigration', 'emigration',
      'migrant', 'migrants', 'migration', 'refugee', 'refugees', 'asylum',
      'returnee', 'returnees', 'deportation', 'deportations', 'repatriation',
      'expulsion', 'expulsions', 'expelled', 'diaspora', 'displaced', 'displacement',
      'idps',
      'ویزه', 'ویزې', 'پاسپورت', 'مهاجرت', 'مهاجر', 'مهاجرین', 'مهاجران',
      'پناهنده', 'پناهندگان', 'پناه جویان', 'اخراج', 'بازگشت', 'کوچ',
      'مهاجرینو', 'اوبدوډه', 'بي کوره', 'بی‌جا شده',
    ],
  },
  {
    topic: 'training-opportunities',
    terms: [
      'internship', 'internships', 'training', 'trainings', 'workshop', 'workshops',
      'seminar', 'seminars', 'bootcamp', 'capacity building', 'volunteer',
      'volunteering', 'grant', 'grants', 'hackathon', 'incubator', 'accelerator',
      'mentorship', 'apprenticeship', 'exchange program', 'exchange programs',
      'کارآموز', 'کارگاه', 'کارگاه‌های', 'سمینار', 'مهارت', 'مهارت‌آموزی',
      'ظرفیت', 'ظرفیت‌سازی', 'دوره', 'دوره‌های', 'کارغالی', 'روزنه',
    ],
  },
  {
    topic: 'economy-business',
    terms: [
      'economy', 'economic', 'trade', 'exports', 'import', 'investment',
      'investments', 'business', 'businesses', 'entrepreneur', 'entrepreneurs',
      'entrepreneurship', 'startup', 'startups', 'agriculture', 'agricultural',
      'farmers', 'private sector', 'chamber of commerce', 'exhibition', 'expo',
      'trade fair', 'tariff', 'revenue', 'budget', 'market economy',
      'اقتصاد', 'اقتصادی', 'تجارت', 'تجاری', 'صادرات', 'واردات', 'سرمایه',
      'سرمایه‌گذاری', 'کشاورزی', 'زراعت', 'کاروبار', 'کارآفرین', 'بازار',
      'نمایشگاه', 'بازارموندنه', 'بازارموندنې', 'مالداری', 'عواید', 'بودجه',
    ],
  },
  {
    topic: 'humanitarian-aid',
    terms: [
      'humanitarian', 'aid', 'relief', 'assistance', 'unhcr', 'wfp', 'unicef',
      'world food programme', 'world food program', 'donor', 'donors', 'funding',
      'food aid', 'drought relief', 'earthquake relief',
      'کمک', 'کمکها', 'کمکهای', 'بشردوستانه', 'مساعدت', 'خیریه', 'امداد',
      'صندوق', 'مرستندویه', 'خوراکی',
    ],
  },
  {
    topic: 'tech-digital',
    terms: [
      'artificial intelligence', 'ict', 'digital', 'technology', 'internet',
      'coding', 'programming', 'freelancing', 'online work', 'remote work',
      'هوش مصنوعی', 'مصنوعي ځیرکتیا', 'تکنالوژی', 'ټیکنالوژي', 'دیجیتال',
      'انترنت', 'برمجیات',
    ],
  },
];

// ─── Weak context topics (never qualify alone) ───────────────────────────────

const WEAK_TOPICS: Array<{ topic: string; terms: string[] }> = [
  {
    topic: 'women-youth',
    terms: [
      'women', 'woman', 'girl', 'girls', 'youth', 'young people', 'female',
      'زنان', 'زن', 'دختران', 'دختر', 'جوانان', 'جوان', 'نجونې', 'ښځینه',
      'ښځو', 'ځوانان', 'ځوانانو', 'بنتان',
    ],
  },
  {
    topic: 'health',
    terms: [
      'health', 'healthcare', 'hospital', 'hospitals', 'clinic', 'midwife',
      'nurse', 'nurses', 'doctors', 'polio', 'vaccination',
      'صحت', 'صحی', 'سلامتی', 'روغتیا', 'روغتون', 'شفاخانه', 'بیمارستان',
      'درمان', 'واکسین', 'پولیو', 'قابله', 'نرس',
    ],
  },
  {
    topic: 'infrastructure',
    terms: [
      'infrastructure', 'electricity', 'clean water', 'water supply', 'energy',
      'railway', 'salang',
      'زیربنا', 'برق', 'آب', 'اوبو', 'سرک', 'سړک', 'برېښنا',
    ],
  },
  {
    topic: 'governance-services',
    terms: [
      'civil service', 'bureaucracy', 'public services', 'e-governance',
      'administrative reform', 'بروکراسی', 'روند اداری', 'اداری', 'ریفرم',
    ],
  },
];

// ─── Scoring ─────────────────────────────────────────────────────────────────

interface Baskets { title: string; categories: string; summary: string }

/**
 * TV/radio round-up bulletins aggregate many stories — their excerpt is a
 * topic soup that produces false positives. When the TITLE looks like a
 * bulletin, the summary basket is discarded (title+categories only).
 */
const BULLETIN_TITLE_RE =
  /\b(6|7|8|9)\s?(am|pm)\s*news\b|\bnews\s*[-–—]\s*\d{1,2}\s\w{3,9}\s\d{4}\b|خبر ساعت|فراخبر|طلوع‌نیوز - خبر/i;

function toBaskets(input: NewsRelevanceInput): Baskets {
  return {
    title: normalizeNewsText(input.title),
    categories: normalizeNewsText((input.categories || []).join(' · ')),
    summary: BULLETIN_TITLE_RE.test(input.title || '')
      ? ''
      : normalizeNewsText((input.summary || '').slice(0, 600)),
  };
}

function firstBlock(b: Baskets): string | null {
  // Hard blocks apply to title + categories only (never the summary).
  const surface = `${b.title} || ${b.categories}`;
  for (const group of HARD_BLOCKS) {
    if (group.terms.some((term) => containsTerm(surface, term))) return group.topic;
  }
  return null;
}

function scoreTopics(
  b: Baskets,
  groups: Array<{ topic: string; terms: string[] }>,
  weights: { title: number; categories: number; summary: number },
): { total: number; matched: string[] } {
  let total = 0;
  const matched: string[] = [];
  for (const group of groups) {
    let best = 0;
    if (group.terms.some((t) => containsTerm(b.title, t))) best = Math.max(best, weights.title);
    if (group.terms.some((t) => containsTerm(b.categories, t))) best = Math.max(best, weights.categories);
    if (group.terms.some((t) => containsTerm(b.summary, t))) best = Math.max(best, weights.summary);
    if (best > 0) {
      total += best;
      matched.push(group.topic);
    }
  }
  return { total, matched };
}

/**
 * Classify a news item for platform relevance.
 * Keep when: no hard block AND (strong >= 2 OR (strong >= 1 AND weak >= 2)).
 */
export function classifyNewsRelevance(input: NewsRelevanceInput): NewsRelevanceVerdict {
  const b = toBaskets(input);
  const blockedBy = firstBlock(b);
  const strong = scoreTopics(b, STRONG_TOPICS, { title: 2, categories: 2, summary: 1 });
  const weak = scoreTopics(b, WEAK_TOPICS, { title: 1, categories: 1, summary: 1 });

  const relevant =
    blockedBy === null && (strong.total >= 2 || (strong.total >= 1 && weak.total >= 2));

  return {
    relevant,
    blockedBy,
    strongScore: strong.total,
    weakScore: weak.total,
    matchedTopics: strong.matched,
  };
}

/** Convenience: one-line reason for logs / admin surfaces. */
export function relevanceReason(v: NewsRelevanceVerdict): string {
  if (v.blockedBy) return `blocked:${v.blockedBy}`;
  if (v.relevant) return `keep:strong=${v.strongScore} weak=${v.weakScore} [${v.matchedTopics.join(',')}]`;
  return `drop:strong=${v.strongScore} weak=${v.weakScore}`;
}
