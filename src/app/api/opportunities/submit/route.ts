import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/admin-auth';
import { parseProfessionalFields } from '@/lib/employers/professional-fields';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Crockford-ish alphabet: no 0/O/1/I — codes stay readable over the phone.
const REF_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** Human-friendly tracking code, e.g. "AR-7K2M9QCX". */
function makeReferenceCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let code = '';
  for (const b of bytes) code += REF_ALPHABET[b % REF_ALPHABET.length];
  return `AR-${code}`;
}

const ALLOWED_CATEGORIES = new Set([
  'jobs',
  'scholarships',
  'internships',
  'fellowships',
  'competitions',
  'conferences',
  'volunteer',
  'exchange-programs',
  'training',
]);

const ALLOWED_JOB_TYPES = new Set([
  'full-time',
  'part-time',
  'contract',
  'internship',
  'remote',
]);

/** Strip control chars, collapse whitespace and cap length. */
function clean(value: unknown, max: number): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function isMeaningfulText(text: string): boolean {
  // At least 5 word characters overall (rejects "aaaa", "!!!", links-only)
  const words = text.split(/\s+/).filter((w) => /\p{L}{2,}/u.test(w));
  return words.length >= 5;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req) || 'unknown';
  if (!rateLimit(`opportunity-submit:${ip}`, 3)) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again in a few minutes.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot — real users never fill this hidden field; bots do.
    const honeypot = clean(body.website, 200);
    if (honeypot) {
      // Pretend success so bots do not learn they were caught.
      return NextResponse.json({ success: true });
    }

    const submitterType = clean(body.submitterType, 16) === 'employer' ? 'employer' : 'community';
    const title = clean(body.title, 200);
    const organization = clean(body.organization, 120) || null;
    const categorySlug = clean(body.categorySlug, 40);
    const country = clean(body.country, 80) || null;
    const applyUrlRaw = clean(body.applyUrl, 500);
    const applyEmail = clean(body.applyEmail, 200).toLowerCase();
    const description = clean(body.description, 8000);
    const contactName = clean(body.contactName, 120) || null;
    const contactEmail = clean(body.contactEmail, 200).toLowerCase();
    const deadlineRaw = clean(body.deadline, 40);
    const langRaw = clean(body.lang, 8).toLowerCase();
    const lang = ['en', 'fa', 'ps'].includes(langRaw) ? langRaw : 'en';

    // Employer-lane extras (ignored for community submissions).
    const jobTypeRaw = submitterType === 'employer' ? clean(body.jobType, 24) : '';
    const salaryRange = submitterType === 'employer' ? clean(body.salaryRange, 120) || null : null;
    const location = submitterType === 'employer' ? clean(body.location, 120) || null : null;
    const companyWebsiteRaw = submitterType === 'employer' ? clean(body.companyWebsite, 300) : '';
    const jobType = jobTypeRaw && ALLOWED_JOB_TYPES.has(jobTypeRaw) ? jobTypeRaw : null;

    // Phase 14: professional fields (employer lane only) — validated, capped,
    // province whitelist-checked; carried into Opportunity on approval.
    const professional = submitterType === 'employer' ? parseProfessionalFields(body).professional : null;

    // ── Validation ──────────────────────────────────────────────────────────
    if (title.length < 5 || title.length > 200) {
      return NextResponse.json({ error: 'Title must be between 5 and 200 characters.' }, { status: 400 });
    }
    if (submitterType === 'employer' && !organization) {
      return NextResponse.json({ error: 'Company / organization name is required.' }, { status: 400 });
    }
    if (!ALLOWED_CATEGORIES.has(categorySlug)) {
      return NextResponse.json({ error: 'Please choose a valid category.' }, { status: 400 });
    }
    if (description.length < 80 || description.length > 8000) {
      return NextResponse.json({ error: 'Description must be between 80 and 8000 characters.' }, { status: 400 });
    }
    if (!isMeaningfulText(description)) {
      return NextResponse.json({ error: 'Description appears too short or meaningless.' }, { status: 400 });
    }
    if (!EMAIL_RE.test(contactEmail)) {
      return NextResponse.json({ error: 'A valid contact email is required.' }, { status: 400 });
    }
    if (applyEmail && !EMAIL_RE.test(applyEmail)) {
      return NextResponse.json({ error: 'Invalid application email address.' }, { status: 400 });
    }
    let applyUrl: string | null = null;
    if (applyUrlRaw) {
      if (!/^https:\/\//i.test(applyUrlRaw)) {
        return NextResponse.json({ error: 'Application link must start with https://' }, { status: 400 });
      }
      applyUrl = applyUrlRaw;
    }
    let companyWebsite: string | null = null;
    if (companyWebsiteRaw) {
      if (!/^https:\/\//i.test(companyWebsiteRaw)) {
        return NextResponse.json({ error: 'Company website must start with https://' }, { status: 400 });
      }
      companyWebsite = companyWebsiteRaw;
    }
    if (!applyUrl && !applyEmail) {
      return NextResponse.json({ error: 'An application link or email is required.' }, { status: 400 });
    }
    let deadline: Date | null = null;
    if (deadlineRaw) {
      const parsed = new Date(`${deadlineRaw}T23:59:00Z`);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid deadline date.' }, { status: 400 });
      }
      deadline = parsed;
    }

    // Unique reference code (retry on the astronomically rare collision).
    let referenceCode = makeReferenceCode();
    for (let i = 0; i < 3; i++) {
      const clash = await db.opportunitySubmission.findUnique({ where: { referenceCode }, select: { id: true } });
      if (!clash) break;
      referenceCode = makeReferenceCode();
    }

    const submission = await db.opportunitySubmission.create({
      data: {
        title,
        organization,
        categorySlug,
        country,
        deadline,
        applyUrl,
        applyEmail: applyEmail || null,
        description,
        contactName,
        contactEmail,
        sourceIp: ip,
        status: 'pending',
        submitterType,
        jobType,
        salaryRange,
        location,
        companyWebsite,
        professional: professional && Object.keys(professional).length ? (professional as unknown as import('@prisma/client').Prisma.InputJsonValue) : undefined,
        referenceCode,
        lang,
      },
    });

    return NextResponse.json({ success: true, id: submission.id, referenceCode: submission.referenceCode });
  } catch (e) {
    console.error('[opportunity-submit] error:', e);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
