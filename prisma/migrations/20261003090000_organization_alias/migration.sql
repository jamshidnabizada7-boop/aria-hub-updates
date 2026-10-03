-- CreateTable
CREATE TABLE "OrganizationAlias" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationAlias_normalized_key" ON "OrganizationAlias"("normalized");

-- CreateIndex
CREATE INDEX "OrganizationAlias_organizationId_idx" ON "OrganizationAlias"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationAlias" ADD CONSTRAINT "OrganizationAlias_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

