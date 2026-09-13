import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { rateLimit, getClientIp } from '@/lib/admin-auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req) || 'unknown';
  // Rate limit contact form: 5 per minute per IP
  if (!rateLimit(`contact:${ip}`, 5)) {
    return NextResponse.json({ error: 'Too many submissions. Please try again shortly.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const name = String(body.name || '').trim().slice(0, 100);
    const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
    const phone = body.phone ? String(body.phone).trim().slice(0, 40) : null;
    const subject = body.subject ? String(body.subject).trim().slice(0, 200) : null;
    const message = String(body.message || '').slice(0, 5000);
    const department = body.department ? String(body.department).trim().slice(0, 100) : null;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email and message are required.' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const record = await db.contactMessage.create({
      data: { name, email, phone, subject, message, department },
    });
    return NextResponse.json({ success: true, id: record.id });
  } catch (e: any) {
    console.error('[contact] error:', e);
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
}
