import type {MatcherProfile} from '@/lib/opportunity-matcher';
import {recognizeJobRoles,JOB_ROLE_IDS,type JobRole} from '@/lib/job-role-taxonomy';

/** Only user-confirmed facts may prefill the Matcher. Sensitive eligibility
 * fields (nationality, residence, work authorization) never come from OCR. */
export function reviewedCareerMatcherPrefill(profile:MatcherProfile,raw:unknown):MatcherProfile{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return profile;
 const facts=raw as Record<string,unknown>;
 const levels=['high_school','bachelors','masters','phd','other'];
 const roles=new Set<string>(JOB_ROLE_IDS);
 const areas=['any','technology','engineering','business','health','education','social_sciences','law_policy','natural_sciences','environment_agriculture','arts_humanities'];
 const skills=Array.isArray(facts.skills)?facts.skills.filter((v):v is string=>typeof v==='string'&&v.trim().length>=2&&v.length<=60).slice(0,25):undefined;
 const prefs=Array.isArray(facts.preferredRoles)?facts.preferredRoles.filter((v):v is JobRole=>typeof v==='string'&&roles.has(v)).slice(0,12):undefined;
 return {...profile,
  education:typeof facts.education==='string'&&levels.includes(facts.education)?facts.education as MatcherProfile['education']:profile.education,
  fieldArea:typeof facts.fieldArea==='string'&&areas.includes(facts.fieldArea)?facts.fieldArea as MatcherProfile['fieldArea']:profile.fieldArea,
  experienceYears:Number.isInteger(facts.experienceYears)&&Number(facts.experienceYears)>=0&&Number(facts.experienceYears)<=50?Number(facts.experienceYears):profile.experienceYears,
  skills:skills??profile.skills,preferredRoles:prefs??profile.preferredRoles,
  // Do not copy any extracted nationality, residence, destination or dates.
 };
}
/** Suggestions from explicitly reviewed job-history snippets; not automatically
 * added to applicant preferences or described as established credentials. */
export function suggestedCareerRoles(raw:unknown):JobRole[]{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return [];
 const facts=raw as Record<string,unknown>;
 if(!Array.isArray(facts.workHistory))return [];
 const text=facts.workHistory.filter((x):x is string=>typeof x==='string').slice(0,10).join(' ');
 return [...new Set(recognizeJobRoles(text))].slice(0,12);
}
