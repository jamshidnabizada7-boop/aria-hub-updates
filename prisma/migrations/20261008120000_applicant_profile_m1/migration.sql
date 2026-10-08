-- Milestone 1 applicant identity marker; additive only. Never apply to production without owner approval.
CREATE TABLE "ApplicantProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" TEXT,
    "residence" TEXT,
    "preferredLocale" TEXT NOT NULL DEFAULT 'fa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApplicantProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApplicantProfile_userId_key" ON "ApplicantProfile"("userId");
ALTER TABLE "ApplicantProfile" ADD CONSTRAINT "ApplicantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- RLS defense-in-depth: server-only Prisma app accesses via its designated DB role.
ALTER TABLE "ApplicantProfile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ApplicantProfile" FROM PUBLIC, anon, authenticated;

-- Restrict direct Data API access: applicant profile CRUD is mediated by
-- authenticated Next.js endpoints, not end-user Supabase JWT claims.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aria_social_worker') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "ApplicantProfile" TO aria_social_worker;
    -- Trusted server-only Prisma role: end-user authorization is enforced by
    -- the authenticated app endpoints. PUBLIC/anon/authenticated have no grants.
    EXECUTE 'CREATE POLICY "ApplicantProfile_server_role" ON "ApplicantProfile" FOR ALL TO aria_social_worker USING (true) WITH CHECK (true)';
  END IF;
END $$;
