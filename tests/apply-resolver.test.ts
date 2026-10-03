/**
 * Phase 5 — Application Destination Resolver V2.
 *
 * Covers the plan's mandatory cases plus the extraction refinements:
 *   1. official same-domain Apply URL = valid direct application
 *   2. aggregator same-domain link = source fallback
 *   3. mailto employer address = valid
 *   4. source site's generic email = invalid
 *   5. Google Form = valid
 *   6. external ATS = valid
 * Plus: official-domain matching, blacklist exact-domain behavior, and the
 * widened form-host extraction (typeform/jotform/kobo/office).
 */
import { describe, test, expect } from 'bun:test';

const { resolveApplyDestination, isKnownAtsHost, isTrustworthyDestination } =
  await import('../src/lib/apply-resolver');
const { classifyApplyUrl, isRealApplyLink } = await import('../src/lib/apply');
const { extractApplyLink, extractRealApplyLink, isApplyEmail } =
  await import('../src/lib/apply-extract');

describe('mandatory: official same-domain Apply URL is a real destination', () => {
  const sourceUrl = 'https://careers.testorg.org/job/123';
  const applyUrl = 'https://careers.testorg.org/apply/123';

  test('with an official source role', () => {
    const res = resolveApplyDestination({ applyUrl, sourceUrl, sourceRole: 'official_careers' });
    expect(res.applyUrlType).toBe('direct_application');
    expect(isTrustworthyDestination(res)).toBe(true);
    expect(res.confidence).toBeGreaterThanOrEqual(90);
    expect(res.evidence).toBe('official-same-host-apply');
    // classification stays compatible with the public-page gate
    expect(isRealApplyLink(res.applyUrlType)).toBe(true);
  });

  test('even without a role, when the host is an organization official domain', () => {
    const res = resolveApplyDestination({
      applyUrl: 'https://jobs.unicef.org/go/Apply/8842',
      sourceUrl: 'https://www.jobs.af/jobs/x',
      sourceRole: 'aggregator',
      organizationDomains: ['unicef.org', 'jobs.unicef.org'],
    });
    expect(res.applyUrlType).toBe('direct_application');
    expect(res.evidence).toBe('official-domain-apply-page');
    expect(res.confidence).toBe(92);
  });

  test('aggregator SAME-DOMAIN link remains a fallback', () => {
    const res = resolveApplyDestination({
      applyUrl: 'https://www.acbar.org/listing/x',
      sourceUrl: 'https://www.acbar.org/listing/x',
      sourceRole: 'aggregator',
    });
    expect(res.applyUrlType).toBe('source_article_fallback');
    expect(isTrustworthyDestination(res)).toBe(false);
    expect(res.evidence).toBe('aggregator-same-host-fallback');
  });

  test('discovery-role same-host link stays conservative (fallback)', () => {
    const res = resolveApplyDestination({
      applyUrl: 'https://some-blog.org/posts/1',
      sourceUrl: 'https://some-blog.org/posts/1',
      sourceRole: 'discovery',
    });
    expect(res.applyUrlType).toBe('source_article_fallback');
  });
});

describe('mandatory: email destinations', () => {
  test('mailto employer address is valid', () => {
    const res = resolveApplyDestination({
      applyUrl: 'mailto:hr@speenkai.com', sourceUrl: 'https://www.jobs.af/jobs/x', sourceRole: 'aggregator',
    });
    expect(res.applyUrlType).toBe('application_email');
    expect(isTrustworthyDestination(res)).toBe(true);
    expect(res.evidence).toBe('employer-email-extracted');
  });

  test("source site's generic email is invalid", () => {
    for (const bad of ['mailto:info@acbar.org', 'mailto:webinfo@acbar.org', 'mailto:info@wazifaha.org']) {
      const res = resolveApplyDestination({ applyUrl: bad, sourceUrl: 'https://www.acbar.org/x', sourceRole: 'aggregator' });
      expect(res.applyUrlType).toBe('unknown');
      expect(res.confidence).toBe(0);
    }
  });

  test('blacklist matches by registrable domain, not substring', () => {
    // an unrelated domain that merely CONTAINS an aggregator string is allowed
    expect(isApplyEmail('jobs@acbar.org.af')).toBe(true);
    expect(isApplyEmail('recruitment@nrc.no')).toBe(true);
    // exact blacklist entries stay rejected
    expect(isApplyEmail('webinfo@acbar.org')).toBe(false);
    expect(isApplyEmail('someone@o4af.com')).toBe(false);
    expect(isApplyEmail('no-reply@company.org')).toBe(false);
  });

  test('employer email on an official organization domain scores higher', () => {
    const res = resolveApplyDestination({
      applyUrl: 'mailto:recruitment@unicef.org', sourceUrl: 'https://jobs.af/x', sourceRole: 'aggregator',
      organizationDomains: ['unicef.org'],
    });
    expect(res.evidence).toBe('employer-email-official-domain');
    expect(res.confidence).toBe(85);
  });
});

describe('mandatory: forms and external ATS', () => {
  test('Google Form is valid', () => {
    const res = resolveApplyDestination({
      applyUrl: 'https://docs.google.com/forms/d/e/abc/viewform', sourceUrl: 'https://acbar.org/x', sourceRole: 'aggregator',
    });
    expect(res.applyUrlType).toBe('application_form');
    expect(isTrustworthyDestination(res)).toBe(true);
    expect(res.evidence).toBe('application-form-url');
  });

  test('recognized external ATS is valid', () => {
    expect(isKnownAtsHost('boards.greenhouse.io')).toBe(true);
    expect(isKnownAtsHost('jobs.lever.co')).toBe(true);
    expect(isKnownAtsHost('jobs.lever.co.evil.io')).toBe(false);
    const res = resolveApplyDestination({
      applyUrl: 'https://jobs.lever.co/nrc/abc-123', sourceUrl: 'https://www.acbar.org/x', sourceRole: 'aggregator',
    });
    expect(res.applyUrlType).toBe('direct_application');
    expect(res.evidence).toBe('external-ats');
    expect(res.confidence).toBe(80);
  });

  test('official source + external ATS is the top-ranked destination', () => {
    const res = resolveApplyDestination({
      applyUrl: 'https://boards.greenhouse.io/unicef/jobs/123', sourceUrl: 'https://unicef.org/careers/x',
      sourceRole: 'official_careers', organizationDomains: ['unicef.org'],
    });
    expect(res.evidence).toBe('official-ats-direct-application');
    expect(res.confidence).toBe(95);
  });
});

describe('extraction refinements (apply-extract V2)', () => {
  test('typeform/jotform/kobo links are captured as form candidates', () => {
    const link = extractRealApplyLink([
      'Apply online at https://form.typeform.com/to/abc123 before the deadline.',
    ]);
    expect(link).toBe('https://form.typeform.com/to/abc123');
    expect(classifyApplyUrl(link, 'https://x.org/a')).toBe('application_form');

    const jot = extractRealApplyLink(['Submit via https://eu.jotform.com/123456789012345 please.']);
    expect(jot).toBe('https://eu.jotform.com/123456789012345');
  });

  test('emails beat forms; aggregator emails in text are skipped', () => {
    const listing: any = {
      guidelines: 'Send CV to hr@real-org.org or use https://docs.google.com/forms/d/e/X/viewform. Questions: info@acbar.org',
    };
    expect(extractApplyLink(listing)).toBe('mailto:hr@real-org.org');
  });

  test('blacklisted URLs are not extracted as explicit apply links', () => {
    const link = extractRealApplyLink([
      'Apply at https://www.acbar.org/listing/xyz now.',
    ]);
    expect(link).toBeNull();
  });
});
