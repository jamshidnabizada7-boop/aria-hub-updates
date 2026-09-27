-- Structured opportunity geography + resilient per-language translation progress.
CREATE TABLE "OpportunityLocation" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT '',
  "countryCode" TEXT,
  "province" TEXT NOT NULL DEFAULT '',
  "city" TEXT NOT NULL DEFAULT '',
  "district" TEXT,
  "rawLabel" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'unknown',
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunityLocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OpportunityLocation_opportunityId_fkey"
    FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OpportunityLocation_opportunityId_country_province_city_rawLabel_key"
ON "OpportunityLocation"("opportunityId","country","province","city","rawLabel");
CREATE INDEX "OpportunityLocation_opportunityId_idx" ON "OpportunityLocation"("opportunityId");
CREATE INDEX "OpportunityLocation_country_idx" ON "OpportunityLocation"("country");
CREATE INDEX "OpportunityLocation_country_province_idx" ON "OpportunityLocation"("country","province");

CREATE TABLE "OpportunityTranslationProgress" (
  "id" TEXT NOT NULL,
  "opportunityId" TEXT NOT NULL,
  "lang" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "sourceHash" TEXT,
  "fieldProgress" JSONB,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpportunityTranslationProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OpportunityTranslationProgress_opportunityId_fkey"
    FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OpportunityTranslationProgress_opportunityId_lang_key"
ON "OpportunityTranslationProgress"("opportunityId","lang");
CREATE INDEX "OpportunityTranslationProgress_lang_status_idx"
ON "OpportunityTranslationProgress"("lang","status");
CREATE INDEX "OpportunityTranslationProgress_nextAttemptAt_idx"
ON "OpportunityTranslationProgress"("nextAttemptAt");

-- Recover existing Wazifaha province data deterministically.
WITH raw AS (
  SELECT o.id, trim(x.part) AS part
  FROM "Opportunity" o
  CROSS JOIN LATERAL regexp_split_to_table(COALESCE(o."extractedData"->>'Location',''), '\s*,\s*') x(part)
  WHERE o.country = 'Afghanistan'
    AND o."sourceName" = 'Wazifaha Jobs'
    AND COALESCE(o."extractedData"->>'Location','') <> ''
), canon AS (
  SELECT id, part,
    CASE lower(part)
      WHEN 'ghowr' THEN 'Ghor'
      WHEN 'oruzgan' THEN 'Uruzgan'
      WHEN 'urozgan' THEN 'Uruzgan'
      WHEN 'panjsher' THEN 'Panjshir'
      WHEN 'wardak' THEN 'Maidan Wardak'
      WHEN 'sar-e-pul' THEN 'Sar-e Pol'
      WHEN 'sar e pol' THEN 'Sar-e Pol'
      ELSE part
    END AS province
  FROM raw
)
INSERT INTO "OpportunityLocation"
  ("id","opportunityId","country","countryCode","province","city","rawLabel","source","confidence")
SELECT md5(random()::text || clock_timestamp()::text || id || part),
       id,'Afghanistan','AF',province,'',part,'extractedData.Location',1
FROM canon
WHERE part <> ''
ON CONFLICT DO NOTHING;

-- Recover Jobs.af province data from the scraper's deterministic Location line.
WITH raw AS (
  SELECT o.id,
         trim((regexp_match(o.description, '(?im)^Location:\s*([^\n]+)'))[1]) AS loc
  FROM "Opportunity" o
  WHERE o.country='Afghanistan' AND o."sourceName"='Jobs.af'
), parts AS (
  SELECT id, trim(x.part) AS part
  FROM raw
  CROSS JOIN LATERAL regexp_split_to_table(COALESCE(raw.loc,''), '\s*,\s*') x(part)
), canon AS (
  SELECT id, part,
    CASE lower(part)
      WHEN 'ghowr' THEN 'Ghor'
      WHEN 'oruzgan' THEN 'Uruzgan'
      WHEN 'urozgan' THEN 'Uruzgan'
      WHEN 'panjsher' THEN 'Panjshir'
      WHEN 'wardak' THEN 'Maidan Wardak'
      WHEN 'sar-e-pul' THEN 'Sar-e Pol'
      WHEN 'sar e pol' THEN 'Sar-e Pol'
      ELSE part
    END AS province
  FROM parts
)
INSERT INTO "OpportunityLocation"
  ("id","opportunityId","country","countryCode","province","city","rawLabel","source","confidence")
SELECT md5(random()::text || clock_timestamp()::text || id || part),
       id,'Afghanistan','AF',province,'',part,'backfill-description',0.98
FROM canon
WHERE part <> ''
ON CONFLICT DO NOTHING;
