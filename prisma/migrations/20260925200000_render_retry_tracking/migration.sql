-- Bound render retries independently of per-destination publish attempts.
ALTER TABLE "SocialPostQueue"
  ADD COLUMN "renderAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextRenderAttemptAt" TIMESTAMP(3);
