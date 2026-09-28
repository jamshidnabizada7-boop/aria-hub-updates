import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { getTranslationCounters } from '@/lib/ai/translate-engine';

/**
 * GET /api/admin/content-health
 * Translation coverage, category distribution, deadline health and
 * import-source health — the metrics the ops team needs at a glance.
 */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const in30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

  const [
    total,
    published,
    expired,
    draft,
    pendingSubmissions,
    categories,
    expiring7,
    expiring30,
    noApplyLink,
    sources,
    lastRuns,
    alertSubscribers,
    matcherAlertSubscribers,
    matcherFeedback,
  ] = await Promise.all([
    db.opportunity.count(),
    db.opportunity.count({ where: { status: 'published' } }),
    db.opportunity.count({ where: { status: 'expired' } }),
    db.opportunity.count({ where: { status: 'draft' } }),
    db.opportunitySubmission.count({ where: { status: 'pending' } }),
    db.opportunityCategory.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { order: 'asc' },
    }),
    db.opportunity.count({ where: { deadline: { gte: now, lte: in7 }, status: 'published' } }),
    db.opportunity.count({ where: { deadline: { gte: now, lte: in30 }, status: 'published' } }),
    db.opportunity.count({ where: { applyUrl: null, status: 'published' } }),
    db.importSource.findMany({ select: { id: true, name: true, enabled: true } }),
    // Last 100 runs — deduped in JS (PostgreSQL DISTINCT + ORDER BY on
    // non-selected columns is not portable).
    db.importRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 100,
      select: {
        sourceId: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        found: true,
        imported: true,
        updated: true,
        failed: true,
      },
    }),
    // Email-alert subscribers (lead capture) — status breakdown.
    db.alertSubscriber.groupBy({
      by: ['status'],
      _count: true,
    }),
    db.matcherAlertSubscriber.groupBy({
      by: ['status'],
      _count: true,
    }),
    db.matcherFeedback.groupBy({
      by: ['signal'],
      _count: true,
    }),
  ]);

  // Category distribution counts (published only)
  const categoryCounts = await db.opportunity.groupBy({
    by: ['categoryId'],
    where: { status: 'published' },
    _count: { id: true },
  });
  const countByCategory = new Map(categoryCounts.map((c) => [c.categoryId, c._count.id]));

  // ── Translation coverage ──
  // Legacy quick view: a record is "fully trilingual" when both title and AI
  // summary exist in fa AND ps. Authoritative per-language progress comes
  // from the chunk engine's counters below (faStatus/psStatus + chunks).
  const all = await db.opportunity.findMany({
    where: { status: 'published' },
    select: {
      titleI18n: true,
      aiSummaryI18n: true,
      categoryId: true,
      country: true,
      deadline: true,
      eligibility: true,
      educationReq: true,
      experience: true,
      requirements: true,
      extractedData: true,
      sourceName: true,
      lastChecked: true,
      matchProfile: { select: { id: true, reviewed: true } },
    },
  });
  let trilingual = 0;
  let partial = 0;
  let englishOnly = 0;
  let matchableCore = 0;
  let eligibilityRich = 0;
  let weakMatchData = 0;
  let freshVerified = 0;
  let normalizedProfiles = 0;
  let reviewedProfiles = 0;
  for (const o of all) {
    const title = (o.titleI18n ?? {}) as Record<string, unknown>;
    const summary = (o.aiSummaryI18n ?? {}) as Record<string, unknown>;
    const has = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
    const faOk = has(title.fa) || has(summary.fa);
    const psOk = has(title.ps) || has(summary.ps);
    if (faOk && psOk) trilingual++;
    else if (faOk || psOk) partial++;
    else englishOnly++;

    const hasText = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
    const hasExtracted =
      !!o.extractedData &&
      typeof o.extractedData === 'object' &&
      Object.keys(o.extractedData as Record<string, unknown>).length > 0;
    const core = !!o.categoryId && hasText(o.country);
    const eligibilitySignals = [
      hasText(o.eligibility),
      hasText(o.educationReq),
      hasText(o.experience),
      hasText(o.requirements),
      hasExtracted,
    ].filter(Boolean).length;

    if (core) matchableCore++;
    if (eligibilitySignals >= 3) eligibilityRich++;
    if (!core || eligibilitySignals === 0) weakMatchData++;
    if (
      o.sourceName &&
      o.lastChecked &&
      Date.now() - o.lastChecked.getTime() <= 30 * 86_400_000
    ) {
      freshVerified++;
    }
    if (o.matchProfile) {
      normalizedProfiles++;
      if (o.matchProfile.reviewed) reviewedProfiles++;
    }
  }

  // Chunk-engine truth: Persian-first progress + staged-chunk health.
  const engineCounters = await getTranslationCounters().catch(() => null);

  const lastRunBySource = new Map<string, (typeof lastRuns)[number]>();
  for (const run of lastRuns) {
    if (!lastRunBySource.has(run.sourceId)) lastRunBySource.set(run.sourceId, run);
  }
  const sourceHealth = sources.map((s) => {
    const run = lastRunBySource.get(s.id);
    return {
      id: s.id,
      name: s.name,
      enabled: s.enabled,
      lastRun: run
        ? {
            status: run.status,
            startedAt: run.startedAt,
            finishedAt: run.finishedAt,
            found: run.found,
            imported: run.imported,
            updated: run.updated,
            failed: run.failed,
          }
        : null,
    };
  });

  return NextResponse.json({
    opportunities: { total, published, expired, draft },
    translation: { trilingual, partial, englishOnly, publishedTotal: all.length, engine: engineCounters },
    matchability: {
      publishedTotal: all.length,
      coreReady: matchableCore,
      eligibilityRich,
      weakData: weakMatchData,
      freshVerified,
      normalizedProfiles,
      reviewedProfiles,
    },
    deadlines: { expiring7, expiring30, noApplyLink },
    submissions: { pending: pendingSubmissions },
    alerts: {
      pending: alertSubscribers.find((g) => g.status === 'pending')?._count ?? 0,
      active: alertSubscribers.find((g) => g.status === 'active')?._count ?? 0,
      unsubscribed: alertSubscribers.find((g) => g.status === 'unsubscribed')?._count ?? 0,
    },
    matcherProduct: {
      alertPending: matcherAlertSubscribers.find((g) => g.status === 'pending')?._count ?? 0,
      alertActive: matcherAlertSubscribers.find((g) => g.status === 'active')?._count ?? 0,
      alertUnsubscribed: matcherAlertSubscribers.find((g) => g.status === 'unsubscribed')?._count ?? 0,
      helpful: matcherFeedback.find((g) => g.signal === 'helpful')?._count ?? 0,
      notRelevant: matcherFeedback.find((g) => g.signal === 'not_relevant')?._count ?? 0,
    },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      count: countByCategory.get(c.id) ?? 0,
    })),
    sources: sourceHealth,
  });
}
