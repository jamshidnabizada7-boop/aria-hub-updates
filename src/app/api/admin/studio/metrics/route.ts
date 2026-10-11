import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { canManageSocial } from '@/lib/social/permissions';

export const dynamic = 'force-dynamic';
const nonnegative = z.number().int().min(0).max(1000000000).nullable().optional();
const entry = z.object({
  campaignId: z.string().min(1).max(80),
  platform: z.enum(['facebook', 'instagram']),
  postId: z.string().max(200).optional(),
  capturedAt: z.string().datetime().optional(),
  paid: z.boolean().nullable().optional(),
  views: nonnegative, reach: nonnegative, interactions: nonnegative,
  reactions: nonnegative, comments: nonnegative, shares: nonnegative,
  saves: nonnegative, linkClicks: nonnegative, watchSeconds: nonnegative,
}).strict();

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageSocial(admin.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = entry.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid metric values' }, { status: 400 });
  const campaign = await db.studioCampaign.findUnique({ where: { id: body.data.campaignId }, select: { id: true } });
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  const { capturedAt, ...values } = body.data;
  const metric = await db.studioCampaignMetric.create({
    data: { ...values, capturedAt: capturedAt ? new Date(capturedAt) : new Date() },
  });
  // These are user-entered measurements, not a provider-verified Graph API export.
  return NextResponse.json({ ok: true, origin: 'manual', metric }, { status: 201 });
}
