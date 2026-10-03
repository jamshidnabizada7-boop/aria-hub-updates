/**
 * Organization membership & claiming (Phase 12).
 *
 * A claim is a `pending` OrganizationMember row. Approval is ALWAYS manual
 * (admin action) — never automatic from the organization name alone; the
 * claimer's email domain is recorded as evidence for the admin to compare
 * against the organization's officialDomains.
 *
 * Role hierarchy: owner (full control incl. team) > recruiter (manage jobs)
 * > viewer (read-only).
 */
export type MemberRole = 'owner' | 'recruiter' | 'viewer';

export const ROLE_LEVEL: Record<MemberRole, number> = { owner: 3, recruiter: 2, viewer: 1 };

export function parseMemberRole(value: unknown): MemberRole {
  return value === 'recruiter' || value === 'viewer' || value === 'owner' ? value : 'viewer';
}

type MemberDb = {
  organizationMember: {
    findFirst: (a: any) => Promise<any>;
    findMany: (a: any) => Promise<any[]>;
    findUnique: (a: any) => Promise<any>;
    create: (a: any) => Promise<any>;
    update: (a: any) => Promise<any>;
    delete: (a: any) => Promise<any>;
  };
  organization: { findUnique: (a: any) => Promise<any> };
  opportunity: { updateMany: (a: any) => Promise<any> };
  auditLog: { create: (a: any) => Promise<any> };
};

/** Active memberships of a user, strongest role first. */
export async function myOrganizations(db: MemberDb, userId: string): Promise<Array<{ organizationId: string; organizationName: string; organizationSlug: string; role: MemberRole; organizationVerified: boolean }>> {
  const rows = await db.organizationMember.findMany({
    where: { userId, status: 'active' },
    include: { organization: { select: { id: true, name: true, slug: true, verified: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return (rows as any[]).map((m) => ({
    organizationId: m.organization.id,
    organizationName: m.organization.name,
    organizationSlug: m.organization.slug,
    organizationVerified: m.organization.verified,
    role: parseMemberRole(m.role),
  })).sort((a, b) => ROLE_LEVEL[b.role] - ROLE_LEVEL[a.role]);
}

/**
 * Claim an organization as the pending owner. Rejects when the user already
 * has ANY membership row for that org (pending/active/suspended) — re-claim
 * is an admin conversation, not a retry loop.
 */
export async function claimOrganization(db: MemberDb, userId: string, organizationId: string, claimEmail: string): Promise<{ id: string; status: string }> {
  const org = await db.organization.findUnique({ where: { id: organizationId }, select: { id: true, name: true } });
  if (!org) throw new Error('Organization not found.');
  const claimEmailNormalized = String(claimEmail ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claimEmailNormalized)) throw new Error('Enter the email at your organization used as evidence.');

  const existing = await db.organizationMember.findFirst({ where: { organizationId, userId } });
  if (existing) {
    if (existing.status === 'active') throw new Error('You already manage this organization.');
    throw new Error('A membership request already exists for this organization.');
  }
  const row = await db.organizationMember.create({
    data: { organizationId, userId, role: 'owner', status: 'pending', claimEmail: claimEmailNormalized },
  });
  await db.auditLog.create({ data: { entity: 'organization_member', entityId: row.id, action: 'membership.claim', details: JSON.stringify({ userId, organizationId, claimEmail: claimEmailNormalized }) } });
  return { id: row.id, status: row.status };
}

/** Admin approval: pending → active. */
export async function reviewMembership(db: MemberDb, memberId: string, approve: boolean, adminEmail: string): Promise<void> {
  const member = await db.organizationMember.findUnique({ where: { id: memberId }, include: { organization: { select: { name: true } } } });
  if (!member) throw new Error('Membership request not found.');
  if (member.status !== 'pending') throw new Error('Only pending requests can be reviewed.');
  await db.organizationMember.update({
    where: { id: memberId },
    data: approve
      ? { status: 'active', reviewedBy: adminEmail, reviewedAt: new Date() }
      : { status: 'suspended', reviewedBy: adminEmail, reviewedAt: new Date() },
  });

  // Phase 17: an approved owner claim makes the org's employer jobs trusted
  if (approve) {
    await db.opportunity.updateMany({
      where: { organizationId: member.organizationId, sourceName: 'Employer',
        verificationStatus: { in: ['single_source', 'needs_review', null] } },
      data: { verificationStatus: 'verified_employer' },
    }).catch(() => null);
  }
  await db.auditLog.create({
    data: { entity: 'organization_member', entityId: memberId,
      action: approve ? 'membership.approve' : 'membership.reject',
      details: JSON.stringify({ by: adminEmail, organization: member.organization.name, role: member.role, claimEmail: member.claimEmail }) },
  });
}

/**
 * Ownership guard for every employer mutation: the user must hold an ACTIVE
 * membership on THIS organization at `minRole` or stronger. Cross-org access
 * simply resolves to null (callers answer 403/404).
 */
export async function requireMembership(db: MemberDb, userId: string, organizationId: string, minRole: MemberRole = 'recruiter'): Promise<{ role: MemberRole } | null> {
  const rows = await db.organizationMember.findMany({
    where: { userId, organizationId, status: 'active' },
    select: { role: true },
  });
  const best = rows.map((r: any) => parseMemberRole(r.role)).sort((a, b) => ROLE_LEVEL[b] - ROLE_LEVEL[a])[0];
  if (!best) return null;
  return ROLE_LEVEL[best] >= ROLE_LEVEL[minRole] ? { role: best } : null;
}
