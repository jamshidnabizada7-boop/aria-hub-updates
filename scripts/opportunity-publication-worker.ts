/** Review imported drafts; explicit --apply writes. No social/email sends. */
import { db } from '../src/lib/db';
import { reconcileImportedDrafts } from '../src/lib/import/automatic-publication';

const apply = process.argv.includes('--apply');
try {
  const hostname = new URL(process.env.DATABASE_URL || '').hostname;
  if (!['127.0.0.1', 'localhost', '::1'].includes(hostname) && process.env.WORKER_ALLOW_REMOTE !== '1') throw Error('remote_database_not_authorized');
  let cursor: string | undefined;
  do {
    const result = await reconcileImportedDrafts(db, { dryRun: !apply, cursor });
    console.log(JSON.stringify(result));
    cursor = result.nextCursor;
  } while (cursor);
} finally { await db.$disconnect(); }
