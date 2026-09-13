import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAction, rateLimit } from '@/lib/admin-auth';
import { runImport } from '@/lib/import/orchestrator';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for Vercel Hobby limits

/**
 * POST /api/admin/import/run
 *   body: { sourceId?: string, type?: 'job'|'scholarship' }
 *
 * Kicks off an import run. Rate-limited to avoid concurrent overlapping runs.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limit: max 5 import triggers per minute per IP
  if (!rateLimit(`import-run:${req.headers.get('x-forwarded-for') || 'local'}`, 5)) {
    return NextResponse.json({ error: 'Too many import requests. Please wait a moment.' }, { status: 429 });
  }

  let body: { sourceId?: string; type?: string; force?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const summary = await runImport({
      sourceId: body.sourceId || null,
      type: body.type || null,
      triggeredBy: `manual:${admin.email}`,
      force: body.force === true,
    });

    await logAction({
      userId: admin.id,
      action: 'import_run',
      entity: 'importRun',
      entityId: summary.runId,
      details: JSON.stringify(summary),
      req,
    });

    return NextResponse.json({ success: true, summary });
  } catch (e: any) {
    console.error('[import/run] error:', e);
    return NextResponse.json({ error: e?.message || 'Import failed.' }, { status: 500 });
  }
}
