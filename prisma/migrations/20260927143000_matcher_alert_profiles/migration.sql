CREATE TABLE "MatcherAlertSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'fa',
    "profile" JSONB NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmToken" TEXT,
    "sourceIp" TEXT,
    "lastDigestAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatcherAlertSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatcherAlertSubscriber_email_key" ON "MatcherAlertSubscriber"("email");
CREATE INDEX "MatcherAlertSubscriber_status_createdAt_idx" ON "MatcherAlertSubscriber"("status", "createdAt");

ALTER TABLE "MatcherAlertSubscriber" ENABLE ROW LEVEL SECURITY;
