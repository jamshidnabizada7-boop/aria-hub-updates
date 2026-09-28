CREATE TABLE "OpportunityMatchProfile" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "eligibleNationalities" JSONB,
    "eligibleCountries" JSONB,
    "educationLevels" JSONB,
    "fieldAreas" JSONB,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "minExperienceYears" INTEGER,
    "languages" JSONB,
    "fundingType" TEXT,
    "locationType" TEXT,
    "visaSponsorship" BOOLEAN,
    "provenance" JSONB,
    "confidence" JSONB,
    "extractionVersion" TEXT NOT NULL DEFAULT 'v1',
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityMatchProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OpportunityMatchProfile_opportunityId_key" ON "OpportunityMatchProfile"("opportunityId");
CREATE INDEX "OpportunityMatchProfile_reviewed_idx" ON "OpportunityMatchProfile"("reviewed");
CREATE INDEX "OpportunityMatchProfile_fundingType_idx" ON "OpportunityMatchProfile"("fundingType");
CREATE INDEX "OpportunityMatchProfile_locationType_idx" ON "OpportunityMatchProfile"("locationType");

ALTER TABLE "OpportunityMatchProfile"
ADD CONSTRAINT "OpportunityMatchProfile_opportunityId_fkey"
FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OpportunityMatchProfile" ENABLE ROW LEVEL SECURITY;
