/**
 * ChatGPT Translation Gateway — RPC behavior suite (2026-10-07).
 *
 * Exercises the four SECURITY DEFINER RPC functions (claim/commit/fail/
 * translation_queue_status) plus the aria_translation_worker privilege
 * boundary, against a real Postgres with the full migration chain applied
 * (DATABASE_URL must point at an isolated localhost *_test / *_fresh DB —
 * tests create and delete their own tgwtest-* fixture rows).
 *
 * The shared suite DB legitimately holds published rows from other test
 * files, so per-case tests claim-in-a-loop (claimAll/claimOne) until their
 * boosted fixture is in hand and release every scanned claim untouched.
 *
 * Mandated coverage: concurrent claim disjointness, manual rows unclaimable,
 * expired rows skipped, claim expiry reclaim, sourceHash guard, partial
 * language rejection, manual overwrite protection, URL/email/number
 * preservation, commit atomicity, fail→retryable, 30-row default batch,
 * 50-row upper bound.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import pg from 'pg';

process.env.DATABASE_URL ||= 'postgresql://postgres:test@127.0.0.1:5434/ariagw_test?sslmode=disable';
const adminUrl = new URL(process.env.DATABASE_URL);
const isolated = ['127.0.0.1', 'localhost'].includes(adminUrl.hostname) &&
  (adminUrl.pathname.endsWith('_test') || adminUrl.pathname.endsWith('_fresh'));

const WORKER_URL = process.env.ARIA_TRANSLATION_WORKER_URL ||
  'postgresql://aria_translation_worker:tgw-test-pw-1234567890@127.0.0.1:5434/ariagw_test';

const describeIf = isolated ? describe : describe.skip;

/** Minimal translation of a field map: keeps URLs/emails/numbers, adds a Persian prefix. */
function translate(fields: Record<string, string>, prefix = 'ترجمه آزمایشی: '): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = prefix + v;
  return out;
}

const LONG_BODY =
  'We are hiring an officer in Kabul. Apply online at https://example.org/apply/jobs ' +
  'or email recruitment@example.org before the deadline. The salary is $1,200 per month ' +
  'with 50 available slots. Candidates must hold a 2024 or newer bachelor degree and have ' +
  'at least 3 years of experience in program management, reporting, and community outreach.';

type ClaimItem = { id: string; sourceHash: string; needFa: boolean; needPs: boolean; fields: Record<string, string> };

describeIf('translation gateway RPCs', () => {
  let admin: pg.Client;
  let worker: pg.Client;
  let seq = 0;

  async function seedFixture(overrides: Record<string, unknown> = {}): Promise<string> {
    seq += 1;
    const id = `tgwtest-${Date.now()}-${seq}`;
    const res = await admin.query(
      `INSERT INTO "Opportunity" (id, slug, title, description, status, "faStatus", "psStatus",
         deadline, "verificationStatus", "translationOrigin", "translationSourceHash", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now()) RETURNING id`,
      [
        id,
        `${id}-slug`,
        overrides.title ?? `Test Opportunity ${seq}`,
        overrides.description ?? LONG_BODY,
        overrides.status ?? 'published',
        overrides.faStatus ?? null,
        overrides.psStatus ?? null,
        overrides.deadline ?? new Date(Date.now() + 86400_000), // closing-soon bucket
        overrides.verificationStatus ?? 'verified_official',   // publication-ready bucket
        overrides.translationOrigin ?? null,
        overrides.translationSourceHash ?? null,
      ],
    );
    return res.rows[0].id;
  }

  async function seedBulk(n: number): Promise<void> {
    const values: unknown[] = [];
    const rows: string[] = [];
    for (let i = 1; i <= n; i++) {
      seq += 1;
      const id = `tgwtest-bulk-${Date.now()}-${seq}`;
      values.push(id, `${id}-slug`, `Bulk Opportunity ${i}`, LONG_BODY);
      const base = rows.length * 4;
      rows.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},'published',NULL,NULL,now() + interval '30 days', now())`);
    }
    await admin.query(
      `INSERT INTO "Opportunity" (id, slug, title, description, status, "faStatus", "psStatus", deadline, "updatedAt")
       VALUES ${rows.join(',')}`, values,
    );
  }

  async function claim(workerClient: pg.Client, limit = 30, opts: { charBudget?: number; includeExpired?: boolean } = {}) {
    const res = await workerClient.query(
      'SELECT public.claim_translation_batch($1::int, $2::int, $3::boolean, $4::text) AS r',
      [limit, opts.charBudget ?? 250_000, opts.includeExpired ?? false, 'chatgpt'],
    );
    return res.rows[0].r as { ok: boolean; claimId: string; count: number; items: ClaimItem[] };
  }

  async function release(claimId: string, client: pg.Client = worker) {
    await client.query('SELECT public.fail_translation_batch($1::text)', [claimId]);
  }

  /** Claim (releasing scanned claims that hold nothing we need) until every
   *  id is in hand. Claims holding found items stay alive — callers commit
   *  against them. */
  async function claimAll(ids: string[], opts: { includeExpired?: boolean } = {}, tries = 15) {
    const missing = new Set(ids);
    const found = new Map<string, { claimId: string; item: ClaimItem }>();
    for (let i = 0; i < tries && missing.size > 0; i++) {
      const r = await claim(worker, 50, opts);
      let holdsWanted = false;
      for (const item of r.items) {
        if (missing.has(item.id)) {
          missing.delete(item.id);
          holdsWanted = true;
          found.set(item.id, { claimId: r.claimId, item });
        }
      }
      if (!holdsWanted) await release(r.claimId);
    }
    return found;
  }

  async function claimOne(id: string, opts: { includeExpired?: boolean } = {}) {
    const res = await claimAll([id], opts);
    expect(res.size).toBe(1);
    return res.get(id)!;
  }

  async function commit(claimId: string, items: unknown[]) {
    const res = await worker.query(
      'SELECT public.commit_translation_batch($1::text, $2::jsonb) AS r',
      [claimId, JSON.stringify({ items })],
    );
    return res.rows[0].r as { ok: boolean; committed: number; faCompleted: number; psCompleted: number };
  }

  async function rowById(id: string) {
    const res = await admin.query(
      `SELECT "faStatus", "psStatus", "translationStatus", "translationOrigin",
              "translationSourceHash", "translationClaimId", "titleI18n", "descriptionI18n"
       FROM "Opportunity" WHERE id = $1`, [id],
    );
    return res.rows[0];
  }

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await admin.connect();
    // The migration creates the role passwordless; give it a known password
    // so the worker-identity connection path is exercised exactly as in prod.
    await admin.query(`ALTER ROLE aria_translation_worker WITH PASSWORD 'tgw-test-pw-1234567890'`);
    worker = new pg.Client({ connectionString: WORKER_URL });
    await worker.connect();
    // Release any claims the rest of the suite may have left hanging.
    for (let i = 0; i < 50; i++) {
      const r = await claim(worker, 50);
      if (!r.count) break;
      await release(r.claimId);
    }
  });

  afterAll(async () => {
    await admin.query(`DELETE FROM "Opportunity" WHERE id LIKE 'tgwtest-%'`);
    await admin.query(`DELETE FROM "AuditLog" WHERE action IN ('translation_claim','translation_commit','translation_fail')`);
    await admin.end().catch(() => undefined);
    await worker.end().catch(() => undefined);
  });

  test('worker role is privilege-bounded (no table DML, no helpers, RPC only)', async () => {
    await expect(worker.query('SELECT id FROM "Opportunity" LIMIT 1')).rejects.toThrow(/permission denied/i);
    await expect(worker.query(`UPDATE "Opportunity" SET title='x' WHERE id='nope'`)).rejects.toThrow(/permission denied/i);
    await expect(worker.query(`DELETE FROM "Opportunity" WHERE id='nope'`)).rejects.toThrow(/permission denied/i);
    await expect(worker.query(`INSERT INTO "AuditLog" (id, action) VALUES ('tgwtest-x','hacked')`)).rejects.toThrow(/permission denied/i);
    await expect(worker.query(`SELECT public.aria_tgw_source_plan('{}'::jsonb)`)).rejects.toThrow(/permission denied/i);
    await expect(worker.query('CREATE TABLE tgwtest_hack(id int)')).rejects.toThrow(/permission denied/i);
    const ok = await worker.query('SELECT public.translation_queue_status() AS r');
    expect(ok.rows[0].r.ok).toBe(true);
  });

  test('hourly body batches exclude failed IDs and rotate released records', async () => {
    const existing=(await admin.query('SELECT id FROM "Opportunity"')).rows.map(r=>r.id);
    const firstId=await seedFixture();const secondId=await seedFixture();
    const rpc='SELECT public.claim_translation_batch_excluding(1,12000,false,$1::text,$2::text[]) AS r';
    const first=(await worker.query(rpc,['hourly-test',existing])).rows[0].r;
    expect(first.count).toBe(1);const claimed=first.items[0].id;
    await release(first.claimId);
    const next=(await worker.query(rpc,['hourly-test',existing])).rows[0].r;
    expect(next.items[0].id).not.toBe(claimed);await release(next.claimId);
    const empty=(await worker.query(rpc,['hourly-test',[...existing,firstId,secondId]])).rows[0].r;
    expect(empty.count).toBe(0);
  });

  test('claim returns pending rows with source fields and hashes', async () => {
    const id = await seedFixture();
    const { claimId, item } = await claimOne(id);
    expect(item.needFa).toBe(true);
    expect(item.fields.title).toContain('Test Opportunity');
    expect(item.fields.description).toContain('https://example.org/apply/jobs');
    expect(item.sourceHash).toMatch(/^[0-9a-f]{64}$/);
    const row = await rowById(id);
    expect(row.translationClaimId).toBe(claimId);
    await admin.query(`DELETE FROM "Opportunity" WHERE id=$1`, [id]);
  });

  test('two concurrent claimers never get the same row (SKIP LOCKED)', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 8; i++) ids.push(await seedFixture());
    const w2 = new pg.Client({ connectionString: WORKER_URL });
    await w2.connect();
    const [a, b] = await Promise.all([claim(worker, 5), claim(w2, 5)]);
    const aIds = a.items.map((i) => i.id);
    const bIds = b.items.map((i) => i.id);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    for (const x of aIds) expect(bIds).not.toContain(x);
    await release(b.claimId, w2);
    await w2.end();
    await release(a.claimId);
    await admin.query(`DELETE FROM "Opportunity" WHERE id = ANY($1)`, [ids]);
  });

  test('manually translated rows are never claimed', async () => {
    const manual = await seedFixture({ translationOrigin: { fa: 'MANUAL', ps: 'MANUAL' } });
    const stale = await seedFixture({ translationOrigin: { fa: 'MANUAL_STALE', ps: 'MANUAL_STALE' } });
    const r = await claim(worker, 50);
    const got = r.items.map((i) => i.id);
    expect(got).not.toContain(manual);
    expect(got).not.toContain(stale);
    await release(r.claimId);
    await admin.query(`DELETE FROM "Opportunity" WHERE id = ANY($1)`, [[manual, stale]]);
  });

  test('expired rows are skipped unless explicitly included', async () => {
    const past = await seedFixture({ deadline: new Date(Date.now() - 86400_000) });
    const r = await claim(worker, 50);
    expect(r.items.map((i) => i.id)).not.toContain(past);
    await release(r.claimId);
    const held = await claimOne(past, { includeExpired: true });
    expect(held.item.id).toBe(past);
    await admin.query(`DELETE FROM "Opportunity" WHERE id=$1`, [past]);
  });

  test('expired claims are safely reclaimable after 90 minutes', async () => {
    const id = await seedFixture();
    const first = await claimOne(id);
    await admin.query(`UPDATE "Opportunity" SET "translationClaimedAt" = now() - interval '91 minutes' WHERE id=$1`, [id]);
    const second = await claimOne(id);
    expect(second.claimId).not.toBe(first.claimId);
    await admin.query(`DELETE FROM "Opportunity" WHERE id=$1`, [id]);
  });

  test('commit rejects when the source changed after claim (sourceHash)', async () => {
    const id = await seedFixture();
    const { claimId, item } = await claimOne(id);
    await admin.query(`UPDATE "Opportunity" SET title = title || ' (amended)' WHERE id=$1`, [id]);
    await expect(commit(claimId, [{ id, sourceHash: item.sourceHash, fa: translate(item.fields) }]))
      .rejects.toThrow(/TGW:source_hash_changed/);
    await admin.query(`DELETE FROM "Opportunity" WHERE id=$1`, [id]);
  });

  test('commit rejects Pashto before Persian is complete', async () => {
    const id = await seedFixture();
    const { claimId, item } = await claimOne(id);
    await expect(commit(claimId, [{ id, sourceHash: item.sourceHash, ps: translate(item.fields) }]))
      .rejects.toThrow(/TGW:persian_not_complete/);
    await admin.query(`DELETE FROM "Opportunity" WHERE id=$1`, [id]);
  });

  test('commit refuses to overwrite manual translations set after claim', async () => {
    const id = await seedFixture();
    const { claimId, item } = await claimOne(id);
    await admin.query(`UPDATE "Opportunity" SET "translationOrigin" = '{"fa":"MANUAL"}'::jsonb WHERE id=$1`, [id]);
    await expect(commit(claimId, [{ id, sourceHash: item.sourceHash, fa: translate(item.fields) }]))
      .rejects.toThrow(/TGW:manual_translation_locked/);
    await admin.query(`DELETE FROM "Opportunity" WHERE id=$1`, [id]);
  });

  test('URLs, emails and numbers must survive translation', async () => {
    const id = await seedFixture();
    const { claimId, item } = await claimOne(id);

    // URL dropped
    const noUrl = { ...item.fields };
    noUrl.description = noUrl.description.replace(/https:\/\/example\.org\/apply\/jobs/g, 'وب‌سایت مربوطه');
    await expect(commit(claimId, [{ id, sourceHash: item.sourceHash, fa: noUrl }]))
      .rejects.toThrow(/TGW:field_invalid.*url_lost/);

    // Email dropped
    const noEmail = { ...item.fields };
    noEmail.description = noEmail.description.replace(/recruitment@example\.org/g, 'ایمیل ما');
    await expect(commit(claimId, [{ id, sourceHash: item.sourceHash, fa: noEmail }]))
      .rejects.toThrow(/TGW:field_invalid.*email_lost/);

    // Number dropped
    const noNumber = { ...item.fields };
    noNumber.description = noNumber.description.replace(/\$1,200/g, 'معاش قابل مذاکره');
    await expect(commit(claimId, [{ id, sourceHash: item.sourceHash, fa: noNumber }]))
      .rejects.toThrow(/TGW:field_invalid.*number_lost/);

    await admin.query(`DELETE FROM "Opportunity" WHERE id=$1`, [id]);
  });

  test('a fully valid commit succeeds and writes statuses, i18n, hash, origin', async () => {
    const id = await seedFixture();
    const { claimId, item } = await claimOne(id);
    const result = await commit(claimId, [{ id, sourceHash: item.sourceHash, fa: translate(item.fields) }]);
    expect(result.ok).toBe(true);
    expect(result.faCompleted).toBe(1);
    const row = await rowById(id);
    expect(row.faStatus).toBe('complete');
    expect(row.translationStatus).toBe('partial'); // ps still pending
    expect(row.translationClaimId).toBeNull();
    expect(row.translationSourceHash).toBe(item.sourceHash);
    expect(row.translationOrigin.fa).toBe('AI');
    expect(row.titleI18n.fa).toContain('ترجمه');
    await admin.query(`DELETE FROM "Opportunity" WHERE id=$1`, [id]);
  });

  test('Pashto commits only after Persian is complete (second claim pass)', async () => {
    const id = await seedFixture();
    const first = await claimOne(id);
    await commit(first.claimId, [{ id, sourceHash: first.item.sourceHash, fa: translate(first.item.fields) }]);

    const second = await claimOne(id);
    expect(second.item.needFa).toBe(false);
    expect(second.item.needPs).toBe(true);
    const result = await commit(second.claimId, [{ id, sourceHash: second.item.sourceHash, ps: translate(second.item.fields, 'پښتو: ') }]);
    expect(result.psCompleted).toBe(1);
    const row = await rowById(id);
    expect(row.psStatus).toBe('complete');
    expect(row.translationStatus).toBe('complete');
    await admin.query(`DELETE FROM "Opportunity" WHERE id=$1`, [id]);
  });

  test('commit is atomic: one invalid item rolls back the entire batch', async () => {
    const idA = await seedFixture();
    const idB = await seedFixture();
    // Both fixtures are top-priority; retry until one claim holds both.
    let r: Awaited<ReturnType<typeof claim>> | null = null;
    let itemA: ClaimItem | undefined;
    let itemB: ClaimItem | undefined;
    for (let i = 0; i < 15; i++) {
      r = await claim(worker, 50);
      itemA = r.items.find((i) => i.id === idA);
      itemB = r.items.find((i) => i.id === idB);
      if (itemA && itemB) break;
      await release(r.claimId);
      r = null;
    }
    expect(r && itemA && itemB).toBeTruthy();
    const badB = { ...itemB!.fields };
    badB.description = badB.description.replace(/https:\/\/example\.org\/apply\/jobs/g, 'لینک');
    await expect(commit(r!.claimId, [
      { id: idA, sourceHash: itemA!.sourceHash, fa: translate(itemA!.fields) }, // valid
      { id: idB, sourceHash: itemB!.sourceHash, fa: badB },                     // invalid
    ])).rejects.toThrow(/TGW:field_invalid/);

    const rowA = await rowById(idA);
    expect(rowA.faStatus).toBeNull();                // nothing applied
    expect(rowA.titleI18n?.fa).toBeUndefined();
    expect(rowA.translationClaimId).toBe(r!.claimId); // still claimed
    await admin.query(`DELETE FROM "Opportunity" WHERE id = ANY($1)`, [[idA, idB]]);
  });

  test('failed claims become retryable immediately', async () => {
    const id = await seedFixture();
    const first = await claimOne(id);
    const failRes = await worker.query('SELECT public.fail_translation_batch($1::text, $2::jsonb) AS r',
      [first.claimId, JSON.stringify([{ id, error: 'model refused' }])]);
    expect(failRes.rows[0].r.released).toBe(1);
    const second = await claimOne(id);
    expect(second.claimId).not.toBe(first.claimId);
    await admin.query(`DELETE FROM "Opportunity" WHERE id=$1`, [id]);
  });

  test('status reports queue buckets', async () => {
    const id = await seedFixture();
    const manual = await seedFixture({ translationOrigin: { fa: 'MANUAL', ps: 'MANUAL' } });
    const s = await worker.query('SELECT public.translation_queue_status() AS r');
    const q = s.rows[0].r.queue;
    expect(q.pending).toBeGreaterThanOrEqual(1);
    expect(q.manual).toBeGreaterThanOrEqual(1);
    const r = await claim(worker, 50);
    const s2 = await worker.query('SELECT public.translation_queue_status() AS r');
    expect(s2.rows[0].r.queue.processing).toBeGreaterThanOrEqual(1);
    await release(r.claimId);
    await admin.query(`DELETE FROM "Opportunity" WHERE id = ANY($1)`, [[id, manual]]);
  });

  test('default batch is 30 rows', async () => {
    await seedBulk(40);
    const r = await claim(worker); // no args → default limit 30
    expect(r.count).toBe(30);
    await release(r.claimId);
  });

  test('maximum batch is 50 rows; higher limits are rejected', async () => {
    await seedBulk(30); // 40 bulk rows still pending from the previous test
    const r = await claim(worker, 50);
    expect(r.count).toBe(50);
    await expect(worker.query('SELECT public.claim_translation_batch($1::int)', [60]))
      .rejects.toThrow(/TGW:invalid_limit/);
    const left = await claim(worker, 50);
    expect(left.count).toBe(20); // everything seeded is now claimed
    await release(left.claimId);
  });
});
