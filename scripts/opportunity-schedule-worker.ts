import { db } from '../src/lib/db';
import { runScheduledOpportunityImport } from '../src/lib/automation/scheduled-import';
import { runScheduledOpportunityTranslation } from '../src/lib/automation/scheduled-translation';

const kind = process.argv[2];
if (kind !== 'import' && kind !== 'translate') {
  console.error('Usage: opportunity-schedule-worker.ts import|translate');
  process.exit(2);
}

try {
  const started = Date.now();
  const result = kind === 'import'
    ? await runScheduledOpportunityImport()
    : await runScheduledOpportunityTranslation();
  console.log('[opportunity-worker]', JSON.stringify({
    kind,
    at: new Date().toISOString(),
    ms: Date.now() - started,
    ...result,
  }));
} catch (error) {
  console.error('[opportunity-worker] cycle failed', error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
