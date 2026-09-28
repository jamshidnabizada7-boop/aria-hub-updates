import { canManageSocial } from '@/lib/social/permissions';
import { matchesSecret, socialRenderBaseUrl } from '@/lib/automation/auth';
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
  if (!(matchesSecret(provided, secret))) {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageSocial(admin.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const renderOrigin = socialRenderBaseUrl();
  // Vercel's function budget is intentionally conservative; the persistent
  // worker can process larger batches.
  const result = await runSocialTick(renderOrigin, { renderLimit: 2, publishLimit: 5 });
  return NextResponse.json({ ok: true, result });
}
