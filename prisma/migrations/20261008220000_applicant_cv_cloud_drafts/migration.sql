-- Candidate-only, additive cloud CV draft store. All content is AES-GCM
-- ciphertext; owner and revision constraints guard cross-device writes.
CREATE TABLE "ApplicantCVDraft" (
 "id" TEXT NOT NULL,
 "applicantProfileId" TEXT NOT NULL,
 "draftId" TEXT NOT NULL,
 "encryptedContent" TEXT NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ApplicantCVDraft_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApplicantCVDraft_applicantProfileId_draftId_key" ON "ApplicantCVDraft"("applicantProfileId","draftId");
CREATE INDEX "ApplicantCVDraft_applicantProfileId_updatedAt_idx" ON "ApplicantCVDraft"("applicantProfileId","updatedAt");
ALTER TABLE "ApplicantCVDraft" ADD CONSTRAINT "ApplicantCVDraft_applicantProfileId_fkey"
 FOREIGN KEY ("applicantProfileId") REFERENCES "ApplicantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApplicantCVDraft" ADD CONSTRAINT "ApplicantCVDraft_revision_positive" CHECK ("revision">0);
