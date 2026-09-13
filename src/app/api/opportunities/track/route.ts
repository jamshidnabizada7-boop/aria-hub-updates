import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/admin-auth';

/**
 * GET /api/opportunities/track?ref=AR-XXXXXXXX&email=submitter@example.org
 *
 * Privacy: requires BOTH the reference code AND the contact email used at
 * submission time — a leaked reference alone reveals nothing. Response is a
 * minimal, safe projection (no contact email, no source IP, no internal ids).
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req) || 'unknown';
  if (!rateLimit(`opportunity-track:${ip}`, 10)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again in a few minutes.' }, { status: 429 });
  }

  const refRaw = req.nextUrl.searchParams.get('ref') || '';
  const emailRaw = req.nextUrl.searchParams.get('email') || '';

  // Normalize: uppercase, drop every non-alphanumeric char, then rebuild the
  // canonical form — "ar 7b29-mdb9", "AR7B29MDB9" and "ar-7b29mdb9" all match.
  const cleaned = refRaw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = (cleaned.startsWith('AR') ? cleaned.slice(2) : cleaned).slice(0, 16);
  const referenceCode = `AR-${body}`;
  const email = emailRaw.trim().toLowerCase().slice(0, 200);

  if (!/^AR-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6,16}$/.test(referenceCode)) {
    return NextResponse.json({ error: 'invalid_ref' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  try {
    const submission = await db.opportunitySubmission.findUnique({
      where: { referenceCode },
      select: {
        referenceCode: true,
        title: true,
        organization: true,
        categorySlug: true,
        submitterType: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        publishedSlug: true,
        reviewNote: true,
        contactEmail: true,
      },
    });

    // Same 404 for "no such code" and "email mismatch" — no enumeration.
    if (!submission || submission.contactEmail !== email) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({
      found: true,
      submission: {
        referenceCode: submission.referenceCode,
        title: submission.title,
        organization: submission.organization,
        categorySlug: submission.categorySlug,
        submitterType: submission.submitterType,
        status: submission.status,
        createdAt: submission.createdAt,
        reviewedAt: submission.reviewedAt,
        publishedSlug: submission.publishedSlug,
        // Review note is shown to the submitter on rejection (improvement hint).
        reviewNote: submission.status === 'rejected' ? submission.reviewNote : null,
      },
    });
  } catch (e) {
    console.error('[opportunity-track] error:', e);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
