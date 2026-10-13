import { createHash } from 'node:crypto';
import { z } from 'zod';
export const repairIssue=z.enum(['apply','core','evidence','all']);
const fact=z.string().trim().min(1).max(12000);
const list=z.array(z.string().trim().min(1).max(150)).max(30);
export const repairPatch=z.object({applyUrl:z.string().trim().min(1).max(2000).optional(),country:z.string().trim().min(2).max(120).optional(),categoryId:z.string().min(1).max(100).optional(),eligibility:fact.optional(),educationReq:fact.optional(),experience:fact.optional(),requirements:fact.optional(),guidelines:fact.optional(),matchProfile:z.object({eligibleNationalities:list.optional(),eligibleCountries:list.optional(),educationLevels:list.optional(),fieldAreas:list.optional(),minAge:z.number().int().min(0).max(120).optional(),maxAge:z.number().int().min(0).max(120).optional(),minExperienceYears:z.number().min(0).max(80).optional(),languages:list.optional(),fundingType:z.enum(['fully_funded','partially_funded','self_funded','paid','unpaid']).optional(),locationType:z.enum(['remote','onsite','hybrid']).optional(),visaSponsorship:z.boolean().optional()}).strict().optional()}).strict();
export const repairEvidence=z.array(z.object({field:z.string().max(100),sourceUrl:z.string().max(2000),quote:z.string().min(2).max(12000)}).strict()).min(1).max(40);
export const commitRepairInput=z.object({claimId:z.string().uuid(),id:z.string().max(100),sourceHash:z.string().regex(/^[a-f0-9]{64}$/),patch:repairPatch,evidence:repairEvidence}).strict();
export const normalizeEvidence=(s:string)=>s.replace(/\s+/g,' ').trim().toLowerCase();
export function repairSourceHash(row:Record<string,unknown>){
  const keys=['id','title','description','sourceUrl','originalUrl','applyUrl','country','categoryId','eligibility','educationReq','experience','requirements','guidelines','deadline','extractedData','matchProfile'];
  return createHash('sha256').update(JSON.stringify(Object.fromEntries(keys.map(k=>[k,row[k]])))).digest('hex');
}
