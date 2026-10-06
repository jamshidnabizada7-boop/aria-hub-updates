-- RELEASE CLOSEOUT (2026-10-06): codify the complete aria_social_worker grant
-- set so the deployed production permission state is reproducible from
-- migrations alone.
--
-- Trigger: after the 514bd80 promotion the Jobs.af import started failing
-- ("failed 19") because the worker's jobsaf admin-edit detection
-- (src/lib/import/orchestrator.ts) runs db.auditLog.findFirst and the worker
-- role had no AuditLog grant — Postgres 42501 threw and failed every item.
-- The manual repair (GRANT INSERT, SELECT ON "AuditLog") fixed it instantly;
-- this migration makes that repair (and the whole grant matrix) permanent.
--
-- The matrix below mirrors the audited production state exactly:
--   * IMPORT-WORKER lane (least privilege derived from the worker import
--     graph — scripts/opportunity-import-worker.ts + src/lib/import/**):
--     AuditLog SELECT,INSERT; ImportRun SELECT,INSERT,UPDATE;
--     ImportSource SELECT,UPDATE; Opportunity SELECT,INSERT,UPDATE;
--     OpportunityCategory SELECT; OpportunitySourceObservation
--     SELECT,INSERT,UPDATE; Organization SELECT,INSERT,UPDATE;
--     OrganizationAlias SELECT,INSERT,UPDATE.
--   * SOCIAL-WORKER lane (the same shared DB role also serves
--     aria-hub-social-worker): AutomationState, OpportunityLocation,
--     OrganizationMember, OrganizationSourceSuggestion, PipelineRun,
--     PublishChannel, RateLimitBucket, SocialDelivery, SocialPostQueue,
--     StudioDesign, TranslationChunk, User — mirroring their existing
--     production grants so role separation (future aria_import_worker vs
--     aria_social_worker split) can later be done by subtracting lanes.
--
-- Idempotent: GRANT statements are additive and safe to re-run; the whole
-- block is skipped on databases where the role does not exist (local dev and
-- test databases where Prisma runs as the owner role).

DO $$
DECLARE
  app_role TEXT := 'aria_social_worker';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    RAISE NOTICE 'role % not present — grants skipped (local/dev database)', app_role;
    RETURN;
  END IF;

  -- IMPORT-WORKER lane
  EXECUTE 'GRANT SELECT, INSERT ON TABLE "AuditLog" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE "ImportRun" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, UPDATE ON TABLE "ImportSource" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE "Opportunity" TO aria_social_worker';
  EXECUTE 'GRANT SELECT ON TABLE "OpportunityCategory" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE "OpportunitySourceObservation" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE "Organization" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE "OrganizationAlias" TO aria_social_worker';

  -- SOCIAL-WORKER lane (shared role; mirrors existing production grants)
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE "AutomationState" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "OpportunityLocation" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "OrganizationMember" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "OrganizationSourceSuggestion" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, INSERT ON TABLE "PipelineRun" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, UPDATE ON TABLE "PublishChannel" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "RateLimitBucket" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE "SocialDelivery" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE "SocialPostQueue" TO aria_social_worker';
  EXECUTE 'GRANT SELECT ON TABLE "StudioDesign" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "TranslationChunk" TO aria_social_worker';
  EXECUTE 'GRANT SELECT, UPDATE ON TABLE "User" TO aria_social_worker';

  -- Keep sequence usage safe across restores/reinstatements (ids are
  -- cuid/TEXT so this is usually a no-op).
  EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', app_role);

  RAISE NOTICE 'worker grant matrix applied for role %', app_role;
END
$$;
