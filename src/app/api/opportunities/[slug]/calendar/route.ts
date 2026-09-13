import { NextRequest } from 'next/server';
import { getOpportunityBySlug, cleanSummary } from '@/lib/opportunity-queries';
import { getLocalizedContent } from '@/lib/i18n-content';
import { isLang, type Lang } from '@/lib/lang-route';

export const dynamic = 'force-dynamic';

const SITE_URL = 'https://www.myariahub.com';

// ---------------------------------------------------------------------------
// RFC 5545 helpers
// ---------------------------------------------------------------------------

/** Escape a TEXT value (RFC 5545 §3.3.11): backslash, semicolon, comma, newline. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

/**
 * Fold a content line to ≤75 octets (RFC 5545 §3.1), inserting CRLF + space.
 * Octet-aware so multibyte (fa/ps) characters are never split mid-sequence;
 * continuation lines budget 74 content octets for their leading space.
 */
function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const decoder = new TextDecoder();
  const parts: string[] = [];
  let start = 0;
  let first = true;
  while (start < bytes.length) {
    const budget = first ? 75 : 74;
    let end = Math.min(start + budget, bytes.length);
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) {
      end--; // step back to the start of the UTF-8 sequence
    }
    parts.push(decoder.decode(bytes.subarray(start, end)));
    start = end;
    first = false;
  }
  return parts.join('\r\n ');
}

/** `YYYYMMDDTHHMMSSZ` — UTC timestamp form used by DTSTAMP. */
function toStamp(d: Date): string {
  return `${d.toISOString().slice(0, 10).replace(/-/g, '')}T${d
    .toISOString()
    .slice(11, 19)
    .replace(/:/g, '')}Z`;
}

/** `YYYYMMDD` — date form used by DTSTART/DTEND with VALUE=DATE. */
function toAllDay(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

// ---------------------------------------------------------------------------
// handler
// ---------------------------------------------------------------------------

/**
 * GET /api/opportunities/{slug}/calendar?lang=en|fa|ps
 * Returns an RFC 5545 .ics file with an all-day VEVENT on the deadline
 * (DTEND = deadline + 1 day per the all-day convention) plus a VALARM
 * reminder 2 days out (1 day when the deadline is closer than 3 days).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const langParam = req.nextUrl.searchParams.get('lang');
  const lang: Lang = isLang(langParam) ? langParam : 'fa';

  const opp = await getOpportunityBySlug(slug);
  if (!opp || opp.status !== 'published' || !opp.deadline) {
    return Response.json(
      { error: 'Opportunity not found or has no deadline' },
      { status: 404 }
    );
  }

  const deadline = opp.deadline;
  const title = getLocalizedContent(
    opp.title,
    opp.titleI18n as Record<string, string> | null,
    lang
  );
  const summary = cleanSummary(
    getLocalizedContent(
      opp.aiSummary,
      opp.aiSummaryI18n as Record<string, string> | null,
      lang
    ),
    420
  );

  const pageUrl = `${SITE_URL}/${lang}/opportunities/${slug}`;
  const applyLink = opp.applyUrl?.trim() || opp.sourceUrl?.trim() || pageUrl;

  let description = summary
    ? `${summary} — Apply: ${applyLink}`
    : `Apply: ${applyLink}`;
  if (description.length > 500) description = description.slice(0, 499).trimEnd() + '…';

  // All-day VEVENT: DTEND is exclusive → deadline + 1 day.
  const endExclusive = new Date(deadline);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  // Reminder: 2 days before, tightened to 1 day when < 3 days remain.
  const alarmDays = deadline.getTime() - Date.now() < 3 * 86_400_000 ? 1 : 2;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ARIA HUB//Opportunities//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${slug}@myariahub.com`,
    `DTSTAMP:${toStamp(new Date())}`,
    `DTSTART;VALUE=DATE:${toAllDay(deadline)}`,
    `DTEND;VALUE=DATE:${toAllDay(endExclusive)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${pageUrl}`,
    'BEGIN:VALARM',
    `TRIGGER:-P${alarmDays}D`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  // RFC 5545 requires CRLF line endings.
  const ics = `${lines.map(foldLine).join('\r\n')}\r\n`;

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}-deadline.ics"`,
      'Cache-Control': 'no-store',
    },
  });
}
