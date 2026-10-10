import {beforeAll,afterAll,test,expect} from 'bun:test';
import {randomBytes} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {db} from '../src/lib/db';
import {registerApplicant,loginApplicant,verifyApplicantEmail,getApplicantSession,sendVerification,forgotApplicantPassword,resetApplicantPassword} from '../src/lib/applicant-auth';
import {startAccountSmtp,accountMailLink} from '../scripts/tests/account-smtp-fixture';
const url=new URL(process.env.DATABASE_URL||'postgresql://localhost/no_database');
if(!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw Error('isolated_test_database_required');
const ids:string[]=[],emails:string[]=[],old:Record<string,string|undefined>={};
const keys=['APPLICANT_AUTH_ENABLED','SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','SMTP_FROM','PUBLIC_SITE_URL'];
let smtp:Awaited<ReturnType<typeof startAccountSmtp>>;
const email=()=>{const e='account-flow-'+randomBytes(10).toString('hex')+'@test.invalid';emails.push(e);return e;};
beforeAll(async()=>{await db.$queryRaw`SELECT 1`;smtp=await startAccountSmtp();for(const key of keys)old[key]=process.env[key];Object.assign(process.env,{APPLICANT_AUTH_ENABLED:'true',SMTP_HOST:'127.0.0.1',SMTP_PORT:String(smtp.port),SMTP_USER:'test-only',SMTP_PASS:'test-only',SMTP_FROM:'ARIA HUB <accounts@test.invalid>',PUBLIC_SITE_URL:'https://www.myariahub.com'});});
afterAll(async()=>{if(!smtp)return;await smtp.close();await db.verificationToken.deleteMany({where:{identifier:{in:emails.map(e=>'applicant-email:'+e)}}});await db.user.deleteMany({where:{OR:[{id:{in:ids}},{email:{in:emails}}]}});for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}});
async function identity(verified=true){const u=await db.user.create({data:{email:email(),passwordHash:await bcrypt.hash('existing-password-123',12),emailVerified:verified?new Date():null,name:'Synthetic identity'}});ids.push(u.id);return u;}
test('new signup sends verification and can log in only after confirming email',async()=>{
 const e=email();await registerApplicant(e,'registration-password-123','Synthetic applicant','en');
 const link=accountMailLink(smtp.messages.at(-1)!);expect(link.pathname).toBe('/api/applicant/auth/verify');
 await expect(loginApplicant(e,'registration-password-123')).rejects.toThrow('email_not_verified');
 expect(await verifyApplicantEmail(e,link.searchParams.get('token')!)).toBe(true);
 expect(await verifyApplicantEmail(e,link.searchParams.get('token')!)).toBe(false);
 const token=await loginApplicant(e,'registration-password-123','en');expect((await getApplicantSession(token))?.email).toBe(e);
},30000);
test('a delivery outage can be retried with the same registration details',async()=>{
 const e=email();smtp.setReject(true);await expect(registerApplicant(e,'registration-password-123','Synthetic applicant','en')).rejects.toThrow('email_delivery_unavailable');smtp.setReject(false);
 const before=await db.user.findUniqueOrThrow({where:{email:e}}),count=smtp.messages.length;
 await registerApplicant(e,'wrong-registration-password','Changed name','en');expect(smtp.messages.length).toBe(count);
 await registerApplicant(e,'registration-password-123','Synthetic applicant','en');expect(smtp.messages.length).toBe(count+1);
 expect((await db.user.findUniqueOrThrow({where:{email:e}})).id).toBe(before.id);
},30000);
test('verified existing users log in directly and gain their dashboard without changing credentials',async()=>{
 const u=await identity(),count=await db.organizationMember.count({where:{userId:u.id}});
 const token=await loginApplicant(u.email!,'existing-password-123','ps');
 expect((await getApplicantSession(token))?.id).toBe(u.id);
 expect((await db.applicantProfile.findUniqueOrThrow({where:{userId:u.id}})).preferredLocale).toBe('ps');
 expect((await db.user.findUniqueOrThrow({where:{id:u.id}})).passwordHash).toBe(u.passwordHash);
 expect(await db.organizationMember.count({where:{userId:u.id}})).toBe(count);
},30000);
test('wrong passwords and unverified existing users cannot acquire a profile or session',async()=>{
 const u=await identity(false);await expect(loginApplicant(u.email!,'wrong-password')).rejects.toThrow('invalid_credentials');await expect(loginApplicant(u.email!,'existing-password-123')).rejects.toThrow('email_not_verified');
 expect(await db.applicantProfile.findUnique({where:{userId:u.id}})).toBeNull();expect(await db.session.count({where:{userId:u.id}})).toBe(0);
 await sendVerification(u.email!,'en');const link=accountMailLink(smtp.messages.at(-1)!);expect(await verifyApplicantEmail(u.email!,link.searchParams.get('token')!)).toBe(true);
 expect((await getApplicantSession(await loginApplicant(u.email!,'existing-password-123')))?.id).toBe(u.id);
},30000);
test('verified existing users can recover a password before their first applicant login',async()=>{
 const u=await identity();await forgotApplicantPassword(u.email!,'en');const link=accountMailLink(smtp.messages.at(-1)!);
 expect(link.pathname).toBe('/en/reset-password');await resetApplicantPassword(link.searchParams.get('token')!,'recovered-password-123');
 await expect(loginApplicant(u.email!,'existing-password-123')).rejects.toThrow('invalid_credentials');expect((await getApplicantSession(await loginApplicant(u.email!,'recovered-password-123')))?.id).toBe(u.id);
},30000);
test('concurrent registration creates one identity and leaves credentials unchanged',async()=>{
 const e=email();const outcomes=await Promise.allSettled([registerApplicant(e,'registration-password-123','Synthetic','en'),registerApplicant(e,'registration-password-123','Synthetic','en')]);
 expect(outcomes.every(o=>o.status==='fulfilled')).toBe(true);expect(await db.user.count({where:{email:e}})).toBe(1);
},30000);
