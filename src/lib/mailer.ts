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
  const host=process.env.SMTP_HOST!;
  const port=Number(process.env.SMTP_PORT||587);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('invalid_smtp_port');
  const loopback=['localhost','127.0.0.1','::1','[::1]'].includes(host.toLowerCase());
  // Never send SMTP credentials over an unencrypted remote connection.
  // A disposable loopback SMTP test relay does not need STARTTLS.
  const transport = nodemailer.createTransport({
    host,port,
    secure:port===465,
    requireTLS:port!==465&&!loopback,
    tls:{rejectUnauthorized:true},
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
