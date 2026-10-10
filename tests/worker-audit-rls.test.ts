import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test';
const url = new URL(process.env.DATABASE_URL);
const isolated = ['127.0.0.1', 'localhost'].includes(url.hostname) && /_(test|fresh)$/.test(url.pathname);
if (!isolated && process.env.REQUIRE_TEST_DATABASE === '1') throw new Error('Audit policy test requires an isolated test database');

(isolated ? test : test.skip)('worker audit policy permits append/read with RLS and preserves audit immutability', async () => {
  const { db } = await import('../src/lib/db');
  const sql = readFileSync(new URL('../prisma/migrations/20261010180000_worker_audit_rls/migration.sql', import.meta.url), 'utf8');
  const rollback = new Error('rollback isolated audit policy fixture');
  try {
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='aria_social_worker') THEN CREATE ROLE aria_social_worker NOLOGIN; END IF; END $$`);
      await tx.$executeRawUnsafe('GRANT SELECT, INSERT ON public."AuditLog" TO aria_social_worker');
      await tx.$executeRawUnsafe('REVOKE UPDATE, DELETE ON public."AuditLog" FROM aria_social_worker');
      await tx.$executeRawUnsafe('ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY');
      await tx.$executeRawUnsafe(sql);
      const held = 'held-'+randomUUID();
      await tx.auditLog.create({ data: { id: held, entity: 'opportunity', entityId: 'test-fixture', action: 'opportunity.manual-draft' } });
      await tx.$executeRawUnsafe('SET LOCAL ROLE aria_social_worker');
      const written = await tx.auditLog.create({ data: { entity: 'opportunity', entityId: 'test-fixture', action: 'opportunity.auto-publish' } });
      expect(written.action).toBe('opportunity.auto-publish');
      expect((await tx.auditLog.findUnique({ where: { id: held } }))?.action).toBe('opportunity.manual-draft');
      const privileges = await tx.$queryRaw<Array<{ update_allowed: boolean; delete_allowed: boolean }>>`SELECT has_table_privilege(current_user, 'public."AuditLog"', 'UPDATE') AS update_allowed, has_table_privilege(current_user, 'public."AuditLog"', 'DELETE') AS delete_allowed`;
      expect(privileges[0].update_allowed).toBe(false);
      expect(privileges[0].delete_allowed).toBe(false);
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
});
