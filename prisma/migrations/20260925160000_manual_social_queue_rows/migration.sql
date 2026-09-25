-- Brand Studio may prepare a due queue row for an explicit Publish Now action.
-- Keep that row out of the automatic social worker's claims.
ALTER TABLE "SocialPostQueue"
  ADD COLUMN "requiresManualPublish" BOOLEAN NOT NULL DEFAULT false;
