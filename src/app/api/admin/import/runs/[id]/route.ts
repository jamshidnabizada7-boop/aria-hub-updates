import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';

/**
 * GET /api/admin/import/runs/:id
 *   Single run detail (incl. parsed errors array).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const run = await db.importRun.findUnique({
    where: { id },
    include: { source: { select: { name: true, type: true, scraperKey: true } } },
  });
  if (!run) return NextResponse.json({ error: 'Run not found.' }, { status: 404 });

  // Parse the errors JSON for the UI
  let errors: unknown[] = [];
  try { errors = run.errors ? JSON.parse(run.errors) : []; } catch { /* ignore */ }

  return NextResponse.json({ ...run, errors });
}
