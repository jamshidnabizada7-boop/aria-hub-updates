import { NextRequest, NextResponse } from 'next/server';
import { matchesSecret } from '@/lib/automation/auth';
import { runScheduledOpportunityTranslation } from '@/lib/automation/scheduled-translation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!matchesSecret(token, process.env.TRANSLATION_CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runScheduledOpportunityTranslation();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('[scheduled-translation] failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Translation tick failed' }, { status: 500 });
  }
}
