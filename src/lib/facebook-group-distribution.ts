import { db } from '@/lib/db';

type QueueSnapshot = {
  templateType: string;
  contentRef: string | null;
  contentJson: unknown;
  captionJson: unknown;
};

type MatchReason = {
  type: 'tag' | 'language' | 'region' | 'audience' | 'rule' | 'manual';
  value: string;
};

export type GroupMatch = {
  groupId: string;
  groupName: string;
  groupUrl: string;
  reasons: MatchReason[];
};

function norm(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map(norm).filter(Boolean) : [];
}

function rowMetadata(row: QueueSnapshot) {
  const c = (row.contentJson && typeof row.contentJson === 'object'
    ? row.contentJson
    : {}) as Record<string, unknown>;
  const poster = (c.posterData && typeof c.posterData === 'object'
    ? c.posterData
    : {}) as Record<string, unknown>;
  const categoryObj = (poster.category && typeof poster.category === 'object'
    ? poster.category
    : {}) as Record<string, unknown>;

  const category = norm(categoryObj.name || c.category || row.templateType);
  const country = norm(poster.country || c.country);
  const langs = Object.keys(
    row.captionJson && typeof row.captionJson === 'object'
      ? (row.captionJson as Record<string, unknown>)
      : {},
  ).map(norm);

  const kind = row.templateType === 'spotlight' ? 'opportunity' : norm(row.templateType);
  return { kind, category, country, langs };
}

function ruleApplies(
  rule: {
    contentKinds: string[];
    contentCategories: string[];
    languages: string[];
    regions: string[];
  },
  meta: ReturnType<typeof rowMetadata>,
) {
  const kinds = rule.contentKinds.map(norm);
  const categories = rule.contentCategories.map(norm);
  const languages = rule.languages.map(norm);
  const regions = rule.regions.map(norm);

  if (kinds.length && !kinds.includes(meta.kind)) return false;
  if (categories.length && !categories.some((x) => meta.category.includes(x) || x.includes(meta.category))) return false;
  if (languages.length && !languages.some((x) => meta.langs.includes(x))) return false;
  if (regions.length && meta.country && !regions.some((x) => meta.country.includes(x) || x.includes(meta.country))) return false;
  return true;
}

export async function matchGroupsForQueueRow(row: QueueSnapshot): Promise<GroupMatch[]> {
  const meta = rowMetadata(row);
  const [groups, rules] = await Promise.all([
    db.facebookGroup.findMany({
      where: { active: true, postingEligible: true },
      include: { tagLinks: { include: { tag: true } } },
      orderBy: { name: 'asc' },
    }),
    db.facebookGroupDistributionRule.findMany({
      where: { enabled: true },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    }),
  ]);

  const out: GroupMatch[] = [];
  for (const group of groups) {
    const tagSlugs = group.tagLinks.map((x) => norm(x.tag.slug));
    const tagNames = group.tagLinks.map((x) => norm(x.tag.name));
    const reasons: MatchReason[] = [];
    let included = false;
    let excluded = false;

    for (const rule of rules) {
      if (!ruleApplies(rule, meta)) continue;
      const includeIds = rule.includeGroupIds.map(norm);
      const excludeIds = rule.excludeGroupIds.map(norm);
      const includeTags = rule.includeTags.map(norm);
      const excludeTags = rule.excludeTags.map(norm);

      if (excludeIds.includes(norm(group.id)) || excludeIds.includes(norm(group.groupId))) {
        excluded = true;
        break;
      }
      if (excludeTags.some((t) => tagSlugs.includes(t) || tagNames.includes(t))) {
        excluded = true;
        break;
      }

      const direct = includeIds.includes(norm(group.id)) || includeIds.includes(norm(group.groupId));
      const tagMatch = includeTags.some((t) => tagSlugs.includes(t) || tagNames.includes(t));
      const languageMatch =
        !rule.requireLanguageMatch ||
        !group.language ||
        norm(group.language) === 'any' ||
        meta.langs.includes(norm(group.language));
      const regionMatch =
        !rule.requireRegionMatch ||
        !group.region ||
        !meta.country ||
        meta.country.includes(norm(group.region)) ||
        norm(group.region).includes(meta.country);

      if ((direct || tagMatch || (includeIds.length === 0 && includeTags.length === 0)) && languageMatch && regionMatch) {
        included = true;
        reasons.push({ type: 'rule', value: rule.name });
        if (direct) reasons.push({ type: 'manual', value: 'Included explicitly by rule' });
        for (const t of includeTags.filter((t) => tagSlugs.includes(t) || tagNames.includes(t))) {
          reasons.push({ type: 'tag', value: t });
        }
        if (rule.requireLanguageMatch && group.language) reasons.push({ type: 'language', value: group.language });
        if (rule.requireRegionMatch && group.region) reasons.push({ type: 'region', value: group.region });
      }
    }

    if (!excluded && included) {
      out.push({ groupId: group.id, groupName: group.name, groupUrl: group.url, reasons });
    }
  }
  return out;
}

export async function createCampaignForQueueRow(
  sourceQueueId: string,
  opts?: { adminId?: string | null; manualGroupIds?: string[]; selectionMode?: 'auto' | 'manual' },
) {
  const row = await db.socialPostQueue.findUnique({ where: { id: sourceQueueId } });
  if (!row) throw new Error('queue_row_not_found');

  const selectionMode = opts?.selectionMode ?? (opts?.manualGroupIds?.length ? 'manual' : 'auto');
  let matches: GroupMatch[] = [];

  if (selectionMode === 'manual') {
    const ids = [...new Set(opts?.manualGroupIds ?? [])];
    const groups = await db.facebookGroup.findMany({
      where: { id: { in: ids }, active: true, postingEligible: true },
      orderBy: { name: 'asc' },
    });
    matches = groups.map((g) => ({
      groupId: g.id,
      groupName: g.name,
      groupUrl: g.url,
      reasons: [{ type: 'manual', value: 'Selected manually by administrator' }],
    }));
  } else {
    matches = await matchGroupsForQueueRow(row);
  }

  const autoSourceKey = selectionMode === 'auto' ? `queue:${row.id}` : null;
  const campaign = await db.facebookGroupCampaign.upsert({
    where: { autoSourceKey: autoSourceKey ?? `manual-never-match:${row.id}:${Date.now()}` },
    create: {
      sourceQueueId: row.id,
      sourceContentRef: row.contentRef,
      selectionMode,
      transport: 'manual_assist',
      status: matches.length ? 'requires_review' : 'requires_review',
      scheduledFor: row.scheduledFor,
      autoSourceKey,
      createdByAdminId: opts?.adminId ?? null,
      summary: {
        matched: matches.length,
        platform: 'facebook',
        transport: 'manual_assist',
        limitation: 'Meta public Groups publishing API is unavailable',
      },
    },
    update: {
      sourceContentRef: row.contentRef,
      scheduledFor: row.scheduledFor,
      summary: {
        matched: matches.length,
        platform: 'facebook',
        transport: 'manual_assist',
        limitation: 'Meta public Groups publishing API is unavailable',
      },
    },
  });

  for (const match of matches) {
    await db.facebookGroupDistributionJob.upsert({
      where: { sourceQueueId_groupId: { sourceQueueId: row.id, groupId: match.groupId } },
      create: {
        campaignId: campaign.id,
        groupId: match.groupId,
        sourceQueueId: row.id,
        status: 'requires_review',
        transport: 'manual_assist',
        scheduledFor: row.scheduledFor,
        matchReasons: match.reasons,
        retryable: false,
        suggestedAction: 'Open the Facebook Group and publish manually. Mark completed after verifying the post.',
      },
      update: {
        campaignId: campaign.id,
        matchReasons: match.reasons,
        scheduledFor: row.scheduledFor,
      },
    });
  }

  return { campaign, matches };
}

export async function ensureAutoCampaigns(limit = 5): Promise<{ created: number; jobs: number }> {
  const rows = await db.socialPostQueue.findMany({
    where: {
      facebookGroupDistribution: true,
      status: { not: 'cancelled' },
      facebookGroupCampaigns: { none: {} },
    },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  });

  let created = 0;
  let jobs = 0;
  for (const row of rows) {
    const r = await createCampaignForQueueRow(row.id, { selectionMode: 'auto' });
    created++;
    jobs += r.matches.length;
  }
  return { created, jobs };
}

export async function refreshCampaignStatus(campaignId: string) {
  const jobs = await db.facebookGroupDistributionJob.findMany({ where: { campaignId } });
  const statuses = jobs.map((j) => j.status);
  let status = 'requires_review';
  let completedAt: Date | null = null;

  if (statuses.length && statuses.every((s) => s === 'completed' || s === 'cancelled')) {
    status = 'completed';
    completedAt = new Date();
  } else if (statuses.some((s) => s === 'failed')) {
    status = 'partial';
  } else if (statuses.some((s) => s === 'processing')) {
    status = 'processing';
  } else if (statuses.some((s) => s === 'queued' || s === 'pending')) {
    status = 'queued';
  } else if (statuses.some((s) => s === 'paused')) {
    status = 'paused';
  }

  return db.facebookGroupCampaign.update({
    where: { id: campaignId },
    data: { status, completedAt },
  });
}
