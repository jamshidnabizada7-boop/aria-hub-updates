import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { decryptCredentials, encryptCredentials } from './credentials';
import { META_GRAPH_VERSION } from './channels';

type Health = { platform: string; checkedAt: string; status: 'valid' | 'renewal_needed' | 'invalid' | 'unknown'; expiresAt: string | null; dataAccessExpiresAt: string | null; noScheduledExpiry: boolean; refreshConfigured: boolean; message: string };
export function tokenExpiry(seconds: unknown): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  const date = new Date(seconds * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
const isoExpiry = (value: unknown): string | null => {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
};

/** Runs inside the social tick's existing distributed lock. Never outputs secrets. */
export async function checkSocialTokenHealth(force = false): Promise<Health[]> {
  const stored = await db.automationState.findUnique({ where: { id: 'singleton' } });
  const state = (stored?.state ?? {}) as Record<string, unknown>;
  const previousCheck = Date.parse(String(state.lastSocialTokenCheckAt || ''));
  if (!force && Number.isFinite(previousCheck) && Date.now() - previousCheck < 24 * 3600000) return [];
  const previous = (state.socialTokenHealth ?? {}) as Record<string, Health>;
  const health: Health[] = [];
  for (const channel of await db.publishChannel.findMany({ where: { enabled: true, platform: { in: ['facebook', 'whatsapp', 'instagram', 'linkedin'] } } })) {
    let creds = decryptCredentials(channel.credentials);
    let expiresAt = isoExpiry(creds.expiresAt) || tokenExpiry(creds.expires_at);
    const clientId = String(creds.clientId || process.env.LINKEDIN_CLIENT_ID || '');
    const clientSecret = String(creds.clientSecret || process.env.LINKEDIN_CLIENT_SECRET || '');
    const refreshToken = String(creds.refreshToken || creds.refresh_token || '');
    const refreshConfigured = Boolean(refreshToken && clientId && clientSecret);
    const result: Health = { platform: channel.platform, checkedAt: new Date().toISOString(), status: 'unknown', expiresAt,
      dataAccessExpiresAt: null, noScheduledExpiry: false, refreshConfigured, message: 'Token expiry could not be verified. Reconnection may be required.' };
    try {
      if (channel.platform === 'linkedin') {
        // Only use a provider-issued refresh grant. Never infer a permanent token.
        if (refreshConfigured && expiresAt && Date.parse(expiresAt) - Date.now() < 7 * 86400000) {
          const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret }),
            signal: AbortSignal.timeout(15000),
          });
          const payload = await response.json();
          if (response.ok && typeof payload.access_token === 'string' && typeof payload.expires_in === 'number' && payload.expires_in > 0) {
            const next = { ...creds, accessToken: payload.access_token, expiresAt: new Date(Date.now() + payload.expires_in * 1000).toISOString(),
              ...(typeof payload.refresh_token === 'string' ? { refreshToken: payload.refresh_token } : {}) };
            const saved = await db.publishChannel.updateMany({ where: { id: channel.id, updatedAt: channel.updatedAt }, data: { credentials: encryptCredentials(next) as Prisma.InputJsonValue } });
            if (saved.count) { creds = next; expiresAt = next.expiresAt; result.expiresAt = expiresAt; }
          }
        }
        const response = await fetch('https://api.linkedin.com/v2/userinfo', { headers: { Authorization: `Bearer ${String(creds.accessToken || '')}` }, signal: AbortSignal.timeout(10000) });
        result.status = response.ok ? 'valid' : response.status === 401 ? 'invalid' : 'unknown';
        result.message = response.ok
          ? expiresAt ? `LinkedIn token expires ${expiresAt.slice(0, 10)}. ${refreshConfigured ? 'Automatic renewal is configured.' : 'Reconnect before expiry; no refresh grant is saved.'}`
            : 'LinkedIn login works, but expiry is unknown and no permanent token is available. Reauthorize through LinkedIn when required.'
          : 'LinkedIn login could not be verified; check publishing settings.';
      } else {
        const url = new URL(`https://graph.facebook.com/${META_GRAPH_VERSION}/debug_token`);
        url.searchParams.set('input_token', String(creds.accessToken || ''));
        const response = await fetch(url, { headers: { Authorization: `Bearer ${String(creds.accessToken || '')}` }, signal: AbortSignal.timeout(10000) });
        const payload = await response.json();
        const data = payload.data;
        if (response.ok && data && typeof data.is_valid === 'boolean') {
          result.status = data.is_valid ? 'valid' : 'invalid';
          result.expiresAt = tokenExpiry(data.expires_at);
          result.dataAccessExpiresAt = tokenExpiry(data.data_access_expires_at);
          result.noScheduledExpiry = data.is_valid && data.expires_at === 0 && data.data_access_expires_at === 0;
          result.message = !data.is_valid ? 'Provider rejected this token. Reconnect the publishing account.'
            : result.noScheduledExpiry ? 'Provider reports no scheduled token or data-access expiry. Revocation and permission changes can still interrupt publishing.'
              : `Renew publishing access before ${[result.expiresAt, result.dataAccessExpiresAt].filter(Boolean).sort()[0]?.slice(0, 10) || 'the provider expiry date'}.`;
        } else if (payload.error?.code === 190) {
          result.status = 'invalid'; result.message = 'Provider rejected this token. Reconnect the publishing account.';
        }
      }
      if (result.status === 'valid' && [result.expiresAt, result.dataAccessExpiresAt].some(date => date && Date.parse(date) - Date.now() < 14 * 86400000)) result.status = 'renewal_needed';
    } catch { result.status = 'unknown'; result.message = 'Token health check unavailable; the existing publishing credentials were retained.'; }
    health.push(result);
    const old = previous[channel.platform];
    if (!old || old.status !== result.status || old.expiresAt !== result.expiresAt || old.noScheduledExpiry !== result.noScheduledExpiry) {
      await db.pipelineRun.create({ data: { kind: 'social_token_health', status: result.status === 'invalid' ? 'error' : result.status === 'valid' ? 'ok' : 'partial',
        message: `${channel.label}: ${result.message}`, stats: result, finishedAt: new Date() } });
    }
  }
  const patch = JSON.stringify({ lastSocialTokenCheckAt: new Date().toISOString(), socialTokenHealth: Object.fromEntries(health.map(h => [h.platform, h])) });
  await db.$executeRaw`UPDATE "AutomationState" SET state = state || ${patch}::jsonb, "updatedAt" = now() WHERE id = 'singleton'`;
  return health;
}
