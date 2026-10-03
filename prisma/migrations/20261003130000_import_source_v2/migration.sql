-- AlterTable
ALTER TABLE "ImportSource" ADD COLUMN     "backoffUntil" TIMESTAMP(3),
ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "healthStatus" TEXT NOT NULL DEFAULT 'healthy',
ADD COLUMN     "lastFailureAt" TIMESTAMP(3),
ADD COLUMN     "lastSuccessAt" TIMESTAMP(3),
ADD COLUMN     "nextRunAt" TIMESTAMP(3),
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "sourceRole" TEXT,
ADD COLUMN     "supportsDelta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trustScore" INTEGER;

-- CreateIndex
CREATE INDEX "ImportSource_nextRunAt_idx" ON "ImportSource"("nextRunAt");

-- CreateIndex
CREATE INDEX "ImportSource_priority_idx" ON "ImportSource"("priority");

-- CreateIndex
CREATE INDEX "ImportSource_healthStatus_idx" ON "ImportSource"("healthStatus");

-- AddForeignKey
ALTER TABLE "ImportSource" ADD CONSTRAINT "ImportSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

