/**
 * Shared types for the automated import / scraping pipeline.
 *
 * Scrapers produce `RawListing` objects. These are source-agnostic and feed
 * into dedupe → AI pipeline → image download → Opportunity upsert.
 */

/** A single opportunity as extracted from a source (before AI enrichment). */
export interface RawListing {
  // Core identity
  title: string;
  organization?: string | null;
  category?: string | null;        // human-readable category hint from source
  jobType?: string | null;          // job | scholarship | fellowship | ...
  scholarshipType?: string | null;
  // Location / dates
  location?: string | null;
  country?: string | null;
  deadline?: string | null;         // ISO date when possible
  publishedDate?: string | null;    // ISO date when possible
  // Content
  description?: string | null;
  responsibilities?: string | null;
  eligibility?: string | null;
  benefits?: string | null;
  requiredDocuments?: string | null;
  requirements?: string | null;   // alias: required documents / qualification list
  guidelines?: string | null;     // submission guidelines / how to apply
  salary?: string | null;
  educationReq?: string | null;
  experience?: string | null;
  // Links
  applyUrl?: string | null;
  sourceUrl: string;                // canonical listing/detail URL on the source
  originalUrl?: string | null;      // deep link (defaults to sourceUrl)
  website?: string | null;
  // Media
  imageUrl?: string | null;
  logoUrl?: string | null;
  // Provenance
  sourceName: string;
  sourceLanguage?: string | null;   // e.g. 'en'
  // Extracted extra fields
  extractedData?: Record<string, any>;
}

/** Result of fetching one page of listings. */
export interface ScrapePage {
  listings: RawListing[];
  nextPage?: string | null;         // absolute URL of next page, or null when done
}

/** Parsed source config (stored as JSON string on ImportSource.config). */
export interface ScraperConfig {
  crawlDelayMs?: number;
  timeoutMs?: number;
  maxPages?: number;
  detailFetch?: boolean;
  perPage?: number;
  apiBase?: string;
  [k: string]: unknown;
}

/** Options passed to fetch helpers. */
export interface FetchOptions {
  retries?: number;
  timeoutMs?: number;
  /** Delay between requests to be polite to the source. */
  crawlDelayMs?: number;
  headers?: Record<string, string>;
  /**
   * Optional body validator. When provided and it returns false, the response
   * is treated as a retryable failure (used to detect JS bot-protection
   * interstitials that answer HTTP 200 with a challenge page).
   */
  validate?: (body: string) => boolean;
}

/** A minimal view of an ImportSource for scrapers (avoids importing Prisma types). */
export interface SourceHandle {
  id: string;
  name: string;
  type: string;
  scraperKey: string;
  baseUrl: string;
  config: ScraperConfig;
  defaultCategory?: string | null;
}
