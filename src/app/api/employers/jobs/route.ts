/**
 * Employer jobs API (Phase 13) — cookie-authenticated, ownership-enforced.
 * GET  /api/employers/jobs?organizationId=… → bucketed lists for the dashboard
 * POST /api/employers/jobs { organizationId, title, description, … } → creates a
 *      draft (admin moderation publishes it)
 */
import { NextResponse } from 'next/server';
import { employerFromRequest } from '@/lib/employer-auth';
import { listOrgJobs, createJob } from '@/lib/employers/jobs';
import { checkRateLimit, rateLimitKey, clientIpOf } from '@/lib/security/rate-limit';
import { allowDurable } from '@/lib/security/durable-rate-limit';
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

  if (!checkRateLimit(rateLimitKey('employer-jobs-post', employer.id, clientIpOf(request)), 20, 60_000) ||
      !(await allowDurable(db, 'employer-jobs-post', [employer.id, clientIpOf(request)], 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests — slow down.' }, { status: 429 });
  }

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
      applyPhone: body.applyPhone ? String(body.applyPhone) : null,
      categorySlug: body.categorySlug ? String(body.categorySlug) : null,
      // Phase 14 professional fields
      vacancyNumber: body.vacancyNumber != null && body.vacancyNumber !== '' ? String(body.vacancyNumber) : null,
      numberOfVacancies: body.numberOfVacancies != null && body.numberOfVacancies !== '' ? Number(body.numberOfVacancies) : null,
      province: body.province ? String(body.province) : null,
      city: body.city ? String(body.city) : null,
      district: body.district ? String(body.district) : null,
      contractType: body.contractType ? String(body.contractType) : null,
      contractDuration: body.contractDuration ? String(body.contractDuration) : null,
      genderRequirement: body.genderRequirement ? String(body.genderRequirement) : null,
      nationalityRequirement: body.nationalityRequirement ? String(body.nationalityRequirement) : null,
      salaryGrade: body.salaryGrade ? String(body.salaryGrade) : null,
      responsibilities: body.responsibilities ? String(body.responsibilities) : null,
      requirements: body.requirements ? String(body.requirements) : null,
      guidelines: body.guidelines ? String(body.guidelines) : null,
      education: body.education ? String(body.education) : null,
      experience: body.experience ? String(body.experience) : null,
    });
    return NextResponse.json({ success: true, ...job });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Create failed' }, { status: 400 });
  }
}
