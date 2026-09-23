import { describe, expect, test } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SEO_PAGE_DATA, ensureSeoDescription, getPageSeo } from '../src/lib/seo-metadata';
import { INDEXNOW_KEY, KEY_LOCATION, SITE_HOST } from '../src/lib/indexnow';
import type { Lang } from '../src/lib/lang-route';

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
});
