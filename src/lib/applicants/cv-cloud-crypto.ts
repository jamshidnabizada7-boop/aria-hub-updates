import 'server-only';
import { randomBytes,createCipheriv,createDecipheriv } from 'node:crypto';
import { z } from 'zod';
import { normalizeDraft } from '@/app/[lang]/cv-builder/lib/cv-utils';
import type { CVDraft } from '@/app/[lang]/cv-builder/types';

export const MAX_CLOUD_DRAFT_BYTES=160*1024;
export const CloudDraftId=z.string().regex(/^cv-[a-zA-Z0-9-]{8,85}$/);
export const CloudDraftWrite=z.object({
 draft:z.unknown(),expectedRevision:z.number().int().min(0).max(2147483646)
}).strict();
const validDate=(s:string)=>!Number.isNaN(Date.parse(s)) && s.length<=40;
/** Only actual v4 CV drafts. Never trust arbitrary JSON from a browser. */
export function checkedCloudDraft(raw:unknown,id:string):CVDraft {
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('invalid_draft');
 const obj=raw as Record<string,unknown>;
 if(obj.schemaVersion!==4||obj.id!==id||!obj.data||typeof obj.data!=='object')throw Error('invalid_draft');
 const encoded=JSON.stringify(raw);
 if(!encoded||Buffer.byteLength(encoded,'utf8')>MAX_CLOUD_DRAFT_BYTES)throw Error('draft_too_large');
 if(!validDate(String(obj.createdAt||''))||!validDate(String(obj.updatedAt||'')))throw Error('invalid_draft');
 const draft=normalizeDraft(raw);
 if(!draft||draft.id!==id||draft.schemaVersion!==4)throw Error('invalid_draft');
 if(draft.name.length>120||draft.data.skills.length>100||draft.data.education.length>60||draft.data.experience.length>60)throw Error('invalid_draft');
 return draft;
}
function encryptionKey():Buffer{
 const value=process.env.CV_DRAFT_ENCRYPTION_KEY||'';
 if(!/^[a-f0-9]{64}$/i.test(value))throw Error('cv_draft_encryption_unavailable');
 return Buffer.from(value,'hex');
}
/** AES-256-GCM with owner+draft as authenticated associated data. */
export function encryptCVDraft(content:CVDraft,owner:string,id:string):string{
 const iv=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv);
 cipher.setAAD(Buffer.from(owner+':'+id,'utf8'));
 const data=Buffer.concat([cipher.update(JSON.stringify(content),'utf8'),cipher.final()]);
 return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),data.toString('base64url')].join('.');
}
export function decryptCVDraft(blob:string,owner:string,id:string):CVDraft{
 const parts=blob.split('.');
 if(parts.length!==4||parts[0]!=='v1')throw Error('cv_draft_corrupt');
 const decipher=createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(parts[1],'base64url'));
 decipher.setAAD(Buffer.from(owner+':'+id,'utf8'));
 decipher.setAuthTag(Buffer.from(parts[2],'base64url'));
 const decoded=Buffer.concat([decipher.update(Buffer.from(parts[3],'base64url')),decipher.final()]).toString('utf8');
 return checkedCloudDraft(JSON.parse(decoded),id);
}
export function cloudCVEnabled():boolean{
 return process.env.APPLICANT_CV_SYNC_ENABLED==='true'&&/^[a-f0-9]{64}$/i.test(process.env.CV_DRAFT_ENCRYPTION_KEY||'');
}
