-- CreateTable
CREATE TABLE "OpportunitySourceObservation" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "importSourceId" TEXT,
    "organizationId" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceRole" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourcePublishedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT,
    "vacancyNumber" TEXT,
    "observedApplyUrl" TEXT,
    "observedDeadline" TIMESTAMP(3),
    "rawData" JSONB,
    "trustScore" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunitySourceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpportunitySourceObservation_opportunityId_idx" ON "OpportunitySourceObservation"("opportunityId");

-- CreateIndex
CREATE INDEX "OpportunitySourceObservation_organizationId_idx" ON "OpportunitySourceObservation"("organizationId");

-- CreateIndex
CREATE INDEX "OpportunitySourceObservation_sourceUrl_idx" ON "OpportunitySourceObservation"("sourceUrl");

-- CreateIndex
CREATE INDEX "OpportunitySourceObservation_vacancyNumber_idx" ON "OpportunitySourceObservation"("vacancyNumber");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunitySourceObservation_opportunityId_sourceName_sourc_key" ON "OpportunitySourceObservation"("opportunityId", "sourceName", "sourceUrl");

-- AddForeignKey
ALTER TABLE "OpportunitySourceObservation" ADD CONSTRAINT "OpportunitySourceObservation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySourceObservation" ADD CONSTRAINT "OpportunitySourceObservation_importSourceId_fkey" FOREIGN KEY ("importSourceId") REFERENCES "ImportSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunitySourceObservation" ADD CONSTRAINT "OpportunitySourceObservation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

