import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAction } from '@/lib/admin-auth';
import { db } from '@/lib/db';

/**
 * POST /api/admin/import/sources/:id/toggle
 *   body: { field: 'enabled'|'autoPublish', value: boolean }
 *   Toggles a source's enabled or autoPublish flag.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let body: { field?: string; value?: boolean };
  try { body = await req.json(); } catch { body = {}; }

  const field = body.field === 'autoPublish' ? 'autoPublish' : 'enabled';
  const value = !!body.value;

  try {
    const item = await db.importSource.update({
      where: { id },
      data: { [field]: value },
    });
    await logAction({
      userId: admin.id,
      action: `${field}_toggled`,
      entity: 'importSource',
      entityId: id,
      details: `${field}=${value}`,
      req,
    });
    return NextResponse.json({ success: true, item });
  } catch (e) {
    console.error('[import/sources/toggle] error:', e);
    return NextResponse.json({ error: 'Failed to toggle.' }, { status: 500 });
  }
}
