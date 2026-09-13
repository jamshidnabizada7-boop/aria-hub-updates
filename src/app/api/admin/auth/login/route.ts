import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { setSessionCookie, rateLimit, getClientIp } from '@/lib/admin-auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req) || 'unknown';

    // Rate limit: 10 login attempts per minute per IP to mitigate brute force.
    if (!rateLimit(`login:${ip}`, 10)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again in a minute.' }, { status: 429 });
    }

    let email = '';
    let password = '';
    try {
      const body = await req.json();
      email = String(body.email || '').trim().toLowerCase();
      password = String(body.password || '');
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Query user via db abstraction (works for both local SQLite and Turso)
    const user = await db.adminUser.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last login
    await db.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch(() => {});

    await setSessionCookie(email);
    
    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      } 
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
