/** E.164 international phone numbers only. Never guess country code. */
export function applicationPhoneUrl(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw || !/^\+[0-9 ()\-.]{7,24}$/.test(raw)) return null;
  const cleaned = raw.replace(/[\s().-]/g, '');
  if (!/^\+[1-9][0-9]{6,14}$/.test(cleaned)) return null;
  return 'tel:' + cleaned;
}
