import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { createPasswordResetToken } from '@/lib/employer-auth';
import { allowDurable } from '@/lib/security/durable-rate-limit';
import { db } from '@/lib/db';

/**
 * AUDIT §21 — admin-assisted employer password reset.
 * POST { email } with a valid ADMIN session → creates a single-use,
 * 60-minute hashed reset token and returns the PLAINTEXT token ONLY to the
 * authenticated admin (hand it to the employer out-of-band until SMTP
 * delivery is wired). Public endpoints never reveal reset tokens.
 */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin session required.' }, { status: 401 });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!(await allowDurable(db, 'admin-reset-link', [ip], 10, 10 * 60_000))) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  const result = await createPasswordResetToken(email);
  if (!result.sent || !result.token) {
    // Uniform response — no account-existence leak.
    return NextResponse.json({ success: true, delivered: false });
  }
  return NextResponse.json({ success: true, delivered: true, token: result.token });
}
