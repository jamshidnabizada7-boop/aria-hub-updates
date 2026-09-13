import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/admin-auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req) || 'unknown';
  if (!rateLimit(`newsletter:${ip}`, 5)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
    const name = body.name ? String(body.name).trim().slice(0, 100) : null;

    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const sub = await db.subscriber.upsert({
      where: { email },
      update: { status: 'active' },
      create: { email, name, status: 'active' },
    });
    return NextResponse.json({ success: true, id: sub.id });
  } catch (e: any) {
    console.error('[newsletter] error:', e);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
