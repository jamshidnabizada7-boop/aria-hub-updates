import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';

/**
 * GET /api/admin/import/runs?sourceId=&page=&limit=
 *   List import runs (paginated, newest first), with source included.
 */
export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const sourceId = sp.get('sourceId') || undefined;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get('limit') || '20', 10)));

  const where = sourceId ? { sourceId } : {};

  // Cleanup stale running imports (older than 2 mins - Vercel max duration is 60s)
  const staleThreshold = new Date(Date.now() - 2 * 60 * 1000);
  await db.importRun.updateMany({
    where: { status: 'running', startedAt: { lt: staleThreshold } },
    data: { status: 'error' }
  }).catch(() => {});

  const [items, total] = await Promise.all([
    db.importRun.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { source: { select: { name: true, type: true } } },
    }),
    db.importRun.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}
