import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAction } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET  /api/admin/import/sources  — list all sources
 * POST /api/admin/import/sources  — create a new source
 */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await db.importSource.findMany({
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ items });
}

const VALID_TYPES = ['job', 'scholarship'];

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let data: Record<string, unknown>;
  try { data = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const name = String(data.name || '').trim();
  const type = String(data.type || '').trim();
  const scraperKey = String(data.scraperKey || '').trim();
  const baseUrl = String(data.baseUrl || '').trim();

  if (!name || !type || !scraperKey || !baseUrl) {
    return NextResponse.json({ error: 'name, type, scraperKey, baseUrl are required.' }, { status: 400 });
  }
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }

  try {
    const item = await db.importSource.create({
      data: {
        name,
        type,
        scraperKey,
        baseUrl,
        enabled: data.enabled !== false,
        autoPublish: data.autoPublish === true,
        scheduleMinutes: Number(data.scheduleMinutes) || 60,
        defaultCategory: (data.defaultCategory as string) || null,
        config: data.config ? JSON.stringify(data.config) : null,
      },
    });
    await logAction({ userId: admin.id, action: 'create', entity: 'importSource', entityId: item.id, req });
    return NextResponse.json({ success: true, item });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'A source with this name already exists.' }, { status: 409 });
    }
    console.error('[import/sources] create error:', e);
    return NextResponse.json({ error: 'Failed to create source.' }, { status: 500 });
  }
}
