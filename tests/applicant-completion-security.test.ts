import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { db } from '../src/lib/db';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { changeEmployerPassword, createPasswordResetToken, resetEmployerPassword } from '../src/lib/employer-auth';
import { changeApplicantPassword, getApplicantSession, newApplicantSession, resetApplicantPassword } from '../src/lib/applicant-auth';
import { exportApplicantData, requestAccountDeletion, processAccountDeletion } from '../src/lib/applicants/account-privacy';
const url=new URL(process.env.DATABASE_URL||'postgresql://localhost/no_database');
if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw Error('isolated_database_required');
const ids:string[]=[];
async function account(){
 const user=await db.user.create({data:{email:'completion-'+randomBytes(10).toString('hex')+'@test.invalid',name:'Synthetic Applicant',passwordHash:await bcrypt.hash('old-password-123',12),emailVerified:new Date(),applicantProfile:{create:{}}},include:{applicantProfile:true}});ids.push(user.id);return user;
}
beforeAll(async()=>{await db.$queryRaw`SELECT 1`;});
afterAll(async()=>{await db.user.deleteMany({where:{id:{in:ids}}});await db.applicantDeletionJob.deleteMany({where:{userId:{in:ids}}});});
describe('shared identity session and reset repair',()=>{
 test('employer password change revokes applicant sessions and outstanding reset token',async()=>{
  const user=await account(),session=await newApplicantSession(user.id);
  await db.user.update({where:{id:user.id},data:{passwordResetToken:'old-reset',passwordResetExpires:new Date(Date.now()+60000)}});
  await changeEmployerPassword(user.id,'old-password-123','new-password-123');
  expect(await getApplicantSession(session)).toBeNull();
  expect((await db.user.findUniqueOrThrow({where:{id:user.id}})).passwordResetToken).toBeNull();
 });
 test('employer reset is single use under concurrency and revokes applicant session',async()=>{
  const user=await account(),session=await newApplicantSession(user.id),token=await createPasswordResetToken(user.email!);
  const results=await Promise.allSettled([resetEmployerPassword(token.token!,'new-password-123'),resetEmployerPassword(token.token!,'other-password-123')]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(await getApplicantSession(session)).toBeNull();
 },15000);
 test('applicant reset is single use under concurrency',async()=>{
  const user=await account(),raw=randomBytes(32).toString('base64url'),session=await newApplicantSession(user.id);
  await db.user.update({where:{id:user.id},data:{passwordResetToken:createHash('sha256').update(raw).digest('hex'),passwordResetExpires:new Date(Date.now()+60000)}});
  const results=await Promise.allSettled([resetApplicantPassword(raw,'new-password-123'),resetApplicantPassword(raw,'other-password-123')]);
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(await getApplicantSession(session)).toBeNull();
 },15000);
 test('password change clears earlier reset links and rotates all applicant sessions',async()=>{
  const user=await account(),old=await newApplicantSession(user.id);
  await db.user.update({where:{id:user.id},data:{passwordResetToken:'old-reset',passwordResetExpires:new Date(Date.now()+60000)}});
  const fresh=await changeApplicantPassword(user.id,'old-password-123','new-password-123');
  expect(await getApplicantSession(old)).toBeNull();expect((await getApplicantSession(fresh))?.id).toBe(user.id);
  expect((await db.user.findUniqueOrThrow({where:{id:user.id}})).passwordResetToken).toBeNull();
 });
 test('a login password snapshot cannot mint a session after the password changes',async()=>{
  const user=await account();await changeEmployerPassword(user.id,'old-password-123','new-password-123');
  await expect(newApplicantSession(user.id,user.passwordHash!)).rejects.toThrow('invalid_credentials');
 });
});
describe('private export and durable deletion',()=>{
 test('export excludes credentials, object keys and provider secrets',async()=>{
  const user=await account(),other=await account();
  await db.applicantDocument.create({data:{applicantProfileId:user.applicantProfile!.id,originalName:'private.pdf',mimeType:'application/pdf',byteSize:100,sha256:'a'.repeat(64),storageKey:user.id+'/private-object.pdf'}});
  const exported=JSON.stringify(await exportApplicantData(db,user.id));
  expect(exported).toContain('private.pdf');expect(exported).not.toContain(other.email!);expect(exported).not.toMatch(/passwordHash|sessionToken|storageKey|encryptedSubscription/);
 });
 test('wrong-password deletion has no side effects',async()=>{
  const user=await account();await expect(requestAccountDeletion(db,user.id,'incorrect')).rejects.toThrow('invalid_credentials');
  expect((await db.user.findUniqueOrThrow({where:{id:user.id}})).disabled).toBe(false);
 });
 test('storage outage retains document references; retry completes purge and is idempotent',async()=>{
  const user=await account(),other=await account(),session=await newApplicantSession(user.id);
  const doc=await db.applicantDocument.create({data:{applicantProfileId:user.applicantProfile!.id,originalName:'private.pdf',mimeType:'application/pdf',byteSize:100,sha256:'a'.repeat(64),storageKey:user.id+'/private-object.pdf'}});
  const job=await requestAccountDeletion(db,user.id,'old-password-123');
  expect(await getApplicantSession(session)).toBeNull();
  await expect(processAccountDeletion(db,job.id,async()=>{throw Error('provider_down');})).rejects.toThrow();
  expect(await db.applicantDocument.findUnique({where:{id:doc.id}})).not.toBeNull();
  let removed=0;await processAccountDeletion(db,job.id,async()=>{removed++;});
  expect(removed).toBe(1);expect(await db.user.findUnique({where:{id:user.id}})).toBeNull();
  expect(await db.user.findUnique({where:{id:other.id}})).not.toBeNull();
  await processAccountDeletion(db,job.id,async()=>{throw Error('should_not_run');});
  expect((await db.applicantDeletionJob.findUniqueOrThrow({where:{id:job.id}})).status).toBe('complete');
 },15000);
});
