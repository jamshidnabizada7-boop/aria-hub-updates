-- Structured opportunity geography + resilient per-language translation state.
-- Additive migration: existing Opportunity.country remains untouched for compatibility.

CREATE TABLE "OpportunityLocation" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "countryCode" TEXT,
  "province" TEXT,
  "city" TEXT,
  "district" TEXT,
  "rawLabel" TEXT,
  "provenance" TEXT NOT NULL DEFAULT 'source',
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunityLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OpportunityTranslation" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "lang" TEXT NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "staging" JSONB,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunityTranslation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpportunityLocation_opportunityId_idx" ON "OpportunityLocation"("opportunityId");
CREATE INDEX "OpportunityLocation_country_idx" ON "OpportunityLocation"("country");
CREATE INDEX "OpportunityLocation_province_idx" ON "OpportunityLocation"("province");
CREATE INDEX "OpportunityLocation_country_province_idx" ON "OpportunityLocation"("country","province");

CREATE UNIQUE INDEX "OpportunityTranslation_opportunityId_lang_key"
  ON "OpportunityTranslation"("opportunityId","lang");
CREATE INDEX "OpportunityTranslation_lang_status_nextAttemptAt_idx"
  ON "OpportunityTranslation"("lang","status","nextAttemptAt");
CREATE INDEX "OpportunityTranslation_opportunityId_idx"
  ON "OpportunityTranslation"("opportunityId");

ALTER TABLE "OpportunityLocation"
  ADD CONSTRAINT "OpportunityLocation_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityTranslation"
  ADD CONSTRAINT "OpportunityTranslation_opportunityId_fkey"
  FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill deterministic province data already captured by Wazifaha.
WITH raw AS (
  SELECT
    o.id AS opportunity_id,
    btrim(p.value) AS raw_province
  FROM "Opportunity" o
  CROSS JOIN LATERAL regexp_split_to_table(
    COALESCE(o."extractedData"->>'Location',''), ','
  ) AS p(value)
  WHERE o.country = 'Afghanistan'
    AND o."sourceName" = 'Wazifaha Jobs'
    AND btrim(p.value) <> ''
),
norm AS (
  SELECT DISTINCT
    opportunity_id,
    raw_province,
    CASE lower(raw_province)
      WHEN 'ghowr' THEN 'Ghor'
      WHEN 'oruzgan' THEN 'Uruzgan'
      WHEN 'urozgan' THEN 'Uruzgan'
      WHEN 'panjsher' THEN 'Panjshir'
      WHEN 'sar-e-pul' THEN 'Sar-e Pol'
      WHEN 'sar-e-pul province' THEN 'Sar-e Pol'
      WHEN 'wardak' THEN 'Maidan Wardak'
      ELSE raw_province
    END AS province
  FROM raw
)
INSERT INTO "OpportunityLocation"
  ("id","opportunityId","country","countryCode","province","rawLabel","provenance","confidence","createdAt","updatedAt")
SELECT
  'loc_' || md5(opportunity_id || '|wazifaha|' || province),
  opportunity_id,'Afghanistan','AF',province,raw_province,'source',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM norm;

-- Backfill deterministic province data embedded by the Jobs.af structured scraper.
WITH source_rows AS (
  SELECT
    o.id AS opportunity_id,
    substring(o.description from 'Location:[[:space:]]*([^\n]+)') AS raw_location
  FROM "Opportunity" o
  WHERE o.country = 'Afghanistan'
    AND o."sourceName" = 'Jobs.af'
),
raw AS (
  SELECT
    opportunity_id,
    btrim(p.value) AS raw_province
  FROM source_rows
  CROSS JOIN LATERAL regexp_split_to_table(COALESCE(raw_location,''), ',') AS p(value)
  WHERE btrim(p.value) <> ''
),
norm AS (
  SELECT DISTINCT
    opportunity_id,
    raw_province,
    CASE lower(raw_province)
      WHEN 'ghowr' THEN 'Ghor'
      WHEN 'oruzgan' THEN 'Uruzgan'
      WHEN 'urozgan' THEN 'Uruzgan'
      WHEN 'panjsher' THEN 'Panjshir'
      WHEN 'sar-e-pul' THEN 'Sar-e Pol'
      WHEN 'wardak' THEN 'Maidan Wardak'
      ELSE raw_province
    END AS province
  FROM raw
)
INSERT INTO "OpportunityLocation"
  ("id","opportunityId","country","countryCode","province","rawLabel","provenance","confidence","createdAt","updatedAt")
SELECT
  'loc_' || md5(opportunity_id || '|jobsaf|' || province),
  opportunity_id,'Afghanistan','AF',province,raw_province,'source',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
FROM norm;
