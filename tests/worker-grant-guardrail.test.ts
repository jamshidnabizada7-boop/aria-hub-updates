/**
 * Worker grant guardrail (release closeout 2026-10-06).
 *
 * Asserts that every table the import worker touches carries the exact
 * privileges its code paths need for the shared `aria_social_worker` role —
 * the gap that broke Jobs.af in production when AuditLog was missing
 * (Postgres 42501 → "failed 19").
 *
 * Skips cleanly on databases where the role does not exist (local dev/test
 * DBs where migrations run as the owner role); the fresh-DB verification
 * pre-creates the role so this test exercises the real migration output.
 */
import { describe, test, expect } from 'bun:test';
import Prisma from '@prisma/client';

process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub_test?sslmode=disable';
const testUrl = new URL(process.env.DATABASE_URL);
const isolated = ['127.0.0.1', 'localhost'].includes(testUrl.hostname) &&
  (testUrl.pathname.endsWith('_test') || testUrl.pathname.endsWith('_fresh'));

const ROLE = 'aria_social_worker';

/** table → privileges the import worker's code paths require */
const WORKER_REQUIRED: Record<string, string[]> = {
  AuditLog: ['SELECT', 'INSERT'],
  ImportRun: ['SELECT', 'INSERT', 'UPDATE'],
  ImportSource: ['SELECT', 'UPDATE'],
  Opportunity: ['SELECT', 'INSERT', 'UPDATE'],
  OpportunityCategory: ['SELECT'],
  OpportunitySourceObservation: ['SELECT', 'INSERT', 'UPDATE'],
  Organization: ['SELECT', 'INSERT', 'UPDATE'],
  OrganizationAlias: ['SELECT', 'INSERT', 'UPDATE'],
};

const describeIf = isolated ? describe : describe.skip;

describeIf('worker grant guardrail (closeout §2)', () => {
  const prisma = new Prisma.PrismaClient({ log: ['error'] });

  test('role exists on production-shaped databases and holds every required privilege', async () => {
    const role = await prisma.$queryRawUnsafe<Array<{ rolname: string }>>(
      `SELECT rolname FROM pg_roles WHERE rolname = $1`, ROLE,
    );
    if (role.length === 0) {
      console.warn(`[worker-grant-guardrail] role ${ROLE} not present on this database — skipping assertion (dev DB)`);
      return;
    }
    for (const [table, privs] of Object.entries(WORKER_REQUIRED)) {
      for (const priv of privs) {
        const ok = await prisma.$queryRawUnsafe<Array<{ allowed: boolean }>>(
          `SELECT has_table_privilege($1, $2, $3) AS allowed`, ROLE, `"${table}"`, priv,
        );
        expect(ok[0]?.allowed).toBe(true);
      }
    }
  });

  test('every required worker table exists (migration + schema in sync)', async () => {
    for (const table of Object.keys(WORKER_REQUIRED)) {
      const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
        `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        table,
      );
      expect(Number(rows[0]?.n)).toBe(1);
    }
  });

  test('AuditLog is writable by the worker role (the Jobs.af regression)', async () => {
    const role = await prisma.$queryRawUnsafe<Array<{ rolname: string }>>(
      `SELECT rolname FROM pg_roles WHERE rolname = $1`, ROLE,
    );
    if (role.length === 0) return; // dev DB — covered by the skip above
    const ins = await prisma.$queryRawUnsafe<Array<{ allowed: boolean }>>(
      `SELECT has_table_privilege($1, $2, 'INSERT') AS allowed`, ROLE, '"AuditLog"',
    );
    const sel = await prisma.$queryRawUnsafe<Array<{ allowed: boolean }>>(
      `SELECT has_table_privilege($1, $2, 'SELECT') AS allowed`, ROLE, '"AuditLog"',
    );
    expect(ins[0]?.allowed).toBe(true);
    expect(sel[0]?.allowed).toBe(true);
  });
});
