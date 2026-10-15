ALTER TABLE "Organization" ADD COLUMN "industry" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "acceptsNativeApplications" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "OrganizationFollow" (
 "id" TEXT PRIMARY KEY, "applicantProfileId" TEXT NOT NULL REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE,
 "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("applicantProfileId", "organizationId")
);
CREATE INDEX "OrganizationFollow_organizationId_idx" ON "OrganizationFollow"("organizationId");
CREATE TABLE "EmployerApplication" (
 "id" TEXT PRIMARY KEY,
 "applicantProfileId" TEXT NOT NULL REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE,
 "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
 "opportunityId" TEXT NOT NULL REFERENCES "Opportunity"("id") ON DELETE CASCADE,
 "documentId" TEXT REFERENCES "ApplicantDocument"("id") ON DELETE SET NULL,
 "name" TEXT NOT NULL, "email" TEXT NOT NULL, "coverLetter" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'submitted', "consentedAt" TIMESTAMP(3) NOT NULL,
 "withdrawnAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, "history" JSONB NOT NULL DEFAULT '[]',
 UNIQUE ("applicantProfileId", "opportunityId")
);
CREATE INDEX "EmployerApplication_organizationId_status_createdAt_idx" ON "EmployerApplication"("organizationId", "status", "createdAt");
CREATE INDEX "EmployerApplication_applicantProfileId_createdAt_idx" ON "EmployerApplication"("applicantProfileId", "createdAt");
CREATE INDEX "EmployerApplication_documentId_idx" ON "EmployerApplication"("documentId");
