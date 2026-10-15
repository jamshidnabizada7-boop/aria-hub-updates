/** Source-only maintenance. Dry preview -> immutable plan -> guarded application. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as cheerio from 'cheerio';
import { db } from '../src/lib/db';
import { JobsAfScraper } from '../src/lib/import/scrapers/jobs-af';
import { WazifahaScraper } from '../src/lib/import/scrapers/wazifaha';
import { WpApiScraper, afghanEligibilityEvidence } from '../src/lib/import/scrapers/wp-api';
import { classifyOpportunityApplyUrl, classifyApplyUrl, isRealApplyLink } from '../src/lib/apply';
import { preserveRepairsAndTranslations } from '../src/lib/import/preserve-repairs';
import type { RawListing, ScrapePage, SourceHandle } from '../src/lib/import/types';
import type { Prisma } from '@prisma/client';

const root = '/opt/aria-hub/private/source-destination-repair';
const applyPath = process.argv.find(a => a.startsWith('--apply-plan='))?.slice(13);
const onlyIds = process.argv.find(a => a.startsWith('--ids='))?.slice(6).split(',').filter(Boolean);
const plans: Array<{ id: string; updatedAt: string; before: Record<string, unknown>; data: Record<string, unknown>; sourceUrl: string }> = [];
const skipped: Array<{ id: string; reason: string }> = [];
const norm = (v: string) => v.replace(/\s+/g, ' ').trim();
// Individually checked organizer pages. Country is the programme host, not nationality.
const reviewedHosts: Record<string, { url: string; programme: string; quote: string; country: string }> = {
  'maria-rosario-lazzati-niada-scholarship-for-afghan-women-2027-2028': { url: 'https://www.graduateinstitute.ch/afghan-scholarships', programme: 'Successful applicants will enrol in a two-year master programme from the Geneva Graduate Institute.', quote: 'CH - 1211 Geneva 1, Switzerland', country: 'Switzerland' },
  'cees-fellowship-program-2027': { url: 'https://www.cees.uzh.ch/de/CEES-Fellowship-Program.html', programme: 'four-month (one semester) residential fellowship', quote: 'contemporary Russian, Eastern European and Eurasian studies in Switzerland', country: 'Switzerland' },
  'jean-monnet-fellowship-2027-2028': { url: 'https://www.eui.eu/apply?id=jean-monnet-fellowships', programme: 'Jean Monnet Fellows are based at the Robert Schuman Centre', quote: 'I-50014 San Domenico di Fiesole (FI) - Italy', country: 'Italy' },
};

try {
  const database = new URL(process.env.DATABASE_URL || 'http://invalid');
  if (!['127.0.0.1', 'localhost'].includes(database.hostname) || database.port !== '5450') throw new Error('Requires the existing local Oracle database');
  await mkdir(root, { recursive: true, mode: 0o700 });
  if (applyPath) {
    if (!applyPath.startsWith(`${root}/plan-`) || applyPath.includes('..')) throw new Error('Unexpected plan path');
    const plan = JSON.parse(await readFile(applyPath, 'utf8'));
    if (plan.version !== 1 || Date.now() - new Date(plan.createdAt).getTime() > 3600000) throw new Error('Plan must be reviewed within one hour');
    const backup = `${root}/before-${Date.now()}.json`;
    await writeFile(backup, JSON.stringify(plan.rows.map((p: { before: unknown }) => p.before)), { flag: 'wx', mode: 0o600 });
    let updated = 0;
    for (const p of plan.rows) {
      await db.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "Opportunity" WHERE id=${p.id} FOR UPDATE`;
        const current = await tx.opportunity.findUniqueOrThrow({ where: { id: p.id } });
        if (current.updatedAt.toISOString() !== p.updatedAt || current.sourceUrl !== p.sourceUrl) throw new Error(`Concurrent update: ${p.id}; stop for review`);
        if (['status', 'deadline', 'slug', 'title', 'description'].some(key => key in p.data)) throw new Error('Plan includes an unsupported field');
        await tx.opportunity.update({ where: { id: p.id }, data: p.data as Prisma.OpportunityUpdateInput });
        await tx.auditLog.create({ data: { action: 'opportunity.source_destination_backfill', entity: 'Opportunity', entityId: p.id, details: JSON.stringify({ sourceUrl: p.sourceUrl, fields: Object.keys(p.data), backup }) } });
      });
      updated++;
    }
    console.log(JSON.stringify({ updated, backup, publicationStatusUnchanged: true }));
  } else {
    const sources = await db.importSource.findMany({ where: { OR: [{ scraperKey: 'jobsaf' }, { scraperKey: 'wazifaha' }, { baseUrl: 'https://opportunitydesk.org' }] } });
    for (const source of sources) {
      const handle: SourceHandle = { ...source, config: { ...JSON.parse(source.config || '{}'), publicApiOnly: true } };
      const scraper = source.scraperKey === 'jobsaf' ? new JobsAfScraper(handle) : source.scraperKey === 'wazifaha' ? new WazifahaScraper(handle) : new WpApiScraper(handle);
      const rows = await db.opportunity.findMany({ where: { sourceName: source.name, status: { in: ['published', 'draft'] }, ...(onlyIds ? { id: { in: onlyIds } } : {}) }, orderBy: { id: 'asc' } });
      if (!rows.length) continue;
      let wpListings: RawListing[] = [];
      if (scraper instanceof WpApiScraper) {
        // Bulk public API reads; only exact existing rows can become a plan.
        for (let page = 1; page <= 5; page++) {
          const url = `https://opportunitydesk.org/wp-json/wp/v2/posts?per_page=100&page=${page}&_embed=1`;
          try {
            const body = await scraper.fetchText(url, { retries: 0, timeoutMs: 15000, crawlDelayMs: 500 });
            const parsed = await (scraper as unknown as { parseListPage: (body: string, url: string) => Promise<ScrapePage> }).parseListPage(body, url);
            wpListings.push(...parsed.listings);
            if (rows.every(row => wpListings.some(l => l.sourceUrl === row.sourceUrl)) || JSON.parse(body).length < 100) break;
          } catch { break; }
        }
        for (const row of rows.filter(row => !wpListings.some(l => l.sourceUrl === row.sourceUrl))) {
          const slug = new URL(row.sourceUrl || '').pathname.split('/').filter(Boolean).at(-1);
          try {
            const body = await scraper.fetchText(`https://opportunitydesk.org/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug || '')}&_embed=1`, { retries: 0, timeoutMs: 12000, crawlDelayMs: 250 });
            const parsed = await (scraper as unknown as { parseListPage: (body: string, url: string) => Promise<ScrapePage> }).parseListPage(body, row.sourceUrl || '');
            wpListings.push(...parsed.listings);
          } catch { skipped.push({ id: row.id, reason: 'Original source unavailable' }); }
        }
      }
      for (const row of rows) {
        if (!(scraper instanceof WpApiScraper) && isRealApplyLink(classifyOpportunityApplyUrl(row))) continue;
        try {
          const sourceUrl = row.sourceUrl || '';
          if (new URL(sourceUrl).hostname.replace(/^www\./, '') !== new URL(source.baseUrl).hostname.replace(/^www\./, '')) throw new Error('Unexpected source host');
          const listing = scraper instanceof WpApiScraper ? wpListings.find(l => l.sourceUrl === sourceUrl) : await scraper.parseDetail({ title: row.title, sourceUrl, originalUrl: row.originalUrl, sourceName: source.name });
          if (!listing) { skipped.push({ id: row.id, reason: 'Source article unavailable' }); continue; }
          const relevant = scraper instanceof WpApiScraper ? afghanEligibilityEvidence(listing.eligibility) : null;
          if (scraper instanceof WpApiScraper && !relevant) { skipped.push({ id: row.id, reason: 'No explicit Afghan/worldwide eligibility; no speculative changes' }); continue; }
          const logs = await db.auditLog.findMany({ where: { entityId: row.id, action: 'opportunity.source_repair' }, select: { details: true } });
          const protectedFields = [...new Set(logs.flatMap(l => { try { return Object.keys(JSON.parse(l.details || '{}').patch || {}); } catch { return []; } }))];
          const data: Record<string, unknown> = {};
          let hostEvidence: Record<string, unknown> | null = null;
          const reviewedHost = reviewedHosts[new URL(sourceUrl).pathname.split('/').filter(Boolean).at(-1) || ''];
          if (relevant && !row.country && reviewedHost) {
            try {
              const response = await fetch(reviewedHost.url, { signal: AbortSignal.timeout(15000) });
              if (!response.ok) throw new Error('Organizer unavailable');
              const $ = cheerio.load(await response.text()); $('script,style').remove();
              const text = norm($.root().text());
              if (text.includes(reviewedHost.quote) && text.includes(reviewedHost.programme)) {
                data.country = reviewedHost.country;
                hostEvidence = { ...reviewedHost, verifiedAt: new Date().toISOString() };
              }
            } catch { /* Retain unknown country when primary evidence cannot be checked. */ }
          }
          if (!isRealApplyLink(classifyOpportunityApplyUrl(row)) && listing.applyUrl && isRealApplyLink(classifyApplyUrl(listing.applyUrl, sourceUrl, row.originalUrl)) && !protectedFields.includes('applyUrl')) {
            data.applyUrl = listing.applyUrl; data.applyUrlType = classifyApplyUrl(listing.applyUrl, sourceUrl, row.originalUrl);
            data.applyUrlEvidence = `source-explicit-destination:${sourceUrl}`; data.applyConfidence = 95; data.applyVerifiedAt = new Date().toISOString();
          }
          for (const field of ['eligibility', 'requirements', 'guidelines', 'benefits', 'educationReq', 'experience', 'country'] as const) {
            const next = listing[field];
            const old = row[field];
            const contaminated = scraper instanceof WpApiScraper && field !== 'country' && old && next &&
              (norm(old).startsWith(norm(next)) || norm(old).startsWith(`Eligibility ${norm(next)}`)) && /\bApplication\b/.test(old.slice(next.length));
            if (next && (!old || contaminated)) data[field] = next;
          }
          if (relevant) {
            const existing = row.extractedData && typeof row.extractedData === 'object' && !Array.isArray(row.extractedData) ? row.extractedData as Record<string, unknown> : {};
            // Existing explicitly reviewed nationality restrictions always win.
            data.extractedData = { ...existing, afghanEligibilityEvidence: { ...relevant, sourceUrl },
              ...(hostEvidence ? { sourceHostCountryEvidence: hostEvidence } : {}),
              ...(!existing.eligibleNationalities ? { eligibleNationalities: relevant.scope === 'afghan' ? ['Afghanistan'] : ['Worldwide'] } : {}) };
          }
          for (const key of ['eligibility', 'requirements', 'guidelines', 'benefits', 'educationReq', 'experience']) if (data[key]) data[`${key}I18n`] = { en: data[key] };
          const merged = preserveRepairsAndTranslations(data, row as unknown as Record<string, unknown>, protectedFields);
          for (const key of Object.keys(merged)) if (JSON.stringify(merged[key]) === JSON.stringify(row[key as keyof typeof row])) delete merged[key];
          if (!Object.keys(merged).length) { skipped.push({ id: row.id, reason: 'No new verified destination or facts exposed by source' }); continue; }
          plans.push({ id: row.id, updatedAt: row.updatedAt.toISOString(), before: row as unknown as Record<string, unknown>, data: merged, sourceUrl });
        } catch (error) { skipped.push({ id: row.id, reason: error instanceof Error ? error.message : 'Source unavailable' }); }
      }
    }
    const path = `${root}/plan-${Date.now()}.json`;
    await writeFile(path, JSON.stringify({ version: 1, createdAt: new Date().toISOString(), rows: plans, skipped }, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ mode: 'dry', path, plans: plans.map(p => ({ id: p.id, source: p.before.sourceName, applyUrl: p.data.applyUrl, fields: Object.keys(p.data) })), skipped }));
  }
} finally { await db.$disconnect(); }
