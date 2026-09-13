/**
 * Phase 4 self-test — the tick lock must be cross-process.
 * Run: bun run scripts/phase4-selftest.ts
 */
process.env.DATABASE_URL ||= 'postgresql://postgres@127.0.0.1:5433/ariahub?sslmode=disable';

async function childAcquire(): Promise<boolean> {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync('bun', ['-e', `process.env.DATABASE_URL=${JSON.stringify(process.env.DATABASE_URL)};import('./src/lib/automation/tick').then(async (m)=>{console.log(await m.acquireTickLock() ? 'ACQUIRED' : 'DENIED');process.exit(0)})`], { encoding: 'utf8', cwd: process.cwd() });
  return r.stdout.includes('ACQUIRED');
}

async function main() {
  const { acquireTickLock, releaseTickLock, runTick } = await import('../src/lib/automation/tick');

  await releaseTickLock().catch(() => undefined);

  // 1. acquire in this process → child must be denied
  const a = await acquireTickLock();
  const b = await childAcquire();
  console.log('lock held here:', a, '| child denied:', !b);

  // 2. release → child can acquire
  await releaseTickLock();
  const c = await childAcquire();
  console.log('child acquires after release:', c);
  // child exits without releasing — the lock is now held by a dead "process";
  // our release clears it regardless (and staleness would too after 30 min)
  await releaseTickLock();

  // 3. a full tick runs, then the lock is free again
  const t = await runTick();
  console.log('tick ran:', t.ran, '| errors recorded:', JSON.stringify(t.errors ?? []), '| reason:', t.reason ?? '-');
  const again = await acquireTickLock();
  console.log('lock released after tick:', again);
  await releaseTickLock();

  // 4. second concurrent in-process call is refused via the in-memory flag —
  //    simulated by acquiring and then calling runTick
  await acquireTickLock();
  const t2 = await runTick();
  console.log('in-process overlap refused:', t2.ran === false, `(${t2.reason})`);
  await releaseTickLock();

  process.exit(0);
}

void main();
