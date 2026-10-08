-- Milestone 5 — applicant-only tracker. Additive, staging-only.
CREATE TABLE "ApplicantApplication" (
 "id" TEXT NOT NULL,
 "applicantProfileId" TEXT NOT NULL,
 "opportunityId" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'saved',
 "notes" VARCHAR(2000),
 "nextActionAt" TIMESTAMP(3),
 "appliedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ApplicantApplication_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ApplicantApplication_applicantProfileId_fkey" FOREIGN KEY ("applicantProfileId") REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ApplicantApplication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ApplicantApplication_status_check" CHECK ("status" IN ('saved','preparing','applied','interview','offer','rejected','withdrawn'))
);
CREATE UNIQUE INDEX "ApplicantApplication_applicantProfileId_opportunityId_key" ON "ApplicantApplication"("applicantProfileId","opportunityId");
CREATE INDEX "ApplicantApplication_applicantProfileId_updatedAt_idx" ON "ApplicantApplication"("applicantProfileId","updatedAt");
CREATE INDEX "ApplicantApplication_status_nextActionAt_idx" ON "ApplicantApplication"("status","nextActionAt");
ALTER TABLE "ApplicantApplication" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ApplicantApplication" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  EXECUTE 'REVOKE ALL ON TABLE "ApplicantApplication" FROM anon';
 END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  EXECUTE 'REVOKE ALL ON TABLE "ApplicantApplication" FROM authenticated';
 END IF;
END $$;
-- IMPORTANT: access only through trusted Next.js server, with session owner predicates.
-- Staging verification of deployed server DB role / RLS remains mandatory.
