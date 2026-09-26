import { canManageSocial } from '@/lib/social/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { isAllowedStudioMediaUrl } from '@/lib/social/studio/media-url';

export const dynamic = 'force-dynamic';

/** GET — list studio visuals (enabled only for non-admin convenience). */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const visuals = await db.studioVisual.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  return NextResponse.json({ visuals });
}

/** POST — add / toggle / delete a visual. */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!canManageSocial(admin.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => null) as {
    action?: string; id?: string; label?: string; category?: string; url?: string;
    enabled?: boolean; order?: number;
  } | null;
  if (!body?.action) return NextResponse.json({ error: 'action required' }, { status: 400 });
  try {
    if (body.action === 'add') {
      if (!body.url || !body.label) return NextResponse.json({ error: 'label and url required' }, { status: 400 });
      if (!isAllowedStudioMediaUrl(body.url)) return NextResponse.json({ error: 'Use a site asset or durable public Blob URL' }, { status: 400 });
      const row = await db.studioVisual.create({ data: { label: body.label.slice(0, 80), category: (body.category || 'General').slice(0, 40), url: body.url, order: 0 } });
      return NextResponse.json({ ok: true, row });
    }
    if (body.action === 'update' && body.id) {
      if (body.url !== undefined && !isAllowedStudioMediaUrl(body.url)) {
        return NextResponse.json({ error: 'Use a site asset or durable public Blob URL' }, { status: 400 });
      }
      const existing = await db.studioVisual.findUnique({ where: { id: body.id } });
      if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
      const row = await db.studioVisual.update({
        where: { id: body.id },
        data: {
          label: typeof body.label === 'string' && body.label.trim() ? body.label.trim().slice(0, 80) : existing.label,
          category: typeof body.category === 'string' && body.category.trim() ? body.category.trim().slice(0, 40) : existing.category,
          url: typeof body.url === 'string' ? body.url : existing.url,
          enabled: typeof body.enabled === 'boolean' ? body.enabled : existing.enabled,
          order: typeof body.order === 'number' && Number.isFinite(body.order) ? Math.trunc(body.order) : existing.order,
        },
      });
      return NextResponse.json({ ok: true, row });
    }
    if (body.action === 'toggle' && body.id) {
      const existing = await db.studioVisual.findUnique({ where: { id: body.id } });
      if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
      const row = await db.studioVisual.update({ where: { id: body.id }, data: { enabled: !existing.enabled } });
      return NextResponse.json({ ok: true, row });
    }
    if (body.action === 'delete' && body.id) {
      await db.studioVisual.delete({ where: { id: body.id } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}
