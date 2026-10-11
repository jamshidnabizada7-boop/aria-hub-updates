-- Brand Studio editorial campaigns. No existing publishing tables are modified.
CREATE TABLE "StudioCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fa',
    "format" TEXT NOT NULL DEFAULT 'portrait',
    "recipeId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "media" JSONB,
    "sourceUrl" TEXT,
    "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudioCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudioCampaign_status_updatedAt_idx" ON "StudioCampaign"("status", "updatedAt");
CREATE INDEX "StudioCampaign_pillar_createdAt_idx" ON "StudioCampaign"("pillar", "createdAt");

CREATE TABLE "StudioCampaignMetric" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT,
    "paid" BOOLEAN,
    "views" INTEGER,
    "reach" INTEGER,
    "interactions" INTEGER,
    "reactions" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "linkClicks" INTEGER,
    "watchSeconds" INTEGER,
    CONSTRAINT "StudioCampaignMetric_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudioCampaignMetric_campaignId_capturedAt_idx" ON "StudioCampaignMetric"("campaignId", "capturedAt");
CREATE INDEX "StudioCampaignMetric_platform_capturedAt_idx" ON "StudioCampaignMetric"("platform", "capturedAt");
ALTER TABLE "StudioCampaignMetric" ADD CONSTRAINT "StudioCampaignMetric_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "StudioCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
