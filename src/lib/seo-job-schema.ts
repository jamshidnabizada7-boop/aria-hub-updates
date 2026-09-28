/**
 * Pure, tested helpers for building Google Rich Results compliant JobPosting schema.
 *
 * Resolves Google Search Console structured data issues:
 * - Missing field "hiringOrganization" (required)
 * - Missing field "jobLocation" (required)
 * - Missing field "addressLocality" (in "jobLocation.address")
 * - Missing field "streetAddress" (in "jobLocation.address")
 * - Missing field "addressRegion" (in "jobLocation.address")
 * - Missing field "postalCode" (in "jobLocation.address")
 * - Missing field "validThrough" (recommended)
 * - Missing field "baseSalary" (recommended, parsed to MonetaryAmount + QuantitativeValue)
 */

export interface PostalAddressSchema {
  '@type': 'PostalAddress';
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
}

export interface PlaceSchema {
  '@type': 'Place';
  address: PostalAddressSchema;
}

export interface QuantitativeValueSchema {
  '@type': 'QuantitativeValue';
  value?: number;
  minValue?: number;
  maxValue?: number;
  unitText: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
}

export interface MonetaryAmountSchema {
  '@type': 'MonetaryAmount';
  currency: string;
  value: QuantitativeValueSchema;
}

export interface OrganizationSchema {
  '@type': 'Organization';
  name: string;
  sameAs: string;
  logo: string;
}

export interface JobPostingSchema {
  '@context': 'https://schema.org';
  '@type': 'JobPosting';
  title: string;
  description: string;
  url: string;
  identifier: {
    '@type': 'PropertyValue';
    name: string;
    value: string;
  };
  datePosted: string;
  validThrough: string;
  employmentType: string;
  directApply: boolean;
  hiringOrganization: OrganizationSchema;
  jobLocation: PlaceSchema;
  jobLocationType?: 'TELECOMMUTE';
  applicantLocationRequirements?: {
    '@type': 'Country';
    name: string;
  };
  baseSalary?: MonetaryAmountSchema;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert Eastern Arabic (۰-۹) and Arabic-Indic (٠-٩) numerals to standard ASCII (0-9). */
export function normalizeEasternDigits(str: string): string {
  const easternDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(easternDigits[i], String(i)).replaceAll(arabicDigits[i], String(i));
  }
  return res.replace(/٬/g, ',').replace(/٫/g, '.');
}

/**
 * Normalizes Persian/Arabic character variations (Yeh and Kaf) for robust text matching.
 */
function normalizePersianText(str: string): string {
  return str
    .replace(/\u064a/g, '\u06cc') // Arabic Yeh to Persian Yeh
    .replace(/\u0649/g, '\u06cc') // Alef Maksura to Persian Yeh
    .replace(/\u0643/g, '\u06a9') // Arabic Kaf to Persian Kaf
    .replace(/[\u200B-\u200D\uFEFF]/g, ' ') // Zero-width spaces to space
    .trim();
}

/**
 * Parses free-form salary text into a Schema.org MonetaryAmount.
 * Supports USD, AFN, EUR, GBP, CAD, AUD, monthly/annual/hourly rates, ranges,
 * Persian/Pashto numerals, and extracts from description when salary column is missing.
 */
export function parseBaseSalary(
  salaryStr: string | null | undefined,
  description?: string | null
): MonetaryAmountSchema | undefined {
  let text = (salaryStr || '').trim();

  // If salary is empty or generic, probe description for concrete salary/stipend mentions
  if (!text || isGenericSalaryText(text)) {
    if (description) {
      const extracted = extractSalarySnippetFromDescription(description);
      if (extracted) {
        text = extracted;
      }
    }
  }

  if (!text || isGenericSalaryText(text)) return undefined;

  const normalized = normalizePersianText(normalizeEasternDigits(text));
  const lower = normalized.toLowerCase();

  // 1. Detect Currency
  let currency = 'USD';
  if (
    lower.includes('afn') ||
    lower.includes('afs') ||
    /\baf\b/i.test(lower) ||
    normalized.includes('افغانی') ||
    normalized.includes('افغانۍ') ||
    normalized.includes('افغانیو')
  ) {
    currency = 'AFN';
  } else if (
    lower.includes('eur') ||
    normalized.includes('€') ||
    normalized.includes('یورو') ||
    lower.includes('euro')
  ) {
    currency = 'EUR';
  } else if (
    lower.includes('gbp') ||
    normalized.includes('£') ||
    normalized.includes('پوند') ||
    lower.includes('pound')
  ) {
    currency = 'GBP';
  } else if (lower.includes('cad') || lower.includes('c$')) {
    currency = 'CAD';
  } else if (lower.includes('aud') || lower.includes('a$')) {
    currency = 'AUD';
  } else if (
    lower.includes('usd') ||
    normalized.includes('$') ||
    normalized.includes('دالر') ||
    normalized.includes('ډالر') ||
    lower.includes('dollar')
  ) {
    currency = 'USD';
  }

  // 2. Detect unitText / Pay Frequency (from text with experience stripped to avoid false positives)
  const cleanedForUnit = normalized
    .replace(/\d+\s*(?:[-–—]|to|الی|تر|تا)?\s*\d*\s*(?:years?|yrs?|سال|کال)(?:\s*(?:of\s*)?experience)?/gi, ' ')
    .replace(/(?:experience|سابقه‌کار|تجربه\s*کاری?)\s*[:\-]?\s*\d+\s*(?:years?|yrs?|سال|کال)/gi, ' ');
  const lowerUnit = cleanedForUnit.toLowerCase();

  let unitText: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' = 'MONTH';
  if (
    lowerUnit.includes('hour') ||
    lowerUnit.includes('/hr') ||
    lowerUnit.includes('hourly') ||
    cleanedForUnit.includes('ساعت')
  ) {
    unitText = 'HOUR';
  } else if (
    lowerUnit.includes('year') ||
    lowerUnit.includes('annual') ||
    lowerUnit.includes('/yr') ||
    lowerUnit.includes('annum') ||
    cleanedForUnit.includes('سال') ||
    cleanedForUnit.includes('کال')
  ) {
    unitText = 'YEAR';
  } else if (
    lowerUnit.includes('week') ||
    lowerUnit.includes('/wk') ||
    lowerUnit.includes('weekly') ||
    cleanedForUnit.includes('هفته') ||
    cleanedForUnit.includes('اونۍ')
  ) {
    unitText = 'WEEK';
  } else if (
    lowerUnit.includes('day') ||
    lowerUnit.includes('/day') ||
    lowerUnit.includes('daily') ||
    lowerUnit.includes('per diem') ||
    cleanedForUnit.includes('روز') ||
    cleanedForUnit.includes('ورځ')
  ) {
    unitText = 'DAY';
  } else {
    unitText = 'MONTH';
  }

  // 3. Clean string by removing non-salary numbers (years of experience, grade/step numbers, multi-million grants)
  const cleaned = cleanSalaryTextForNumberExtraction(normalized);

  // 4. Try matching Range: "900 - 1,200", "65,000–85,000", "7000 to 30000"
  const rangeMatch = cleaned.match(
    /(?:^|[^\d])(\d[\d,\.]*)\s*(?:[-–—]|to|الی|تر|تا)\s*(\d[\d,\.]*)(?:[^\d]|$)/i
  );

  if (rangeMatch) {
    const minVal = parseNumberValue(rangeMatch[1]);
    const maxVal = parseNumberValue(rangeMatch[2]);
    if (minVal > 0 && maxVal >= minVal && isPlausibleSalary(minVal, currency, unitText)) {
      return {
        '@type': 'MonetaryAmount',
        currency,
        value: {
          '@type': 'QuantitativeValue',
          minValue: minVal,
          maxValue: maxVal,
          unitText,
        },
      };
    }
  }

  // 5. Try matching Single value adjacent to currency or salary terms
  // First attempt: adjacent to $, AFN, USD, Afs, EUR, GBP, دالر, افغانی
  const adjacentMatch = cleaned.match(
    /(?:[$€£]\s*|USD\s*|AFN\s*|EUR\s*|GBP\s*|Afs\s*|دالر\s*|افغانی\s*|تنخواه\s*|معاش\s*)(\d[\d,\.]*)|(\d[\d,\.]*)\s*(?:[$€£]|USD|AFN|EUR|GBP|Afs|دالر|افغانی|افغانۍ)/i
  );
  if (adjacentMatch) {
    const rawNum = adjacentMatch[1] || adjacentMatch[2];
    const val = parseNumberValue(rawNum);
    if (val > 0 && isPlausibleSalary(val, currency, unitText)) {
      return {
        '@type': 'MonetaryAmount',
        currency,
        value: {
          '@type': 'QuantitativeValue',
          value: val,
          unitText,
        },
      };
    }
  }

  // Fallback: any standalone number in the cleaned string
  const singleMatch = cleaned.match(/\b(\d[\d,\.]*)\b/);
  if (singleMatch) {
    const val = parseNumberValue(singleMatch[1]);
    if (val > 0 && isPlausibleSalary(val, currency, unitText)) {
      return {
        '@type': 'MonetaryAmount',
        currency,
        value: {
          '@type': 'QuantitativeValue',
          value: val,
          unitText,
        },
      };
    }
  }

  return undefined;
}

/** Check if text is a vague placeholder like "Competitive" or "As per scale" */
function isGenericSalaryText(text: string): boolean {
  const t = text.toLowerCase();
  if (/^(?:as\s*per|according\s*to|competitive|negotiable|not\s*disclosed|tbd|n\/a|scale|structure)/i.test(t)) {
    // Only generic if it contains no digits
    return !/\d/.test(t);
  }
  if (/^(?:حق‌الزحمه|توافقی|مطابق|طبق|بر اساس|نامشخص)/.test(text)) {
    return !/[\d۰-۹٠-٩]/.test(text);
  }
  return false;
}

/** Parses numeric strings with comma or period thousand separators */
function parseNumberValue(raw: string): number {
  let str = raw.trim();
  // Handle European/Persian style dot separator e.g. "1.200" or "45.000" where dot is followed by 3 digits
  if (/^\d{1,3}\.\d{3}$/.test(str)) {
    str = str.replace('.', '');
  } else {
    str = str.replace(/,/g, '');
  }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

/** Sanitize salary text by eliminating false positives like "3-5 years experience" and "Grade 4" */
function cleanSalaryTextForNumberExtraction(text: string): string {
  return text
    // Remove experience snippets: "3-5 years", "2 to 3 years experience", "3 سال تجربه"
    .replace(/\d+\s*(?:[-–—]|to|الی|تر|تا)?\s*\d*\s*(?:years?|yrs?|سال|کال)(?:\s*(?:of\s*)?experience)?/gi, ' ')
    // Remove grade/step snippets: "Grade 4", "Step 2", "رتبه ۴", "بست ۳"
    .replace(/(?:grade|step|level|tier|رتبه|بست|گرید)\s*#?\s*[a-z0-9]+/gi, ' ')
    // Remove vacancy counts: "10 vacancies", "1 position"
    .replace(/\d+\s*(?:vacanc(?:y|ies)|positions?|موقعیت)/gi, ' ')
    // Remove hours per week: "40 hours / week"
    .replace(/\d+\s*(?:hours?|hrs?|ساعت)\s*(?:per|\/|در)\s*(?:week|هفته)/gi, ' ')
    // Remove multi-million dollar amounts (these are funding pools, not salaries): "$4 million"
    .replace(/[$€£]?\s*\d+(?:\.\d+)?\s*(?:million|billion|میلیون|میلیارد)/gi, ' ')
    // Remove calendar years: "2026", "2027"
    .replace(/\b202[0-9]\b/g, ' ')
    // Clean currency symbols from number adjacency
    .replace(/[$€£]/g, ' ');
}

/** Plausibility guard to prevent returning absurd amounts like $3/month or $4/year */
function isPlausibleSalary(amount: number, currency: string, unitText: string): boolean {
  if (amount <= 0) return false;
  if (currency === 'AFN') {
    if (unitText === 'HOUR') return amount >= 50 && amount <= 50000;
    if (unitText === 'DAY') return amount >= 200 && amount <= 100000;
    if (unitText === 'WEEK') return amount >= 1000 && amount <= 500000;
    if (unitText === 'MONTH') return amount >= 2000 && amount <= 5000000;
    if (unitText === 'YEAR') return amount >= 24000 && amount <= 60000000;
  } else {
    // USD, EUR, GBP, CAD, AUD
    if (unitText === 'HOUR') return amount >= 5 && amount <= 1000;
    if (unitText === 'DAY') return amount >= 20 && amount <= 10000;
    if (unitText === 'WEEK') return amount >= 50 && amount <= 50000;
    if (unitText === 'MONTH') return amount >= 100 && amount <= 500000;
    if (unitText === 'YEAR') return amount >= 1000 && amount <= 5000000;
  }
  return true;
}

/** Extracts candidate salary sentences or phrases from description text */
function extractSalarySnippetFromDescription(desc: string): string | null {
  const patterns = [
    /(?:salary|stipend|payment|compensation|allowance|معاش|تنخواه|حق‌الزحمه)\s*(?:range)?\s*(?:is|of|between|:)?\s*([^.\n;]{3,60})/i,
    /(\$\s*\d[\d,\.]*\s*(?:[-–—]|to)\s*[$]?\s*\d[\d,\.]*(?:\s*(?:per|\/)\s*(?:month|year|hr|hour))?)/i,
    /(AFN\s*\d[\d,\.]*\s*(?:[-–—]|to)\s*(?:AFN\s*)?\d[\d,\.]*(?:\s*(?:per|\/)\s*(?:month|year))?)/i,
    /(\d[\d,\.]*\s*(?:[-–—]|to)\s*\d[\d,\.]*\s*(?:USD|AFN|EUR|GBP)\s*(?:\/\s*monthly|\/\s*month)?)/i,
    /(US\$\s*\d[\d,\.]*\s*[-–—]\s*US\$\s*\d[\d,\.]*)/i,
    /(\$\d[\d,\.]*\s*(?:per month|per year|monthly|annualized base salary|stipend))/i,
  ];

  for (const pattern of patterns) {
    const m = desc.match(pattern);
    if (m && m[1]) {
      return m[1].trim();
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Location Directories
// ---------------------------------------------------------------------------

interface LocationDirectoryEntry {
  locality: string;
  region: string;
  postalCode: string;
  country: string;
}

/**
 * Afghan provinces and major urban centers mapped across English, Dari/Persian, and Pashto.
 */
const AFGHAN_LOCATIONS: Record<string, LocationDirectoryEntry> = {
  kabul: { locality: 'Kabul', region: 'Kabul Province', postalCode: '1001', country: 'Afghanistan' },
  کابل: { locality: 'Kabul', region: 'Kabul Province', postalCode: '1001', country: 'Afghanistan' },
  herat: { locality: 'Herat', region: 'Herat Province', postalCode: '3001', country: 'Afghanistan' },
  هرات: { locality: 'Herat', region: 'Herat Province', postalCode: '3001', country: 'Afghanistan' },
  mazar: { locality: 'Mazar-i-Sharif', region: 'Balkh Province', postalCode: '1701', country: 'Afghanistan' },
  balkh: { locality: 'Mazar-i-Sharif', region: 'Balkh Province', postalCode: '1701', country: 'Afghanistan' },
  بلخ: { locality: 'Mazar-i-Sharif', region: 'Balkh Province', postalCode: '1701', country: 'Afghanistan' },
  'مزار شریف': { locality: 'Mazar-i-Sharif', region: 'Balkh Province', postalCode: '1701', country: 'Afghanistan' },
  'مزارشریف': { locality: 'Mazar-i-Sharif', region: 'Balkh Province', postalCode: '1701', country: 'Afghanistan' },
  kandahar: { locality: 'Kandahar', region: 'Kandahar Province', postalCode: '3801', country: 'Afghanistan' },
  کندهار: { locality: 'Kandahar', region: 'Kandahar Province', postalCode: '3801', country: 'Afghanistan' },
  قندهار: { locality: 'Kandahar', region: 'Kandahar Province', postalCode: '3801', country: 'Afghanistan' },
  jalalabad: { locality: 'Jalalabad', region: 'Nangarhar Province', postalCode: '2601', country: 'Afghanistan' },
  nangarhar: { locality: 'Jalalabad', region: 'Nangarhar Province', postalCode: '2601', country: 'Afghanistan' },
  ننگرهار: { locality: 'Jalalabad', region: 'Nangarhar Province', postalCode: '2601', country: 'Afghanistan' },
  'جلال آباد': { locality: 'Jalalabad', region: 'Nangarhar Province', postalCode: '2601', country: 'Afghanistan' },
  'جلال اباد': { locality: 'Jalalabad', region: 'Nangarhar Province', postalCode: '2601', country: 'Afghanistan' },
  kunduz: { locality: 'Kunduz', region: 'Kunduz Province', postalCode: '3501', country: 'Afghanistan' },
  کندز: { locality: 'Kunduz', region: 'Kunduz Province', postalCode: '3501', country: 'Afghanistan' },
  قندوز: { locality: 'Kunduz', region: 'Kunduz Province', postalCode: '3501', country: 'Afghanistan' },
  badakhshan: { locality: 'Faizabad', region: 'Badakhshan Province', postalCode: '3401', country: 'Afghanistan' },
  faizabad: { locality: 'Faizabad', region: 'Badakhshan Province', postalCode: '3401', country: 'Afghanistan' },
  بدخشان: { locality: 'Faizabad', region: 'Badakhshan Province', postalCode: '3401', country: 'Afghanistan' },
  'فیض آباد': { locality: 'Faizabad', region: 'Badakhshan Province', postalCode: '3401', country: 'Afghanistan' },
  'فیض اباد': { locality: 'Faizabad', region: 'Badakhshan Province', postalCode: '3401', country: 'Afghanistan' },
  bamyan: { locality: 'Bamyan', region: 'Bamyan Province', postalCode: '1601', country: 'Afghanistan' },
  بامیان: { locality: 'Bamyan', region: 'Bamyan Province', postalCode: '1601', country: 'Afghanistan' },
  ghazni: { locality: 'Ghazni', region: 'Ghazni Province', postalCode: '2301', country: 'Afghanistan' },
  غزنی: { locality: 'Ghazni', region: 'Ghazni Province', postalCode: '2301', country: 'Afghanistan' },
  غزنه: { locality: 'Ghazni', region: 'Ghazni Province', postalCode: '2301', country: 'Afghanistan' },
  baghlan: { locality: 'Pul-e-Khumri', region: 'Baghlan Province', postalCode: '3601', country: 'Afghanistan' },
  بغلان: { locality: 'Pul-e-Khumri', region: 'Baghlan Province', postalCode: '3601', country: 'Afghanistan' },
  'پلخمری': { locality: 'Pul-e-Khumri', region: 'Baghlan Province', postalCode: '3601', country: 'Afghanistan' },
  'پل خمری': { locality: 'Pul-e-Khumri', region: 'Baghlan Province', postalCode: '3601', country: 'Afghanistan' },
  khost: { locality: 'Khost', region: 'Khost Province', postalCode: '2501', country: 'Afghanistan' },
  خوست: { locality: 'Khost', region: 'Khost Province', postalCode: '2501', country: 'Afghanistan' },
  helmand: { locality: 'Lashkargah', region: 'Helmand Province', postalCode: '3901', country: 'Afghanistan' },
  هلمند: { locality: 'Lashkargah', region: 'Helmand Province', postalCode: '3901', country: 'Afghanistan' },
  lashkargah: { locality: 'Lashkargah', region: 'Helmand Province', postalCode: '3901', country: 'Afghanistan' },
  لشکرگاه: { locality: 'Lashkargah', region: 'Helmand Province', postalCode: '3901', country: 'Afghanistan' },
  farah: { locality: 'Farah', region: 'Farah Province', postalCode: '3101', country: 'Afghanistan' },
  فراه: { locality: 'Farah', region: 'Farah Province', postalCode: '3101', country: 'Afghanistan' },
  faryab: { locality: 'Maymana', region: 'Faryab Province', postalCode: '1801', country: 'Afghanistan' },
  فاریاب: { locality: 'Maymana', region: 'Faryab Province', postalCode: '1801', country: 'Afghanistan' },
  میمنه: { locality: 'Maymana', region: 'Faryab Province', postalCode: '1801', country: 'Afghanistan' },
  parwan: { locality: 'Charikar', region: 'Parwan Province', postalCode: '1101', country: 'Afghanistan' },
  پروان: { locality: 'Charikar', region: 'Parwan Province', postalCode: '1101', country: 'Afghanistan' },
  چاریکار: { locality: 'Charikar', region: 'Parwan Province', postalCode: '1101', country: 'Afghanistan' },
  samangan: { locality: 'Aybak', region: 'Samangan Province', postalCode: '1301', country: 'Afghanistan' },
  سمنگان: { locality: 'Aybak', region: 'Samangan Province', postalCode: '1301', country: 'Afghanistan' },
  takhar: { locality: 'Taloqan', region: 'Takhar Province', postalCode: '3701', country: 'Afghanistan' },
  تخار: { locality: 'Taloqan', region: 'Takhar Province', postalCode: '3701', country: 'Afghanistan' },
  paktia: { locality: 'Gardez', region: 'Paktia Province', postalCode: '2201', country: 'Afghanistan' },
  پکتیا: { locality: 'Gardez', region: 'Paktia Province', postalCode: '2201', country: 'Afghanistan' },
  گردیز: { locality: 'Gardez', region: 'Paktia Province', postalCode: '2201', country: 'Afghanistan' },
  paktika: { locality: 'Sharana', region: 'Paktika Province', postalCode: '2401', country: 'Afghanistan' },
  پکتیکا: { locality: 'Sharana', region: 'Paktika Province', postalCode: '2401', country: 'Afghanistan' },
  kunar: { locality: 'Asadabad', region: 'Kunar Province', postalCode: '2801', country: 'Afghanistan' },
  کنر: { locality: 'Asadabad', region: 'Kunar Province', postalCode: '2801', country: 'Afghanistan' },
  laghman: { locality: 'Mehtarlam', region: 'Laghman Province', postalCode: '2701', country: 'Afghanistan' },
  لغمان: { locality: 'Mehtarlam', region: 'Laghman Province', postalCode: '2701', country: 'Afghanistan' },
  panjshir: { locality: 'Bazarak', region: 'Panjshir Province', postalCode: '1201', country: 'Afghanistan' },
  پنجشیر: { locality: 'Bazarak', region: 'Panjshir Province', postalCode: '1201', country: 'Afghanistan' },
  kapisa: { locality: 'Mahmud-i-Raqi', region: 'Kapisa Province', postalCode: '1051', country: 'Afghanistan' },
  کاپیسا: { locality: 'Mahmud-i-Raqi', region: 'Kapisa Province', postalCode: '1051', country: 'Afghanistan' },
  logar: { locality: 'Pul-i-Alam', region: 'Logar Province', postalCode: '1091', country: 'Afghanistan' },
  لوگر: { locality: 'Pul-i-Alam', region: 'Logar Province', postalCode: '1091', country: 'Afghanistan' },
  wardak: { locality: 'Maidan Shahr', region: 'Wardak Province', postalCode: '1151', country: 'Afghanistan' },
  وردک: { locality: 'Maidan Shahr', region: 'Wardak Province', postalCode: '1151', country: 'Afghanistan' },
  ghor: { locality: 'Chaghcharan', region: 'Ghor Province', postalCode: '2001', country: 'Afghanistan' },
  غور: { locality: 'Chaghcharan', region: 'Ghor Province', postalCode: '2001', country: 'Afghanistan' },
  daikundi: { locality: 'Nili', region: 'Daikundi Province', postalCode: '1401', country: 'Afghanistan' },
  دایکندی: { locality: 'Nili', region: 'Daikundi Province', postalCode: '1401', country: 'Afghanistan' },
  uruzgan: { locality: 'Tarinkot', region: 'Uruzgan Province', postalCode: '1501', country: 'Afghanistan' },
  ارزگان: { locality: 'Tarinkot', region: 'Uruzgan Province', postalCode: '1501', country: 'Afghanistan' },
  zabul: { locality: 'Qalat', region: 'Zabul Province', postalCode: '3951', country: 'Afghanistan' },
  زابل: { locality: 'Qalat', region: 'Zabul Province', postalCode: '3951', country: 'Afghanistan' },
  nimroz: { locality: 'Zaranj', region: 'Nimroz Province', postalCode: '3201', country: 'Afghanistan' },
  نیمروز: { locality: 'Zaranj', region: 'Nimroz Province', postalCode: '3201', country: 'Afghanistan' },
  badghis: { locality: 'Qala-e-Naw', region: 'Badghis Province', postalCode: '1901', country: 'Afghanistan' },
  بادغیس: { locality: 'Qala-e-Naw', region: 'Badghis Province', postalCode: '1901', country: 'Afghanistan' },
  'sar-e pol': { locality: 'Sar-e Pol', region: 'Sar-e Pol Province', postalCode: '1751', country: 'Afghanistan' },
  سرپل: { locality: 'Sar-e Pol', region: 'Sar-e Pol Province', postalCode: '1751', country: 'Afghanistan' },
  'سر پل': { locality: 'Sar-e Pol', region: 'Sar-e Pol Province', postalCode: '1751', country: 'Afghanistan' },
  nuristan: { locality: 'Parun', region: 'Nuristan Province', postalCode: '2901', country: 'Afghanistan' },
  نورستان: { locality: 'Parun', region: 'Nuristan Province', postalCode: '2901', country: 'Afghanistan' },
  jawzjan: { locality: 'Sheberghan', region: 'Jawzjan Province', postalCode: '2101', country: 'Afghanistan' },
  جوزجان: { locality: 'Sheberghan', region: 'Jawzjan Province', postalCode: '2101', country: 'Afghanistan' },
};

/**
 * Comprehensive international destination directory covering key scholarship and employment countries.
 */
const INTERNATIONAL_COUNTRIES: Record<string, LocationDirectoryEntry> = {
  'united states': { locality: 'Washington', region: 'DC', postalCode: '20001', country: 'United States' },
  usa: { locality: 'Washington', region: 'DC', postalCode: '20001', country: 'United States' },
  'u.s.': { locality: 'Washington', region: 'DC', postalCode: '20001', country: 'United States' },
  us: { locality: 'Washington', region: 'DC', postalCode: '20001', country: 'United States' },
  'آمریکا': { locality: 'Washington', region: 'DC', postalCode: '20001', country: 'United States' },
  'ایالات متحده': { locality: 'Washington', region: 'DC', postalCode: '20001', country: 'United States' },
  'united kingdom': { locality: 'London', region: 'Greater London', postalCode: 'SW1A 1AA', country: 'United Kingdom' },
  uk: { locality: 'London', region: 'Greater London', postalCode: 'SW1A 1AA', country: 'United Kingdom' },
  britain: { locality: 'London', region: 'Greater London', postalCode: 'SW1A 1AA', country: 'United Kingdom' },
  england: { locality: 'London', region: 'Greater London', postalCode: 'SW1A 1AA', country: 'United Kingdom' },
  'انگلستان': { locality: 'London', region: 'Greater London', postalCode: 'SW1A 1AA', country: 'United Kingdom' },
  'بریتانیا': { locality: 'London', region: 'Greater London', postalCode: 'SW1A 1AA', country: 'United Kingdom' },
  germany: { locality: 'Berlin', region: 'Berlin', postalCode: '10115', country: 'Germany' },
  deutschland: { locality: 'Berlin', region: 'Berlin', postalCode: '10115', country: 'Germany' },
  'آلمان': { locality: 'Berlin', region: 'Berlin', postalCode: '10115', country: 'Germany' },
  canada: { locality: 'Ottawa', region: 'ON', postalCode: 'K1P 1J1', country: 'Canada' },
  'کانادا': { locality: 'Ottawa', region: 'ON', postalCode: 'K1P 1J1', country: 'Canada' },
  australia: { locality: 'Canberra', region: 'ACT', postalCode: '2600', country: 'Australia' },
  'استرالیا': { locality: 'Canberra', region: 'ACT', postalCode: '2600', country: 'Australia' },
  france: { locality: 'Paris', region: 'Île-de-France', postalCode: '75001', country: 'France' },
  'فرانسه': { locality: 'Paris', region: 'Île-de-France', postalCode: '75001', country: 'France' },
  japan: { locality: 'Tokyo', region: 'Tokyo', postalCode: '100-0001', country: 'Japan' },
  'ژاپن': { locality: 'Tokyo', region: 'Tokyo', postalCode: '100-0001', country: 'Japan' },
  'جاپان': { locality: 'Tokyo', region: 'Tokyo', postalCode: '100-0001', country: 'Japan' },
  turkey: { locality: 'Ankara', region: 'Ankara', postalCode: '06010', country: 'Turkey' },
  türkiye: { locality: 'Ankara', region: 'Ankara', postalCode: '06010', country: 'Turkey' },
  'ترکیه': { locality: 'Ankara', region: 'Ankara', postalCode: '06010', country: 'Turkey' },
  pakistan: { locality: 'Islamabad', region: 'Islamabad Capital Territory', postalCode: '44000', country: 'Pakistan' },
  'پاکستان': { locality: 'Islamabad', region: 'Islamabad Capital Territory', postalCode: '44000', country: 'Pakistan' },
  india: { locality: 'New Delhi', region: 'Delhi', postalCode: '110001', country: 'India' },
  'هند': { locality: 'New Delhi', region: 'Delhi', postalCode: '110001', country: 'India' },
  'هندوستان': { locality: 'New Delhi', region: 'Delhi', postalCode: '110001', country: 'India' },
  sweden: { locality: 'Stockholm', region: 'Stockholm', postalCode: '111 20', country: 'Sweden' },
  'سوئد': { locality: 'Stockholm', region: 'Stockholm', postalCode: '111 20', country: 'Sweden' },
  'سویدن': { locality: 'Stockholm', region: 'Stockholm', postalCode: '111 20', country: 'Sweden' },
  switzerland: { locality: 'Bern', region: 'Bern', postalCode: '3000', country: 'Switzerland' },
  'سوئیس': { locality: 'Bern', region: 'Bern', postalCode: '3000', country: 'Switzerland' },
  'سویس': { locality: 'Bern', region: 'Bern', postalCode: '3000', country: 'Switzerland' },
  italy: { locality: 'Rome', region: 'Lazio', postalCode: '00100', country: 'Italy' },
  'ایتالیا': { locality: 'Rome', region: 'Lazio', postalCode: '00100', country: 'Italy' },
  netherlands: { locality: 'Amsterdam', region: 'North Holland', postalCode: '1012 JS', country: 'Netherlands' },
  holland: { locality: 'Amsterdam', region: 'North Holland', postalCode: '1012 JS', country: 'Netherlands' },
  'هلند': { locality: 'Amsterdam', region: 'North Holland', postalCode: '1012 JS', country: 'Netherlands' },
  'هالند': { locality: 'Amsterdam', region: 'North Holland', postalCode: '1012 JS', country: 'Netherlands' },
  china: { locality: 'Beijing', region: 'Beijing', postalCode: '100000', country: 'China' },
  'چین': { locality: 'Beijing', region: 'Beijing', postalCode: '100000', country: 'China' },
  'saudi arabia': { locality: 'Riyadh', region: 'Riyadh', postalCode: '11564', country: 'Saudi Arabia' },
  'عربستان': { locality: 'Riyadh', region: 'Riyadh', postalCode: '11564', country: 'Saudi Arabia' },
  uae: { locality: 'Dubai', region: 'Dubai', postalCode: '00000', country: 'United Arab Emirates' },
  'united arab emirates': { locality: 'Dubai', region: 'Dubai', postalCode: '00000', country: 'United Arab Emirates' },
  'امارات': { locality: 'Dubai', region: 'Dubai', postalCode: '00000', country: 'United Arab Emirates' },
  qatar: { locality: 'Doha', region: 'Doha', postalCode: '00000', country: 'Qatar' },
  'قطر': { locality: 'Doha', region: 'Doha', postalCode: '00000', country: 'Qatar' },
  iran: { locality: 'Tehran', region: 'Tehran Province', postalCode: '11369', country: 'Iran' },
  'ایران': { locality: 'Tehran', region: 'Tehran Province', postalCode: '11369', country: 'Iran' },
  tajikistan: { locality: 'Dushanbe', region: 'Dushanbe', postalCode: '734000', country: 'Tajikistan' },
  'تاجیکستان': { locality: 'Dushanbe', region: 'Dushanbe', postalCode: '734000', country: 'Tajikistan' },
  uzbekistan: { locality: 'Tashkent', region: 'Tashkent', postalCode: '100000', country: 'Uzbekistan' },
  'ازبکستان': { locality: 'Tashkent', region: 'Tashkent', postalCode: '100000', country: 'Uzbekistan' },
  kazakhstan: { locality: 'Astana', region: 'Astana', postalCode: '010000', country: 'Kazakhstan' },
  'قزاقستان': { locality: 'Astana', region: 'Astana', postalCode: '010000', country: 'Kazakhstan' },
  kyrgyzstan: { locality: 'Bishkek', region: 'Bishkek', postalCode: '720000', country: 'Kyrgyzstan' },
  'قرغیزستان': { locality: 'Bishkek', region: 'Bishkek', postalCode: '720000', country: 'Kyrgyzstan' },
  norway: { locality: 'Oslo', region: 'Oslo', postalCode: '0150', country: 'Norway' },
  'نروژ': { locality: 'Oslo', region: 'Oslo', postalCode: '0150', country: 'Norway' },
  'ناروی': { locality: 'Oslo', region: 'Oslo', postalCode: '0150', country: 'Norway' },
  finland: { locality: 'Helsinki', region: 'Uusimaa', postalCode: '00100', country: 'Finland' },
  'فنلاند': { locality: 'Helsinki', region: 'Uusimaa', postalCode: '00100', country: 'Finland' },
  denmark: { locality: 'Copenhagen', region: 'Capital Region', postalCode: '1050', country: 'Denmark' },
  'دانمارک': { locality: 'Copenhagen', region: 'Capital Region', postalCode: '1050', country: 'Denmark' },
  austria: { locality: 'Vienna', region: 'Vienna', postalCode: '1010', country: 'Austria' },
  'اتریش': { locality: 'Vienna', region: 'Vienna', postalCode: '1010', country: 'Austria' },
  belgium: { locality: 'Brussels', region: 'Brussels-Capital', postalCode: '1000', country: 'Belgium' },
  'بلژیک': { locality: 'Brussels', region: 'Brussels-Capital', postalCode: '1000', country: 'Belgium' },
  'بلجیم': { locality: 'Brussels', region: 'Brussels-Capital', postalCode: '1000', country: 'Belgium' },
  poland: { locality: 'Warsaw', region: 'Masovian', postalCode: '00-001', country: 'Poland' },
  'لهستان': { locality: 'Warsaw', region: 'Masovian', postalCode: '00-001', country: 'Poland' },
  'پولند': { locality: 'Warsaw', region: 'Masovian', postalCode: '00-001', country: 'Poland' },
  malaysia: { locality: 'Kuala Lumpur', region: 'Federal Territory', postalCode: '50450', country: 'Malaysia' },
  'مالزی': { locality: 'Kuala Lumpur', region: 'Federal Territory', postalCode: '50450', country: 'Malaysia' },
  'مالیزیا': { locality: 'Kuala Lumpur', region: 'Federal Territory', postalCode: '50450', country: 'Malaysia' },
  singapore: { locality: 'Singapore', region: 'Central', postalCode: '018989', country: 'Singapore' },
  'سنگاپور': { locality: 'Singapore', region: 'Central', postalCode: '018989', country: 'Singapore' },
  'south korea': { locality: 'Seoul', region: 'Seoul', postalCode: '03000', country: 'South Korea' },
  korea: { locality: 'Seoul', region: 'Seoul', postalCode: '03000', country: 'South Korea' },
  'کره جنوبی': { locality: 'Seoul', region: 'Seoul', postalCode: '03000', country: 'South Korea' },
  'کوریای جنوبی': { locality: 'Seoul', region: 'Seoul', postalCode: '03000', country: 'South Korea' },
  russia: { locality: 'Moscow', region: 'Moscow', postalCode: '101000', country: 'Russia' },
  'روسیه': { locality: 'Moscow', region: 'Moscow', postalCode: '101000', country: 'Russia' },
  spain: { locality: 'Madrid', region: 'Madrid', postalCode: '28001', country: 'Spain' },
  'اسپانیا': { locality: 'Madrid', region: 'Madrid', postalCode: '28001', country: 'Spain' },
  portugal: { locality: 'Lisbon', region: 'Lisbon', postalCode: '1000-001', country: 'Portugal' },
  'پرتغال': { locality: 'Lisbon', region: 'Lisbon', postalCode: '1000-001', country: 'Portugal' },
  'پرتگال': { locality: 'Lisbon', region: 'Lisbon', postalCode: '1000-001', country: 'Portugal' },
  ireland: { locality: 'Dublin', region: 'Leinster', postalCode: 'D02', country: 'Ireland' },
  'ایرلند': { locality: 'Dublin', region: 'Leinster', postalCode: 'D02', country: 'Ireland' },
  'new zealand': { locality: 'Wellington', region: 'Wellington', postalCode: '6011', country: 'New Zealand' },
  'نیوزیلند': { locality: 'Wellington', region: 'Wellington', postalCode: '6011', country: 'New Zealand' },
  brazil: { locality: 'Brasilia', region: 'Federal District', postalCode: '70000-000', country: 'Brazil' },
  'برزیل': { locality: 'Brasilia', region: 'Federal District', postalCode: '70000-000', country: 'Brazil' },
  kenya: { locality: 'Nairobi', region: 'Nairobi County', postalCode: '00100', country: 'Kenya' },
  'کینیا': { locality: 'Nairobi', region: 'Nairobi County', postalCode: '00100', country: 'Kenya' },
  egypt: { locality: 'Cairo', region: 'Cairo Governorate', postalCode: '11511', country: 'Egypt' },
  'مصر': { locality: 'Cairo', region: 'Cairo Governorate', postalCode: '11511', country: 'Egypt' },
  hungary: { locality: 'Budapest', region: 'Central Hungary', postalCode: '1011', country: 'Hungary' },
  'مجارستان': { locality: 'Budapest', region: 'Central Hungary', postalCode: '1011', country: 'Hungary' },
  czech: { locality: 'Prague', region: 'Prague', postalCode: '110 00', country: 'Czech Republic' },
  czechia: { locality: 'Prague', region: 'Prague', postalCode: '110 00', country: 'Czech Republic' },
  'czech republic': { locality: 'Prague', region: 'Prague', postalCode: '110 00', country: 'Czech Republic' },
  romania: { locality: 'Bucharest', region: 'Bucharest', postalCode: '010011', country: 'Romania' },
  'رومانی': { locality: 'Bucharest', region: 'Bucharest', postalCode: '010011', country: 'Romania' },
  greece: { locality: 'Athens', region: 'Attica', postalCode: '104 31', country: 'Greece' },
  'یونان': { locality: 'Athens', region: 'Attica', postalCode: '104 31', country: 'Greece' },
  'multiple (europe)': { locality: 'Brussels', region: 'Brussels-Capital', postalCode: '1000', country: 'Belgium' },
  europe: { locality: 'Brussels', region: 'Brussels-Capital', postalCode: '1000', country: 'Belgium' },
  'اروپا': { locality: 'Brussels', region: 'Brussels-Capital', postalCode: '1000', country: 'Belgium' },
};

export interface ResolvedLocation {
  isRemote: boolean;
  jobLocation: PlaceSchema;
  jobLocationType?: 'TELECOMMUTE';
  applicantLocationRequirements?: {
    '@type': 'Country';
    name: string;
  };
}

/**
 * Builds complete job location data guaranteed to satisfy Google's Rich Results validator.
 * Provides all 5 PostalAddress fields (streetAddress, addressLocality, addressRegion,
 * postalCode, addressCountry) to eliminate all Search Console missing field warnings.
 */
export function buildJobLocation(
  countryInput: string | null | undefined,
  orgName?: string | null,
  provinces?: string[] | null
): ResolvedLocation {
  const raw = (countryInput || '').trim();
  const normalized = normalizePersianText(raw);
  const lower = normalized.toLowerCase();

  const isRemote =
    !raw ||
    lower.includes('remote') ||
    lower.includes('online') ||
    lower.includes('telecommute') ||
    lower.includes('virtual') ||
    normalized.includes('دورکاری') ||
    normalized.includes('آنلاین') ||
    normalized.includes('مجازی');

  const streetFallback = orgName?.trim()
    ? `${orgName.trim()} Central Office`
    : 'Central District';

  if (isRemote) {
    // If a specific country is mentioned alongside remote (e.g. "Remote - United States"),
    // extract that country for applicantLocationRequirements and anchor location.
    let remoteCountryName = 'Afghanistan';
    let remoteLoc = AFGHAN_LOCATIONS.kabul;

    for (const [key, entry] of Object.entries(INTERNATIONAL_COUNTRIES)) {
      if (lower.includes(key) || normalized.includes(key)) {
        remoteCountryName = entry.country;
        remoteLoc = entry;
        break;
      }
    }

    return {
      isRemote: true,
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: {
        '@type': 'Country',
        name: remoteCountryName,
      },
      // Anchor location with complete 5-field PostalAddress
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          streetAddress: streetFallback,
          addressLocality: remoteLoc.locality,
          addressRegion: remoteLoc.region,
          postalCode: remoteLoc.postalCode,
          addressCountry: remoteLoc.country,
        },
      },
    };
  }

  // Structured province rows win first (canonical 34-province whitelist) —
  // they are authoritative, unlike substring matching on the country column.
  const afghanKeys = Object.keys(AFGHAN_LOCATIONS);
  const resolveAfghanEntry = (province: string) => {
    const p = province.toLowerCase().replace(/\s+/g, ' ').trim();
    if (AFGHAN_LOCATIONS[p as keyof typeof AFGHAN_LOCATIONS]) {
      return AFGHAN_LOCATIONS[p as keyof typeof AFGHAN_LOCATIONS];
    }
    // "Maidan Wardak" → 'wardak', "Sar-e Pol" → 'sar-e pol', etc.
    const tokens = p.split(/[\s-]+/).filter((t) => t.length >= 3);
    for (const token of tokens) {
      const hit = afghanKeys.find((k) => k === token || k.replace(/[\s-]+/g, '') === token.replace(/[\s-]+/g, ''));
      if (hit) return AFGHAN_LOCATIONS[hit as keyof typeof AFGHAN_LOCATIONS];
    }
    return null;
  };
  for (const province of provinces || []) {
    const entry = resolveAfghanEntry(province);
    if (entry) {
      return {
        isRemote: false,
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            streetAddress: streetFallback,
            addressLocality: entry.locality,
            addressRegion: entry.region,
            postalCode: entry.postalCode,
            addressCountry: entry.country,
          },
        },
      };
    }
  }

  // Check if text mentions a known Afghan city or province (in English, Persian, or Pashto)
  for (const [key, entry] of Object.entries(AFGHAN_LOCATIONS)) {
    if (lower.includes(key) || normalized.includes(key)) {
      return {
        isRemote: false,
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            streetAddress: streetFallback,
            addressLocality: entry.locality,
            addressRegion: entry.region,
            postalCode: entry.postalCode,
            addressCountry: entry.country,
          },
        },
      };
    }
  }

  // Check international directory
  for (const [key, entry] of Object.entries(INTERNATIONAL_COUNTRIES)) {
    if (lower.includes(key) || normalized.includes(key)) {
      return {
        isRemote: false,
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            streetAddress: streetFallback,
            addressLocality: entry.locality,
            addressRegion: entry.region,
            postalCode: entry.postalCode,
            addressCountry: entry.country,
          },
        },
      };
    }
  }

  // If country mentions Afghanistan or default Afghan fallback
  if (
    lower.includes('afghanistan') ||
    normalized.includes('افغانستان') ||
    lower.includes('afg')
  ) {
    return {
      isRemote: false,
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          streetAddress: streetFallback,
          addressLocality: 'Kabul',
          addressRegion: 'Kabul Province',
          postalCode: '1001',
          addressCountry: 'Afghanistan',
        },
      },
    };
  }

  // Other country: extract cleanest country name without city or extra punctuation
  const cleanCountry = raw.split(/[,;\-\/]/)[0].trim() || raw;
  return {
    isRemote: false,
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: streetFallback,
        addressLocality: cleanCountry,
        addressRegion: cleanCountry,
        postalCode: '00000',
        addressCountry: cleanCountry,
      },
    },
  };
}

/**
 * Builds guaranteed valid hiringOrganization schema with name, sameAs, logo.
 */
export function buildHiringOrganization(
  organization: string | null | undefined,
  options?: {
    website?: string | null;
    logoUrl?: string | null;
    sourceName?: string | null;
    siteUrl?: string;
  }
): OrganizationSchema {
  const siteUrl = options?.siteUrl || 'https://www.myariahub.com';
  const name =
    organization?.trim() ||
    options?.sourceName?.trim() ||
    'ARIA HUB';

  // Normalize website URL if provided
  let sameAs = siteUrl;
  if (options?.website && options.website.trim()) {
    const rawWeb = options.website.trim();
    if (rawWeb.startsWith('http://') || rawWeb.startsWith('https://')) {
      sameAs = rawWeb;
    } else if (rawWeb.includes('.')) {
      sameAs = `https://${rawWeb}`;
    }
  }

  // Normalize logo URL
  let logo = `${siteUrl}/images/logo-mark.webp`;
  if (options?.logoUrl && options.logoUrl.trim()) {
    const rawLogo = options.logoUrl.trim();
    if (rawLogo.startsWith('http://') || rawLogo.startsWith('https://')) {
      logo = rawLogo;
    } else if (rawLogo.startsWith('//')) {
      logo = `https:${rawLogo}`;
    } else if (rawLogo.startsWith('/')) {
      logo = `${siteUrl}${rawLogo}`;
    }
  }

  return {
    '@type': 'Organization',
    name,
    sameAs,
    logo,
  };
}

/**
 * Builds validThrough ISO string.
 * - If deadline is present and valid, returns its ISO string.
 * - If deadline is missing or invalid:
 *   - For published (active) listings, defaults to 90 days from the current date or posting date
 *     to prevent Google from prematurely marking active opportunities as expired.
 *   - For expired/archived listings, preserves the safe expiration date.
 */
export function buildValidThrough(
  deadline: Date | string | null | undefined,
  safePostedDate: Date,
  status?: string | null
): string {
  if (deadline) {
    const d = deadline instanceof Date ? deadline : new Date(deadline);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  // Default to 90 days from posting date
  const standardFallback = new Date(safePostedDate.getTime() + 90 * 86_400_000);

  // If the listing is actively published but the 90-day window from creation has already lapsed,
  // extend validThrough from today so Google does not immediately drop the active listing.
  if (status === 'published' && standardFallback.getTime() < Date.now()) {
    return new Date(Date.now() + 90 * 86_400_000).toISOString();
  }

  return standardFallback.toISOString();
}

/**
 * Maps arbitrary jobType string to standard Schema.org employmentType enum.
 */
export function mapEmploymentType(jobType: string | null | undefined): string {
  if (!jobType) return 'FULL_TIME';
  const jt = jobType.toUpperCase();
  if (jt.includes('INTERN')) return 'INTERN';
  if (jt.includes('PART')) return 'PART_TIME';
  if (jt.includes('CONTRACT') || jt.includes('FREELANCE') || jt.includes('PROJECT')) return 'CONTRACTOR';
  if (jt.includes('TEMPORARY') || jt.includes('TEMP')) return 'TEMPORARY';
  if (jt.includes('VOLUNTEER')) return 'VOLUNTEER';
  return 'FULL_TIME';
}

export interface BuildJobPostingOptions {
  title: string;
  slug: string;
  description?: string;
  organization?: string | null;
  country?: string | null;
  /** Canonical province/admin-1 names from OpportunityLocation rows. */
  provinces?: string[] | null;
  jobType?: string | null;
  salary?: string | null;
  deadline?: Date | string | null;
  publishedDate?: string | null;
  createdAt?: Date | string | null;
  website?: string | null;
  applyUrl?: string | null;
  logoUrl?: string | null;
  sourceName?: string | null;
  siteUrl?: string;
  lang?: string;
  extractedData?: Record<string, unknown> | null;
  status?: string | null;
}

/**
 * Master generator for complete Google Rich Results compliant JobPosting JSON-LD.
 */
export function buildJobPostingPayload(opts: BuildJobPostingOptions): JobPostingSchema {
  const siteUrl = opts.siteUrl || 'https://www.myariahub.com';
  const lang = opts.lang || 'en';
  const pageUrl = `${siteUrl}/${lang}/opportunities/${opts.slug}`;

  // Safe posted date
  let safePostedDate: Date = new Date();
  if (opts.publishedDate) {
    const d = new Date(opts.publishedDate);
    if (!isNaN(d.getTime())) safePostedDate = d;
  } else if (opts.createdAt) {
    const d = opts.createdAt instanceof Date ? opts.createdAt : new Date(opts.createdAt);
    if (!isNaN(d.getTime())) safePostedDate = d;
  }
  const datePostedIso = safePostedDate.toISOString().slice(0, 10);

  // Hiring organization
  const hiringOrganization = buildHiringOrganization(opts.organization, {
    website: opts.website,
    logoUrl: opts.logoUrl,
    sourceName: opts.sourceName,
    siteUrl,
  });

  // Location
  const loc = buildJobLocation(opts.country, hiringOrganization.name, opts.provinces);

  // Valid through
  const validThrough = buildValidThrough(opts.deadline, safePostedDate, opts.status);

  // Base salary resolution: check opts.salary -> extractedData -> description
  let rawSalary = opts.salary;
  if (!rawSalary && opts.extractedData) {
    const ed = opts.extractedData as Record<string, unknown>;
    rawSalary =
      (typeof ed.salary === 'string' && ed.salary) ||
      (typeof ed.Salary === 'string' && ed.Salary) ||
      (typeof ed['Salary range'] === 'string' && ed['Salary range']) ||
      (typeof ed['Salary Range'] === 'string' && ed['Salary Range']) ||
      null;
  }
  const baseSalary = parseBaseSalary(rawSalary, opts.description);

  // Employment type
  const employmentType = mapEmploymentType(opts.jobType);

  const desc = opts.description?.trim() || opts.title || 'Opportunity details on ARIA HUB';

  const schema: JobPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: opts.title,
    description: desc,
    url: pageUrl,
    identifier: {
      '@type': 'PropertyValue',
      name: opts.title,
      value: opts.slug,
    },
    datePosted: datePostedIso,
    validThrough,
    employmentType,
    directApply: Boolean(opts.applyUrl),
    hiringOrganization,
    jobLocation: loc.jobLocation,
  };

  if (loc.isRemote) {
    schema.jobLocationType = 'TELECOMMUTE';
    if (loc.applicantLocationRequirements) {
      schema.applicantLocationRequirements = loc.applicantLocationRequirements;
    }
  }

  if (baseSalary) {
    schema.baseSalary = baseSalary;
  }

  return schema;
}
