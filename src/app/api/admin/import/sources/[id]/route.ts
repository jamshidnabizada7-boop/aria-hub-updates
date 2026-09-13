import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAction } from '@/lib/admin-auth';
import { db } from '@/lib/db';

/**
 * PUT    /api/admin/import/sources/:id  — update a source
 * DELETE /api/admin/import/sources/:id  — delete a source
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let data: Record<string, unknown>;
  try { data = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const clean: Record<string, unknown> = {};
  for (const k of ['name', 'type', 'scraperKey', 'baseUrl', 'enabled', 'autoPublish', 'scheduleMinutes', 'defaultCategory']) {
    if (data[k] !== undefined) clean[k] = data[k];
  }
  if (data.config !== undefined) clean.config = JSON.stringify(data.config);
  if (clean.scheduleMinutes !== undefined) clean.scheduleMinutes = Number(clean.scheduleMinutes) || 60;

  try {
    const item = await db.importSource.update({ where: { id }, data: clean });
    await logAction({ userId: admin.id, action: 'update', entity: 'importSource', entityId: id, req });
    return NextResponse.json({ success: true, item });
  } catch (e) {
    console.error('[import/sources] update error:', e);
    return NextResponse.json({ error: 'Failed to update source.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    await db.importSource.delete({ where: { id } });
    await logAction({ userId: admin.id, action: 'delete', entity: 'importSource', entityId: id, req });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[import/sources] delete error:', e);
    return NextResponse.json({ error: 'Failed to delete source.' }, { status: 500 });
  }
}
