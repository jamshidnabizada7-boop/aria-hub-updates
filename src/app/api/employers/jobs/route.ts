/**
 * Employer jobs API (Phase 13) — cookie-authenticated, ownership-enforced.
 * GET  /api/employers/jobs?organizationId=… → bucketed lists for the dashboard
 * POST /api/employers/jobs { organizationId, title, description, … } → creates a
 *      draft (admin moderation publishes it)
 */
import { NextResponse } from 'next/server';
import { employerFromRequest } from '@/lib/employer-auth';
import { listOrgJobs, createJob } from '@/lib/employers/jobs';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const employer = await employerFromRequest(request);
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId) return NextResponse.json({ error: 'organizationId required' }, { status: 400 });

  // membership guard — a user can only ever list jobs of orgs they belong to
  const { requireMembership } = await import('@/lib/employers/membership');
  if ((await requireMembership(db, employer.id, organizationId, 'viewer')) === null) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const jobs = await listOrgJobs(db, organizationId);
  return NextResponse.json({ success: true, ...jobs });
}

export async function POST(request: Request) {
  const employer = await employerFromRequest(request);
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const organizationId = String(body.organizationId ?? '');
  if (!organizationId) return NextResponse.json({ error: 'organizationId required' }, { status: 400 });

  try {
    const job = await createJob(db, employer.id, organizationId, {
      title: String(body.title ?? ''),
      description: String(body.description ?? ''),
      deadline: body.deadline ? String(body.deadline) : null,
      location: body.location ? String(body.location) : null,
      salary: body.salary ? String(body.salary) : null,
      jobType: body.jobType ? String(body.jobType) : null,
      applyUrl: body.applyUrl ? String(body.applyUrl) : null,
      applyEmail: body.applyEmail ? String(body.applyEmail) : null,
      categorySlug: body.categorySlug ? String(body.categorySlug) : null,
    });
    return NextResponse.json({ success: true, ...job });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Create failed' }, { status: 400 });
  }
}
