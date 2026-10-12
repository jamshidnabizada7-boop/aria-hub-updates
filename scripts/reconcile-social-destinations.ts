/** Reconcile inspected ARIA HUB destinations. Dry run unless --apply is supplied.
 * Existing OAuth credentials stay on the server; no new access is granted.
 * Run with the application's production environment and a private backup dir.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { db } from '../src/lib/db';
import { decryptCredentials, encryptCredentials } from '../src/lib/social/credentials';

const apply = process.argv.includes('--apply');
const expectedSubject = 'U3Zc3dYH4o';
const linkedin = await db.publishChannel.findUniqueOrThrow({ where: { platform: 'linkedin' } });
const credentials = decryptCredentials(linkedin.credentials);
const identity = await fetch('https://api.linkedin.com/v2/userinfo', {
  headers: { Authorization: `Bearer ${credentials.accessToken}` }, signal: AbortSignal.timeout(15000),
});
const user = await identity.json() as { sub?: string; name?: string };
if (!identity.ok || user.sub !== expectedSubject || user.name !== 'Ahmad Jamshid Nabizada') {
  throw new Error('Existing credential does not identify the inspected ARIA HUB owner. No changes made.');
}
const authorUrn = `urn:li:person:${user.sub}`;
// Initialize an unpublished image asset: checks actual member media permission
// without publishing a test message to followers.
const media = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
  method: 'POST', headers: {
    Authorization: `Bearer ${credentials.accessToken}`, 'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0', 'LinkedIn-Version': process.env.LINKEDIN_API_VERSION || '202609',
  }, body: JSON.stringify({ initializeUploadRequest: { owner: authorUrn } }), signal: AbortSignal.timeout(15000),
});
await media.body?.cancel();
if (!media.ok) throw new Error(`Member media preflight rejected (${media.status}). No changes made.`);
console.log(JSON.stringify({ apply, linkedin: { name: user.name, authorUrn, memberMediaPermission: true },
  instagram: 'left_disabled_pending_owner_approval', whatsapp: 'existing_direct_message_API_preserved',
  publicLinks: ['https://www.instagram.com/aria___hub/', 'https://www.linkedin.com/company/aria-hub/',
    'https://whatsapp.com/channel/0029Vb64Wf25q08koeYn8b3h'] }));
if (apply) {
  const backupDir = process.env.SOCIAL_RECONCILE_BACKUP_DIR;
  if (!backupDir) throw new Error('SOCIAL_RECONCILE_BACKUP_DIR must point to restricted server storage.');
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  const backup = join(backupDir, `connections-${Date.now()}.json`);
  await writeFile(backup, JSON.stringify({ channels: await db.publishChannel.findMany(),
    links: await db.socialLink.findMany() }), { mode: 0o600, flag: 'wx' });
  await db.$transaction(async tx => {
    await tx.publishChannel.update({ where: { id: linkedin.id }, data: {
      label: 'LinkedIn — Ahmad Jamshid Nabizada profile',
      credentials: encryptCredentials({ ...credentials, authorUrn }), enabled: true,
      lastStatus: 'connection_verified', lastError: null,
    } });
    await tx.publishChannel.update({ where: { platform: 'facebook' }, data: { label: 'Facebook — Aria Hub Page' } });
    await tx.publishChannel.update({ where: { platform: 'whatsapp' }, data: { label: 'WhatsApp — direct messages (API)' } });
    await tx.socialLink.updateMany({ where: { platform: 'instagram' }, data: { url: 'https://www.instagram.com/aria___hub/' } });
    for (const link of [
      { platform: 'linkedin', label: 'LinkedIn company Page', url: 'https://www.linkedin.com/company/aria-hub/', icon: 'Linkedin', color: '#0A66C2', order: 7 },
      { platform: 'whatsapp', label: 'WhatsApp Channel', url: 'https://whatsapp.com/channel/0029Vb64Wf25q08koeYn8b3h', icon: 'MessageCircle', color: '#25D366', order: 8 },
    ]) {
      const existing = await tx.socialLink.findFirst({ where: { url: link.url } });
      if (!existing) await tx.socialLink.create({ data: link });
    }
    // Discovery is not posting permission. Keep every researched external
    // community inactive until an admin verifies membership and link policy.
    for (const group of [
      { groupId: '2798071730475833', name: 'Jobs in Afghanistan', audience: 'job seekers',
        notes: 'Inspected 2026-10-12: public, 23,160 members, 19 posts/month. Rule forbids links/spam in comments. Current Facebook identity is not a member. Group-post promotional permission remains unverified; never place campaign links in comments.' },
      { groupId: '981518689829972', name: 'Scholarship for Afghanistan بورسیه تحصیلی برای افغانستان', audience: 'scholarship seekers',
        notes: 'Excluded from promotional distribution. Inspected 2026-10-12: rule 2 explicitly prohibits self-promotion, other Pages content and links. 21,268 members; only 4 posts/month. Do not enable ARIA promotional campaigns here.' },
      { groupId: '901050738400274', name: 'Scholarship & Job opportunities فرصت های وظیفوی و بورسیه ها', audience: 'jobs and scholarships',
        notes: 'Candidate only. Inspected 2026-10-12: public, 3,939 members, 118 posts/month, 4 posts today. No posting rules displayed in About; current identity is not a member. Obtain group admin permission for website promotional links before activation.' },
    ]) {
      const url = `https://www.facebook.com/groups/${group.groupId}/`;
      if (!await tx.facebookGroup.findFirst({ where: { url } })) {
        await tx.facebookGroup.create({ data: { ...group, url, region: 'Afghanistan', language: 'any', active: false, postingEligible: false, approvalRequired: true } });
      }
    }
    await tx.auditLog.create({ data: { action: 'social.destinations_reconciled', entity: 'PublishChannel', entityId: linkedin.id,
      details: JSON.stringify({ authorUrn, reusedExistingCredential: true, companyPublishing: 'provider_review_pending', instagram: 'owner_requested_pause' }) } });
  });
  console.log(JSON.stringify({ applied: true, backupSaved: true }));
}
await db.$disconnect();
