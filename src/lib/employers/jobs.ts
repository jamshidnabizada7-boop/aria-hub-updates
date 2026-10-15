import {resolveEmployerApplication, type EmployerApplyMethod} from './application-method';
/**
 * Employer job management (Phase 13) — every mutation passes through
 * requireMembership, so a recruiter from organization A can NEVER touch
 * organization B (cross-org access fails with a clear error).
 *
 * Status model for employer-created jobs:
 *   created/duplicated/reopened → 'draft' (admin moderation publishes them)
 *   closed                      → 'expired' (hidden from the public site)
 *   Active = published, Pending review = draft, Expired/Closed = expired+archived
 */
import { requireMembership } from './membership';
import { slugify } from '@/lib/import/utils';
import type { Prisma } from '@prisma/client';
import { parseProfessionalFields, professionalToExtractedData, professionalToColumns, professionalLocationRow } from './professional-fields';
import { translationPendingFlags } from '@/lib/translation/pending';

export interface EmployerJobInput {
  title: string;
  description: string;
  deadline?: string | null;
  location?: string | null;
  salary?: string | null;
  jobType?: string | null;
  applyUrl?: string | null;
  applyEmail?: string | null;
  applyPhone?: string | null;
  categorySlug?: string | null;
  applyMethod?: EmployerApplyMethod | null;
  // Phase 14 professional fields (all optional)
  vacancyNumber?: string | null;
  numberOfVacancies?: number | string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  contractType?: string | null;
  contractDuration?: string | null;
  genderRequirement?: string | null;
  nationalityRequirement?: string | null;
  salaryGrade?: string | null;
  responsibilities?: string | null;
  requirements?: string | null;
  guidelines?: string | null;
  education?: string | null;
  experience?: string | null;
}

type JobsDb = {
  opportunity: {
    findMany: (a: any) => Promise<any[]>;
    findFirst: (a: any) => Promise<any>;
    updateMany: (a: any) => Promise<any>;
    findUnique: (a: any) => Promise<any>;
    create: (a: any) => Promise<any>;
    update: (a: any) => Promise<any>;
  };
  opportunityCategory: { findUnique: (a: any) => Promise<any> };
  organization: { findUnique: (a: any) => Promise<any> };
  organizationMember: { findFirst: (a: any) => Promise<any>; findMany: (a: any) => Promise<any[]>; findUnique: (a: any) => Promise<any>; create: (a: any) => Promise<any>; update: (a: any) => Promise<any>; delete: (a: any) => Promise<any> };
  auditLog: { create: (a: any) => Promise<any> };
};

async function uniqueJobSlug(db: JobsDb, base: string): Promise<string> {
  let candidate = base;
  for (let i = 2; i < 100; i++) {
    const existing = await db.opportunity.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** All employer-created jobs of one organization, bucketed for the dashboard. */
export async function listOrgJobs(db: JobsDb, organizationId: string): Promise<{
  active: any[]; pending: any[]; closed: any[];
}> {
  const jobs = await db.opportunity.findMany({
    where: { organizationId, sourceName: 'Employer' },
    select: {
      id: true, slug: true, title: true, status: true, deadline: true, createdAt: true,
      country: true, salary: true, jobType: true, applyUrl: true,description:true,acceptsNativeApplications:true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return {
    active: jobs.filter((j: any) => j.status === 'published'),
    pending: jobs.filter((j: any) => j.status === 'draft'),
    closed: jobs.filter((j: any) => j.status === 'expired' || j.status === 'archived'),
  };
}

export async function createJob(db: JobsDb, userId: string, organizationId: string, input: EmployerJobInput): Promise<{ id: string; slug: string; status: string }> {
  if ((await requireMembership(db, userId, organizationId, 'recruiter')) === null) {
    throw new Error('You do not have recruiter access to this organization.');
  }
  const title = String(input.title ?? '').trim();
  const description = String(input.description ?? '').trim();
  if (title.length < 5 || title.length > 200) throw new Error('Title must be 5-200 characters.');
  if (description.length < 80 || description.length>40000) throw new Error('Description must be at least 80 characters.');
  if(input.deadline&&Number.isNaN(new Date(input.deadline).getTime()))throw Error('Invalid deadline.');
  const application=resolveEmployerApplication(input);
  const applyUrl=application.url;

  const category = await db.opportunityCategory.findUnique({where:{slug:input.categorySlug||'job'}});
  const org = await db.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
  const slug = await uniqueJobSlug(db, slugify(title));

  // Phase 14: professional bundle → extractedData + columns + location row
  const prof = parseProfessionalFields(input as unknown as Record<string, unknown>);
  const profExtracted = professionalToExtractedData(prof.professional);
  const profColumns = professionalToColumns(prof.professional);
  const locationRow = professionalLocationRow(prof.professional);

  const job = await db.opportunity.create({
    data: {
      title,
      description,
      slug,
      status: 'draft', // admin moderation publishes it
      organizationId,
      organization: org?.name ?? null,
      sourceName: 'Employer',
      deadline: input.deadline ? new Date(input.deadline) : null,
      country: input.location || null, // employer lane: location text lives in the country display field
      salary: input.salary || null,
      jobType: input.jobType || 'full-time',
      applyUrl,
      acceptsNativeApplications:application.method==='ariahub',
      applyUrlType: application.type,
      categoryId: category?.id ?? null,
      language: 'en',
      extractedData: {...profExtracted,employerApplicationMethod:application.method} as unknown as Prisma.InputJsonValue,
      ...translationPendingFlags(), // Phase 18: enter the shared translation queue
      ...profColumns,
      ...(locationRow ? { locations: { create: locationRow } } : {}),
    },
  });
  await db.auditLog.create({
    data: { entity: 'opportunity', entityId: job.id, action: 'employer.job-create',
      details: JSON.stringify({ userId, organizationId, slug: job.slug }) },
  });
  return { id: job.id, slug: job.slug, status: job.status };
}

/** Load the job only when the user holds an active membership at minRole. */
async function ownedJob(db: JobsDb, userId: string, jobId: string, minRole: 'recruiter' | 'owner' = 'recruiter') {
  const job = await db.opportunity.findUnique({
    where: { id: jobId },
    select: {
      id: true, organizationId: true, slug: true, status: true, title: true,
      description: true, deadline: true, applyUrl: true, applyUrlType: true,
      country: true, salary: true, jobType: true, categoryId: true, organization: true, sourceName:true, acceptsNativeApplications:true, extractedData:true, educationReq:true,experience:true,requirements:true,responsibilities:true,guidelines:true,locations:{select:{country:true,province:true,city:true,district:true}},
    },
  });
  if (!job?.organizationId || job.sourceName!=='Employer') return null;
  if ((await requireMembership(db, userId, job.organizationId, minRole)) === null) return null;
  return job;
}

/** Edit — ownership enforced; only the employer-manageable fields change. */
export async function updateJob(db: JobsDb, userId: string, jobId: string, patch: Partial<EmployerJobInput>): Promise<void> {
  const job = await ownedJob(db, userId, jobId, 'recruiter');
  if (!job) throw new Error('Job not found or you do not have access to it.');
  const data: Record<string, unknown> = {};
  if(patch.title!==undefined){const title=patch.title.trim();if(title.length<5||title.length>200)throw Error('Title must be 5–200 characters.');data.title=title;}
  if(patch.description!==undefined){const description=patch.description.trim();if(description.length<80||description.length>40000)throw Error('Description must be 80–40000 characters.');data.description=description;}
  if(patch.location!==undefined)data.country=patch.location?.slice(0,200)||null;
  if(patch.salary!==undefined)data.salary=patch.salary?.slice(0,200)||null;
  if(patch.jobType!==undefined)data.jobType=patch.jobType?.slice(0,100)||null;
  if(patch.deadline!==undefined){const date=patch.deadline?new Date(patch.deadline):null;if(date&&Number.isNaN(date.getTime()))throw Error('Invalid deadline.');data.deadline=date;}
  if(patch.applyUrl!==undefined||patch.applyEmail){
    const resolved=resolveEmployerApplication({applyUrl:patch.applyUrl,applyEmail:patch.applyEmail});
    data.applyUrl=resolved.url;data.applyUrlType=resolved.type;data.acceptsNativeApplications=false;
  }
  if(!Object.keys(data).length)throw Error('Nothing to update.');
  data.status='draft';
  Object.assign(data,translationPendingFlags());
  await db.opportunity.update({ where: { id: jobId }, data });
  await db.auditLog.create({
    data: { entity: 'opportunity', entityId: jobId, action: 'employer.job-edit',
      details: JSON.stringify({ userId, fields: Object.keys(data) }) },
  });
}

/** Close (hide from the public site) / reopen (back to admin review). */
export async function setJobClosed(db: JobsDb, userId: string, jobId: string, closed: boolean): Promise<void> {
  const job = await ownedJob(db, userId, jobId, 'recruiter');
  if (!job) throw new Error('Job not found or you do not have access to it.');
  await db.opportunity.update({ where: { id: jobId }, data: { status: closed ? 'expired' : 'draft' } });
  await db.auditLog.create({
    data: { entity: 'opportunity', entityId: jobId, action: closed ? 'employer.job-close' : 'employer.job-reopen',
      details: JSON.stringify({ userId }) },
  });
}

/** Extend the deadline (recruiter). */
export async function extendJobDeadline(db: JobsDb, userId: string, jobId: string, deadline: string): Promise<void> {
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid deadline date.');
  const job = await ownedJob(db, userId, jobId, 'recruiter');
  if (!job) throw new Error('Job not found or you do not have access to it.');
  await db.opportunity.update({ where: { id: jobId }, data: { deadline: d } });
  await db.auditLog.create({
    data: { entity: 'opportunity', entityId: jobId, action: 'employer.job-extend-deadline',
      details: JSON.stringify({ userId, deadline: d.toISOString() }) },
  });
}

/** Duplicate: a fresh draft copy with "(copy)" in the title. */
export async function duplicateJob(db: JobsDb, userId: string, jobId: string): Promise<{ id: string; slug: string }> {
  const job = await ownedJob(db, userId, jobId, 'recruiter');
  if (!job) throw new Error('Job not found or you do not have access to it.');
  const title = `${job.title} (copy)`;
  const slug = await uniqueJobSlug(db, slugify(title));
  const copy = await db.opportunity.create({
    data: {
      title, slug, description: job.description, status: 'draft',
      organizationId: job.organizationId, organization: job.organization,
      sourceName: 'Employer', deadline: job.deadline, country: job.country,
      salary: job.salary, jobType: job.jobType, applyUrl: job.applyUrl,
      applyUrlType: job.applyUrlType, acceptsNativeApplications:job.acceptsNativeApplications,extractedData:job.extractedData,educationReq:job.educationReq,experience:job.experience,requirements:job.requirements,responsibilities:job.responsibilities,guidelines:job.guidelines,...(job.locations?.length?{locations:{create:job.locations}}:{}), categoryId: job.categoryId, language: 'en',...translationPendingFlags(),
    },
  });
  await db.auditLog.create({
    data: { entity: 'opportunity', entityId: copy.id, action: 'employer.job-duplicate',
      details: JSON.stringify({ userId, from: jobId }) },
  });
  return { id: copy.id, slug: copy.slug };
}
