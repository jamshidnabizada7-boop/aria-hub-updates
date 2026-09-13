/**
 * Admin alerts for the publishing pipeline — best-effort email, never throws.
 *
 * Recipient: ADMIN_ALERT_EMAIL, falling back to the first super_admin's email.
 * Delivery is skipped silently when SMTP is not configured (consistent with
 * src/lib/mailer.ts); the queue row's notifiedAt flag still prevents repeat
 * attempts from spamming once mail does get configured.
 */
import { db } from '@/lib/db';
import { sendHtmlEmail } from '@/lib/mailer';

export async function adminAlertRecipient(): Promise<string | null> {
  const env = process.env.ADMIN_ALERT_EMAIL;
  if (env) return env;
  try {
    const admin = await db.adminUser.findFirst({ where: { role: 'super_admin' }, select: { email: true } });
    return admin?.email ?? null;
  } catch {
    return null;
  }
}

/** Send a plain-text-ish alert email to the admin. Returns true if sent. */
export async function notifyAdmin(subject: string, lines: string[]): Promise<boolean> {
  try {
    const to = await adminAlertRecipient();
    if (!to) return false;
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">
${lines.map((l) => `<p style="margin:0 0 8px">${escapeHtml(l)}</p>`).join('')}
</div>`;
    const r = await sendHtmlEmail({ to, subject: `[ARIA HUB] ${subject}`, html });
    return r.sent;
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
