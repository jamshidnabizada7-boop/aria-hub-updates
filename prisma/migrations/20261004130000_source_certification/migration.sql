-- AlterTable
ALTER TABLE "ImportSource" ADD COLUMN     "autoPublishCriteria" JSONB,
ADD COLUMN     "certification" TEXT NOT NULL DEFAULT 'testing';


DO $$
DECLARE
  app_role TEXT := 'aria_social_worker';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    EXECUTE format('GRANT SELECT, UPDATE ON TABLE "ImportSource" TO %I', app_role);
  END IF;
END
$$;
