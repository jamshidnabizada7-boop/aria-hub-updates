import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { canManageSocial } from '@/lib/social/permissions';
import {
  EDITORIAL_PILLARS, CREATIVE_RECIPES, editorialSimilarity, reviewEditorialDraft, recipesForPillar,
  type EditorialPillarId,
} from '@/lib/social/editorial/strategy';
import { hasUnsafeStudioMedia } from '@/lib/social/studio/media-url';

export const dynamic = 'force-dynamic';

const copy = z.object({
  headline: z.string().max(200),
  note: z.string().max(500).default(''),
  caption: z.string().max(5000).default(''),
  eyebrow: z.string().max(100).optional(),
  cta: z.string().max(100).optional(),
}).strict();

const schema = z.object({
  action: z.enum(['create', 'update', 'approve', 'archive']),
  id: z.string().min(1).max(80).optional(),
  title: z.string().max(200).optional(),
  pillar: z.enum(EDITORIAL_PILLARS.map(x => x.id) as [EditorialPillarId, ...EditorialPillarId[]]).optional(),
  language: z.enum(['fa', 'ps', 'en']).optional(),
  format: z.enum(['square', 'portrait', 'story']).optional(),
  recipeId: z.string().max(80).optional(),
  content: copy.optional(),
  media: z.record(z.string(), z.unknown()).nullable().optional(),
  sourceUrl: z.string().max(2048).nullable().optional(),
  consentConfirmed: z.boolean().optional(),
  reviewAcknowledged: z.boolean().optional(),
}).strict();

function responseError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function isValidMedia(value: unknown) {
  return value == null || (!hasUnsafeStudioMedia({ media: value }) &&
    typeof value === 'object' && !Array.isArray(value));
}

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return responseError('Unauthorized', 401);
  if (!canManageSocial(admin.role)) return responseError('Forbidden', 403);
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const campaign = await db.studioCampaign.findUnique({
      where: { id }, include: { metrics: { orderBy: { capturedAt: 'desc' }, take: 40 } },
    });
    return campaign ? NextResponse.json({ ok: true, campaign }) : responseError('Not found', 404);
  }
  const campaigns = await db.studioCampaign.findMany({
    orderBy: { updatedAt: 'desc' }, take: 100,
    select: { id: true, title: true, pillar: true, language: true, format: true, recipeId: true, status: true, updatedAt: true, approvedAt: true },
  });
  return NextResponse.json({ ok: true, campaigns });
}

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return responseError('Unauthorized', 401);
  if (!canManageSocial(admin.role)) return responseError('Forbidden', 403);
  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return responseError('Invalid campaign input');
  const d = parsed.data;

  try {
    if (d.action === 'create' || d.action === 'update') {
      if (d.action === 'update' && !d.id) return responseError('Campaign id required');
      const existing = d.id ? await db.studioCampaign.findUnique({ where: { id: d.id } }) : null;
      if (d.action === 'update' && !existing) return responseError('Not found', 404);
      const content = d.content ?? (existing?.content as z.infer<typeof copy> | undefined);
      const pillar = d.pillar ?? existing?.pillar as EditorialPillarId | undefined;
      const recipeId = d.recipeId ?? existing?.recipeId;
      if (!content || !pillar || !recipeId) return responseError('Content, pillar and recipe are required');
      if (!CREATIVE_RECIPES.some(r => r.id === recipeId)) return responseError('Unknown creative direction');
      if (!recipesForPillar(pillar).some(r => r.id === recipeId)) return responseError('Choose a creative direction supported by this content pillar');
      const media = d.media === undefined ? existing?.media : d.media;
      if (!isValidMedia(media)) return responseError('Unsafe Studio media URL');
      const language = d.language ?? existing?.language ?? 'fa';
      const format = d.format ?? existing?.format ?? 'portrait';
      const data = {
        title: content.headline.slice(0, 200), pillar, recipeId, language, format,
        content: content as Prisma.InputJsonValue,
        media: (media ?? Prisma.DbNull) as Prisma.InputJsonValue,
        sourceUrl: d.sourceUrl === undefined ? existing?.sourceUrl : d.sourceUrl,
        consentConfirmed: d.consentConfirmed ?? existing?.consentConfirmed ?? false,
        // Editing a reviewed campaign always puts it back into draft status.
        status: 'draft',
        approvedAt: null,
      };
      const campaign = existing
        ? await db.studioCampaign.update({ where: { id: existing.id }, data })
        : await db.studioCampaign.create({ data });
      return NextResponse.json({ ok: true, campaign });
    }

    if (!d.id) return responseError('Campaign id required');
    const existing = await db.studioCampaign.findUnique({ where: { id: d.id } });
    if (!existing) return responseError('Not found', 404);
    if (d.action === 'archive') {
      const campaign = await db.studioCampaign.update({ where: { id: existing.id }, data: { status: 'archived', approvedAt: null } });
      return NextResponse.json({ ok: true, campaign });
    }

    if (d.action === 'approve') {
      if (!d.reviewAcknowledged) return responseError('Human editorial review acknowledgment required');
      const c = existing.content as z.infer<typeof copy>;
      const review = reviewEditorialDraft({
        pillar: existing.pillar as EditorialPillarId, title: c.headline, note: c.note,
        caption: c.caption, sourceUrl: existing.sourceUrl ?? '',
        consentConfirmed: existing.consentConfirmed,
      });
      if (!review.publishReady) return responseError(review.warnings.join(' '));
      // Duplicates are checked across campaign drafts, not just within a
      // single browser session. Exact/near-duplicate headlines block approval.
      const nearby = await db.studioCampaign.findMany({
        where: { id: { not: existing.id }, status: 'approved', language: existing.language },
        select: { title: true }, take: 100, orderBy: { updatedAt: 'desc' },
      });
      if (nearby.some(row => editorialSimilarity(c.headline, row.title) >= 0.85)) {
        return responseError('An approved campaign already has a near-identical headline');
      }
      if (!isValidMedia(existing.media)) return responseError('Unsafe Studio media URL');
      const updated = await db.studioCampaign.updateMany({ where: { id: existing.id, status: 'draft' }, data: { status: 'approved', approvedAt: new Date() } });
      if (!updated.count) return responseError('Only drafts can be approved', 409);
      const campaign = await db.studioCampaign.findUniqueOrThrow({ where: { id: existing.id } });
      return NextResponse.json({ ok: true, campaign });
    }
    return responseError('Unknown action');
  } catch {
    return responseError('Unable to save campaign', 500);
  }
}
