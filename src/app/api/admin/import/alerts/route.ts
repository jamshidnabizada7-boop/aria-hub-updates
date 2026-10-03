/**
 * Source health alerts API (Phase 19) — admin-only.
 */
import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { listSourceAlerts } from '@/lib/import/source-alerts';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const alerts = await listSourceAlerts(db);
  return NextResponse.json({
    alerts,
    counts: {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
    },
  });
}
