/**
 * Employer organization claims (Phase 12).
 * GET  /api/employers/claims → the caller's claims with organization names
 * POST /api/employers/claims { organizationSlug | organizationId, claimEmail }
 *      → creates a PENDING owner request; an admin must approve it
 *        (never auto-approved from the organization name alone).
 */
import { NextResponse } from 'next/server';
import { getCurrentEmployer } from '@/lib/employer-auth';
import { claimOrganization, myOrganizations } from '@/lib/employers/membership';
import { checkRateLimit, rateLimitKey, clientIpOf } from '@/lib/security/rate-limit';
import { db } from '@/lib/db';

function employerCookieValue(request: Request): string | undefined {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === 'aria-employer-session') return rest.join('=');
  }
  return undefined;
}

export async function GET(request: Request) {
  const employer = await getCurrentEmployer(employerCookieValue(request));
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const organizations = await myOrganizations(db, employer.id);
  const pending = await db.organizationMember.findMany({
    where: { userId: employer.id, status: 'pending' },
    include: { organization: { select: { name: true, slug: true, officialDomains: true, verified: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({
    organizations,
    pendingClaims: (pending as any[]).map((m) => ({
      id: m.id,
      organizationName: m.organization.name,
      organizationSlug: m.organization.slug,
      organizationVerified: m.organization.verified,
      officialDomains: m.organization.officialDomains,
      claimEmail: m.claimEmail,
      createdAt: m.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const employer = await getCurrentEmployer(employerCookieValue(request));
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let organizationId = String(body.organizationId ?? '');
  if (!organizationId) {
    const slug = String(body.organizationSlug ?? '');
    const org = await db.organization.findUnique({ where: { slug }, select: { id: true } });
    if (!org) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });
    organizationId = org.id;
  }

  if (!checkRateLimit(rateLimitKey('employer-claims', employer.id, clientIpOf(request)), 10, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — slow down.' }, { status: 429 });
  }

  try {
    const claim = await claimOrganization(db, employer.id, organizationId, String(body.claimEmail ?? ''));
    return NextResponse.json({ success: true, ...claim });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Claim failed' }, { status: 400 });
  }
}
