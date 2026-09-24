-- Facebook Group Distribution (additive-only)
-- Meta Group publishing is transport-independent; current implementation uses
-- manual assist because Meta no longer exposes a public Groups publishing API.

ALTER TABLE "SocialPostQueue"
  ADD COLUMN "facebookGroupDistribution" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "facebookGroupMode" TEXT NOT NULL DEFAULT 'auto';

CREATE TABLE "FacebookGroup" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "groupId" TEXT,
  "url" TEXT NOT NULL,
  "language" TEXT,
  "audience" TEXT,
  "region" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "postingEligible" BOOLEAN NOT NULL DEFAULT true,
  "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "lastSuccessfulDistribution" TIMESTAMP(3),
  "lastFailure" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacebookGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FacebookGroupTag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacebookGroupTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FacebookGroupTagLink" (
  "groupId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  CONSTRAINT "FacebookGroupTagLink_pkey" PRIMARY KEY ("groupId","tagId")
);

CREATE TABLE "FacebookGroupDistributionRule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "contentKinds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "contentCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "includeTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "excludeTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "regions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "includeGroupIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "excludeGroupIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "requireLanguageMatch" BOOLEAN NOT NULL DEFAULT false,
  "requireRegionMatch" BOOLEAN NOT NULL DEFAULT false,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacebookGroupDistributionRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FacebookGroupCampaign" (
  "id" TEXT NOT NULL,
  "sourceQueueId" TEXT,
  "sourceContentRef" TEXT,
  "selectionMode" TEXT NOT NULL DEFAULT 'auto',
  "transport" TEXT NOT NULL DEFAULT 'manual_assist',
  "status" TEXT NOT NULL DEFAULT 'requires_review',
  "scheduledFor" TIMESTAMP(3),
  "autoSourceKey" TEXT,
  "createdByAdminId" TEXT,
  "summary" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacebookGroupCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FacebookGroupDistributionJob" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "sourceQueueId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'requires_review',
  "transport" TEXT NOT NULL DEFAULT 'manual_assist',
  "scheduledFor" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3),
  "matchReasons" JSONB NOT NULL DEFAULT '[]',
  "errorType" TEXT,
  "errorMessage" TEXT,
  "retryable" BOOLEAN,
  "suggestedAction" TEXT,
  "externalReference" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FacebookGroupDistributionJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacebookGroup_groupId_key" ON "FacebookGroup"("groupId");
CREATE UNIQUE INDEX "FacebookGroup_url_key" ON "FacebookGroup"("url");
CREATE INDEX "FacebookGroup_active_postingEligible_idx" ON "FacebookGroup"("active","postingEligible");
CREATE INDEX "FacebookGroup_language_region_idx" ON "FacebookGroup"("language","region");
CREATE UNIQUE INDEX "FacebookGroupTag_slug_key" ON "FacebookGroupTag"("slug");
CREATE INDEX "FacebookGroupTagLink_tagId_idx" ON "FacebookGroupTagLink"("tagId");
CREATE INDEX "FacebookGroupDistributionRule_enabled_priority_idx" ON "FacebookGroupDistributionRule"("enabled","priority");
CREATE UNIQUE INDEX "FacebookGroupCampaign_autoSourceKey_key" ON "FacebookGroupCampaign"("autoSourceKey");
CREATE INDEX "FacebookGroupCampaign_status_createdAt_idx" ON "FacebookGroupCampaign"("status","createdAt");
CREATE INDEX "FacebookGroupCampaign_sourceQueueId_idx" ON "FacebookGroupCampaign"("sourceQueueId");
CREATE UNIQUE INDEX "FacebookGroupDistributionJob_campaignId_groupId_key" ON "FacebookGroupDistributionJob"("campaignId","groupId");
CREATE UNIQUE INDEX "FacebookGroupDistributionJob_sourceQueueId_groupId_key" ON "FacebookGroupDistributionJob"("sourceQueueId","groupId");
CREATE INDEX "FacebookGroupDistributionJob_status_scheduledFor_idx" ON "FacebookGroupDistributionJob"("status","scheduledFor");
CREATE INDEX "FacebookGroupDistributionJob_groupId_createdAt_idx" ON "FacebookGroupDistributionJob"("groupId","createdAt");

ALTER TABLE "FacebookGroupTagLink"
  ADD CONSTRAINT "FacebookGroupTagLink_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FacebookGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacebookGroupTagLink"
  ADD CONSTRAINT "FacebookGroupTagLink_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "FacebookGroupTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacebookGroupCampaign"
  ADD CONSTRAINT "FacebookGroupCampaign_sourceQueueId_fkey" FOREIGN KEY ("sourceQueueId") REFERENCES "SocialPostQueue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FacebookGroupDistributionJob"
  ADD CONSTRAINT "FacebookGroupDistributionJob_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "FacebookGroupCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacebookGroupDistributionJob"
  ADD CONSTRAINT "FacebookGroupDistributionJob_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FacebookGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
