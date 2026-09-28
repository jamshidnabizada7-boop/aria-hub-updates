import { canManageSocial } from '@/lib/social/permissions';
import { saveStudioDesign } from '@/lib/social/studio/persistence';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { hasUnsafeStudioMedia } from '@/lib/social/studio/media-url';

export const dynamic = 'force-dynamic';

/**
 * Brand Studio design persistence.
 *
 * GET  ?date=YYYY-MM-DD — all StudioDesign rows for that plan date.
 * POST { action: 'save', design }        — upsert the design (contentRef+forDate).
 * POST { action: 'ensure-row', design, contentJson, captionJson }
 *        — upsert the design AND make sure a queue row exists for today with
 *          the design applied (create if the daily build hasn't, update if it
 *          has) so "Publish now" renders exactly what was designed.
 *
 * All actions are admin-gated; content JSON is trusted from the admin panel
 * the same way the generic CRUD already trusts admin input.
 */

interface DesignInput {
  contentRef: string;
  forDate: string;
  templateType: string;
  themeId?: string;
  layout?: string;
  size?: string;
  overrides?: Record<string, unknown>;
  captionOverride?: Record<string, string>;
}

function parseDesign(input: unknown): DesignInput | null {
  const d = input as Record<string, unknown> | null;
  if (!d || typeof d.contentRef !== 'string' || !d.contentRef) return null;
  if (typeof d.forDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.forDate)) return null;
  return {
    contentRef: d.contentRef,
    forDate: d.forDate,
    templateType: String(d.templateType || 'promo'),
    themeId: typeof d.themeId === 'string' ? d.themeId : 'midnight',
    layout: typeof d.layout === 'string' ? d.layout : 'classic',
    size: typeof d.size === 'string' ? d.size : 'square',
    overrides: (d.overrides ?? {}) as Record<string, unknown>,
    captionOverride: (d.captionOverride ?? {}) as Record<string, string>,
  };
}

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const date = req.nextUrl.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date=YYYY-MM-DD required' }, { status: 400 });
  }
  const designs = await db.studioDesign.findMany({ where: { forDate: date } });
  return NextResponse.json({ ok: true, designs });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageSocial(admin.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const action = String(body.action || '');
  const design = parseDesign(body.design);
  if (!design) return NextResponse.json({ error: 'invalid_design' }, { status: 400 });
  if (hasUnsafeStudioMedia(design.overrides) || hasUnsafeStudioMedia(body.contentJson)) {
    return NextResponse.json({ error: 'Use site assets or durable public Blob URLs for Studio media' }, { status: 400 });
  }

  try {
    if (action === 'save' || action === 'ensure-row') {

      const result = await saveStudioDesign(
        design, (body.contentJson ?? {}) as object, (body.captionJson ?? {}) as object, action === 'ensure-row',
      );

      return NextResponse.json({ ok: true, ...result });
    }
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message.slice(0, 200) : 'Design save failed' }, { status: 409 });
  }
}
