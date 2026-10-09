import 'server-only';
import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { removePrivateCV } from './cv-private-storage';
import { decryptCVDraft } from './cv-cloud-crypto';

/** Export only user-owned information, never credential hashes or object keys. */
export async function exportApplicantData(db: PrismaClient, userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: {
    name: true, email: true, image: true, createdAt: true,
    applicantProfile: { select: {
      id: true,
      headline: true, residence: true, preferredLocale: true, verifiedCareerFacts: true,
      documents: { select: { id: true, originalName: true, mimeType: true, byteSize: true, status: true, extraction: true, reviewedAt: true, createdAt: true } },
      savedSearches: { select: { name: true, profile: true, active: true, createdAt: true } },
      trackedApplications: { select: { opportunitySlug: true, opportunityTitle: true, opportunityOrganization: true, status: true, notes: true, nextActionAt: true, appliedAt: true } },
      notificationPreference: { select: { inAppEnabled: true, emailEnabled: true, pushEnabled: true, whatsappEnabled: true, emailFrequency: true } },
      notifications: { select: { opportunityId: true, evidence: true, readAt: true, createdAt: true } },
      cvDrafts: { select: { draftId: true, encryptedContent: true, revision: true, updatedAt: true } },
    } },
  } });
  const profile=user.applicantProfile;
  const drafts=profile?.cvDrafts.map(d=>({draft:decryptCVDraft(d.encryptedContent,profile.id,d.draftId),revision:d.revision,updatedAt:d.updatedAt}))||[];
  const account={...user,applicantProfile:profile?{...profile,cvDrafts:drafts}:null};
  return { version: 1, exportedAt: new Date().toISOString(), account,
    documents: 'Original files and synced CV drafts can be downloaded from My CVs and CV Builder before deletion.' };
}

/** Disable identity immediately, fence document workers, and retain cleanup references. */
export async function requestAccountDeletion(db: PrismaClient, userId: string, password: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash || user.disabled || !(await bcrypt.compare(password, user.passwordHash)))
    throw new Error('invalid_credentials');
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const fresh = await tx.user.findUnique({ where: { id: userId } });
    if (!fresh || fresh.disabled || fresh.passwordHash !== user.passwordHash) throw new Error('invalid_credentials');
    const profile = await tx.applicantProfile.findUniqueOrThrow({ where: { userId } });
    await tx.$queryRaw`SELECT "id" FROM "ApplicantProfile" WHERE "id" = ${profile.id} FOR UPDATE`;
    await tx.user.update({ where: { id: userId }, data: { disabled: true, passwordResetToken: null, passwordResetExpires: null } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.applicantSavedSearch.updateMany({ where: { applicantProfileId: profile.id }, data: { active: false } });
    await tx.applicantDocument.updateMany({ where: { applicantProfileId: profile.id }, data: { status: 'deleting', processingClaimedAt: null } });
    // Allow in-flight storage uploads to finish/fail before deleting their keys.
    return tx.applicantDeletionJob.create({ data: { userId, nextAttemptAt: new Date(Date.now() + 20 * 60000) }, select: { id: true, status: true } });
  });
}

/** Idempotent cleanup. A failed storage deletion never discards its reference. */
export async function processAccountDeletion(db: PrismaClient, jobId: string, remove = removePrivateCV) {
  const job = await db.applicantDeletionJob.findUniqueOrThrow({ where: { id: jobId } });
  if (job.status === 'complete') return;
  const user = await db.user.findUnique({ where: { id: job.userId }, select: { email: true, disabled: true, applicantProfile: { select: { id: true } } } });
  if (user && !user.disabled) throw new Error('deletion_identity_not_disabled');
  const docs = user?.applicantProfile ? await db.applicantDocument.findMany({ where: { applicantProfileId: user.applicantProfile.id }, select: { id: true, storageKey: true } }) : [];
  for (const document of docs) {
    await remove(document.storageKey);
    await db.applicantDocument.deleteMany({ where: { id: document.id, applicantProfileId: user!.applicantProfile!.id, status: 'deleting' } });
  }
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${job.userId} FOR UPDATE`;
    if (user?.email) await tx.verificationToken.deleteMany({ where: { identifier: 'applicant-email:' + user.email } });
    await tx.user.deleteMany({ where: { id: job.userId, disabled: true } });
    await tx.applicantDeletionJob.update({ where: { id: job.id }, data: { status: 'complete', completedAt: new Date(), claimedAt: null, errorCode: null } });
  });
}
