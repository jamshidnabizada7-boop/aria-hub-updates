import { PrismaClient } from '@prisma/client';
import { processAccountDeletion } from '../src/lib/applicants/account-privacy';
const db = new PrismaClient();
async function main() {
  if (!process.argv.includes('--apply')) { console.log(JSON.stringify({ mode: 'disabled', deleted: 0 })); return; }
  if (process.env.APPLICANT_ACCOUNT_DELETION_ENABLED !== 'true') throw Error('privacy_worker_disabled');
  let complete = 0, retry = 0;
  for (let i = 0; i < 20; i++) {
    const rows = await db.$queryRaw<Array<{ id: string; attempts: number }>>`
      UPDATE "ApplicantDeletionJob" SET "status"='processing', "claimedAt"=now(), "attempts"="attempts"+1, "updatedAt"=now()
      WHERE "id" IN (SELECT "id" FROM "ApplicantDeletionJob"
        WHERE ("status"='pending' AND "nextAttemptAt"<=now()) OR ("status"='processing' AND "claimedAt"<now()-interval '15 minutes')
        ORDER BY "nextAttemptAt","id" FOR UPDATE SKIP LOCKED LIMIT 1)
      RETURNING "id","attempts"`;
    if (!rows.length) break;
    try { await processAccountDeletion(db, rows[0].id); complete++; }
    catch {
      await db.applicantDeletionJob.update({ where: { id: rows[0].id }, data: { status: 'pending', claimedAt: null,
        errorCode: 'cleanup_retry_required', nextAttemptAt: new Date(Date.now() + Math.min(86400, 60 * 2 ** Math.min(10, rows[0].attempts)) * 1000) } });
      retry++;
    }
  }
  console.log(JSON.stringify({ mode: 'apply', complete, retry }));
}
main().catch(() => { console.error('privacy_worker_failed'); process.exitCode = 1; }).finally(() => db.$disconnect());
