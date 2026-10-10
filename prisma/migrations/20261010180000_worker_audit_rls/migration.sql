-- Match the existing SELECT/INSERT grants for the trusted server/worker role
-- when AuditLog RLS is enabled (including Oracle databases restored from
-- Supabase). Do not grant anonymous/browser access, updates or deletes.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aria_social_worker') THEN
    DROP POLICY IF EXISTS "AuditLog_worker_read" ON public."AuditLog";
    DROP POLICY IF EXISTS "AuditLog_worker_append" ON public."AuditLog";
    CREATE POLICY "AuditLog_worker_read" ON public."AuditLog"
      FOR SELECT TO aria_social_worker USING (true);
    CREATE POLICY "AuditLog_worker_append" ON public."AuditLog"
      FOR INSERT TO aria_social_worker WITH CHECK (true);
  END IF;
END $$;
