import { NextRequest, NextResponse } from 'next/server';
import { matchesSecret } from '@/lib/automation/auth';
import { runScheduledOpportunityImport } from '@/lib/automation/scheduled-import';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!matchesSecret(token, process.env.IMPORT_CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runScheduledOpportunityImport();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('[scheduled-import] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Import tick failed' }, { status: 500 });
  }
}
