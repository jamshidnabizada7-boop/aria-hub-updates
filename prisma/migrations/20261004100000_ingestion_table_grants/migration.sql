-- PHASE 3 (completion mandate): codify the application-role grants that had
-- to be applied manually during the 2026-10-04 production release.
--
-- Context: on Supabase, Prisma migrations run as `postgres`, but the
-- application connects as the pooler role `aria_social_worker` (the role
-- part of the dotted pooler username). Tables created by a migration are
-- owned by `postgres`, so the application role has NO access until granted.
-- During the release this was fixed with manual GRANTs; this migration makes
-- that reproducible and idempotent (safe on databases where the role does
-- not exist, e.g. local dev/test).

DO $$
DECLARE
  app_role TEXT := 'aria_social_worker';
  new_tables TEXT[] := ARRAY[
    'Organization',
    'OrganizationAlias',
    'OpportunitySourceObservation',
    'OrganizationMember',
    'OrganizationSourceSuggestion'
  ];
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = app_role) THEN
    RAISE NOTICE 'role % not present — grants skipped (local/dev database)', app_role;
    RETURN;
  END IF;

  FOREACH t IN ARRAY new_tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO %I', t, app_role);
  END LOOP;

  -- Cover any sequences backing the new tables (id columns are cuid/TEXT,
  -- so this is usually a no-op, but it keeps restores/reinstatements safe).
  EXECUTE format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', app_role);

  RAISE NOTICE 'grants applied to % tables for role %', array_length(new_tables, 1), app_role;
END
$$;
