import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { BUILT_IN_STUDIO_VISUALS } from '@/lib/social/studio/assets';

export const dynamic = 'force-dynamic';

/** GET — list studio visuals (enabled only for non-admin convenience). */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const visuals = await db.studioVisual.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  return NextResponse.json({
    visuals: [
      ...BUILT_IN_STUDIO_VISUALS,
      ...visuals.map((visual) => ({ ...visual, builtIn: false })),
    ],
  });
}

/** POST — add / toggle / delete a visual. */
export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null) as {
    action?: string;
    id?: string;
    label?: string;
    category?: string;
    url?: string;
    enabled?: boolean;
    order?: number;
  } | null;
  if (!body?.action) return NextResponse.json({ error: 'action required' }, { status: 400 });
  try {
    if (body.action === 'add') {
      if (!body.url || !body.label) return NextResponse.json({ error: 'label and url required' }, { status: 400 });
      const row = await db.studioVisual.create({ data: { label: body.label.slice(0, 80), category: (body.category || 'General').slice(0, 40), url: body.url, order: 0 } });
      return NextResponse.json({ ok: true, row });
    }
    if (body.action === 'update' && body.id) {
      const existing = await db.studioVisual.findUnique({ where: { id: body.id } });
      if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
      const row = await db.studioVisual.update({
        where: { id: body.id },
        data: {
          ...(typeof body.label === 'string' ? { label: body.label.trim().slice(0, 80) || existing.label } : {}),
          ...(typeof body.category === 'string' ? { category: body.category.trim().slice(0, 40) || existing.category } : {}),
          ...(typeof body.url === 'string' && body.url.trim() ? { url: body.url.trim().slice(0, 2048) } : {}),
          ...(typeof body.enabled === 'boolean' ? { enabled: body.enabled } : {}),
          ...(Number.isFinite(body.order) ? { order: Math.max(-10000, Math.min(10000, Math.round(body.order!))) } : {}),
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
