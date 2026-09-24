import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { getState, patchState } from '@/lib/social/publisher';
import {
  createCampaignForQueueRow,
  matchGroupsForQueueRow,
  refreshCampaignStatus,
} from '@/lib/facebook-group-distribution';

export const dynamic = 'force-dynamic';

const WRITE_ROLES = new Set(['super_admin', 'admin', 'content_manager']);

function csv(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((x) => x.trim()).filter(Boolean);
  return String(v ?? '').split(',').map((x) => x.trim()).filter(Boolean);
}

function slug(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function audit(adminId: string, action: string, entity: string, entityId?: string, details?: unknown) {
  await db.auditLog.create({
    data: {
      userId: adminId,
      action,
      entity,
      entityId: entityId ?? null,
      details: details ? JSON.stringify(details).slice(0, 4000) : null,
    },
  }).catch(() => undefined);
}

async function requireWriteAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (!WRITE_ROLES.has(admin.role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { admin };
}

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [state, groups, rules, campaigns, jobs, queue] = await Promise.all([
    getState(),
    db.facebookGroup.findMany({
      include: { tagLinks: { include: { tag: true } } },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      take: 200,
    }),
    db.facebookGroupDistributionRule.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    }),
    db.facebookGroupCampaign.findMany({
      include: { _count: { select: { jobs: true } } },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    db.facebookGroupDistributionJob.findMany({
      include: {
        group: { select: { id: true, name: true, url: true, approvalRequired: true } },
        campaign: { select: { id: true, sourceContentRef: true, sourceQueueId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    }),
    db.socialPostQueue.findMany({
      where: { scheduledFor: { gte: new Date(Date.now() - 14 * 86400000) } },
      select: {
        id: true,
        scheduledFor: true,
        templateType: true,
        contentRef: true,
        captionJson: true,
        imagePaths: true,
        status: true,
        facebookGroupDistribution: true,
        facebookGroupMode: true,
      },
      orderBy: { scheduledFor: 'desc' },
      take: 50,
    }),
  ]);

  const counts = {
    groups: groups.length,
    activeGroups: groups.filter((g) => g.active && g.postingEligible).length,
    pendingReview: jobs.filter((j) => j.status === 'requires_review' || j.status === 'approval_required').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
  };

  return NextResponse.json({
    ok: true,
    platform: {
      transport: 'manual_assist',
      automated: false,
      reason: 'Meta does not currently expose a public Facebook Groups publishing API.',
    },
    controls: {
      enabled: state.facebookGroupsEnabled !== false,
      paused: state.facebookGroupPaused === true,
    },
    counts,
    groups: groups.map((g) => ({
      ...g,
      tags: g.tagLinks.map((x) => ({ id: x.tag.id, name: x.tag.name, slug: x.tag.slug })),
      tagLinks: undefined,
    })),
    rules,
    campaigns,
    jobs,
    queue,
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireWriteAdmin();
  if ('error' in gate) return gate.error;
  const admin = gate.admin;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const action = String(body.action || '');
  try {
    switch (action) {
      case 'save-group': {
        const id = body.id ? String(body.id) : null;
        const name = String(body.name || '').trim();
        const url = String(body.url || '').trim();
        if (!name || !/^https?:\/\//i.test(url)) {
          return NextResponse.json({ error: 'name_and_valid_url_required' }, { status: 400 });
        }
        const tagNames = csv(body.tags).slice(0, 30);
        const data = {
          name,
          url,
          groupId: String(body.groupId || '').trim() || null,
          language: String(body.language || '').trim() || null,
          audience: String(body.audience || '').trim() || null,
          region: String(body.region || '').trim() || null,
          active: body.active === undefined ? true : Boolean(body.active),
          postingEligible: body.postingEligible === undefined ? true : Boolean(body.postingEligible),
          approvalRequired: Boolean(body.approvalRequired),
          notes: String(body.notes || '').trim() || null,
        };
        const group = id
          ? await db.facebookGroup.update({ where: { id }, data })
          : await db.facebookGroup.create({ data });

        await db.facebookGroupTagLink.deleteMany({ where: { groupId: group.id } });
        for (const tagName of tagNames) {
          const tagSlug = slug(tagName);
          if (!tagSlug) continue;
          const tag = await db.facebookGroupTag.upsert({
            where: { slug: tagSlug },
            create: { name: tagName, slug: tagSlug },
            update: { name: tagName },
          });
          await db.facebookGroupTagLink.create({ data: { groupId: group.id, tagId: tag.id } }).catch(() => undefined);
        }
        await audit(admin.id, id ? 'facebook_group.update' : 'facebook_group.create', 'FacebookGroup', group.id, { name, tags: tagNames });
        return NextResponse.json({ ok: true, group });
      }

      case 'remove-group': {
        const id = String(body.id || '');
        const used = await db.facebookGroupDistributionJob.count({ where: { groupId: id } });
        if (used > 0) {
          const group = await db.facebookGroup.update({
            where: { id },
            data: { active: false, postingEligible: false },
          });
          await audit(admin.id, 'facebook_group.archive', 'FacebookGroup', id, { reason: 'history_preserved' });
          return NextResponse.json({ ok: true, archived: true, group });
        }
        await db.facebookGroup.delete({ where: { id } });
        await audit(admin.id, 'facebook_group.delete', 'FacebookGroup', id);
        return NextResponse.json({ ok: true, deleted: true });
      }

      case 'save-rule': {
        const id = body.id ? String(body.id) : null;
        const name = String(body.name || '').trim();
        if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });
        const data = {
          name,
          enabled: body.enabled === undefined ? true : Boolean(body.enabled),
          contentKinds: csv(body.contentKinds),
          contentCategories: csv(body.contentCategories),
          includeTags: csv(body.includeTags),
          excludeTags: csv(body.excludeTags),
          languages: csv(body.languages),
          regions: csv(body.regions),
          includeGroupIds: csv(body.includeGroupIds),
          excludeGroupIds: csv(body.excludeGroupIds),
          requireLanguageMatch: Boolean(body.requireLanguageMatch),
          requireRegionMatch: Boolean(body.requireRegionMatch),
          priority: Math.max(-100, Math.min(100, Number(body.priority) || 0)),
        };
        const rule = id
          ? await db.facebookGroupDistributionRule.update({ where: { id }, data })
          : await db.facebookGroupDistributionRule.create({ data });
        await audit(admin.id, id ? 'facebook_group_rule.update' : 'facebook_group_rule.create', 'FacebookGroupDistributionRule', rule.id, data);
        return NextResponse.json({ ok: true, rule });
      }

      case 'remove-rule': {
        const id = String(body.id || '');
        await db.facebookGroupDistributionRule.delete({ where: { id } });
        await audit(admin.id, 'facebook_group_rule.delete', 'FacebookGroupDistributionRule', id);
        return NextResponse.json({ ok: true });
      }

      case 'preview-match': {
        const queueId = String(body.queueId || '');
        const row = await db.socialPostQueue.findUnique({ where: { id: queueId } });
        if (!row) return NextResponse.json({ error: 'queue_row_not_found' }, { status: 404 });
        const matches = await matchGroupsForQueueRow(row);
        return NextResponse.json({ ok: true, matches });
      }

      case 'enable-distribution': {
        const queueId = String(body.queueId || '');
        const enabled = body.enabled !== false;
        const mode = body.mode === 'manual' ? 'manual' : 'auto';
        const row = await db.socialPostQueue.update({
          where: { id: queueId },
          data: { facebookGroupDistribution: enabled, facebookGroupMode: mode },
        });
        let campaign = null;
        if (enabled && mode === 'auto') {
          campaign = await createCampaignForQueueRow(queueId, { adminId: admin.id, selectionMode: 'auto' });
        }
        await audit(admin.id, 'facebook_group_distribution.toggle', 'SocialPostQueue', queueId, { enabled, mode });
        return NextResponse.json({ ok: true, row, campaign });
      }

      case 'create-campaign': {
        const queueId = String(body.queueId || '');
        const groupIds = csv(body.groupIds);
        const result = await createCampaignForQueueRow(queueId, {
          adminId: admin.id,
          selectionMode: groupIds.length ? 'manual' : 'auto',
          manualGroupIds: groupIds,
        });
        await audit(admin.id, 'facebook_group_campaign.create', 'FacebookGroupCampaign', result.campaign.id, {
          queueId,
          matched: result.matches.length,
        });
        return NextResponse.json({ ok: true, ...result });
      }

      case 'job-action': {
        const id = String(body.id || '');
        const op = String(body.op || '');
        const job = await db.facebookGroupDistributionJob.findUnique({
          where: { id },
          include: { group: true },
        });
        if (!job) return NextResponse.json({ error: 'job_not_found' }, { status: 404 });

        const now = new Date();
        let data: Prisma.FacebookGroupDistributionJobUpdateInput;
        if (op === 'complete') {
          data = {
            status: 'completed',
            completedAt: now,
            lastAttemptAt: now,
            attemptCount: { increment: 1 },
            errorType: null,
            errorMessage: null,
            externalReference: String(body.externalReference || '').trim() || null,
          };
          await db.facebookGroup.update({
            where: { id: job.groupId },
            data: { lastSuccessfulDistribution: now, lastError: null },
          });
        } else if (op === 'fail') {
          const message = String(body.errorMessage || 'Manual distribution failed').slice(0, 500);
          data = {
            status: 'failed',
            lastAttemptAt: now,
            attemptCount: { increment: 1 },
            errorType: 'manual_failure',
            errorMessage: message,
            retryable: true,
            suggestedAction: 'Review the group restrictions and retry manually if appropriate.',
          };
          await db.facebookGroup.update({
            where: { id: job.groupId },
            data: { lastFailure: now, lastError: message },
          });
        } else if (op === 'pause') {
          data = { status: 'paused' };
        } else if (op === 'resume' || op === 'retry') {
          data = {
            status: job.group.approvalRequired ? 'approval_required' : 'requires_review',
            errorType: null,
            errorMessage: null,
            retryable: false,
          };
        } else if (op === 'cancel') {
          data = { status: 'cancelled' };
        } else if (op === 'open') {
          data = { status: 'processing', lastAttemptAt: now, attemptCount: { increment: 1 } };
        } else {
          return NextResponse.json({ error: 'invalid_job_action' }, { status: 400 });
        }

        const updated = await db.facebookGroupDistributionJob.update({ where: { id }, data });
        await refreshCampaignStatus(job.campaignId);
        await audit(admin.id, `facebook_group_job.${op}`, 'FacebookGroupDistributionJob', id, { groupId: job.groupId });
        return NextResponse.json({ ok: true, job: updated });
      }

      case 'set-emergency-control': {
        const control = String(body.control || '');
        if (control === 'pause-all') {
          await patchState({ facebookGroupPaused: true });
          await db.facebookGroupDistributionJob.updateMany({
            where: { status: { in: ['pending', 'queued', 'requires_review', 'approval_required'] } },
            data: { status: 'paused' },
          });
        } else if (control === 'resume-all') {
          await patchState({ facebookGroupPaused: false, facebookGroupsEnabled: true });
          await db.facebookGroupDistributionJob.updateMany({
            where: { status: 'paused' },
            data: { status: 'requires_review' },
          });
        } else if (control === 'cancel-pending') {
          await db.facebookGroupDistributionJob.updateMany({
            where: { status: { in: ['pending', 'queued', 'requires_review', 'approval_required', 'paused'] } },
            data: { status: 'cancelled' },
          });
        } else if (control === 'retry-failed') {
          await db.facebookGroupDistributionJob.updateMany({
            where: { status: 'failed' },
            data: { status: 'requires_review', errorType: null, errorMessage: null, retryable: false },
          });
        } else if (control === 'disable-groups') {
          await patchState({ facebookGroupsEnabled: false, facebookGroupPaused: true });
          await db.facebookGroupDistributionJob.updateMany({
            where: { status: { in: ['pending', 'queued', 'requires_review', 'approval_required'] } },
            data: { status: 'paused' },
          });
        } else {
          return NextResponse.json({ error: 'invalid_control' }, { status: 400 });
        }
        await audit(admin.id, `facebook_group_control.${control}`, 'AutomationState');
        return NextResponse.json({ ok: true, state: await getState() });
      }

      default:
        return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
    }
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
