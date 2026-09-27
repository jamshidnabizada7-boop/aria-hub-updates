CREATE TABLE "MatcherFeedback" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "signal" TEXT NOT NULL,
    "intent" TEXT,
    "lang" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatcherFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MatcherFeedback_opportunityId_createdAt_idx" ON "MatcherFeedback"("opportunityId", "createdAt");
CREATE INDEX "MatcherFeedback_signal_createdAt_idx" ON "MatcherFeedback"("signal", "createdAt");

ALTER TABLE "MatcherFeedback"
ADD CONSTRAINT "MatcherFeedback_opportunityId_fkey"
FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
