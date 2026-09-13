import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/admin-auth';
import { isProductKey, isPaymentRail, generateOrderReference } from '@/lib/monetization';

/**
 * POST /api/monetization/orders — public order request from the advertise page.
 *
 * Prices are ALWAYS quoted server-side from PRODUCT_CATALOG (client-sent
 * amounts are ignored). Returns a phone-readable reference code the buyer
 * sends along with their hawala/wallet receipt.
 *
 * Response is a safe projection only (no source IP, no internal ids).
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req) || 'unknown';
  if (!rateLimit(`monetization-order:${ip}`, 5)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a few minutes.' },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const product = body.product;
  if (!isProductKey(product)) {
    return NextResponse.json({ error: 'invalid_product' }, { status: 400 });
  }

  const buyerName = String(body.buyerName || '').trim().slice(0, 120);
  const buyerEmail = String(body.buyerEmail || '').trim().toLowerCase().slice(0, 200);
  const buyerOrg = String(body.buyerOrg || '').trim().slice(0, 160) || null;
  const buyerPhone = String(body.buyerPhone || '').trim().slice(0, 40) || null;
  const buyerLang = ['en', 'fa', 'ps'].includes(String(body.buyerLang)) ? String(body.buyerLang) : 'fa';
  const message = String(body.message || '').trim().slice(0, 4000) || null;
  const paymentMethod = isPaymentRail(body.paymentMethod) ? body.paymentMethod : null;
  const opportunityId = String(body.opportunityId || '').trim() || null;

  if (!buyerName || buyerName.length < 2) {
    return NextResponse.json({ error: 'missing_name' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  // Validate the attached listing (if any) exists and is published.
  let validOppId: string | null = null;
  if (opportunityId) {
    const opp = await db.opportunity.findUnique({
      where: { id: opportunityId },
      select: { id: true, status: true },
    });
    if (opp && opp.status === 'published') validOppId = opp.id;
  }

  const { PRODUCT_CATALOG } = await import('@/lib/monetization');
  const def = PRODUCT_CATALOG[product];

  // Collision-safe reference generation.
  let referenceCode = generateOrderReference();
  for (let i = 0; i < 5; i++) {
    const clash = await db.monetizationOrder.findUnique({ where: { referenceCode }, select: { id: true } });
    if (!clash) break;
    referenceCode = generateOrderReference();
  }

  const order = await db.monetizationOrder.create({
    data: {
      referenceCode,
      product,
      amountUsd: def.usd,
      amountAfn: def.afn,
      buyerName,
      buyerEmail,
      buyerOrg,
      buyerPhone,
      buyerLang,
      message,
      paymentMethod,
      opportunityId: validOppId,
      sourceIp: ip,
    },
    select: { referenceCode: true, amountUsd: true, amountAfn: true, product: true },
  });

  return NextResponse.json({
    ok: true,
    order: {
      referenceCode: order.referenceCode,
      product: order.product,
      amountUsd: order.amountUsd,
      amountAfn: order.amountAfn,
    },
  });
}
