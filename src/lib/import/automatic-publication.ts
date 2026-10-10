import type { PrismaClient } from '@prisma/client';
import { isSafePublicUrl } from '../security/url-guard';
import { EXPLICIT_CLOSED_STATUSES } from './freshness';

export interface PublicationSource {
  id: string; name: string; baseUrl: string; enabled: boolean; autoPublish: boolean;
  healthStatus: string;
}
export interface PublicationCandidate {
  status: string; title: string; description: string; sourceName: string | null;
  sourceUrl: string | null; importStatus: string | null; deadline: Date | null;
  applyUrl: string | null; applyUrlType: string | null; guidelines?: string | null;
  requirements?: string | null; responsibilities?: string | null; eligibility?: string | null;
  verificationStatus?: string | null; extractedData?: unknown;
}
export type PublicationDecision = { action: 'publish' | 'expire' | 'hold'; reasons: string[] };

function plain(value: string | null | undefined): string {
  return (value || '').replace(/<[^>]*>/g, ' ').replace(/&(?:#\d+|#x[\da-f]+|\w+);/gi, ' ').replace(/\s+/g, ' ').trim();
}
function sameSourceHost(sourceUrl: string, baseUrl: string): boolean {
  try {
    const host = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, '');
    const base = new URL(baseUrl).hostname.toLowerCase().replace(/^www\./, '');
    return host === base || host.endsWith('.' + base);
  } catch { return false; }
}
function safeApplication(url: string | null): boolean {
  if (/^mailto:/i.test(url || '')) {
    // A mailto scheme alone is not proof of a valid email recipient.
    return /^mailto:[^\s@,?]+@[^\s@,?]+\.[a-z]{2,}(?:\?[^\r\n]*)?$/i.test(url!);
  }
  return isSafePublicUrl(url);
}

/** Source autoPublish is explicit authorization; quality checks run per record.
 * Translation runs independently: the public page can show original content
 * while its localized versions are queued. No verification badge is invented.
 */
export function evaluateImportedDraftPublication(
  row: PublicationCandidate, source: PublicationSource | undefined,
  manualHold = false, now = new Date(), pendingMatchReview = false,
): PublicationDecision {
  const reasons: string[] = [];
  if (row.status !== 'draft') reasons.push('not_draft');
  if (manualHold) reasons.push('manual_hold');
  if (!source || !source.enabled || !source.autoPublish) reasons.push('source_not_automatic');
  if (!row.sourceName || row.sourceName !== source?.name || !['imported', 'updated'].includes(row.importStatus || '')) reasons.push('not_imported');
  if (reasons.length) return { action: 'hold', reasons };
  const facts = row.extractedData && typeof row.extractedData === 'object' && !Array.isArray(row.extractedData)
    ? row.extractedData as Record<string, unknown> : {};
  // Public listings treat a date-only deadline as open through that UTC day.
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if ((row.deadline && row.deadline.getTime() < today) || EXPLICIT_CLOSED_STATUSES.has(String(facts.listingStatus || '').toLowerCase())) {
    return { action: 'expire', reasons: ['expired_or_closed'] };
  }
  if (source!.healthStatus !== 'healthy') reasons.push('source_unhealthy');
  if (!isSafePublicUrl(row.sourceUrl) || !sameSourceHost(row.sourceUrl || '', source!.baseUrl)) reasons.push('invalid_source_url');
  const title = plain(row.title);
  if (title.length < 3 || /^https?:\/\//i.test(title) || /<[^>]+>|&(?:amp|quot|#\d+);/i.test(row.title) ||
      /just a moment|one moment,? please|attention required|access denied|captcha|enable javascript and cookies/i.test(title)) reasons.push('invalid_title');
  const body = [row.description, row.requirements, row.responsibilities, row.eligibility, row.guidelines].map(plain).join(' ').trim();
  if (body.length < 150 || plain(row.description).length < 30 ||
      /^(just a moment|access denied|attention required|please enable javascript)/i.test(plain(row.description))) reasons.push('incomplete_content');
  if (row.deadline && Number.isNaN(row.deadline.getTime())) reasons.push('invalid_deadline');
  if (row.verificationStatus === 'needs_review' || pendingMatchReview || facts.duplicateOf) reasons.push('match_review');
  const realApply = ['application_email', 'application_form', 'direct_application'].includes(row.applyUrlType || '') && safeApplication(row.applyUrl);
  // Fallback articles may publish only with usable application instructions.
  // The public UI renders guidance instead of a misleading Apply button.
  const guidance = row.applyUrlType === 'source_article_fallback' && safeApplication(row.applyUrl) && plain(row.guidelines).length >= 80;
  if (!realApply && !guidance) reasons.push('missing_application_route');
  return { action: reasons.length ? 'hold' : 'publish', reasons };
}

export async function reconcileImportedDrafts(db: PrismaClient, options: {
  dryRun?: boolean; limit?: number; cursor?: string; ids?: string[];
} = {}) {
  const limit = Math.max(1, Math.min(500, options.limit || 500));
  const sources = await db.importSource.findMany({
    where: { enabled: true, type: { in: ['job', 'scholarship', 'fellowship', 'training'] } },
    select: { id: true, name: true, baseUrl: true, enabled: true, autoPublish: true, healthStatus: true },
  });
  const rows = await db.opportunity.findMany({
    where: { status: 'draft', sourceName: { in: sources.map(s => s.name) }, ...(options.ids ? { id: { in: options.ids } } : {}) },
    orderBy: { id: 'asc' }, take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    include: { sourceObservations: { select: { rawData: true } } },
  });
  const hasMore = rows.length > limit;
  const batch = rows.slice(0, limit);
  const holds = await db.auditLog.findMany({
    where: { entity: 'opportunity', action: 'opportunity.manual-draft', entityId: { in: batch.map(r => r.id) } },
    select: { entityId: true },
  });
  const held = new Set(holds.map(h => h.entityId));
  const decisions: Array<{ id: string; slug: string; action: string; reasons: string[] }> = [];
  let published = 0, expired = 0, changedElsewhere = 0;
  for (const row of batch) {
    const source = sources.find(s => s.name === row.sourceName);
    const pendingReview = row.sourceObservations.some(o => {
      const raw = o.rawData as Record<string, unknown> | null;
      return !!raw?.matchReview && !raw?.matchReviewResolved;
    });
    const decision = evaluateImportedDraftPublication(row, source, held.has(row.id), new Date(), pendingReview);
    decisions.push({ id: row.id, slug: row.slug, ...decision });
    if (decision.action === 'hold' || options.dryRun) continue;
    const changed = await db.$transaction(async tx => {
      // Recheck authorization, then compare-and-set the reviewed snapshot.
      // A concurrent admin/source edit must win over a stale worker decision.
      const currentSource = await tx.importSource.findUnique({ where: { id: source!.id } });
      if (!currentSource || evaluateImportedDraftPublication(row, currentSource, false, new Date(), pendingReview).action !== decision.action) return 0;
      if (await tx.auditLog.findFirst({ where: { entity: 'opportunity', entityId: row.id, action: 'opportunity.manual-draft' } })) return 0;
      const result = await tx.opportunity.updateMany({
        where: { id: row.id, status: 'draft', updatedAt: row.updatedAt, sourceName: source!.name },
        data: { status: decision.action === 'publish' ? 'published' : 'expired' },
      });
      if (result.count) await tx.auditLog.create({ data: {
        entity: 'opportunity', entityId: row.id, action: 'opportunity.automatic-publication',
        details: JSON.stringify({ from: 'draft', to: decision.action === 'publish' ? 'published' : 'expired', sourceId: source!.id, policy: 'source-quality-v1', reasons: decision.reasons }),
      } });
      return result.count;
    });
    if (!changed) changedElsewhere++;
    else if (decision.action === 'publish') published++;
    else expired++;
  }
  return { checked: batch.length, published, expired, held: decisions.filter(d => d.action === 'hold').length,
    changedElsewhere, dryRun: !!options.dryRun, nextCursor: hasMore ? batch.at(-1)?.id : undefined, decisions };
}
