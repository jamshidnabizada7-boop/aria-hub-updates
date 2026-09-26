import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export interface StudioDesignInput {
  contentRef: string; forDate: string; templateType: string;
  themeId?: string; layout?: string; size?: string;
  overrides?: Record<string, unknown>; captionOverride?: Record<string, string>;
}

export async function saveStudioDesign(
  design: StudioDesignInput,
  contentJson: object,
  captionJson: object,
  ensureRow: boolean,
) {
  return db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(742194)');
    const saved = await tx.studioDesign.upsert({
      where: { contentRef_forDate: { contentRef: design.contentRef, forDate: design.forDate } },
      create: design as Prisma.StudioDesignCreateInput,
      update: design as Prisma.StudioDesignUpdateInput,
    });
    const isOpportunity = ['spotlight', 'deadline'].includes(design.templateType);
    const prefix = design.templateType + '-';
    const contentRef = isOpportunity && design.contentRef.startsWith(prefix)
      ? design.contentRef.slice(prefix.length) : design.contentRef;
    const dayStart = new Date(design.forDate + 'T00:00:00.000Z');
    dayStart.setUTCMinutes(dayStart.getUTCMinutes() - 270);
    const existing = await tx.socialPostQueue.findFirst({
      where: { contentRef: { in: [contentRef, design.contentRef] }, scheduledFor: { gte: dayStart, lt: new Date(dayStart.getTime() + 86400000) } },
      orderBy: { scheduledFor: 'asc' },
      include: { _count: { select: { deliveries: { where: { attempts: { gt: 0 } } } } } },
    });
    if (existing && (['rendering', 'publishing', 'published', 'partial', 'blocked', 'cancelled'].includes(existing.status) || existing._count.deliveries > 0)) {
      if (ensureRow) throw new Error('Post already claimed or attempted; reconcile its deliveries before editing');
      return { design: saved, row: null, created: false };
    }
    const data = {
      templateType: design.templateType,
      contentRef,
      contentJson: { ...contentJson, ...(isOpportunity ? { sourceSlug: contentRef } : {}) },
      captionJson,
      status: 'pending',
      imageStatus: 'none',
      imagePaths: Prisma.DbNull,
      renderAttempts: 0,
      nextRenderAttemptAt: null,
      error: null,
      ...(ensureRow ? { requiresManualPublish: true } : {}),
    };
    if (existing) {
      // The status condition protects against a render/publish claim that
      // started after the snapshot; never replace media being sent.
      const changed = await tx.socialPostQueue.updateMany({
        where: { id: existing.id, status: { in: ['pending', 'ready', 'failed'] }, updatedAt: existing.updatedAt },
        data,
      });
      if (!changed.count) throw new Error('Post is being processed; retry the edit after it finishes');
      const row = await tx.socialPostQueue.findUniqueOrThrow({ where: { id: existing.id } });
      return { design: saved, row, created: false };
    }
    if (!ensureRow) return { design: saved, row: null, created: false };
    const row = await tx.socialPostQueue.create({ data: { ...data, requiresManualPublish: true, scheduledFor: new Date() } });
    return { design: saved, row, created: true };
  });
}
