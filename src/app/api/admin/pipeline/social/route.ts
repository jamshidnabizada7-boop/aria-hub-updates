import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { runSocialTick } from '@/lib/automation/social-tick';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Fast social-only pipeline endpoint.
 *
 * This intentionally excludes scraping and translation so slow source imports
 * cannot delay scheduled social posts. It is safe to call repeatedly: queue,
 * render and delivery claims are idempotent/lock-guarded.
 *
 * Auth: admin session OR x-cron-secret matching CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get('x-cron-secret');
  if (!(secret && provided && provided === secret)) {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const renderUrl = new URL(
    process.env.SOCIAL_RENDER_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://www.myariahub.com',
  );
  if (renderUrl.protocol !== 'https:' &&
      !(process.env.NODE_ENV !== 'production' &&
        renderUrl.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(renderUrl.hostname))) {
    return NextResponse.json({ error: 'Invalid social render URL' }, { status: 500 });
  }
  // Vercel's function budget is intentionally conservative; the persistent
  // worker can process larger batches.
  const result = await runSocialTick(renderUrl.origin, { renderLimit: 2, publishLimit: 5 });
  return NextResponse.json({ ok: true, result });
}
