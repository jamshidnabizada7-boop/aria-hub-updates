-- Additive migration: structured locations + translation chunk staging
-- (applied to production via supabase apply_migration)

-- Opportunity: new columns
ALTER TABLE "Opportunity" ADD COLUMN "applyUrlType" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "faStatus" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "psStatus" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "translationSourceHash" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "translationProgress" JSONB;

CREATE INDEX "Opportunity_faStatus_idx" ON "Opportunity"("faStatus");
CREATE INDEX "Opportunity_psStatus_idx" ON "Opportunity"("psStatus");

-- OpportunityLocation
CREATE TABLE "OpportunityLocation" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "country" TEXT,
    "countryCode" TEXT,
    "province" TEXT,
    "city" TEXT,
    "district" TEXT,
    "rawLabel" TEXT,
    "source" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpportunityLocation_opportunityId_province_city_district_rawLabel_key"
  ON "OpportunityLocation"("opportunityId", "province", "city", "district", "rawLabel");
CREATE INDEX "OpportunityLocation_opportunityId_idx" ON "OpportunityLocation"("opportunityId");
CREATE INDEX "OpportunityLocation_province_idx" ON "OpportunityLocation"("province");
CREATE INDEX "OpportunityLocation_country_idx" ON "OpportunityLocation"("country");

ALTER TABLE "OpportunityLocation"
  ADD CONSTRAINT "OpportunityLocation_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- TranslationChunk
CREATE TABLE "TranslationChunk" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "chunkTotal" INTEGER NOT NULL,
    "chunkHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranslationChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TranslationChunk_ownerType_ownerId_lang_fieldKey_chunkIndex_key"
  ON "TranslationChunk"("ownerType", "ownerId", "lang", "fieldKey", "chunkIndex");
CREATE INDEX "TranslationChunk_ownerType_ownerId_lang_status_idx"
  ON "TranslationChunk"("ownerType", "ownerId", "lang", "status");
CREATE INDEX "TranslationChunk_status_updatedAt_idx" ON "TranslationChunk"("status", "updatedAt");
