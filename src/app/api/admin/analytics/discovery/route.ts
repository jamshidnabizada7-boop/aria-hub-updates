/**
 * Discovery speed analytics API (Phase 20) — admin-only.
 * GET /api/admin/analytics/discovery?days=30
 */
import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { computeDiscoveryMetrics } from '@/lib/analytics/discovery-speed';

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const days = Number(new URL(request.url).searchParams.get('days') ?? 30) || 30;
  const metrics = await computeDiscoveryMetrics(db, Math.max(1, Math.min(365, days)));
  return NextResponse.json({ success: true, metrics });
}
