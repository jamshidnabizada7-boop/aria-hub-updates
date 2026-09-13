import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifySession, SESSION_COOKIE } from '@/lib/admin-auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  // Extract session from cookie
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both current and new password are required' }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
  }

  const user = await db.adminUser.findUnique({ where: { email: session.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

  const hash = await bcrypt.hash(newPassword, 10);
  await db.adminUser.update({ where: { email: session.email }, data: { password: hash } });

  return NextResponse.json({ success: true });
}
