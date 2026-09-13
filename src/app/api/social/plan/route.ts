import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { isLang } from '@/lib/lang-route';
import { buildDailyPlan } from '@/lib/social/plan';

/**
 * GET /api/social/plan?lang=en — today's branded post plan for the Brand
 * Studio. Admin-only (it exposes draft pools for the Template Lab).
 * Deterministic: the same day + lang always yields the same ordered plan.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const raw = req.nextUrl.searchParams.get('lang');
  const lang = isLang(raw) ? raw : 'en';

  try {
    const plan = await buildDailyPlan(lang);
    return NextResponse.json({ ok: true, plan });
  } catch (e) {
    console.error('[social/plan] failed:', e);
    return NextResponse.json({ ok: false, error: 'plan_failed' }, { status: 500 });
  }
}
