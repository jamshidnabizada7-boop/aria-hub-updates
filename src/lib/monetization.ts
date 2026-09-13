/**
 * Monetization product catalog — single source of truth for the paid-posting
 * funnel (Phase-2 of docs/GROWTH-MONETIZATION-PLAN.md).
 *
 * Prices are set from Afghan market benchmarks (see plan §4 Phase 2):
 * local companies pay AFN cash/hawala, international NGOs pay USD via
 * Payoneer/Wise. The AFN column is informational (≈70 AFN/USD anchor).
 *
 * IMPORTANT: never trust client-sent prices — the order API quotes from this
 * catalog only.
 */

export type ProductKey =
  | 'job_local'
  | 'job_intl'
  | 'featured_7d'
  | 'scholarship_promo'
  | 'sponsored_slot'
  | 'community_boost'
  | 'cv_review'
  | 'hiring_pack';

export interface ProductDef {
  usd: number;
  afn: number;
  /** delivery duration in days (informational) */
  days: number;
  /** includes a Telegram/WhatsApp channel spotlight */
  telegram: boolean;
  /** i18n key namespace: advertise.products.<key> */
  key: ProductKey;
  /** product families for the form's second-level copy */
  needsOpportunity: boolean;
}

export const PRODUCT_CATALOG: Record<ProductKey, ProductDef> = {
  job_local: { usd: 25, afn: 1800, days: 30, telegram: false, key: 'job_local', needsOpportunity: false },
  job_intl: { usd: 50, afn: 3600, days: 30, telegram: false, key: 'job_intl', needsOpportunity: false },
  featured_7d: { usd: 25, afn: 1800, days: 7, telegram: true, key: 'featured_7d', needsOpportunity: true },
  scholarship_promo: { usd: 150, afn: 10500, days: 30, telegram: true, key: 'scholarship_promo', needsOpportunity: false },
  sponsored_slot: { usd: 30, afn: 2100, days: 1, telegram: true, key: 'sponsored_slot', needsOpportunity: false },
  community_boost: { usd: 15, afn: 1050, days: 7, telegram: true, key: 'community_boost', needsOpportunity: true },
  cv_review: { usd: 12, afn: 850, days: 2, telegram: false, key: 'cv_review', needsOpportunity: false },
  hiring_pack: { usd: 99, afn: 6900, days: 30, telegram: true, key: 'hiring_pack', needsOpportunity: false },
};

export const PRODUCT_KEYS = Object.keys(PRODUCT_CATALOG) as ProductKey[];

/** Products grouped for the rate-card table (add-ons listed separately). */
export const FEATURED_PRODUCTS: ProductKey[] = ['job_local', 'job_intl', 'featured_7d', 'hiring_pack'];
export const PROMO_PRODUCTS: ProductKey[] = ['scholarship_promo', 'sponsored_slot', 'community_boost', 'cv_review'];

export const AFN_PER_USD = 70;

/** Canonical reference-code generator for orders (AR-AD-XXXXXXXX). */
export function generateOrderReference(): string {
  // Crockford-ish alphabet (no 0/O/1/I) — phone-readable for hawala senders.
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `AR-AD-${code}`;
}

/** Afghan payment rails (labels resolved via i18n: advertise.pay.<key>). */
export type PaymentRailKey =
  | 'hawala'
  | 'afg_pay'
  | 'hesab_pay'
  | 'bank'
  | 'cash'
  | 'payoneer'
  | 'wise';

export const PAYMENT_RAILS: PaymentRailKey[] = [
  'hawala',
  'afg_pay',
  'hesab_pay',
  'bank',
  'cash',
  'payoneer',
  'wise',
];

/** Rails used inside Afghanistan vs. internationals. */
export const LOCAL_RAILS: PaymentRailKey[] = ['hawala', 'afg_pay', 'hesab_pay', 'bank', 'cash'];
export const INTL_RAILS: PaymentRailKey[] = ['payoneer', 'wise', 'hawala'];

export function isProductKey(v: unknown): v is ProductKey {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(PRODUCT_CATALOG, v);
}

export function isPaymentRail(v: unknown): v is PaymentRailKey {
  return typeof v === 'string' && (PAYMENT_RAILS as string[]).includes(v);
}
