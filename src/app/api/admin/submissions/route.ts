import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin, logAction } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { ensureUniqueSlug, makeSlug } from '@/lib/ai/pipeline';
import { sendDecisionEmail } from '@/lib/submission-notify';

/**
 * GET  /api/admin/submissions?status=pending&type=employer  — list submissions (newest first)
 * PATCH /api/admin/submissions  { id, action: 'approve' | 'reject', reviewNote? }
 */
export async function GET(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status') || 'all';
  const type = req.nextUrl.searchParams.get('type') || 'all'; // all | community | employer
  const where = {
    ...(status === 'all' ? {} : { status }),
    ...(type === 'all' ? {} : { submitterType: type }),
  };
  const items = await db.opportunitySubmission.findMany({
    where,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });
  const counts = {
    pending: await db.opportunitySubmission.count({ where: { status: 'pending' } }),
    approved: await db.opportunitySubmission.count({ where: { status: 'approved' } }),
    rejected: await db.opportunitySubmission.count({ where: { status: 'rejected' } }),
    employers: await db.opportunitySubmission.count({ where: { submitterType: 'employer' } }),
    pendingEmployers: await db.opportunitySubmission.count({
      where: { status: 'pending', submitterType: 'employer' },
    }),
  };
  return NextResponse.json({ items, counts });
}

export async function PATCH(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 });
  }

  const id = String(body.id || '');
  const action = String(body.action || '');
  const reviewNote = body.reviewNote ? String(body.reviewNote).slice(0, 500) : null;

  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'id and action (approve|reject) are required.' }, { status: 400 });
  }

  const submission = await db.opportunitySubmission.findUnique({ where: { id } });
  if (!submission) return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
  if (submission.status !== 'pending') {
    return NextResponse.json({ error: `Submission already ${submission.status}.` }, { status: 409 });
  }

  if (action === 'reject') {
    await db.opportunitySubmission.update({
      where: { id },
      data: { status: 'rejected', reviewNote, reviewedAt: new Date(), reviewedBy: admin.email },
    });
    await logAction({
      userId: admin.id,
      action: 'submission.reject',
      entity: 'OpportunitySubmission',
      entityId: id,
      details: submission.title,
    });

    // Best-effort decision email (skipped silently when SMTP is not configured).
    const delivery = await sendDecisionEmail({
      to: submission.contactEmail,
      lang: submission.lang,
      approved: false,
      referenceCode: submission.referenceCode,
      title: submission.title,
      reviewNote,
    });
    if (delivery !== 'skipped') {
      await db.opportunitySubmission.update({ where: { id }, data: { notifiedAt: new Date() } });
    }

    return NextResponse.json({ success: true, status: 'rejected' });
  }

  // ── Approve: create a real, published Opportunity from the submission ──
  const category = await db.opportunityCategory.findUnique({
    where: { slug: submission.categorySlug },
  });

  const slug = await ensureUniqueSlug(db, makeSlug(submission.title) || `submission-${Date.now()}`);

  // Employer lane: prettify employment type ("full-time" → "Full-time"),
  // map salary range and merge city + country for the display location.
  const isEmployer = submission.submitterType === 'employer';
  const jobTypeLabel = isEmployer && submission.jobType
    ? submission.jobType
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join('-')
    : null;
  const displayCountry =
    isEmployer && submission.location && submission.country
      ? `${submission.location}, ${submission.country}`
      : isEmployer
        ? (submission.location || submission.country)
        : submission.country;

  const opportunity = await db.opportunity.create({
    data: {
      title: submission.title,
      slug,
      organization: submission.organization,
      country: displayCountry,
      deadline: submission.deadline,
      description: submission.description,
      // NOTE: explicit parens — `a ?? b ? c : d` would bind as `(a ?? b) ? c : d`
      // and produce "mailto:null" whenever an apply link exists without an email.
      applyUrl: submission.applyUrl ?? (submission.applyEmail ? `mailto:${submission.applyEmail}` : null),
      categoryId: category?.id ?? null,
      status: 'published',
      sourceName: isEmployer ? 'Employer' : 'Community',
      importedAt: new Date(),
      website: isEmployer ? submission.companyWebsite : null,
      jobType: jobTypeLabel,
      salary: isEmployer ? submission.salaryRange : null,
      // Preserve moderation trail
      originalUrl: submission.applyUrl,
    },
  });

  await db.opportunitySubmission.update({
    where: { id },
    data: {
      status: 'approved',
      reviewNote,
      reviewedAt: new Date(),
      reviewedBy: admin.email,
      publishedSlug: opportunity.slug,
    },
  });

  await logAction({
    userId: admin.id,
    action: 'submission.approve',
    entity: 'OpportunitySubmission',
    entityId: id,
    details: `${submission.title} → opportunity ${opportunity.slug}`,
  });

  // Best-effort "you're live" email (skipped silently when SMTP is not configured).
  const delivery = await sendDecisionEmail({
    to: submission.contactEmail,
    lang: submission.lang,
    approved: true,
    referenceCode: submission.referenceCode,
    title: submission.title,
    publishedSlug: opportunity.slug,
  });
  if (delivery !== 'skipped') {
    await db.opportunitySubmission.update({ where: { id }, data: { notifiedAt: new Date() } });
  }

  return NextResponse.json({ success: true, status: 'approved', slug: opportunity.slug });
}
