import { createHash } from 'node:crypto';
/** Translation timestamps and import bookkeeping are deliberately excluded. */
export function matchMaterialVersion(row: { title: string; deadline: Date | null; requirements?: string | null; eligibility?: string | null; jobType?: string | null; country?: string | null; locations?: unknown; status?: string; educationReq?: string | null; experience?: string | null; publicationRevision?:number }) {
  const locations=Array.isArray(row.locations)?row.locations.map(x=>JSON.stringify(x)).sort():row.locations;
  return createHash('sha256').update(JSON.stringify([row.title, row.deadline?.toISOString(), row.requirements, row.eligibility, row.jobType, row.country, locations, row.status, row.educationReq, row.experience,row.publicationRevision||0])).digest('hex');
}
