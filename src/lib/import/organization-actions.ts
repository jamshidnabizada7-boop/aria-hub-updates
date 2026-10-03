/**
 * Organization admin actions (Phase 11) — manage organizations and their
 * official sources without touching the database by hand.
 *
 *   listOrganizations   → rows with active-job counts, source counts and health
 *   updateOrganization  → admin edit of the identity/contact fields
 *   verify/unverify     → the verified badge (never set automatically)
 *   mergeOrganizations  → folds B into A: opportunities, aliases, sources and
 *                         observations re-pointed; B's name survives as an
 *                         alias of A; B is deleted
 *   addOfficialSource   → create an ImportSource owned by the organization
 *   pauseSource/resumeSource → healthStatus paused / healthy (worker skips paused)
 */
import { normalizeOrgName } from '../organizations/normalize';
import { isSafePublicUrl } from '../security/url-guard';

export interface OrgStatsRow {
  id: string;
  name: string;
  slug: string;
  organizationType: string | null;
  website: string | null;
  careersUrl: string | null;
  officialDomains: unknown;
  verified: boolean;
  verificationMethod: string | null;
  verifiedAt: Date | null;
  active: boolean;
  activeJobs: number;
  sourceCount: number;
  pendingMembers: number;
  sources: { id: string; name: string; scraperKey: string; enabled: boolean; healthStatus: string; lastRunAt: Date | null; lastRunStatus: string | null; lastSuccessAt: Date | null }[];
}

type OrgDb = {
  organization: { findMany: (a: any) => Promise<any[]>; findUnique: (a: any) => Promise<any>; update: (a: any) => Promise<any>; delete: (a: any) => Promise<any> };
  organizationAlias: { findMany: (a: any) => Promise<any[]>; findFirst: (a: any) => Promise<any>; updateMany: (a: any) => Promise<any>; update: (a: any) => Promise<any>; delete: (a: any) => Promise<any>; create: (a: any) => Promise<any>; count: (a: any) => Promise<number> };
  organizationMember: { findMany: (a: any) => Promise<any[]>; findUnique: (a: any) => Promise<any>; update: (a: any) => Promise<any>; updateMany: (a: any) => Promise<any> };
  user: { findMany: (a: any) => Promise<any[]> };
  opportunity: { updateMany: (a: any) => Promise<any>; count: (a: any) => Promise<number>; groupBy: (a: any) => Promise<any[]> };
  importSource: { findMany: (a: any) => Promise<any[]>; updateMany: (a: any) => Promise<any>; update: (a: any) => Promise<any>; create: (a: any) => Promise<any>; count: (a: any) => Promise<number> };
  opportunitySourceObservation: { updateMany: (a: any) => Promise<any> };
  auditLog: { create: (a: any) => Promise<any> };
};

/** All organizations with the stats the admin screen shows. */
export async function listOrganizations(db: OrgDb): Promise<OrgStatsRow[]> {
  const orgs = await db.organization.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, slug: true, organizationType: true, website: true,
      careersUrl: true, officialDomains: true, verified: true,
      verificationMethod: true, verifiedAt: true, active: true,
      sources: {
        select: { id: true, name: true, scraperKey: true, enabled: true, healthStatus: true, lastRunAt: true, lastRunStatus: true, lastSuccessAt: true },
        orderBy: { name: 'asc' },
      },
    },
  });
  if (!orgs.length) return [];
  const ids = orgs.map((o: any) => o.id);
  const jobCounts = await db.opportunity.groupBy({
    by: ['organizationId'], where: { organizationId: { in: ids }, status: { in: ['published', 'draft'] } }, _count: { _all: true },
  }).catch(() => [] as any[]);
  const jobsByOrg = new Map(jobCounts.map((row: any) => [row.organizationId, row._count._all]));
  const pending = await db.organizationMember.findMany({
    where: { status: 'pending', organizationId: { in: ids } },
    select: { organizationId: true },
  });
  const pendingByOrg = new Map<string, number>();
  for (const p of pending) pendingByOrg.set(p.organizationId, (pendingByOrg.get(p.organizationId) ?? 0) + 1);
  return (orgs as any[]).map((o) => ({
    ...o,
    activeJobs: jobsByOrg.get(o.id) ?? 0,
    sourceCount: o.sources.length,
    pendingMembers: pendingByOrg.get(o.id) ?? 0,
  }));
}

/** Pending membership requests (claims) across orgs, with claim evidence. */
export async function listPendingMembers(db: OrgDb): Promise<Array<{ id: string; organizationId: string; organizationName: string; role: string; status: string; claimEmail: string | null; userName: string | null; userEmail: string | null; createdAt: Date }>> {
  const rows = await db.organizationMember.findMany({
    where: { status: 'pending' },
    include: {
      organization: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const userIds = [...new Set((rows as any[]).map((r) => r.userId))];
  const users = await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }).catch(() => [] as any[]);
  const byUser = new Map(users.map((u: any) => [u.id, u]));
  return (rows as any[]).map((m) => ({
    id: m.id,
    organizationId: m.organizationId,
    organizationName: m.organization.name,
    role: m.role,
    status: m.status,
    claimEmail: m.claimEmail,
    userName: byUser.get(m.userId)?.name ?? null,
    userEmail: byUser.get(m.userId)?.email ?? null,
    createdAt: m.createdAt,
  }));
}

const EDITABLE_FIELDS = ['name', 'website', 'careersUrl', 'organizationType', 'description', 'logoUrl', 'country', 'active'] as const;

export async function updateOrganization(db: OrgDb, id: string, patch: Record<string, unknown>, adminEmail: string): Promise<void> {
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (patch[field] !== undefined) data[field] = patch[field];
  }
  if (typeof patch.officialDomains !== 'undefined') {
    const domains = Array.isArray(patch.officialDomains)
      ? patch.officialDomains
      : String(patch.officialDomains).split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
    data.officialDomains = domains;
  }
  for (const urlField of ['website', 'careersUrl', 'logoUrl'] as const) {
    const value = data[urlField];
    if (typeof value === 'string' && value && !isSafePublicUrl(value)) {
      throw new Error(`${urlField} failed the security guard (public http/s hosts only).`);
    }
  }
  if (!Object.keys(data).length) throw new Error('no editable fields provided');
  await db.organization.update({ where: { id }, data });
  await db.auditLog.create({ data: { entity: 'organization', entityId: id, action: 'organization.edit', details: JSON.stringify({ by: adminEmail, fields: Object.keys(data) }) } });
}

export async function setVerified(db: OrgDb, id: string, verified: boolean, method: string | null, adminEmail: string): Promise<void> {
  await db.organization.update({
    where: { id },
    data: verified
      ? { verified: true, verificationMethod: method ?? 'manual_review', verifiedAt: new Date() }
      : { verified: false, verificationMethod: null, verifiedAt: null },
  });
  await db.auditLog.create({ data: { entity: 'organization', entityId: id, action: verified ? 'organization.verify' : 'organization.unverify', details: JSON.stringify({ by: adminEmail, method }) } });
}

/**
 * Fold `sourceId` (the org to remove) into `targetId`. B's aliases move (the
 * clashing ones are dropped, but B's canonical name is ALWAYS kept as an
 * alias of A so future free-text rows resolve), opportunities, sources and
 * observations follow, and B is deleted.
 */
export async function mergeOrganizations(db: OrgDb, targetId: string, sourceId: string, adminEmail: string): Promise<{ movedAliases: number; droppedAliases: number; movedOpportunities: number; movedSources: number; movedObservations: number }> {
  if (targetId === sourceId) throw new Error('cannot merge an organization into itself');
  const [target, source] = await Promise.all([
    db.organization.findUnique({ where: { id: targetId } }),
    db.organization.findUnique({ where: { id: sourceId }, include: { aliases: true } }),
  ]);
  if (!target || !source) throw new Error('organization not found');

  let movedAliases = 0;
  let droppedAliases = 0;
  for (const alias of source.aliases) {
    const clash = await db.organizationAlias.findFirst({ where: { normalized: alias.normalized, organizationId: targetId }, select: { id: true } });
    if (clash) {
      await db.organizationAlias.delete({ where: { id: alias.id } });
      droppedAliases += 1;
    } else {
      // normalized is globally unique — a clash against ANY org means drop
      try {
        await db.organizationAlias.update({ where: { id: alias.id }, data: { organizationId: targetId } });
        movedAliases += 1;
      } catch {
        await db.organizationAlias.delete({ where: { id: alias.id } });
        droppedAliases += 1;
      }
    }
  }
  // B's canonical display name always survives as an alias of A
  const sourceKey = normalizeOrgName(source.name);
  const sourceNameAlias = await db.organizationAlias.findFirst({ where: { normalized: sourceKey } });
  if (sourceNameAlias) {
    if (sourceNameAlias.organizationId !== targetId) {
      await db.organizationAlias.update({ where: { id: sourceNameAlias.id }, data: { organizationId: targetId } }).catch(async () => {
        await db.organizationAlias.delete({ where: { id: sourceNameAlias.id } });
      });
      movedAliases += 1;
    }
  } else {
    try {
      await db.organizationAlias.create({ data: { organizationId: targetId, alias: source.name, normalized: sourceKey } });
      movedAliases += 1;
    } catch { /* raced — ignore, the key exists somewhere already */ }
  }

  const movedOpportunities = (await db.opportunity.updateMany({ where: { organizationId: sourceId }, data: { organizationId: targetId } })).count ?? 0;
  const movedSources = (await db.importSource.updateMany({ where: { organizationId: sourceId }, data: { organizationId: targetId } })).count ?? 0;
  const movedObservations = (await db.opportunitySourceObservation.updateMany({ where: { organizationId: sourceId }, data: { organizationId: targetId } })).count ?? 0;
  await db.organizationMember.updateMany({ where: { organizationId: sourceId }, data: { organizationId: targetId } }).catch(() => null);
  await db.organization.delete({ where: { id: sourceId } });

  await db.auditLog.create({
    data: { entity: 'organization', entityId: targetId, action: 'organization.merge',
      details: JSON.stringify({ by: adminEmail, sourceId, sourceName: source.name, movedAliases, droppedAliases, movedOpportunities, movedSources, movedObservations }) },
  });
  return { movedAliases, droppedAliases, movedOpportunities, movedSources, movedObservations };
}

export async function addOfficialSource(db: OrgDb, organizationId: string, input: {
  name: string; scraperKey: string; baseUrl: string; type?: string;
  sourceRole?: string; priority?: number; scheduleMinutes?: number; config?: Record<string, unknown>;
}, adminEmail: string): Promise<string> {
  if (!isSafePublicUrl(input.baseUrl)) {
    throw new Error('Source URL failed the security guard (public http/s hosts only).');
  }
  const source = await db.importSource.create({
    data: {
      name: input.name,
      type: input.type ?? 'job',
      scraperKey: input.scraperKey,
      baseUrl: input.baseUrl,
      enabled: true,
      autoPublish: false, // official sources never auto-publish from the admin panel
      scheduleMinutes: input.scheduleMinutes ?? 30,
      defaultCategory: 'jobs',
      config: input.config ? JSON.stringify(input.config) : null,
      sourceRole: input.sourceRole ?? 'official_careers',
      priority: input.priority ?? 90,
      healthStatus: 'healthy',
      organizationId,
    },
  });
  await db.auditLog.create({ data: { entity: 'import_source', entityId: source.id, action: 'organization.add-source', details: JSON.stringify({ by: adminEmail, organizationId, name: input.name }) } });
  return source.id;
}

export async function setSourcePaused(db: OrgDb, importSourceId: string, paused: boolean, adminEmail: string): Promise<void> {
  await db.importSource.update({ where: { id: importSourceId }, data: { healthStatus: paused ? 'paused' : 'healthy' } });
  await db.auditLog.create({ data: { entity: 'import_source', entityId: importSourceId, action: paused ? 'organization.pause-source' : 'organization.resume-source', details: JSON.stringify({ by: adminEmail }) } });
}
