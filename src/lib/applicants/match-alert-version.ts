import { createHash } from 'node:crypto';
/** Translation timestamps and import bookkeeping are deliberately excluded. */
export function matchMaterialVersion(row: { title: string; deadline: Date | null; requirements?: string | null; eligibility?: string | null; jobType?: string | null; country?: string | null; locations?: unknown; status?: string; educationReq?: string | null; experience?: string | null }) {
  return createHash('sha256').update(JSON.stringify([row.title, row.deadline?.toISOString(), row.requirements, row.eligibility, row.jobType, row.country, row.locations, row.status, row.educationReq, row.experience])).digest('hex');
}
