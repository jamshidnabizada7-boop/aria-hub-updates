import type {
  Award, CVDraft, CVData, CVOutputLang, CVPurpose, Education, Experience, Project, Publication,
  Research, TemplateType, Volunteering, CVAccent, CVDensity, PaperSize
} from '../types';
import { CV_SCHEMA_VERSION } from '../types';
import { DEFAULT_TEMPLATE_BY_PURPOSE } from './cv-templates';

export { DEFAULT_TEMPLATE_BY_PURPOSE };

export function makeId(prefix = 'item'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEmptyData(): CVData {
  return {
    personal: { fullName: '', headline: '', email: '', phone: '', location: '', summary: '', gender: '', picture: '' },
    socialLinks: [], education: [], experience: [], skills: [], languages: [], certifications: [],
    projects: [], references: [], awards: [], volunteering: [], research: [], publications: [],
  };
}

export function createDraft(
  purpose: CVPurpose = 'professional',
  outputLang: CVOutputLang = 'en',
  source?: CVDraft['source'],
  options?: { template?: TemplateType; paperSize?: PaperSize },
): CVDraft {
  const now = new Date().toISOString();
  return {
    schemaVersion: CV_SCHEMA_VERSION,
    id: makeId('cv'),
    name: '',
    purpose,
    template: options?.template || DEFAULT_TEMPLATE_BY_PURPOSE[purpose],
    paperSize: options?.paperSize || 'a4',
    outputLang,
    appearance: { accent: 'navy', density: 'comfortable', showPhoto: true },
    data: createEmptyData(),
    source,
    createdAt: now,
    updatedAt: now,
  };
}

function monthOrBlank(value: unknown): string {
  if (typeof value !== 'string') return '';
  const match = value.match(/^(\d{4})-(\d{2})$/);
  return match ? `${match[1]}-${match[2]}` : '';
}
function mapLegacyEducation(item: any): Education { return { id: typeof item?.id === 'string' ? item.id : makeId('edu'), degree: String(item?.degree || ''), institution: String(item?.institution || ''), location: String(item?.location || ''), startDate: monthOrBlank(item?.startDate), endDate: monthOrBlank(item?.endDate), isCurrent: Boolean(item?.isCurrent), description: String(item?.description || '') }; }
function mapLegacyExperience(item: any): Experience { return { id: typeof item?.id === 'string' ? item.id : makeId('exp'), role: String(item?.role || ''), company: String(item?.company || ''), location: String(item?.location || ''), startDate: monthOrBlank(item?.startDate), endDate: monthOrBlank(item?.endDate), isCurrent: Boolean(item?.isCurrent), description: String(item?.description || '') }; }
function mapLegacyProject(item: any): Project { return { id: typeof item?.id === 'string' ? item.id : makeId('project'), name: String(item?.name || ''), role: String(item?.role || ''), startDate: monthOrBlank(item?.startDate), endDate: monthOrBlank(item?.endDate), description: String(item?.description || ''), link: String(item?.link || ''), technologies: String(item?.technologies || '') }; }
function mapAward(item: any): Award { return { id: typeof item?.id === 'string' ? item.id : makeId('award'), title: String(item?.title || item?.name || ''), issuer: String(item?.issuer || ''), date: monthOrBlank(item?.date), description: String(item?.description || '') }; }
function mapVolunteering(item: any): Volunteering { return { id: typeof item?.id === 'string' ? item.id : makeId('volunteer'), role: String(item?.role || ''), organization: String(item?.organization || item?.company || ''), startDate: monthOrBlank(item?.startDate), endDate: monthOrBlank(item?.endDate), isCurrent: Boolean(item?.isCurrent), description: String(item?.description || '') }; }
function mapResearch(item: any): Research { return { id: typeof item?.id === 'string' ? item.id : makeId('research'), title: String(item?.title || item?.name || ''), organization: String(item?.organization || ''), startDate: monthOrBlank(item?.startDate), endDate: monthOrBlank(item?.endDate), isCurrent: Boolean(item?.isCurrent), description: String(item?.description || ''), link: String(item?.link || '') }; }
function mapPublication(item: any): Publication { return { id: typeof item?.id === 'string' ? item.id : makeId('publication'), title: String(item?.title || item?.name || ''), publisher: String(item?.publisher || ''), date: monthOrBlank(item?.date), description: String(item?.description || ''), link: String(item?.link || '') }; }

const TEMPLATE_IDS: TemplateType[] = ['ats-simple','ats-compact','modern-sidebar','executive','minimal-elegant','tech-profile','academic-research','scholarship-profile','chronological-classic','skills-first','european-classic'];

export function normalizeDraft(raw: any): CVDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const sourceData = raw.data && typeof raw.data === 'object' ? raw.data : raw;
  const personal = sourceData.personal || {};
  const legacySocialLinks = Array.isArray(sourceData.socialLinks) ? [...sourceData.socialLinks] : [];
  if (!legacySocialLinks.length) {
    if (personal.linkedIn) legacySocialLinks.push({ id: makeId('social'), platform: 'LinkedIn', url: personal.linkedIn });
    if (personal.website) legacySocialLinks.push({ id: makeId('social'), platform: 'Website', url: personal.website });
  }

  const purpose: CVPurpose = ['professional','student','scholarship'].includes(raw.purpose) ? raw.purpose : 'professional';
  const legacyTemplateMap: Record<string, TemplateType> = { ats: 'ats-simple', modern: 'modern-sidebar', academic: 'academic-research' };
  const template: TemplateType = TEMPLATE_IDS.includes(raw.template) ? raw.template : legacyTemplateMap[String(raw.template)] || DEFAULT_TEMPLATE_BY_PURPOSE[purpose];
  const outputLang: CVOutputLang = ['en','fa','ps'].includes(raw.outputLang) ? raw.outputLang : 'en';
  const accent: CVAccent = ['navy','blue','emerald','burgundy','neutral'].includes(raw.appearance?.accent) ? raw.appearance.accent : 'navy';
  const density: CVDensity = ['comfortable','compact'].includes(raw.appearance?.density) ? raw.appearance.density : 'comfortable';

  const data: CVData = {
    personal: {
      fullName: String(personal.fullName || ''), headline: String(personal.headline || ''), email: String(personal.email || ''),
      phone: String(personal.phone || ''), location: String(personal.location || ''), summary: String(personal.summary || ''),
      gender: ['male','female','other'].includes(personal.gender) ? personal.gender : personal.gender === 'Male' ? 'male' : personal.gender === 'Female' ? 'female' : personal.gender === 'Other' ? 'other' : '',
      picture: String(personal.picture || ''),
    },
    socialLinks: legacySocialLinks.map((item:any)=>({ id: typeof item?.id === 'string' ? item.id : makeId('social'), platform: String(item?.platform || ''), url: String(item?.url || '') })),
    education: (Array.isArray(sourceData.education)?sourceData.education:[]).map(mapLegacyEducation),
    experience: (Array.isArray(sourceData.experience)?sourceData.experience:[]).map(mapLegacyExperience),
    skills: (Array.isArray(sourceData.skills)?sourceData.skills:[]).map((item:any)=>({ id: typeof item?.id==='string'?item.id:makeId('skill'), name:String(item?.name||''), level:['beginner','intermediate','expert'].includes(item?.level)?item.level:item?.level==='Beginner'?'beginner':item?.level==='Expert'?'expert':'intermediate' })),
    languages: (Array.isArray(sourceData.languages)?sourceData.languages:[]).map((item:any)=>({ id:typeof item?.id==='string'?item.id:makeId('language'), name:String(item?.name||''), proficiency:['basic','intermediate','fluent','native'].includes(item?.proficiency)?item.proficiency:item?.proficiency==='Native'?'native':item?.proficiency==='Fluent'?'fluent':item?.proficiency==='Basic'?'basic':'intermediate' })),
    certifications: (Array.isArray(sourceData.certifications)?sourceData.certifications:[]).map((item:any)=>({ id:typeof item?.id==='string'?item.id:makeId('cert'), name:String(item?.name||''), issuer:String(item?.issuer||''), date:monthOrBlank(item?.date), credentialUrl:String(item?.credentialUrl||'') })),
    projects: (Array.isArray(sourceData.projects)?sourceData.projects:[]).map(mapLegacyProject),
    references: (Array.isArray(sourceData.references)?sourceData.references:[]).map((item:any)=>({ id:typeof item?.id==='string'?item.id:makeId('reference'), name:String(item?.name||''), role:String(item?.role||''), organization:String(item?.organization||item?.company||''), email:String(item?.email||item?.contact||''), phone:String(item?.phone||'') })),
    awards: (Array.isArray(sourceData.awards)?sourceData.awards:[]).map(mapAward),
    volunteering: (Array.isArray(sourceData.volunteering)?sourceData.volunteering:[]).map(mapVolunteering),
    research: (Array.isArray(sourceData.research)?sourceData.research:[]).map(mapResearch),
    publications: (Array.isArray(sourceData.publications)?sourceData.publications:[]).map(mapPublication),
  };

  const now=new Date().toISOString();
  return {
    schemaVersion: CV_SCHEMA_VERSION,
    id: typeof raw.id==='string'?raw.id:makeId('cv'), name:String(raw.name||''), purpose, template,
    paperSize: raw.paperSize==='letter'?'letter':'a4', outputLang,
    appearance: { accent, density, showPhoto: raw.appearance?.showPhoto !== false },
    data, source: raw.source&&typeof raw.source==='object'?raw.source:undefined,
    createdAt: typeof raw.createdAt==='string'?raw.createdAt:now, updatedAt: typeof raw.updatedAt==='string'?raw.updatedAt:now,
  };
}

export function displayDraftName(draft:CVDraft,fallback:string){ return draft.name.trim()||draft.data.personal.fullName.trim()||fallback; }
export function safeExternalUrl(value:string):string|null { if(!value.trim()) return null; try{ const url=new URL(value.trim()); return url.protocol==='https:'||url.protocol==='http:'?url.toString():null; }catch{return null;} }
export function formatMonth(value:string,lang:CVOutputLang):string { if(!/^\d{4}-\d{2}$/.test(value)) return value; const [year,month]=value.split('-').map(Number); const locale=lang==='fa'?'fa-AF':lang==='ps'?'ps-AF':'en-US'; try{return new Intl.DateTimeFormat(locale,{year:'numeric',month:'short',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)));}catch{return value;} }
export function safeImageDataUrl(value:string):string|null { return /^data:image\/(png|jpeg|jpg|webp);base64,[a-z0-9+/=\s]+$/i.test(value)?value:null; }

export async function prepareProfileImage(file:File):Promise<string>{
  const MAX_INPUT_BYTES=8*1024*1024;
  if(!file.type.startsWith('image/')) throw new Error('invalid-image');
  if(file.size>MAX_INPUT_BYTES) throw new Error('image-too-large');
  const bitmap=await createImageBitmap(file);
  const maxEdge=640, scale=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(bitmap.width*scale)); canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('image-processing-failed');
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close();
  return new Promise((resolve,reject)=>canvas.toBlob((blob)=>{ if(!blob)return reject(new Error('image-processing-failed')); const reader=new FileReader(); reader.onerror=()=>reject(new Error('image-processing-failed')); reader.onload=()=>resolve(String(reader.result||'')); reader.readAsDataURL(blob); },'image/jpeg',0.82));
}
