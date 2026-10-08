-- Safe additive CV processing bookkeeping; staging-only until owner review.
ALTER TABLE "ApplicantDocument"
  ADD COLUMN "processingAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "processingClaimedAt" TIMESTAMP(3),
  ADD COLUMN "nextProcessingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);
CREATE INDEX "ApplicantDocument_status_nextProcessingAt_idx"
  ON "ApplicantDocument" ("status","nextProcessingAt");
ALTER TABLE "ApplicantDocument"
  ADD CONSTRAINT "ApplicantDocument_processingAttempts_check"
  CHECK ("processingAttempts" BETWEEN 0 AND 5);
-- No new grants, no RLS change and no production migration in this work.
