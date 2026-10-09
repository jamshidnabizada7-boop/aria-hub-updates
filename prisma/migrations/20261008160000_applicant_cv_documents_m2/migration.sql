-- M2 private applicant document metadata; file bytes NEVER stored in this table.
-- Additive migration for isolated test DB only; do not deploy to production.
CREATE TABLE "ApplicantDocument" (
  "id" TEXT NOT NULL,
  "applicantProfileId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'uploaded',
  "extraction" JSONB,
  "processingError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicantDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicantDocument_applicantProfileId_fkey" FOREIGN KEY ("applicantProfileId")
    REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApplicantDocument_byteSize_check" CHECK ("byteSize" > 0),
  CONSTRAINT "ApplicantDocument_status_check" CHECK ("status" IN ('uploaded','processing','review','failed'))
);
CREATE UNIQUE INDEX "ApplicantDocument_storageKey_key" ON "ApplicantDocument"("storageKey");
CREATE INDEX "ApplicantDocument_applicantProfileId_createdAt_idx" ON "ApplicantDocument"("applicantProfileId","createdAt");
CREATE INDEX "ApplicantDocument_status_createdAt_idx" ON "ApplicantDocument"("status","createdAt");
ALTER TABLE "ApplicantDocument" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ApplicantDocument" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "ApplicantDocument" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "ApplicantDocument" FROM authenticated';
  END IF;
END $$;
-- Trusted Next.js server DB connection must have table access (typically table
-- owner). No access for browser JWT roles or social/translation workers.
