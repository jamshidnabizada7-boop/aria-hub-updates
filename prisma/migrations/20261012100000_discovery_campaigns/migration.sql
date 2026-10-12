CREATE TABLE "DiscoveryCampaignEvent" (
  "id" TEXT NOT NULL PRIMARY KEY, "queueId" TEXT NOT NULL REFERENCES "SocialPostQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "platform" TEXT NOT NULL, "kind" TEXT NOT NULL, "visitorHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "DiscoveryCampaignEvent_queueId_platform_kind_visitorHash_key" ON "DiscoveryCampaignEvent"("queueId","platform","kind","visitorHash");
CREATE INDEX "DiscoveryCampaignEvent_queueId_kind_idx" ON "DiscoveryCampaignEvent"("queueId","kind");
CREATE INDEX "DiscoveryCampaignEvent_createdAt_idx" ON "DiscoveryCampaignEvent"("createdAt");
CREATE TABLE "DiscoveryCampaignMetric" (
  "id" TEXT NOT NULL PRIMARY KEY, "queueId" TEXT NOT NULL REFERENCES "SocialPostQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "platform" TEXT NOT NULL, "source" TEXT NOT NULL, "capturedAt" TIMESTAMP(3) NOT NULL,
  "reach" INTEGER, "impressions" INTEGER, "engagement" INTEGER, "linkClicks" INTEGER, "paid" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "DiscoveryCampaignMetric_queueId_platform_capturedAt_key" ON "DiscoveryCampaignMetric"("queueId","platform","capturedAt");
CREATE INDEX "DiscoveryCampaignMetric_queueId_platform_idx" ON "DiscoveryCampaignMetric"("queueId","platform");
ALTER TABLE "DiscoveryCampaignEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiscoveryCampaignMetric" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aria_social_worker') THEN
    GRANT SELECT ON "OpportunityMatchProfile" TO aria_social_worker;
    CREATE POLICY "OpportunityMatchProfile_campaign_read" ON "OpportunityMatchProfile" FOR SELECT TO aria_social_worker USING (true);
    GRANT SELECT, INSERT, UPDATE, DELETE ON "DiscoveryCampaignEvent", "DiscoveryCampaignMetric" TO aria_social_worker;
    CREATE POLICY "DiscoveryCampaignEvent_server" ON "DiscoveryCampaignEvent" FOR ALL TO aria_social_worker USING (true) WITH CHECK (true);
    CREATE POLICY "DiscoveryCampaignMetric_server" ON "DiscoveryCampaignMetric" FOR ALL TO aria_social_worker USING (true) WITH CHECK (true);
  END IF;
END $$;
