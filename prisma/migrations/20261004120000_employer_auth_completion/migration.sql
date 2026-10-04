-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordResetExpires" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT;


DO $$
DECLARE
  app_role TEXT := 'aria_social_worker';
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    EXECUTE format('GRANT SELECT, UPDATE ON TABLE "User" TO %I', app_role);
  END IF;
END
$$;
