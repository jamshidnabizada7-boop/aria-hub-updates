-- Additive delivery tracking for per-platform social publishing.
CREATE TABLE "SocialDelivery" (
    "id" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "error" TEXT,
    "externalId" TEXT,
    "permalink" TEXT,
    "publishedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialDelivery_queueId_channelId_key"
ON "SocialDelivery"("queueId", "channelId");

CREATE INDEX "SocialDelivery_queueId_idx"
ON "SocialDelivery"("queueId");

CREATE INDEX "SocialDelivery_platform_status_idx"
ON "SocialDelivery"("platform", "status");

CREATE INDEX "SocialDelivery_status_nextAttemptAt_idx"
ON "SocialDelivery"("status", "nextAttemptAt");

ALTER TABLE "SocialDelivery"
ADD CONSTRAINT "SocialDelivery_queueId_fkey"
FOREIGN KEY ("queueId") REFERENCES "SocialPostQueue"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SocialDelivery"
ADD CONSTRAINT "SocialDelivery_channelId_fkey"
FOREIGN KEY ("channelId") REFERENCES "PublishChannel"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
