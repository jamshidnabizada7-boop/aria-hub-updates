-- Candidate-only applicant push / WhatsApp consent and delivery bookkeeping.
-- No subscription may be created through anon/authenticated DB roles.
ALTER TABLE "ApplicantNotificationPreference"
 ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "ApplicantPushSubscription" (
 "id" TEXT NOT NULL PRIMARY KEY, "applicantProfileId" TEXT NOT NULL,
 "endpointHash" TEXT NOT NULL, "encryptedSubscription" TEXT NOT NULL,
 "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "disabledAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ApplicantPushSubscription_applicantProfileId_fkey"
 FOREIGN KEY ("applicantProfileId") REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ApplicantPushSubscription_endpointHash_key" ON "ApplicantPushSubscription"("endpointHash");
CREATE INDEX "ApplicantPushSubscription_applicantProfileId_disabledAt_idx" ON "ApplicantPushSubscription"("applicantProfileId","disabledAt");
CREATE TABLE "ApplicantWhatsAppContact" (
 "id" TEXT NOT NULL PRIMARY KEY, "applicantProfileId" TEXT NOT NULL,
 "phoneHash" TEXT NOT NULL, "encryptedNumber" TEXT NOT NULL,
 "verifyHash" TEXT, "verifyExpiresAt" TIMESTAMP(3),
 "verifyAttempts" INTEGER NOT NULL DEFAULT 0,
 "verifiedAt" TIMESTAMP(3), "consentedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ApplicantWhatsAppContact_applicantProfileId_fkey"
 FOREIGN KEY ("applicantProfileId") REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ApplicantWhatsAppContact_applicantProfileId_key" ON "ApplicantWhatsAppContact"("applicantProfileId");
CREATE TABLE "ApplicantChannelDelivery" (
 "id" TEXT NOT NULL PRIMARY KEY, "notificationId" TEXT NOT NULL,
 "channel" TEXT NOT NULL,"targetId" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'pending',"attempts" INTEGER NOT NULL DEFAULT 0,
 "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "claimedAt" TIMESTAMP(3),"sentAt" TIMESTAMP(3),"errorCode" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ApplicantChannelDelivery_notificationId_fkey"
 FOREIGN KEY ("notificationId") REFERENCES "ApplicantNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "ApplicantChannelDelivery_status_check"
 CHECK ("status" IN ('pending','processing','sent','suppressed')),
 CONSTRAINT "ApplicantChannelDelivery_channel_check"
 CHECK ("channel" IN ('push','whatsapp'))
);
CREATE UNIQUE INDEX "ApplicantChannelDelivery_notificationId_channel_targetId_key" ON "ApplicantChannelDelivery"("notificationId","channel","targetId");
CREATE INDEX "ApplicantChannelDelivery_status_nextAttemptAt_idx" ON "ApplicantChannelDelivery"("status","nextAttemptAt");
ALTER TABLE "ApplicantPushSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApplicantWhatsAppContact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApplicantChannelDelivery" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ApplicantPushSubscription", "ApplicantWhatsAppContact", "ApplicantChannelDelivery" FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  EXECUTE 'REVOKE ALL ON TABLE "ApplicantPushSubscription", "ApplicantWhatsAppContact", "ApplicantChannelDelivery" FROM anon';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  EXECUTE 'REVOKE ALL ON TABLE "ApplicantPushSubscription", "ApplicantWhatsAppContact", "ApplicantChannelDelivery" FROM authenticated';
 END IF;
END $$;
