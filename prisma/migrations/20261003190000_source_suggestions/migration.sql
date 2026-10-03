-- CreateTable
CREATE TABLE "OrganizationSourceSuggestion" (
    "id" TEXT NOT NULL,
    "suggestedName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "organizationId" TEXT,
    "evidenceDomains" JSONB,
    "evidenceEmails" JSONB,
    "sampleSourceUrl" TEXT,
    "sampleSourceName" TEXT,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSourceSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSourceSuggestion_suggestedName_key" ON "OrganizationSourceSuggestion"("suggestedName");

-- CreateIndex
CREATE INDEX "OrganizationSourceSuggestion_status_idx" ON "OrganizationSourceSuggestion"("status");

-- AddForeignKey
ALTER TABLE "OrganizationSourceSuggestion" ADD CONSTRAINT "OrganizationSourceSuggestion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

