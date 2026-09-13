import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAction } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { PRODUCT_CATALOG, isProductKey } from '@/lib/monetization';

/**
 * Admin monetization-order pipeline.
 *
 * GET   /api/admin/orders?status=…           — list orders + status counts + revenue
 * PATCH /api/admin/orders                    — update one order
 *        { id, status?, paymentMethod?, paymentRef?, adminNote?, featuredUntil?, opportunityId? }
 *
 * AUTO-DELIVERY: marking an order `paid`/`active` with an attached listing sets
 * Opportunity.featured = true (+ featuredUntil for 7-day products). Marking it
 * `delivered`/`declined` clears featured (unless another live order still
 * covers the same listing).
 */

const FEATURE_DAYS: Record<string, number> = {
  featured_7d: 7,
  community_boost: 7,
};

const ALL_STATUSES = ['requested', 'payment_claimed', 'paid', 'active', 'delivered', 'declined'] as const;
type OrderStatus = (typeof ALL_STATUSES)[number];

async function syncOpportunityFeatured(opportunityId: string | null, excludeOrderId: string) {
  if (!opportunityId) return;
  const liveOrder = await db.monetizationOrder.findFirst({
    where: {
      opportunityId,
      id: { not: excludeOrderId },
      status: { in: ['paid', 'active'] },
    },
    select: { id: true },
  });
  if (!liveOrder) {
    await db.opportunity.update({ where: { id: opportunityId }, data: { featured: false } });
  }
}

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status') || 'all';
  const where = ALL_STATUSES.includes(status as OrderStatus) ? { status } : {};

  const items = await db.monetizationOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      referenceCode: true,
      product: true,
      status: true,
      amountUsd: true,
      amountAfn: true,
      buyerName: true,
      buyerOrg: true,
      buyerEmail: true,
      buyerPhone: true,
      buyerLang: true,
      message: true,
      opportunityId: true,
      paymentMethod: true,
      paymentRef: true,
      paidAt: true,
      verifiedAt: true,
      deliveredAt: true,
      featuredUntil: true,
      adminNote: true,
      createdAt: true,
    },
  });

  // Attach the listing title for the UI.
  const oppIds = [...new Set(items.map((i) => i.opportunityId).filter(Boolean))] as string[];
  const opps = oppIds.length
    ? await db.opportunity.findMany({
        where: { id: { in: oppIds } },
        select: { id: true, title: true, slug: true, featured: true },
      })
    : [];
  const oppMap = new Map(opps.map((o) => [o.id, o]));

  const counts: Record<string, number> = {};
  for (const s of ALL_STATUSES) counts[s] = 0;
  const grouped = await db.monetizationOrder.groupBy({ by: ['status'], _count: { _all: true } });
  for (const g of grouped) counts[g.status] = g._count._all;
  const total = await db.monetizationOrder.count();

  // Revenue = orders verified as paid/active/delivered.
  const revenueRows = await db.monetizationOrder.aggregate({
    where: { status: { in: ['paid', 'active', 'delivered'] } },
    _sum: { amountUsd: true, amountAfn: true },
    _count: { _all: true },
  });

  return NextResponse.json({
    items: items.map((i) => ({
      ...i,
      opportunity: i.opportunityId ? oppMap.get(i.opportunityId) || null : null,
    })),
    counts,
    total,
    revenue: {
      usd: revenueRows._sum.amountUsd || 0,
      afn: revenueRows._sum.amountAfn || 0,
      orders: revenueRows._count._all,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const existing = await db.monetizationOrder.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const nextStatus = body.status !== undefined ? String(body.status) : existing.status;
  if (!ALL_STATUSES.includes(nextStatus as OrderStatus)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }
  if (body.status !== undefined && !isProductKey(existing.product)) {
    return NextResponse.json({ error: 'corrupt_product' }, { status: 500 });
  }

  const paymentMethod = body.paymentMethod !== undefined ? String(body.paymentMethod).slice(0, 40) || null : existing.paymentMethod;
  const paymentRef = body.paymentRef !== undefined ? String(body.paymentRef).trim().slice(0, 200) || null : existing.paymentRef;
  const adminNote = body.adminNote !== undefined ? String(body.adminNote).trim().slice(0, 2000) || null : existing.adminNote;
  const oppChange = body.opportunityId !== undefined ? String(body.opportunityId).trim() || null : existing.opportunityId;

  // Validate a newly attached opportunity.
  let validOppId = oppChange;
  if (oppChange && oppChange !== existing.opportunityId) {
    const opp = await db.opportunity.findUnique({ where: { id: oppChange }, select: { id: true, status: true } });
    if (!opp || opp.status !== 'published') return NextResponse.json({ error: 'invalid_opportunity' }, { status: 400 });
  }

  // featuredUntil: explicit value wins; 7-day products auto-set on paid/active.
  let featuredUntil = existing.featuredUntil;
  if (body.featuredUntil !== undefined) {
    const raw = String(body.featuredUntil || '');
    featuredUntil = raw ? new Date(raw) : null;
    if (featuredUntil && isNaN(featuredUntil.getTime())) featuredUntil = null;
  }
  if (!featuredUntil && ['paid', 'active'].includes(nextStatus) && validOppId) {
    const days = FEATURE_DAYS[existing.product];
    if (days) featuredUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  const now = new Date();
  const updated = await db.monetizationOrder.update({
    where: { id },
    data: {
      status: nextStatus,
      paymentMethod,
      paymentRef,
      adminNote,
      opportunityId: validOppId,
      featuredUntil,
      paidAt: ['paid', 'active', 'delivered'].includes(nextStatus) ? existing.paidAt || now : null,
      verifiedAt: ['paid', 'active', 'delivered'].includes(nextStatus) ? existing.verifiedAt || now : null,
      verifiedBy: ['paid', 'active', 'delivered'].includes(nextStatus) ? existing.verifiedBy || admin.email : existing.verifiedBy,
      deliveredAt: nextStatus === 'delivered' ? existing.deliveredAt || now : null,
    },
  });

  // ── AUTO-DELIVERY ──
  if (validOppId) {
    if (['paid', 'active'].includes(nextStatus)) {
      await db.opportunity.update({ where: { id: validOppId }, data: { featured: true } });
    } else if (['delivered', 'declined', 'requested', 'payment_claimed'].includes(nextStatus)) {
      await syncOpportunityFeatured(validOppId, id);
    }
  }
  // If the order was DETACHED from a listing, restore that listing's state.
  if (existing.opportunityId && existing.opportunityId !== validOppId) {
    await syncOpportunityFeatured(existing.opportunityId, id);
  }

  await logAction({
    action: `order:${nextStatus}`,
    entity: 'MonetizationOrder',
    entityId: id,
    details: JSON.stringify({ product: existing.product, ref: existing.referenceCode }),
    userId: null,
  });

  return NextResponse.json({ ok: true, order: updated });
}
