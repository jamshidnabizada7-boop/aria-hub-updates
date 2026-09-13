/**
 * Minimal SMTP mailer shared by the alerts pipeline.
 * Returns null when SMTP is not configured — callers must treat that as
 * "delivery skipped" (never a hard failure: signup still succeeds).
 */
export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendHtmlEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; skipped?: 'smtp_not_configured' }> {
  if (!smtpConfigured()) return { sent: false, skipped: 'smtp_not_configured' };
  const nodemailer = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM || `ARIA HUB <${process.env.SMTP_USER}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  return { sent: true };
}
