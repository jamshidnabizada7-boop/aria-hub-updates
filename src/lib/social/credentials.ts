/**
 * Channel-credential encryption at rest.
 *
 * Publishing credentials (bot tokens, page access tokens) used to sit in
 * `PublishChannel.credentials` as plaintext JSON AND were returned verbatim
 * by the admin API. Now:
 *   - save path  → encryptCredentials() before storage (AES-256-GCM)
 *   - publish path → decryptCredentials() only inside the server process
 *   - admin API  → maskCredentials() never returns secrets to the browser
 *
 * Key: CREDENTIALS_SECRET (preferred) or ADMIN_SESSION_SECRET, hashed to 32
 * bytes. With neither set (dev machines), values are stored as-is and a
 * single warning is logged — production hard-fails without a session secret
 * anyway (see src/lib/admin-auth.ts).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

let warned = false;

function key(): Buffer | null {
  const secret = process.env.CREDENTIALS_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    if (!warned) {
      warned = true;
      console.warn(
        '⚠️  CREDENTIALS_SECRET/ADMIN_SESSION_SECRET not set — channel credentials stored UNENCRYPTED. Set CREDENTIALS_SECRET in production.',
      );
    }
    return null;
  }
  return createHash('sha256').update(secret).digest();
}

export function isEncrypted(value: unknown): boolean {
  return Boolean(
    value && typeof value === 'object' && (value as Record<string, unknown>).__enc === 1,
  );
}

/** Encrypt a credentials object for storage. Returns a Json-safe value. */
export function encryptCredentials(creds: Record<string, unknown>): Record<string, unknown> {
  const k = key();
  if (!k) return creds;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', k, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(creds), 'utf8'), cipher.final()]);
  return {
    __enc: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
}

/** Decrypt a stored credentials value (plaintext values pass through). */
export function decryptCredentials(value: unknown): Record<string, unknown> {
  if (!isEncrypted(value)) return (value ?? {}) as Record<string, unknown>;
  const k = key();
  if (!k) return {};
  try {
    const box = value as { iv: string; tag: string; data: string };
    const decipher = createDecipheriv('aes-256-gcm', k, Buffer.from(box.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(box.tag, 'base64'));
    const out = Buffer.concat([
      decipher.update(Buffer.from(box.data, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(out.toString('utf8')) as Record<string, unknown>;
  } catch {
    // Wrong key or tampered payload — fail closed (publishing will report
    // missing credentials rather than leaking or misfiring).
    return {};
  }
}

/** Fields that identify a channel but are not secrets — safe to show admins. */
const PUBLIC_FIELDS = new Set(['chatId', 'pageId', 'igUserId', 'username']);

/**
 * Admin-API view of a channel's credentials: which fields are configured,
 * plus the non-secret identifiers (chatId/pageId/igUserId — handy for
 * verifying the right account). Secret values never leave the server.
 */
export function maskCredentials(creds: unknown): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  const wasEncrypted = isEncrypted(creds);
  if (wasEncrypted) out.__encrypted = true;
  const c = decryptCredentials(creds);
  for (const [k, v] of Object.entries(c)) {
    if (typeof v !== 'string' || !v) continue;
    out[k] = PUBLIC_FIELDS.has(k) ? v : true;
  }
  return out;
}
