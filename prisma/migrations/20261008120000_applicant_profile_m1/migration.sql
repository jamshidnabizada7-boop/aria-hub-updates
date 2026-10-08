-- Milestone 1 applicant identity marker; additive only. Never apply to production without owner approval.
CREATE TABLE "ApplicantProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApplicantProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApplicantProfile_userId_key" ON "ApplicantProfile"("userId");
ALTER TABLE "ApplicantProfile" ADD CONSTRAINT "ApplicantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- RLS defense-in-depth: server-only Prisma app accesses via its designated DB role.
ALTER TABLE "ApplicantProfile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ApplicantProfile" FROM PUBLIC, anon, authenticated;
