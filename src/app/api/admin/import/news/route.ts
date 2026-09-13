import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAction, rateLimit } from '@/lib/admin-auth';
import { runNewsImport } from '@/lib/import/news-import';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for Vercel Hobby limits

/**
 * POST /api/admin/import/news
 *   body: { sourceId?: string }
 *
 * Triggers an RSS → News import for one news source (type='news',
 * scraperKey='rssNews'), or auto-picks the least-recently-run enabled news
 * source when sourceId is omitted. The admin panel's "Import News" action
 * on news-type sources calls this route.
 */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Rate limit: max 10 news imports per minute per IP (runs are quick).
  if (!rateLimit(`import-news:${req.headers.get('x-forwarded-for') || 'local'}`, 10)) {
    return NextResponse.json({ error: 'Too many import requests. Please wait a moment.' }, { status: 429 });
  }

  let body: { sourceId?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const summary = await runNewsImport({
      sourceId: body.sourceId || null,
      triggeredBy: `manual:${admin.email}`,
    });

    await logAction({
      userId: admin.id,
      action: 'import_news',
      entity: 'importRun',
      entityId: summary.runId,
      details: JSON.stringify(summary),
      req,
    });

    return NextResponse.json({ success: true, summary });
  } catch (e: unknown) {
    console.error('[import/news] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'News import failed.' },
      { status: 500 },
    );
  }
}
