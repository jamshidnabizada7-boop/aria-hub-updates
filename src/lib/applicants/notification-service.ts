import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { applicantEnabled, applicantFromRequest } from '@/lib/applicant-auth';

export const NotificationPrefsSchema=z.object({
  inAppEnabled:z.boolean(),
  emailEnabled:z.boolean(),
  emailFrequency:z.enum(['daily','weekly']),
}).strict();
export type NotificationPrefs=z.infer<typeof NotificationPrefsSchema>;
export const defaultNotificationPrefs:NotificationPrefs={
  inAppEnabled:false,emailEnabled:false,emailFrequency:'daily'
};
export function notificationsEnabled():boolean {
  return applicantEnabled() && process.env.APPLICANT_MATCHER_V3_ENABLED==='true' && process.env.APPLICANT_NOTIFICATIONS_ENABLED==='true';
}
export function applicantResponse(data:object,status=200) {
  return NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
export async function notificationAccount(req:Request) {
  if(!notificationsEnabled())return null;
  const user=await applicantFromRequest(req);if(!user)return null;
  const profile=await db.applicantProfile.findUnique({where:{userId:user.id},select:{id:true,userId:true,preferredLocale:true}});
  return profile?{profile,email:user.email,emailVerified:!!user.emailVerified}:null;
}
export function validId(value:string){return /^c[a-z0-9]{10,40}$/.test(value);}
export function emailDue(last:Date|null,frequency:'daily'|'weekly',now:Date):boolean {
  return !last || now.getTime()-last.getTime()>=(frequency==='daily'?86400000:7*86400000);
}
export function safeLocale(raw:string):'en'|'fa'|'ps' {
  return raw==='en'||raw==='ps'?raw:'fa';
}
