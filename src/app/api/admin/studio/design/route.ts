import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';

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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const action = String(body.action || '');
  const design = parseDesign(body.design);
  if (!design) return NextResponse.json({ error: 'invalid_design' }, { status: 400 });

  try {
    if (action === 'save' || action === 'ensure-row') {
      const saved = await db.studioDesign.upsert({
        where: { contentRef_forDate: { contentRef: design.contentRef, forDate: design.forDate } },
        create: design as unknown as Parameters<typeof db.studioDesign.upsert>[0]['create'],
        update: {
          templateType: design.templateType,
          themeId: design.themeId,
          layout: design.layout,
          size: design.size,
          overrides: design.overrides as object,
          captionOverride: design.captionOverride as object,
        },
      });

      if (action === 'save') {
        return NextResponse.json({ ok: true, design: saved });
      }

      // ensure-row: the queue row must exist for today with this design's
      // content, so "Publish now" renders exactly what was designed.
      const dayStart = new Date(`${design.forDate}T00:00:00.000Z`);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const existing = await db.socialPostQueue.findFirst({
        where: { contentRef: design.contentRef, scheduledFor: { gte: dayStart, lt: dayEnd } },
        orderBy: { scheduledFor: 'asc' },
      });

      const contentJson = (body.contentJson ?? {}) as object;
      const captionJson = (body.captionJson ?? {}) as object;

      if (existing) {
        // Replacing the plan row's content — also pull it back into the due
        // window so publish-now renders the NEW design immediately.
        const row = await db.socialPostQueue.update({
          where: { id: existing.id },
          data: {
            templateType: design.templateType,
            contentJson,
            captionJson,
            scheduledFor: existing.scheduledFor < new Date() ? existing.scheduledFor : new Date(),
          },
        });
        return NextResponse.json({ ok: true, design: saved, row, created: false });
      }

      const row = await db.socialPostQueue.create({
        data: {
          scheduledFor: new Date(Date.now() + 60000), // due immediately
          templateType: design.templateType,
          contentRef: design.contentRef,
          contentJson,
          captionJson,
          status: 'pending',
        },
      });
      return NextResponse.json({ ok: true, design: saved, row, created: true });
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: (e instanceof Error ? e.message : String(e)).slice(0, 200) },
      { status: 500 },
    );
  }
}
