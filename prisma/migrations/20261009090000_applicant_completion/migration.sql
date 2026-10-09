ALTER TABLE "ApplicantSavedSearch" ADD COLUMN "lastScannedAt" TIMESTAMP(3),
 ADD COLUMN "scanCursorUpdatedAt" TIMESTAMP(3), ADD COLUMN "scanCursorId" TEXT;
ALTER TABLE "ApplicantNotification" ADD COLUMN "materialVersion" TEXT NOT NULL DEFAULT 'legacy',
 ADD COLUMN "archivedAt" TIMESTAMP(3);
DROP INDEX "ApplicantNotification_applicantProfileId_savedSearchId_oppo_key";
CREATE UNIQUE INDEX "ApplicantNotification_match_version_key" ON "ApplicantNotification"("applicantProfileId","savedSearchId","opportunityId","materialVersion");
CREATE TABLE "ApplicantDeletionJob" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'pending', "attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "claimedAt" TIMESTAMP(3), "errorCode" TEXT, "completedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "ApplicantDeletionJob_userId_key" ON "ApplicantDeletionJob"("userId");
CREATE INDEX "ApplicantDeletionJob_status_nextAttemptAt_idx" ON "ApplicantDeletionJob"("status","nextAttemptAt");
ALTER TABLE "ApplicantDeletionJob" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "ApplicantDeletionJob" FROM PUBLIC;
DO $$ DECLARE role_name TEXT; BEGIN
 FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
  EXECUTE format('REVOKE ALL ON "ApplicantDeletionJob" FROM %I', role_name);
 END LOOP;
END $$;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aria_social_worker') THEN
  GRANT SELECT, INSERT, UPDATE, DELETE ON "ApplicantDeletionJob" TO aria_social_worker;
  CREATE POLICY "ApplicantDeletionJob_server_role" ON "ApplicantDeletionJob" FOR ALL TO aria_social_worker USING (true) WITH CHECK (true);
 END IF;
END $$;
