import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { runTick } from '@/lib/automation/tick';

/**
 * POST /api/admin/pipeline/tick — run ONE automation tick.
 *
 * Auth: admin session OR `x-cron-secret` header matching CRON_SECRET env
 * (lets the platform's 15-min cron trigger the pipeline without a session).
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get('x-cron-secret');
  if (!(secret && provided && provided === secret)) {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const origin = new URL(req.url).origin;
  const onlyRender = new URL(req.url).searchParams.get('only') === 'render';
  const result = await runTick(origin, onlyRender ? { skipImport: true, skipTranslate: true } : undefined);
  return NextResponse.json({ ok: true, result });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
