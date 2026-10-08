/**
 * Applicant identity. Reuses User + Session rather than introducing a second identity store.
 * Raw session/verification tokens never enter the database, logs, or API responses.
 */
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { sendHtmlEmail, smtpConfigured } from '@/lib/mailer';

export const APPLICANT_COOKIE = 'aria-applicant-session';
const SESSION_DAYS = 14;
const verifyPrefix = 'applicant-email:';
const tokenHash = (raw: string) => createHash('sha256').update(raw).digest('hex');
const cleanEmail = (value: unknown) => String(value ?? '').trim().toLowerCase();
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;

export class ApplicantError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}

export function applicantEnabled(): boolean {
  return process.env.APPLICANT_AUTH_ENABLED === 'true';
}
export function requireApplicantEnabled(): void {
  if (!applicantEnabled()) throw new ApplicantError('feature_disabled', 503);
}
export function requireDelivery(): void {
  if (!smtpConfigured()) throw new ApplicantError('email_delivery_unavailable', 503);
}
export function passwordOk(password: string): boolean {
  return password.length >= 12 && password.length <= 128;
}
export function applicantCookie(raw: string) {
  return { name: APPLICANT_COOKIE, value: raw, httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: SESSION_DAYS * 86400 };
}
export function expiredApplicantCookie() {
  return { ...applicantCookie(''), maxAge: 0 };
}
export async function newApplicantSession(userId: string): Promise<string> {
  const raw = randomBytes(32).toString('base64url');
  await db.session.create({
    data: { userId, sessionToken: tokenHash(raw), expires: new Date(Date.now() + SESSION_DAYS * 86400000) },
  });
  return raw;
}
export async function getApplicantSession(raw: string | undefined | null) {
  if (!raw || !/^[A-Za-z0-9_-]{40,64}$/.test(raw)) return null;
  const session = await db.session.findUnique({
    where: { sessionToken: tokenHash(raw) },
    include: { user: { select: { id: true, name: true, email: true, emailVerified: true, disabled: true } } },
  });
  if (!session || session.expires <= new Date() || session.user.disabled || !session.user.emailVerified) return null;
  const applicant = await db.applicantProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  return applicant ? session.user : null;
}
export async function currentApplicant() {
  const jar = await cookies();
  return getApplicantSession(jar.get(APPLICANT_COOKIE)?.value);
}
export async function applicantFromRequest(request: Request) {
  const header = request.headers.get('cookie') ?? '';
  const match = header.split(';').map(v => v.trim()).find(v => v.startsWith(APPLICANT_COOKIE + '='));
  return getApplicantSession(match?.slice(APPLICANT_COOKIE.length + 1));
}
export async function revokeApplicantSession(raw: string | undefined | null): Promise<void> {
  if (raw) await db.session.deleteMany({ where: { sessionToken: tokenHash(raw) } });
}
export async function revokeAllApplicantSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

export async function sendVerification(emailRaw: string, lang: string): Promise<void> {
  requireDelivery();
  const email = cleanEmail(emailRaw);
  const user = await db.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
  if (!user || user.emailVerified) return;
  const raw = randomBytes(32).toString('hex');
  await db.verificationToken.deleteMany({ where: { identifier: verifyPrefix + email } });
  await db.verificationToken.create({
    data: { identifier: verifyPrefix + email, token: tokenHash(raw), expires: new Date(Date.now() + 30 * 60000) },
  });
  const base = process.env.PUBLIC_SITE_URL || 'https://www.myariahub.com';
  const verify = new URL('/api/applicant/auth/verify', base);
  verify.searchParams.set('email', email);
  verify.searchParams.set('token', raw);
  verify.searchParams.set('lang', ['en', 'fa', 'ps'].includes(lang) ? lang : 'fa');
  const result = await sendHtmlEmail({
    to: email, subject: 'Verify your ARIA HUB account',
    html: '<p>Confirm your ARIA HUB account by opening this secure link (valid 30 minutes):</p><p><a href="' + verify.toString().replace(/&/g, '&amp;') + '">Verify email</a></p>',
  });
  if (!result.sent) throw new ApplicantError('email_delivery_unavailable', 503);
}
export async function registerApplicant(emailRaw: string, password: string, name: string, lang: string) {
  requireApplicantEnabled();
  requireDelivery();
  const email = cleanEmail(emailRaw);
  if (!validEmail(email) || !passwordOk(password) || !name?.trim() || name.length > 120)
    throw new ApplicantError('invalid_registration');
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return; // non-enumerating; verified users are not silently modified
  await db.user.create({ data: { email, name: name.trim(), passwordHash: await bcrypt.hash(password, 12), applicantProfile: { create: {} } } });
  await sendVerification(email, lang);
}
export async function verifyApplicantEmail(emailRaw: string, raw: string): Promise<boolean> {
  const email = cleanEmail(emailRaw);
  if (!validEmail(email) || !/^[a-f0-9]{64}$/.test(raw)) return false;
  const token = await db.verificationToken.findUnique({ where: { token: tokenHash(raw) } });
  if (!token || token.identifier !== verifyPrefix + email || token.expires < new Date()) return false;
  await db.$transaction([
    db.user.update({ where: { email }, data: { emailVerified: new Date() } }),
    db.verificationToken.delete({ where: { token: token.token } }),
  ]);
  return true;
}
export async function loginApplicant(emailRaw: string, password: string): Promise<string> {
  requireApplicantEnabled();
  const email = cleanEmail(emailRaw);
  const user = validEmail(email) ? await db.user.findUnique({ where: { email } }) : null;
  // Normalize timing when an account does not exist.
  const dummy = '$2b$12$C6UzMDM.H6dfI/f/IKcEeOOoN8AwcEJZaU5fg3UJmKcF6bLPydTeS';
  const valid = await bcrypt.compare(password, user?.passwordHash || dummy).catch(() => false);
  if (!user || !valid || user.disabled) throw new ApplicantError('invalid_credentials', 401);
  const applicant = await db.applicantProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!applicant) throw new ApplicantError('invalid_credentials', 401);
  if (!user.emailVerified) throw new ApplicantError('email_not_verified', 403);
  return newApplicantSession(user.id);
}
export async function forgotApplicantPassword(emailRaw: string, lang: string): Promise<void> {
  requireApplicantEnabled();
  requireDelivery();
  const email = cleanEmail(emailRaw);
  if (!validEmail(email)) return;
  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash || user.disabled || !user.emailVerified) return;
  if (!(await db.applicantProfile.findUnique({ where: { userId: user.id }, select: { id: true } }))) return;
  const raw = randomBytes(32).toString('base64url');
  await db.user.update({ where: { id: user.id }, data: { passwordResetToken: tokenHash(raw), passwordResetExpires: new Date(Date.now() + 30 * 60000) } });
  const base = process.env.PUBLIC_SITE_URL || 'https://www.myariahub.com';
  const url = new URL('/' + (['en', 'fa', 'ps'].includes(lang) ? lang : 'fa') + '/reset-password', base);
  url.searchParams.set('token', raw);
  await sendHtmlEmail({ to: email, subject: 'ARIA HUB password reset', html: '<p>Reset your password (valid 30 minutes):</p><p><a href="' + url.toString().replace(/&/g, '&amp;') + '">Reset password</a></p>' });
}
export async function resetApplicantPassword(raw: string, password: string): Promise<void> {
  if (!passwordOk(password) || !/^[A-Za-z0-9_-]{40,64}$/.test(raw)) throw new ApplicantError('invalid_reset', 400);
  const user = await db.user.findFirst({ where: { passwordResetToken: tokenHash(raw), passwordResetExpires: { gt: new Date() } } });
  if (!user || user.disabled) throw new ApplicantError('invalid_reset', 400);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 12), passwordResetToken: null, passwordResetExpires: null } }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
}
export async function changeApplicantPassword(userId: string, oldPassword: string, newPassword: string): Promise<string> {
  if (!passwordOk(newPassword)) throw new ApplicantError('invalid_password');
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash || !(await bcrypt.compare(oldPassword, user.passwordHash))) throw new ApplicantError('invalid_credentials', 401);
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } }),
    db.session.deleteMany({ where: { userId } }),
  ]);
  return newApplicantSession(userId);
}
