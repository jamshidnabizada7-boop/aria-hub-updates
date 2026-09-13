import { getSiteData } from '@/lib/get-site';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myariahub.com';

export async function JsonLd() {
  const data = await getSiteData();
  const s = data.settings;
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: s?.siteName || 'ARIA HUB',
    description: s?.description,
    url: SITE_URL,
    email: s?.email,
    telephone: s?.phone,
    address: s?.address ? { '@type': 'PostalAddress', streetAddress: s.address } : undefined,
    sameAs: data.socialLinks.map((l) => l.url).filter((u) => u.startsWith('http')),
  };
  // Sitelinks searchbox: target must be the user-facing results page.
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: s?.siteName || 'ARIA HUB',
    url: SITE_URL,
    inLanguage: ['fa', 'ps', 'en'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/en/opportunities?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify([org, website]).replace(/</g, '\\u003c') }}
    />
  );
}
