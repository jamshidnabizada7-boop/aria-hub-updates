import { listOpportunities } from '@/lib/opportunity-queries';

export const revalidate = 1800; // refresh every 30 minutes

const BASE_URL = 'https://www.myariahub.com';
const SITE_EMAIL = 'info@myariahub.com';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(value: string): string {
  // Split any "]]>" so it cannot terminate the CDATA block early.
  return `<![CDATA[${value.replace(/]]>/g, ']]&gt;')}]]>`;
}

/**
 * RSS 2.0 feed of the newest active opportunities — subscribe-and-return
 * surface for daily visitors. English titles with structured metadata in
 * the description.
 */
export async function GET() {
  const { items } = await listOpportunities({ lang: 'en', sort: 'newest', page: 1, perPage: 50 });

  const itemsXml = items
    .map((item) => {
      const link = `${BASE_URL}/en/opportunities/${item.slug}`;
      const deadline = item.deadline ? item.deadline.toISOString().slice(0, 10) : null;
      const description = [
        item.summary,
        item.organization ? `Organization: ${item.organization}` : null,
        item.country ? `Location: ${item.country}` : null,
        item.jobType ? `Type: ${item.jobType}` : null,
        deadline ? `Deadline: ${deadline}` : null,
      ]
        .filter(Boolean)
        .join(' — ');
      return `    <item>
      <title>${cdata(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${cdata(description)}</description>
      <category>${cdata(item.categoryLabel || 'Opportunity')}</category>
      <pubDate>${new Date(item.createdAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ARIA HUB — Latest Opportunities for Afghans</title>
    <link>${BASE_URL}</link>
    <description>Jobs, scholarships, internships and opportunities for Afghans — gathered from trusted sources, summarized and translated daily (English / دری / پښتو).</description>
    <language>en</language>
    <managingEditor>${SITE_EMAIL} (ARIA HUB)</managingEditor>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  });
}
