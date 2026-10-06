-- AUTOMATIC TRANSLATION (2026-10-06): columns for the dedicated translation
-- worker — chunk claim semantics (double-worker safety), per-chunk provider
-- audit trail, and manual-translation provenance (never auto-overwrite a
-- human translation while its source is unchanged).
-- Additive only; no destructive operations.

ALTER TABLE "TranslationChunk" ADD COLUMN IF NOT EXISTS "claimedAt" TIMESTAMP(3);
ALTER TABLE "TranslationChunk" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "TranslationChunk" ADD COLUMN IF NOT EXISTS "model" TEXT;
ALTER TABLE "TranslationChunk" ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3);
ALTER TABLE "TranslationChunk" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "translationOrigin" JSONB;
