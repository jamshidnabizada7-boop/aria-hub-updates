import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Uptime/health probe: verifies the app can reach its database.
 * Returns 200 with { ok: true } or 503 with { ok: false } — designed for
 * uptime checkers (no auth, no data exposure, cheap query).
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: 'up', ts: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, db: 'down' }, { status: 503 });
  }
}
