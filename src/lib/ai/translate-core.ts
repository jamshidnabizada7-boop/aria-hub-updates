/**
 * translate-core — kept as a compatibility entry point.
 *
 * The real work moved to src/lib/ai/translate-engine.ts: a chunked, atomic,
 * Persian-first engine. The old implementation here translated only the
 * first 900 characters of the description (`.slice(0, 900)`) and committed
 * partial results — both defects are gone: the engine chunks EVERY source
 * field, stages each chunk in TranslationChunk, and publishes a language
 * only when 100% of its chunks succeeded.
 */
import { processBatch } from '@/lib/ai/translate-engine';

export interface TranslateBatchResult {
  processed: number;
  failed: number;
  rateLimited: boolean;
}

/**
 * Process up to `batch` translation units (one staged chunk each) from the
 * highest-priority incomplete content. Returns whether a 429 was hit (the
 * caller sets a backoff window).
 */
export async function translateNextBatch(batch = 3): Promise<TranslateBatchResult> {
  const r = await processBatch(batch);
  return {
    processed: r.processed,
    failed: 0, // per-chunk failures live in TranslationChunk/row progress
    rateLimited: r.rateLimited,
  };
}
