import { getSiteData } from '@/lib/get-site';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.myariahub.com';

export async function JsonLd() {
  const data = await getSiteData();
  const s = data.settings;
  const lastModified = s?.updatedAt ? new Date(s.updatedAt).toISOString() : undefined;

  const fallbackSameAs = [
    'https://www.youtube.com/@myariahub',
    'https://x.com/myariahub',
  ];
  const dynamicSameAs = data.socialLinks
    .map((l) => l.url)
    .filter((u) => u && u.startsWith('http'));
  const sameAs = Array.from(new Set([...fallbackSameAs, ...dynamicSameAs]));

  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: s?.siteName || 'ARIA HUB',
    description: s?.description,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo-mark.webp`,
    email: s?.email,
    telephone: s?.phone,
    address: s?.address ? { '@type': 'PostalAddress', streetAddress: s.address } : undefined,
    sameAs,
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

  // Speakable schema for Voice & AI Assistant indexing (AEO)
  const webpage = {
    '@type': 'WebPage',
    '@id': `${SITE_URL}/#webpage`,
    name: s?.siteName || 'ARIA HUB',
    url: SITE_URL,
    description: s?.description,
    datePublished: '2026-01-01T00:00:00Z',
    dateModified: lastModified,
    inLanguage: ['en', 'fa', 'ps'],
    publisher: {
      '@type': 'Organization',
      name: s?.siteName || 'ARIA HUB',
      url: SITE_URL,
    },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.article-headline', '.article-summary', 'h1', 'h2', 'header p', '.faq-question', '.faq-answer'],
    },
  };

  // FAQPage JSON-LD schema for rich snippet answer boxes & AEO sourcing
  // Formatted with concise 40-80 word paragraphs for featured snippet eligibility.
  const defaultFaqs = [
    {
      q: 'How do I find and apply for scholarships on ARIA HUB?',
      a: 'To find and apply for international scholarships on ARIA HUB, browse our verified opportunities directory filtered by degree level, host country, and funding type. Each listing provides detailed eligibility requirements, deadline countdowns, required documentation, and direct official application portal links translated into English, Persian (Afghanistan), and Pashto to support Afghan students worldwide.',
    },
    {
      q: 'Is posting jobs and scholarships on ARIA HUB free for employers?',
      a: 'Yes, posting verified job vacancies, internships, fellowships, and scholarship programs on ARIA HUB is completely free for reputable employers and academic institutions. Submissions are subject to automated and editorial quality checks, and key listing details are provided in Persian (Afghanistan), Pashto, and English.',
    },
    {
      q: 'What languages and localization features does ARIA HUB offer?',
      a: "ARIA HUB is Afghanistan's premier trilingual career and educational gateway, offering complete native support across English, Persian (Afghanistan), and Pashto. Users can seamlessly switch languages with full RTL layout support, localized Gregorian calendar dates, Eastern Arabic numerals, and culturally tailored interfaces designed for desktop and mobile devices.",
    },
    {
      q: 'How often are new job vacancies and educational deadlines updated?',
      a: 'The ARIA HUB database is updated multiple times daily with verified international scholarships, remote work positions, local employment opportunities, and training programs. We provide automated deadline reminders, application tracking tools, and direct email alerts so Afghan candidates never miss critical submission dates for high-impact educational and professional opportunities.',
    },
  ];

  const faqItems =
    data.faqs && data.faqs.length > 0
      ? data.faqs.slice(0, 10).map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        }))
      : defaultFaqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.a,
          },
        }));

  const faqSchema = {
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    mainEntity: faqItems,
  };

  const graphData = {
    '@context': 'https://schema.org',
    '@graph': [org, website, webpage, faqSchema],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graphData).replace(/</g, '\\u003c'),
      }}
    />
  );
}
