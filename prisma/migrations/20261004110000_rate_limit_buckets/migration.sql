-- PHASE 6 (completion mandate): durable rate limiting.
-- Fixed-window counters in Postgres survive serverless cold starts, unlike
-- the in-memory limiters. Atomic upsert-increment; opportunistic cleanup of
-- expired windows happens in application code. Also granted to the
-- application worker role for parity.

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateIndex
CREATE INDEX "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");

DO $$
DECLARE
  app_role TEXT := 'aria_social_worker';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "RateLimitBucket" TO %I', app_role);
  END IF;
END
$$;
