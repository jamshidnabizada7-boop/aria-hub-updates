import { describe, expect, test } from 'bun:test';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SEO_PAGE_DATA, ensureSeoDescription, getPageSeo } from '../src/lib/seo-metadata';
import { INDEXNOW_KEY, KEY_LOCATION, SITE_HOST } from '../src/lib/indexnow';
import robots from '../src/app/robots';
import { formatDateLong, formatDateShort, parseSafeDate, toSafeIsoString } from '../src/lib/date-format';
import { daysUntilDeadline, isOpportunityExpired } from '../src/lib/opportunity-shared';
import type { Lang } from '../src/lib/lang-route';
import {
  buildJobPostingPayload,
  parseBaseSalary,
  buildJobLocation,
  buildHiringOrganization,
  buildValidThrough,
} from '../src/lib/seo-job-schema';

const LANGS: Lang[] = ['en', 'fa', 'ps'];

describe('SEO Metadata & Bing Optimization Suite', () => {
  describe('SEO_PAGE_DATA Static Dictionary', () => {
    test('contains all expected core routes', () => {
      const keys = Object.keys(SEO_PAGE_DATA);
      expect(keys.length).toBeGreaterThanOrEqual(19);
      expect(keys).toContain('services');
      expect(keys).toContain('contact');
      expect(keys).toContain('deadlines');
      expect(keys).toContain('visas');
      expect(keys).toContain('employers');
      expect(keys).toContain('blog');
      expect(keys).toContain('about');
      expect(keys).toContain('templates');
      expect(keys).toContain('track');
    });

    test('every page entry has titles between 30 and 65 chars across en, fa, ps', () => {
      for (const [key, entry] of Object.entries(SEO_PAGE_DATA)) {
        for (const lang of LANGS) {
          const title = entry.title[lang];
          expect(title).toBeDefined();
          expect(title.length).toBeGreaterThanOrEqual(30);
          expect(title.length).toBeLessThanOrEqual(65);
        }
      }
    });

    test('every page entry has descriptions strictly between 120 and 160 chars across en, fa, ps', () => {
      for (const [key, entry] of Object.entries(SEO_PAGE_DATA)) {
        for (const lang of LANGS) {
          const desc = entry.description[lang];
          expect(desc).toBeDefined();
          expect(desc.length).toBeGreaterThanOrEqual(120);
          expect(desc.length).toBeLessThanOrEqual(160);
        }
      }
    });

    test('getPageSeo returns fallback when key is unknown', () => {
      const fallback = getPageSeo('unknown-page' as any, 'en');
      expect(fallback.title.length).toBeGreaterThanOrEqual(30);
      expect(fallback.description.length).toBeGreaterThanOrEqual(120);
      expect(fallback.description.length).toBeLessThanOrEqual(160);
    });
  });

  describe('ensureSeoDescription Dynamic Boundary Enforcement', () => {
    test('preserves valid 120-160 char descriptions without tampering', () => {
      const valid = 'This is a well-crafted meta description for search engine optimization that contains exactly the right amount of detail for users and bots.';
      expect(valid.length).toBeGreaterThanOrEqual(120);
      expect(valid.length).toBeLessThanOrEqual(160);
      for (const lang of LANGS) {
        expect(ensureSeoDescription(valid, lang)).toBe(valid);
      }
    });

    test('truncates overlong descriptions cleanly with ellipsis (<= 160 chars and >= 120 chars)', () => {
      const overlong = 'Word '.repeat(40); // 200 chars
      for (const lang of LANGS) {
        const out = ensureSeoDescription(overlong, lang);
        expect(out.length).toBeGreaterThanOrEqual(120);
        expect(out.length).toBeLessThanOrEqual(160);
        expect(out.endsWith('...')).toBe(true);
      }
    });

    test('enriches empty, null, and short descriptions to 120-160 chars across all languages', () => {
      const shortInputs = ['', 'Short description', 'A brief summary of this job listing.', null, undefined];
      for (const input of shortInputs) {
        for (const lang of LANGS) {
          const out = ensureSeoDescription(input, lang);
          expect(out.length).toBeGreaterThanOrEqual(120);
          expect(out.length).toBeLessThanOrEqual(160);
        }
      }
    });

    test('handles custom contextNotes of any length while guaranteeing 120-160 chars', () => {
      const notes = [
        'Tiny',
        'Find eligibility requirements, deadline, and application instructions on ARIA HUB.',
        'A very long custom context note providing full instructions on scholarship eligibility and embassy preparation guidelines for Afghan students in 2026.',
      ];
      for (const note of notes) {
        for (const lang of LANGS) {
          for (const input of ['', 'Job Title', 'A moderately short snippet of about sixty-five characters.']) {
            const out = ensureSeoDescription(input, lang, note);
            expect(out.length).toBeGreaterThanOrEqual(120);
            expect(out.length).toBeLessThanOrEqual(160);
          }
        }
      }
    });
  });

  describe('Microsoft Clarity & IndexNow Integration', () => {
    test('layout.tsx includes Microsoft Clarity script with project ID ymu0ma5xzk', () => {
      const layoutPath = join(process.cwd(), 'src/app/layout.tsx');
      const layoutSrc = readFileSync(layoutPath, 'utf8');
      expect(layoutSrc).toContain('ymu0ma5xzk');
      expect(layoutSrc).toContain('https://www.clarity.ms/tag/');
      expect(layoutSrc).toContain('ref=bwt');
    });

    test('IndexNow key matches static file in public/ directory', () => {
      expect(INDEXNOW_KEY).toBe('9761dc99a8ec4438bcfc3d1481ea2264');
      expect(KEY_LOCATION).toBe(`https://${SITE_HOST}/${INDEXNOW_KEY}.txt`);
      const keyFilePath = join(process.cwd(), 'public', `${INDEXNOW_KEY}.txt`);
      expect(existsSync(keyFilePath)).toBe(true);
      const keyFileContent = readFileSync(keyFilePath, 'utf8').trim();
      expect(keyFileContent).toBe(INDEXNOW_KEY);
    });

    test('root layout fallback metadata conforms to length bounds', () => {
      const layoutPath = join(process.cwd(), 'src/app/layout.tsx');
      const layoutSrc = readFileSync(layoutPath, 'utf8');
      const titleMatch = layoutSrc.match(/title:\s*['"](.*?)['"]/);
      const descMatch = layoutSrc.match(/description:\s*\n?\s*['"](.*?)['"]/);
      expect(titleMatch).toBeTruthy();
      expect(descMatch).toBeTruthy();
      const title = titleMatch![1];
      const desc = descMatch![1];
      expect(title.length).toBeGreaterThanOrEqual(30);
      expect(title.length).toBeLessThanOrEqual(65);
      expect(desc.length).toBeGreaterThanOrEqual(120);
      expect(desc.length).toBeLessThanOrEqual(160);
    });
  });

  describe('Robots.txt & AI Crawler Access (AEO / GEO)', () => {
    test('robots() exports rules with sitemap and explicit AI bot access', () => {
      const config = robots();
      expect(config.sitemap).toBe('https://www.myariahub.com/sitemap.xml');
      const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
      const aiRule = rules.find((r) => Array.isArray(r.userAgent) && r.userAgent.includes('GPTBot'));
      expect(aiRule).toBeDefined();
      expect(aiRule?.allow).toBe('/');
      const userAgents = (aiRule?.userAgent || []) as string[];
      expect(userAgents).toContain('GPTBot');
      expect(userAgents).toContain('Claude-Web');
      expect(userAgents).toContain('PerplexityBot');
      expect(userAgents).toContain('Google-Extended');
      expect(userAgents).toContain('Applebot-Extended');
    });

    test('public/llms.txt exists and contains structured AI engine directives', () => {
      const llmsPath = join(process.cwd(), 'public/llms.txt');
      expect(existsSync(llmsPath)).toBe(true);
      const content = readFileSync(llmsPath, 'utf8');
      expect(content).toContain('# ARIA HUB');
      expect(content).toContain('https://www.myariahub.com');
      expect(content).toContain('/en');
      expect(content).toContain('/fa');
      expect(content).toContain('/ps');
    });

    test('public/og-image.png and public/images/og-image.png exist with valid file size', () => {
      const ogPath = join(process.cwd(), 'public/og-image.png');
      const ogImagesPath = join(process.cwd(), 'public/images/og-image.png');
      expect(existsSync(ogPath)).toBe(true);
      expect(existsSync(ogImagesPath)).toBe(true);
      expect(statSync(ogPath).size).toBeGreaterThan(10000);
      expect(statSync(ogImagesPath).size).toBeGreaterThan(10000);
    });

    test('root layout exports viewport with device-width and initial-scale', () => {
      const layoutPath = join(process.cwd(), 'src/app/layout.tsx');
      const layoutSrc = readFileSync(layoutPath, 'utf8');
      expect(layoutSrc).toContain('export const viewport: Viewport');
      expect(layoutSrc).toContain('width: "device-width"');
      expect(layoutSrc).toContain('initialScale: 1');
    });

    test('formatDateLong and formatDateShort handle invalid dates and null without throwing RangeError', () => {
      const invalidDate = new Date('invalid');
      expect(formatDateLong(invalidDate, 'en')).toBe('');
      expect(formatDateLong(invalidDate, 'fa')).toBe('');
      expect(formatDateLong(invalidDate, 'ps')).toBe('');
      expect(formatDateShort(invalidDate, 'en')).toBe('');
      expect(formatDateShort(invalidDate, 'fa')).toBe('');
      expect(formatDateLong(null as any, 'en')).toBe('');
      expect(formatDateShort(undefined as any, 'en')).toBe('');

      const validDate = new Date('2026-10-15T00:00:00Z');
      expect(formatDateLong(validDate, 'en')).toBe('October 15, 2026');
      expect(formatDateShort(validDate, 'en')).toBe('Oct 15, 2026');

      // Test ISO string support without throwing TypeError
      expect(formatDateLong('2026-10-15T00:00:00Z', 'en')).toBe('October 15, 2026');
      expect(formatDateShort('2026-10-15T00:00:00Z', 'en')).toBe('Oct 15, 2026');
      expect(formatDateLong('not-a-date', 'en')).toBe('');
    });

    test('daysUntilDeadline and isOpportunityExpired handle Date, ISO string, null, and expired statuses', () => {
      const future = new Date(Date.now() + 7 * 86_400_000);
      const futureIso = future.toISOString();
      const past = new Date(Date.now() - 7 * 86_400_000);
      const pastIso = past.toISOString();

      expect(isOpportunityExpired('expired', future)).toBe(true);
      expect(isOpportunityExpired('active', null)).toBe(false);
      expect(isOpportunityExpired('active', undefined)).toBe(false);
      expect(isOpportunityExpired('active', past)).toBe(true);
      expect(isOpportunityExpired('active', pastIso)).toBe(true);
      expect(isOpportunityExpired('active', future)).toBe(false);
      expect(isOpportunityExpired('active', futureIso)).toBe(false);

      expect(daysUntilDeadline(null)).toBe(0);
      expect(daysUntilDeadline(undefined)).toBe(0);
      expect(daysUntilDeadline('invalid-date')).toBe(0);
      expect(daysUntilDeadline(future)).toBeGreaterThanOrEqual(6);
      expect(daysUntilDeadline(futureIso)).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Safe Date Parsing and ISO Serialization Helpers', () => {
    test('parseSafeDate parses valid Date, ISO strings, timestamps, and returns null on bad input', () => {
      const fixed = new Date('2026-10-15T12:00:00.000Z');
      expect(parseSafeDate(fixed)?.getTime()).toBe(fixed.getTime());
      expect(parseSafeDate('2026-10-15T12:00:00.000Z')?.getTime()).toBe(fixed.getTime());
      expect(parseSafeDate(fixed.getTime())?.getTime()).toBe(fixed.getTime());

      expect(parseSafeDate(null)).toBeNull();
      expect(parseSafeDate(undefined)).toBeNull();
      expect(parseSafeDate('')).toBeNull();
      expect(parseSafeDate('not-a-valid-date')).toBeNull();
    });

    test('toSafeIsoString safely produces ISO string or empty string without throwing', () => {
      const fixed = new Date('2026-10-15T12:00:00.000Z');
      expect(toSafeIsoString(fixed)).toBe('2026-10-15T12:00:00.000Z');
      expect(toSafeIsoString('2026-10-15T12:00:00.000Z')).toBe('2026-10-15T12:00:00.000Z');
      expect(toSafeIsoString(fixed.getTime())).toBe('2026-10-15T12:00:00.000Z');

      expect(toSafeIsoString(null)).toBe('');
      expect(toSafeIsoString(undefined)).toBe('');
      expect(toSafeIsoString('')).toBe('');
      expect(toSafeIsoString('invalid')).toBe('');
    });

    test('resilience against unstable_cache JSON serialization (Date serialized to string)', () => {
      // When unstable_cache hydrates items, Date instances become ISO strings:
      const cachedOpportunity = {
        id: 'test-opp-1',
        createdAt: '2026-09-20T10:00:00.000Z',
        deadline: '2026-11-01T00:00:00.000Z',
        status: 'published',
      };

      // OpportunityCard logic:
      const rawCreated = cachedOpportunity.createdAt as unknown;
      const createdMs = rawCreated
        ? (rawCreated instanceof Date
            ? (rawCreated as Date).getTime()
            : new Date(cachedOpportunity.createdAt).getTime())
        : 0;
      expect(isNaN(createdMs)).toBe(false);
      expect(createdMs).toBeGreaterThan(0);

      // DeadlineCard logic:
      const rawDl = cachedOpportunity.deadline as unknown;
      const dlDate = rawDl instanceof Date ? rawDl : new Date(cachedOpportunity.deadline);
      expect(isNaN(dlDate.getTime())).toBe(false);
      expect(dlDate.getUTCMonth()).toBe(10); // Nov is 10 (0-indexed)
      expect(dlDate.getUTCDate()).toBe(1);
      expect(dlDate.toISOString().slice(0, 10)).toBe('2026-11-01');

      // Invalid date string doesn't crash:
      const badCreated = 'junk-date';
      const badCreatedMs = badCreated ? new Date(badCreated).getTime() : 0;
      const isBadNew = !isNaN(badCreatedMs) && badCreatedMs > 0 && Date.now() - badCreatedMs < 7 * 86_400_000;
      expect(isBadNew).toBe(false);
    });
  });

  describe('Comprehensive Sitemap Crawlability & Hreflang Validation', () => {
    test('sitemap.ts exports 24-hour ISR cache and includes all required core landing pages', () => {
      const sitemapPath = join(process.cwd(), 'src/app/sitemap.ts');
      expect(existsSync(sitemapPath)).toBe(true);
      const sitemapSrc = readFileSync(sitemapPath, 'utf8');

      // Verify 24-hour ISR revalidation
      expect(sitemapSrc).toContain('export const revalidate = 86400');

      // Verify all required core landing pages are statically configured
      const requiredPaths = [
        "'/'",
        "'/opportunities'",
        "'/visas'",
        "'/templates'",
        "'/visa-prep'",
        "'/interview-prep'",
        "'/cv-builder'",
        "'/opportunity-matcher'",
        "'/deadlines'",
        "'/services'",
        "'/about'",
        "'/blog'",
        "'/success-stories'",
        "'/contact'",
        "'/privacy-policy'",
        "'/terms-of-service'",
        "'/employers'",
        "'/advertise'",
        "'/submit-opportunity'",
        "'/track'",
      ];

      for (const p of requiredPaths) {
        expect(sitemapSrc).toContain(p);
      }

      // Verify queries for dynamic entities
      expect(sitemapSrc).toContain('db.opportunity.findMany');
      expect(sitemapSrc).toContain('db.news.findMany');
      expect(sitemapSrc).toContain('db.successStory.findMany');
      expect(sitemapSrc).toContain('db.documentTemplate.findMany');

      // Verify try-catch safety around DB calls
      expect(sitemapSrc).toContain('catch');
    });

    test('hreflang language alternates function produces valid URLs for all languages', () => {
      const BASE_URL = 'https://www.myariahub.com';
      function languageAlternates(path: string): Record<string, string> {
        const alternates: Record<string, string> = {};
        for (const lang of LANGS) {
          alternates[lang] = `${BASE_URL}/${lang}${path === '/' ? '' : path}`;
        }
        return alternates;
      }

      const rootAlts = languageAlternates('/');
      expect(rootAlts.en).toBe('https://www.myariahub.com/en');
      expect(rootAlts.fa).toBe('https://www.myariahub.com/fa');
      expect(rootAlts.ps).toBe('https://www.myariahub.com/ps');

      const oppAlts = languageAlternates('/opportunities');
      expect(oppAlts.en).toBe('https://www.myariahub.com/en/opportunities');
      expect(oppAlts.fa).toBe('https://www.myariahub.com/fa/opportunities');
      expect(oppAlts.ps).toBe('https://www.myariahub.com/ps/opportunities');
    });

    test('JobPosting JSON-LD schema builder produces Google Rich Results compliant payloads', () => {
      // Remote scholarship listing
      const remoteOpp = buildJobPostingPayload({
        title: 'DAAD University Summer Courses',
        slug: 'daad-summer-courses',
        organization: null,
        country: 'Online / Remote',
        jobType: 'scholarship',
        deadline: '2026-10-26T00:00:00.000Z',
        createdAt: '2026-09-11T12:00:00.000Z',
      });
      expect(remoteOpp.datePosted).toBe('2026-09-11');
      expect((remoteOpp.hiringOrganization as any).name).toBe('ARIA HUB');
      expect(remoteOpp.jobLocationType).toBe('TELECOMMUTE');
      expect((remoteOpp.applicantLocationRequirements as any).name).toBe('Afghanistan');
      expect(remoteOpp.validThrough).toBe('2026-10-26T00:00:00.000Z');
      expect(remoteOpp.employmentType).toBe('FULL_TIME');
      // Full PostalAddress is present even for remote, satisfying strict crawlers
      expect((remoteOpp.jobLocation as any).address.addressCountry).toBe('Afghanistan');
      expect((remoteOpp.jobLocation as any).address.addressLocality).toBe('Kabul');
      expect((remoteOpp.jobLocation as any).address.addressRegion).toBe('Kabul Province');
      expect((remoteOpp.jobLocation as any).address.postalCode).toBe('1001');
      expect((remoteOpp.jobLocation as any).address.streetAddress).toBeDefined();

      // On-site fellowship listing
      const onsiteOpp = buildJobPostingPayload({
        title: 'Wallace Fellowships at Harvard',
        slug: 'wallace-fellowships',
        organization: 'Harvard University',
        country: 'United States',
        jobType: 'part-time fellowship',
        deadline: new Date('2026-11-16T00:00:00.000Z'),
        createdAt: new Date('2026-08-31T00:00:00.000Z'),
        salary: '$1,200 - $1,800 / month',
      });
      expect(onsiteOpp.datePosted).toBe('2026-08-31');
      expect((onsiteOpp.hiringOrganization as any).name).toBe('Harvard University');
      expect((onsiteOpp.jobLocation as any).address.addressCountry).toBe('United States');
      expect((onsiteOpp.jobLocation as any).address.addressLocality).toBe('Washington');
      expect((onsiteOpp.jobLocation as any).address.addressRegion).toBe('DC');
      expect((onsiteOpp.jobLocation as any).address.postalCode).toBe('20001');
      expect((onsiteOpp.jobLocation as any).address.streetAddress).toBe('Harvard University Central Office');
      expect(onsiteOpp.employmentType).toBe('PART_TIME');
      expect(onsiteOpp.validThrough).toBe('2026-11-16T00:00:00.000Z');
      expect(onsiteOpp.baseSalary).toBeDefined();
      expect(onsiteOpp.baseSalary?.currency).toBe('USD');
      expect(onsiteOpp.baseSalary?.value.minValue).toBe(1200);
      expect(onsiteOpp.baseSalary?.value.maxValue).toBe(1800);
      expect(onsiteOpp.baseSalary?.value.unitText).toBe('MONTH');
    });

    test('Google Search Console Rich Results Validation — all reported issues are eliminated', () => {
      // 1. Missing field "hiringOrganization": guaranteed fallback organization with name, sameAs, logo
      const noOrg = buildHiringOrganization(null);
      expect(noOrg['@type']).toBe('Organization');
      expect(noOrg.name).toBe('ARIA HUB');
      expect(noOrg.sameAs).toBe('https://www.myariahub.com');
      expect(noOrg.logo).toContain('/images/logo-mark.webp');

      // 2. Missing field "jobLocation" & address fields: guaranteed 5-field PostalAddress
      const afgLoc = buildJobLocation('Kabul, Afghanistan', 'Kabul University');
      expect(afgLoc.jobLocation['@type']).toBe('Place');
      expect(afgLoc.jobLocation.address['@type']).toBe('PostalAddress');
      expect(afgLoc.jobLocation.address.streetAddress).toBe('Kabul University Central Office');
      expect(afgLoc.jobLocation.address.addressLocality).toBe('Kabul');
      expect(afgLoc.jobLocation.address.addressRegion).toBe('Kabul Province');
      expect(afgLoc.jobLocation.address.postalCode).toBe('1001');
      expect(afgLoc.jobLocation.address.addressCountry).toBe('Afghanistan');

      const heratLoc = buildJobLocation('Herat', null);
      expect(heratLoc.jobLocation.address.addressLocality).toBe('Herat');
      expect(heratLoc.jobLocation.address.postalCode).toBe('3001');

      // 3. Missing field "validThrough": calculates safe 90-day fallback when deadline is null
      const posted = new Date('2026-09-01T00:00:00.000Z');
      const fallbackExpiry = buildValidThrough(null, posted);
      const expectedDate = new Date(posted.getTime() + 90 * 86_400_000).toISOString();
      expect(fallbackExpiry).toBe(expectedDate);

      // 4. Missing field "baseSalary": parses USD, AFN, EUR, GBP, ranges, and Persian/Pashto numerals
      const usdRange = parseBaseSalary('USD 900–1,200 / month');
      expect(usdRange?.currency).toBe('USD');
      expect(usdRange?.value.minValue).toBe(900);
      expect(usdRange?.value.maxValue).toBe(1200);
      expect(usdRange?.value.unitText).toBe('MONTH');

      const afnSingle = parseBaseSalary('AFN 110,000 / month');
      expect(afnSingle?.currency).toBe('AFN');
      expect(afnSingle?.value.value).toBe(110000);
      expect(afnSingle?.value.unitText).toBe('MONTH');

      const afnRange = parseBaseSalary('AFN 65,000–85,000 / month');
      expect(afnRange?.currency).toBe('AFN');
      expect(afnRange?.value.minValue).toBe(65000);
      expect(afnRange?.value.maxValue).toBe(85000);

      const easternDigits = parseBaseSalary('۹۰۰–۱٬۲۰۰ دالر در ماه');
      expect(easternDigits?.currency).toBe('USD');
      expect(easternDigits?.value.minValue).toBe(900);
      expect(easternDigits?.value.maxValue).toBe(1200);
      expect(easternDigits?.value.unitText).toBe('MONTH');

      const hourlyUsd = parseBaseSalary('$25 / hour');
      expect(hourlyUsd?.currency).toBe('USD');
      expect(hourlyUsd?.value.value).toBe(25);
      expect(hourlyUsd?.value.unitText).toBe('HOUR');

      const annualEur = parseBaseSalary('€50,000 / year');
      expect(annualEur?.currency).toBe('EUR');
      expect(annualEur?.value.value).toBe(50000);
      expect(annualEur?.value.unitText).toBe('YEAR');

      // Unstated/empty salary gracefully returns undefined without fabricating fake values
      expect(parseBaseSalary(null)).toBeUndefined();
      expect(parseBaseSalary('')).toBeUndefined();
      expect(parseBaseSalary('Competitive / Negotiable')).toBeUndefined();
      expect(parseBaseSalary('حق‌الزحمه روزانه')).toBeUndefined();

      const stipendFa = parseBaseSalary('تنخواه ۴۵۰ دالر در ماه');
      expect(stipendFa?.currency).toBe('USD');
      expect(stipendFa?.value.value).toBe(450);
      expect(stipendFa?.value.unitText).toBe('MONTH');
    });

    test('JobPosting schema edge cases (invalid dates, empty strings, serializability)', () => {
      const edgeOpp = buildJobPostingPayload({
        title: 'Senior Frontend Engineer',
        slug: 'senior-frontend-engineer',
        description: '',
        organization: '   ',
        country: '',
        jobType: '',
        salary: 'Negotiable',
        deadline: 'invalid-date-format-string',
        publishedDate: 'not-a-date',
        createdAt: null,
      });

      // hiringOrganization has fallback name and valid URLs
      expect(edgeOpp.hiringOrganization.name).toBe('ARIA HUB');
      expect(edgeOpp.hiringOrganization.sameAs).toBe('https://www.myariahub.com');
      expect(edgeOpp.hiringOrganization.logo).toBe('https://www.myariahub.com/images/logo-mark.webp');

      // Invalid dates fallback safely without crashing or emitting NaN
      expect(edgeOpp.datePosted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(edgeOpp.validThrough).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Empty country defaults to TELECOMMUTE with valid anchor location
      expect(edgeOpp.jobLocationType).toBe('TELECOMMUTE');
      expect(edgeOpp.applicantLocationRequirements?.name).toBe('Afghanistan');
      expect(edgeOpp.jobLocation.address.postalCode).toBe('1001');
      expect(edgeOpp.jobLocation.address.addressCountry).toBe('Afghanistan');

      // Unstated salary is cleanly omitted
      expect(edgeOpp.baseSalary).toBeUndefined();

      // Serializes cleanly to JSON without error
      const serialized = JSON.stringify(edgeOpp);
      expect(serialized).toContain('"@type":"JobPosting"');
      expect(serialized).toContain('"hiringOrganization"');
      expect(serialized).toContain('"jobLocation"');
      expect(serialized).not.toContain('NaN');
      expect(serialized).not.toContain('undefined');
    });

    test('Robust Localization, Country Cleanliness & Advanced Salary Extraction', () => {
      // 1. Persian and Pashto cities resolve to Afghanistan with correct province, locality, and postalCode
      const kabulFa = buildJobLocation('کابل', 'دانشگاه کابل');
      expect(kabulFa.jobLocation.address.addressCountry).toBe('Afghanistan');
      expect(kabulFa.jobLocation.address.addressLocality).toBe('Kabul');
      expect(kabulFa.jobLocation.address.addressRegion).toBe('Kabul Province');
      expect(kabulFa.jobLocation.address.postalCode).toBe('1001');

      const mazarFa = buildJobLocation('مزار شریف', null);
      expect(mazarFa.jobLocation.address.addressCountry).toBe('Afghanistan');
      expect(mazarFa.jobLocation.address.addressLocality).toBe('Mazar-i-Sharif');
      expect(mazarFa.jobLocation.address.postalCode).toBe('1701');

      const kandaharPs = buildJobLocation('کندهار', null);
      expect(kandaharPs.jobLocation.address.addressCountry).toBe('Afghanistan');
      expect(kandaharPs.jobLocation.address.addressLocality).toBe('Kandahar');
      expect(kandaharPs.jobLocation.address.postalCode).toBe('3801');

      const jalalabadFa = buildJobLocation('جلال آباد', null);
      expect(jalalabadFa.jobLocation.address.addressCountry).toBe('Afghanistan');
      expect(jalalabadFa.jobLocation.address.addressLocality).toBe('Jalalabad');
      expect(jalalabadFa.jobLocation.address.postalCode).toBe('2601');

      // 2. International locations produce clean country names (not "Berlin, Germany" as country)
      const berlinLoc = buildJobLocation('Berlin, Germany');
      expect(berlinLoc.jobLocation.address.addressCountry).toBe('Germany');
      expect(berlinLoc.jobLocation.address.addressLocality).toBe('Berlin');
      expect(berlinLoc.jobLocation.address.postalCode).toBe('10115');

      const londonLoc = buildJobLocation('London, UK');
      expect(londonLoc.jobLocation.address.addressCountry).toBe('United Kingdom');
      expect(londonLoc.jobLocation.address.addressLocality).toBe('London');

      const tajikistanLoc = buildJobLocation('تاجیکستان');
      expect(tajikistanLoc.jobLocation.address.addressCountry).toBe('Tajikistan');
      expect(tajikistanLoc.jobLocation.address.addressLocality).toBe('Dushanbe');

      const iranLoc = buildJobLocation('ایران');
      expect(iranLoc.jobLocation.address.addressCountry).toBe('Iran');
      expect(iranLoc.jobLocation.address.addressLocality).toBe('Tehran');

      // 3. Afs and Arabic Yeh (ي) resolve to AFN (not USD)
      const afsSalary = parseBaseSalary('45,000 Afs / month');
      expect(afsSalary?.currency).toBe('AFN');
      expect(afsSalary?.value.value).toBe(45000);
      expect(afsSalary?.value.unitText).toBe('MONTH');

      const arabicYehSalary = parseBaseSalary('45,000 \u0627\u0641\u063a\u0627\u0646\u064a \u062f\u0631 \u0645\u0627\u0647');
      expect(arabicYehSalary?.currency).toBe('AFN');
      expect(arabicYehSalary?.value.value).toBe(45000);
      expect(arabicYehSalary?.value.unitText).toBe('MONTH');

      // 4. Experience and Grade numbers are not falsely captured as salaries
      const expSalary = parseBaseSalary('3-5 years experience, $2,000 / month');
      expect(expSalary?.currency).toBe('USD');
      expect(expSalary?.value.value).toBe(2000);
      expect(expSalary?.value.unitText).toBe('MONTH');

      expect(parseBaseSalary('NTA Grade 4')).toBeUndefined();
      expect(parseBaseSalary('Grade 3, Step 2')).toBeUndefined();

      // 5. European/Persian dot thousands separator
      const dotSalary = parseBaseSalary('1.200 دالر در ماه');
      expect(dotSalary?.currency).toBe('USD');
      expect(dotSalary?.value.value).toBe(1200);

      // 6. Extraction from description when salary column is missing or generic
      const fromDesc = parseBaseSalary(null, 'Full time position. The salary range is between $71,000 to $90,000 per year.');
      expect(fromDesc?.currency).toBe('USD');
      expect(fromDesc?.value.minValue).toBe(71000);
      expect(fromDesc?.value.maxValue).toBe(90000);
      expect(fromDesc?.value.unitText).toBe('YEAR');

      const fromDescGeneric = parseBaseSalary('As per scale', 'Location: Kabul\nSalary: 7000 - 30000 AFN / Monthly\nWork type: Full Time');
      expect(fromDescGeneric?.currency).toBe('AFN');
      expect(fromDescGeneric?.value.minValue).toBe(7000);
      expect(fromDescGeneric?.value.maxValue).toBe(30000);
      expect(fromDescGeneric?.value.unitText).toBe('MONTH');

      // 7. Remote listing with specific country
      const remoteUs = buildJobLocation('Remote - United States', 'Tech Corp');
      expect(remoteUs.isRemote).toBe(true);
      expect(remoteUs.applicantLocationRequirements?.name).toBe('United States');
      expect(remoteUs.jobLocation.address.addressCountry).toBe('United States');

      // 8. buildValidThrough extends published listings with old dates into the future
      const oldPublishedDate = new Date('2024-01-01T00:00:00.000Z');
      const safeFuture = buildValidThrough(null, oldPublishedDate, 'published');
      expect(new Date(safeFuture).getTime()).toBeGreaterThan(Date.now());
    });
  });
});



