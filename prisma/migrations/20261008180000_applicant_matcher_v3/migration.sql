-- Milestone 3, additive migration. Never apply to production without approval.
ALTER TABLE "ApplicantProfile" ADD COLUMN "verifiedCareerFacts" JSONB;
CREATE TABLE "ApplicantSavedSearch" (
  "id" TEXT NOT NULL,
  "applicantProfileId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "profile" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicantSavedSearch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicantSavedSearch_applicantProfileId_fkey"
    FOREIGN KEY ("applicantProfileId") REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ApplicantSavedSearch_applicantProfileId_updatedAt_idx" ON "ApplicantSavedSearch"("applicantProfileId","updatedAt");
ALTER TABLE "ApplicantSavedSearch" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ApplicantSavedSearch" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "ApplicantSavedSearch" FROM anon';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "ApplicantSavedSearch" FROM authenticated';
  END IF;
END $$;
-- Next.js server-only DB owner mediates per-user authorization. Do not grant
-- access to translation, importer, social or public-facing database roles.
