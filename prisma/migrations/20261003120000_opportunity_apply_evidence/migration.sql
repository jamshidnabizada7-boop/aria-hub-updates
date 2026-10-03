-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "applyConfidence" INTEGER,
ADD COLUMN     "applyUrlEvidence" TEXT,
ADD COLUMN     "applyVerifiedAt" TIMESTAMP(3);

