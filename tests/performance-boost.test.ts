import { describe, expect, it } from 'bun:test';
import fs from 'fs';
import path from 'path';

describe('Performance Boost & SSR Optimization Suite', () => {
  const root = path.resolve(__dirname, '..');

  it('verifies src/app/layout.tsx does not await cookies() to preserve ISR site-wide', () => {
    const layoutContent = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
    expect(layoutContent).not.toContain('cookies()');
    expect(layoutContent).not.toContain('cookieStore');
    expect(layoutContent).toContain('lang={lang}');
    expect(layoutContent).toContain('dir={dir}');
    expect(layoutContent).toContain('DEFAULT_LANG');
  });

  it('verifies src/app/[lang]/layout.tsx injects synchronous documentElement lang/dir script', () => {
    const langLayoutContent = fs.readFileSync(path.join(root, 'src/app/[lang]/layout.tsx'), 'utf8');
    expect(langLayoutContent).toContain('document.documentElement.lang="${lang}"');
    expect(langLayoutContent).toContain('document.documentElement.dir="${lang === \'en\' ? \'ltr\' : \'rtl\'}"');
    expect(langLayoutContent).toContain('getCachedLanguages');
    expect(langLayoutContent).toContain('getCachedSettings');
  });

  it('verifies src/lib/get-site.ts caches site-data bundle with unstable_cache', () => {
    const getSiteContent = fs.readFileSync(path.join(root, 'src/lib/get-site.ts'), 'utf8');
    expect(getSiteContent).toContain('unstable_cache');
    expect(getSiteContent).toContain('site-data-bundle');
    expect(getSiteContent).toContain('revalidate: 300');
  });

  it('verifies src/app/api/site/route.ts delegates directly to getSiteData()', () => {
    const apiSiteContent = fs.readFileSync(path.join(root, 'src/app/api/site/route.ts'), 'utf8');
    expect(apiSiteContent).toContain('getSiteData()');
    expect(apiSiteContent).not.toContain('db.siteSetting.findFirst()');
  });

  it('verifies Reveal and RevealStagger do not render opacity: 0 on SSR (initial={false})', () => {
    const revealContent = fs.readFileSync(path.join(root, 'src/components/site/reveal.tsx'), 'utf8');
    expect(revealContent).toContain('<motion.div\n      initial={false}');
    expect(revealContent).toContain('initial={false}');
  });

  it('verifies opportunity-queries caches facets, closing soon, spotlight candidates, list opportunities, deadlines, and exports getHomeStats', () => {
    const oppQueriesContent = fs.readFileSync(path.join(root, 'src/lib/opportunity-queries.ts'), 'utf8');
    expect(oppQueriesContent).toContain('getHomeStats');
    expect(oppQueriesContent).toContain('getRawFacetsData');
    expect(oppQueriesContent).toContain('getCachedClosingSoonRows');
    expect(oppQueriesContent).toContain('getCachedSpotlightCandidates');
    expect(oppQueriesContent).toContain('getCachedOpportunities');
    expect(oppQueriesContent).toContain('getCachedDeadlinesData');
  });

  it('verifies homepage uses getHomeStats, exports generateStaticParams for SSG, and has 300s revalidate window', () => {
    const pageContent = fs.readFileSync(path.join(root, 'src/app/[lang]/page.tsx'), 'utf8');
    expect(pageContent).toContain('revalidate = 300');
    expect(pageContent).toContain('getHomeStats()');
    expect(pageContent).toContain('generateStaticParams');
    expect(pageContent).not.toContain("distinct: ['organization']");
    expect(pageContent).not.toContain("distinct: ['country']");
  });

  it('verifies public landing pages export generateStaticParams for static edge CDN serving', () => {
    const ssgPages = [
      'src/app/[lang]/page.tsx',
      'src/app/[lang]/about/page.tsx',
      'src/app/[lang]/contact/page.tsx',
      'src/app/[lang]/services/page.tsx',
      'src/app/[lang]/terms-of-service/page.tsx',
      'src/app/[lang]/privacy-policy/page.tsx',
      'src/app/[lang]/cv-builder/page.tsx',
      'src/app/[lang]/opportunity-matcher/page.tsx',
    ];

    for (const relPath of ssgPages) {
      const content = fs.readFileSync(path.join(root, relPath), 'utf8');
      expect(content).toContain('generateStaticParams');
      expect(content).toContain('revalidate');
    }
  });

  it('verifies visas and success story queries use unstable_cache', () => {
    const visasContent = fs.readFileSync(path.join(root, 'src/app/[lang]/visas/page.tsx'), 'utf8');
    expect(visasContent).toContain('getCachedVisas');
    expect(visasContent).toContain('unstable_cache');

    const storiesContent = fs.readFileSync(path.join(root, 'src/lib/success-story-queries.ts'), 'utf8');
    expect(storiesContent).toContain('getCachedFeaturedStoryRow');
    expect(storiesContent).toContain('unstable_cache');
  });

  it('verifies key sections and process use initial={false} to ensure instant SSR visibility', () => {
    const filesToCheck = [
      'src/components/site/sections/opportunities.tsx',
      'src/components/site/sections/news.tsx',
      'src/components/site/sections/visas.tsx',
      'src/components/site/sections/services.tsx',
      'src/components/site/sections/testimonials.tsx',
      'src/components/site/sections/comparison.tsx',
      'src/components/site/sections/why-choose-us.tsx',
      'src/components/site/sections/team.tsx',
      'src/components/site/sections/pricing.tsx',
      'src/components/site/sections/payments.tsx',
      'src/components/site/sections/faqs.tsx',
      'src/components/site/sections/cta-banner.tsx',
      'src/components/site/sections/counters.tsx',
      'src/components/site/sections/gallery.tsx',
      'src/components/site/sections/promote.tsx',
      'src/components/site/sections/process.tsx',
      'src/components/site/trust-bar.tsx',
    ];

    for (const relPath of filesToCheck) {
      const content = fs.readFileSync(path.join(root, relPath), 'utf8');
      expect(content).toContain('initial={false}');
    }
  });

  it('verifies providers.tsx does not overwrite document lang/dir with stale Zustand state', () => {
    const providersContent = fs.readFileSync(path.join(root, 'src/components/providers.tsx'), 'utf8');
    expect(providersContent).not.toContain('html.lang = code');
    expect(providersContent).not.toContain('html.dir = dir');
  });

  it('verifies accessibility roles fix prohibited ARIA attributes across key elements', () => {
    const counters = fs.readFileSync(path.join(root, 'src/components/site/sections/counters.tsx'), 'utf8');
    expect(counters).toContain('role="status" aria-label=');

    const home = fs.readFileSync(path.join(root, 'src/components/site/home.tsx'), 'utf8');
    expect(home).toContain('role="img" aria-label={`${rating}/5`}');

    const stories = fs.readFileSync(path.join(root, 'src/app/[lang]/success-stories/page.tsx'), 'utf8');
    expect(stories).toContain('role="region" aria-label={t(\'stories.eyebrow\')}');

    const adminImport = fs.readFileSync(path.join(root, 'src/components/admin/auto-import-panel.tsx'), 'utf8');
    expect(adminImport).toContain('role="status" aria-busy="true" aria-label="Loading import data"');

    const countUp = fs.readFileSync(path.join(root, 'src/components/site/count-up.tsx'), 'utf8');
    expect(countUp).toContain('role="status" aria-label=');
  });

  it('verifies llms.txt route handler exists, has correct headers, and proxy config excludes it', () => {
    const routeContent = fs.readFileSync(path.join(root, 'src/app/llms.txt/route.ts'), 'utf8');
    expect(routeContent).toContain("'Content-Type': 'text/plain; charset=utf-8'");
    expect(routeContent).toContain('Cache-Control');
    expect(routeContent).toContain('public');

    const proxyContent = fs.readFileSync(path.join(root, 'src/proxy.ts'), 'utf8');
    expect(proxyContent).toContain(String.raw`llms\.txt`);
  });

  it('verifies home.tsx code-splits below-the-fold sections with next/dynamic', () => {
    const homeContent = fs.readFileSync(path.join(root, 'src/components/site/home.tsx'), 'utf8');
    expect(homeContent).toContain("import dynamic from 'next/dynamic';");
    const dynamicSections = [
      'VisasSection',
      'PromoteSection',
      'PricingSection',
      'PaymentsSection',
      'GallerySection',
      'PartnersSection',
      'TeamSection',
      'FaqsSection',
      'ComparisonSection',
      'WhyChooseUsSection',
    ];
    for (const section of dynamicSections) {
      expect(homeContent).toContain(`dynamic(() => import(`);
      expect(homeContent).toContain(section);
    }
  });

  it('verifies third-party scripts (Clarity & AdSense) are deferred to browser idle time', () => {
    const rootLayout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
    expect(rootLayout).toContain('requestIdleCallback');
    expect(rootLayout).toContain('clarity-js');

    const langLayout = fs.readFileSync(path.join(root, 'src/app/[lang]/layout.tsx'), 'utf8');
    expect(langLayout).toContain('requestIdleCallback');
    expect(langLayout).toContain('adsbygoogle-js');
    expect(langLayout).toContain('generateStaticParams');
  });

  it('verifies hero background SmartImage uses fetchPriority="high" for LCP', () => {
    const heroContent = fs.readFileSync(path.join(root, 'src/components/site/sections/hero.tsx'), 'utf8');
    expect(heroContent).toContain('fetchPriority="high"');
  });
});
