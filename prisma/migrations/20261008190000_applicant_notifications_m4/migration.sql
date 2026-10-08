-- M4 Applicant alerts — ADDITIVE ONLY. Do not apply to production until owner approval.
CREATE TABLE "ApplicantNotificationPreference" (
  "id" TEXT NOT NULL,
  "applicantProfileId" TEXT NOT NULL,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT false,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "emailFrequency" TEXT NOT NULL DEFAULT 'daily',
  "lastEmailAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicantNotificationPreference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicantNotificationPreference_applicantProfileId_fkey" FOREIGN KEY ("applicantProfileId") REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApplicantNotificationPreference_emailFrequency_check" CHECK ("emailFrequency" IN ('daily','weekly'))
);
CREATE UNIQUE INDEX "ApplicantNotificationPreference_applicantProfileId_key" ON "ApplicantNotificationPreference"("applicantProfileId");

CREATE TABLE "ApplicantNotification" (
  "id" TEXT NOT NULL,
  "applicantProfileId" TEXT NOT NULL,
  "savedSearchId" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "evidence" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicantNotification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicantNotification_applicantProfileId_fkey" FOREIGN KEY ("applicantProfileId") REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApplicantNotification_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "ApplicantSavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApplicantNotification_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ApplicantNotification_applicantProfileId_savedSearchId_opportunityId_key" ON "ApplicantNotification"("applicantProfileId","savedSearchId","opportunityId");
CREATE INDEX "ApplicantNotification_applicantProfileId_readAt_createdAt_idx" ON "ApplicantNotification"("applicantProfileId","readAt","createdAt");
CREATE INDEX "ApplicantNotification_createdAt_idx" ON "ApplicantNotification"("createdAt");

CREATE TABLE "ApplicantEmailDelivery" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "claimedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApplicantEmailDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ApplicantEmailDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "ApplicantNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ApplicantEmailDelivery_status_check" CHECK ("status" IN ('pending','processing','sent','suppressed')),
  CONSTRAINT "ApplicantEmailDelivery_attempts_check" CHECK ("attempts" BETWEEN 0 AND 10)
);
CREATE UNIQUE INDEX "ApplicantEmailDelivery_notificationId_key" ON "ApplicantEmailDelivery"("notificationId");
CREATE INDEX "ApplicantEmailDelivery_status_nextAttemptAt_idx" ON "ApplicantEmailDelivery"("status","nextAttemptAt");

ALTER TABLE "ApplicantNotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApplicantNotification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApplicantEmailDelivery" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ApplicantNotificationPreference", "ApplicantNotification", "ApplicantEmailDelivery" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE "ApplicantNotificationPreference", "ApplicantNotification", "ApplicantEmailDelivery" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON TABLE "ApplicantNotificationPreference", "ApplicantNotification", "ApplicantEmailDelivery" FROM authenticated';
  END IF;
END $$;
-- Trusted Next.js server owner mediates sessions/tenant scopes. The notification
-- CLI is intentionally run with the existing dedicated server-side DB role,
-- NOT the translation/social restricted roles. Verify deployment grants in staging.
