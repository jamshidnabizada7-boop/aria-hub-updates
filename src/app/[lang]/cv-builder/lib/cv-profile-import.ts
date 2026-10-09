import type {CVDraft} from '../types';
import {makeId} from './cv-utils';

/** Import is explicitly initiated by the applicant; no OCR proposals or
 * unstated employers, dates, grades or proficiency can enter the CV. */
export function applyVerifiedCareerFacts(draft:CVDraft,facts:Record<string,unknown>):CVDraft{
 const take=(field:string,max:number)=>Array.isArray(facts[field])?
  (facts[field] as unknown[]).filter((x):x is string=>typeof x==='string'&&x.length>=2).slice(0,max):[];
 const fullName=typeof facts.fullName==='string'?facts.fullName.slice(0,120):'';
 const headline=typeof facts.headline==='string'?facts.headline.slice(0,160):'';
 const skills=take('skills',25).filter(x=>!draft.data.skills.some(y=>y.name.toLowerCase()===x.toLowerCase()));
 const languages=take('languages',15).filter(x=>!draft.data.languages.some(y=>y.name.toLowerCase()===x.toLowerCase()));
 const certs=take('certifications',8).filter(x=>!draft.data.certifications.some(y=>y.name.toLowerCase()===x.toLowerCase()));
 const education=take('educationHistory',8).filter(x=>!draft.data.education.some(y=>y.description.toLowerCase()===x.toLowerCase()));
 const experience=take('workHistory',10).filter(x=>!draft.data.experience.some(y=>y.description.toLowerCase()===x.toLowerCase()));
 return {...draft,data:{...draft.data,
  personal:{...draft.data.personal,fullName:draft.data.personal.fullName||fullName,headline:draft.data.personal.headline||headline},
  skills:[...draft.data.skills,...skills.map(name=>({id:makeId('skill'),name,level:'beginner' as const}))],
  languages:[...draft.data.languages,...languages.map(name=>({id:makeId('language'),name,proficiency:'basic' as const}))],
  certifications:[...draft.data.certifications,...certs.map(name=>({id:makeId('cert'),name,issuer:'',date:'',credentialUrl:''}))],
  education:[...draft.data.education,...education.map(description=>({id:makeId('edu'),degree:'',institution:'',location:'',startDate:'',endDate:'',isCurrent:false,description}))],
  experience:[...draft.data.experience,...experience.map(description=>({id:makeId('exp'),role:'',company:'',location:'',startDate:'',endDate:'',isCurrent:false,description}))]
 }};
}
