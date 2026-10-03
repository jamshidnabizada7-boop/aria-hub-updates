/**
 * Application Destination Resolver V2 (Phase 5).
 *
 * Classify:src/lib/apply.ts decides the TYPE of a link; this resolver decides
 * whether that type is TRUSTWORTHY for the specific source, and records why.
 *
 * The core fix over classifyApplyUrl's same-host rule: an official careers
 * page linking to its own /apply/ path (careers.org.org/job/123 →
 * careers.org.org/apply/123) is a GENUINE destination, while an aggregator's
 * same-host link (acbar.org listing → acbar.org listing) remains a fallback.
 * Classification therefore considers the source role, the organization's
 * official domains, the apply URL, and the source URL together.
 *
 * Destination preference (recorded in applyConfidence, 0-100):
 *   95 official ATS direct application
 *   92 official organization application page (own domain / same-host official)
 *   88 official application form
 *   85 employer application email on the organization's own domain
 *   75 employer application email (extracted from the listing)
 *   80 recognized external ATS
 *   65 unknown-host direct link (current platform default)
 *   20 aggregator source fallback (stored for "How to apply" guidance only)
 *
 * The actual URL CHOICE still happens upstream (extractApplyLink prefers
 * extracted emails/forms over the scraped link; the canonical-merge policy
 * promotes official destinations) — this module classifies and scores the
 * chosen candidate. applyVerifiedAt is reserved for human/automated
 * verification and is never set automatically here.
 */
import { classifyApplyUrl, FORM_URL_RE, isRealApplyLink } from './apply';
import type { ApplyUrlType } from './apply';
import { normalizeDomain, registrableDomain } from './organizations/domains';

/** Hosts of recognized external ATS platforms (a vacancy page there is a real destination). */
const KNOWN_ATS_HOSTS = [
  'greenhouse.io', 'lever.co', 'workable.com', 'smartrecruiters.com',
  'bamboohr.com', 'myworkdayjobs.com', 'myworkdaysite.com', 'taleo.net',
  'jobvite.com', 'applytojob.com', 'recruitee.com', 'ashbyhq.com',
  'breezy.hr', 'jazz.hr', 'eightfold.ai', 'icims.com', 'successfactors.com',
  'ceipal.com', 'zoho.com', 'recruitcrm.io', 'hire.withgoogle.com',
];

export function isKnownAtsHost(host?: string | null): boolean {
  const h = normalizeDomain(host);
  if (!h) return false;
  return KNOWN_ATS_HOSTS.some((ats) => {
    const root = registrableDomain(ats);
    return h === root || h.endsWith(`.${root}`) || h === ats || h.endsWith(`.${ats}`);
  });
}

const OFFICIAL_ROLES = new Set([
  'official_api', 'official_feed', 'official_careers', 'official_ats',
  'official_government', 'official_university',
]);

/** Aggregator/discovery hosts: an email on these domains is never a destination. */
const BLACKLISTED_DOMAINS = new Set([
  'acbar.org', 'wazifaha.org', 'o4af.com', 'scholarships.af', 'jobs.af',
]);

function hostOf(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return normalizeDomain(new URL(String(url).trim()).hostname);
  } catch {
    return '';
  }
}

function emailHost(url: string | null | undefined): string {
  const s = String(url ?? '').trim();
  const m = s.match(/^mailto:([^?]+)/i);
  return m ? normalizeDomain(m[1].split(',')[0].split('@')[1] ?? '') : '';
}

/** True when the apply path is a DIFFERENT, deeper path than the source listing path. */
function isDistinctApplyPath(applyUrl: string, sourceUrl: string): boolean {
  try {
    const a = new URL(applyUrl);
    const s = new URL(sourceUrl);
    const aPath = a.pathname.replace(/\/+$/, '');
    const sPath = s.pathname.replace(/\/+$/, '');
    if (aPath !== sPath) return true;
    // same path but an action-looking query (e.g. ?action=apply)
    return /apply/i.test(a.search);
  } catch {
    return false;
  }
}

export interface ApplyResolution {
  applyUrl: string | null;
  applyUrlType: ApplyUrlType;
  confidence: number;
  evidence: string;
}

export interface ApplyResolverInput {
  applyUrl: string | null | undefined;
  sourceUrl?: string | null;
  originalUrl?: string | null;
  /** Role of the source this listing came from (see SOURCE_ROLES). */
  sourceRole?: string | null;
  /** Organization official domains, e.g. ["unicef.org", "jobs.unicef.org"] —
   *  accepts the raw Json value from the Organization record (array or
   *  JSON-encoded string) and ignores anything else. */
  organizationDomains?: unknown;
}

const DOMAINS_DEFAULT_RANK: Record<ApplyUrlType, number> = {
  application_email: 75,
  application_form: 88,
  direct_application: 65,
  source_article_fallback: 20,
  unknown: 0,
};

/**
 * Classify the candidate apply URL for a listing with full context.
 * Returns the same five types as classifyApplyUrl (public pages and the
 * real-destination gate keep working) plus evidence and confidence.
 */
export function resolveApplyDestination(input: ApplyResolverInput): ApplyResolution {
  const raw = String(input.applyUrl ?? '').trim();
  if (!raw) {
    return { applyUrl: null, applyUrlType: 'unknown', confidence: 0, evidence: 'no-destination' };
  }
  const type = classifyApplyUrl(raw, input.sourceUrl, input.originalUrl);
  const applyHost = hostOf(raw);

  const domains = Array.isArray(input.organizationDomains)
    ? input.organizationDomains
    : typeof input.organizationDomains === 'string'
      ? (() => { try { const p = JSON.parse(input.organizationDomains); return Array.isArray(p) ? p : []; } catch { return []; } })()
      : [];
  const officialDomains = domains.map((d) => normalizeDomain(d)).filter(Boolean);
  const isOfficialDomain = officialDomains.some((d) => applyHost === d || applyHost.endsWith(`.${d}`));
  const isOfficialRole = !!input.sourceRole && OFFICIAL_ROLES.has(input.sourceRole);
  const isAts = isKnownAtsHost(applyHost);

  // ── mailto ──────────────────────────────────────────────────────────────────
  if (type === 'application_email') {
    const host = emailHost(raw);
    if (!host) return { applyUrl: raw, applyUrlType: 'unknown', confidence: 0, evidence: 'malformed-email' };
    const root = registrableDomain(host);
    if (BLACKLISTED_DOMAINS.has(root) || BLACKLISTED_DOMAINS.has(host)) {
      return { applyUrl: raw, applyUrlType: 'unknown', confidence: 0, evidence: 'blacklisted-email-rejected' };
    }
    // the source site's own generic mailbox is an aggregator contact, not an employer
    const sourceHost = hostOf(input.sourceUrl) || hostOf(input.originalUrl);
    if (sourceHost && (host === sourceHost || host.endsWith(`.${sourceHost}`))) {
      const genericMailbox = /^(info|webinfo|contact|office|admin|noreply|no-reply|donotreply)@/i.test(raw);
      if (genericMailbox || (input.sourceRole === 'aggregator' || input.sourceRole === 'discovery')) {
        return { applyUrl: raw, applyUrlType: 'unknown', confidence: 0, evidence: 'generic-source-email-rejected' };
      }
    }
    if (officialDomains.length && (host === root || officialDomains.some((d) => host === d || host.endsWith(`.${d}`)))) {
      return { applyUrl: raw, applyUrlType: 'application_email', confidence: 85, evidence: 'employer-email-official-domain' };
    }
    return { applyUrl: raw, applyUrlType: 'application_email', confidence: 75, evidence: 'employer-email-extracted' };
  }

  // ── http(s) ─────────────────────────────────────────────────────────────────
  if (type === 'source_article_fallback') {
    // same host as the source — official sources get the benefit of the doubt
    const sourceHost = hostOf(input.sourceUrl) || hostOf(input.originalUrl);
    if (isOfficialRole || isOfficialDomain) {
      return {
        applyUrl: raw, applyUrlType: 'direct_application', confidence: 92,
        evidence: isOfficialDomain && !isOfficialRole ? 'official-domain-apply-page' : 'official-same-host-apply',
      };
    }
    return { applyUrl: raw, applyUrlType: 'source_article_fallback', confidence: 20, evidence: 'aggregator-same-host-fallback' };
  }

  if (type === 'application_form') {
    return { applyUrl: raw, applyUrlType: 'application_form', confidence: 88, evidence: 'application-form-url' };
  }

  if (type === 'direct_application') {
    if (isAts) {
      return {
        applyUrl: raw, applyUrlType: 'direct_application',
        confidence: isOfficialRole || isOfficialDomain ? 95 : 80,
        evidence: isOfficialRole || isOfficialDomain ? 'official-ats-direct-application' : 'external-ats',
      };
    }
    if (isOfficialDomain) {
      return { applyUrl: raw, applyUrlType: 'direct_application', confidence: 92, evidence: 'official-domain-apply-page' };
    }
    if (FORM_URL_RE.test(raw)) {
      return { applyUrl: raw, applyUrlType: 'application_form', confidence: 88, evidence: 'application-form-url' };
    }
    return { applyUrl: raw, applyUrlType: 'direct_application', confidence: DOMAINS_DEFAULT_RANK.direct_application, evidence: 'unknown-host-direct' };
  }

  return { applyUrl: raw, applyUrlType: type, confidence: 0, evidence: 'unclassifiable' };
}

/**
 * True when a resolution is good enough to render an Apply button — the same
 * gate as isRealApplyLink, kept here for symmetry with the V2 vocabulary.
 */
export function isTrustworthyDestination(res: ApplyResolution, minConfidence = 60): boolean {
  return isRealApplyLink(res.applyUrlType) && res.confidence >= minConfidence;
}
