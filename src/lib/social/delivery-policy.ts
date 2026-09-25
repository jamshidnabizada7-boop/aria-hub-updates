export type SocialDeliveryErrorCode =
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'PERMISSION_MISSING'
  | 'MEDIA_UNREACHABLE'
  | 'DESTINATION_INVALID'
  | 'NETWORK_ERROR'
  | 'PLATFORM_ERROR';

export function classifySocialDeliveryError(input: {
  error?: string;
  rateLimited?: boolean;
  tokenExpired?: boolean;
}): SocialDeliveryErrorCode {
  if (input.tokenExpired) return 'AUTH_EXPIRED';
  if (input.rateLimited) return 'RATE_LIMITED';

  const msg = (input.error || '').toLowerCase();
  if (/permission|not authorized|insufficient|forbidden|scope/.test(msg)) return 'PERMISSION_MISSING';
  if (/image|photo|media|upload|fetch/.test(msg) && /fail|error|invalid|unreachable|403|404/.test(msg)) return 'MEDIA_UNREACHABLE';
  if (/does not exist|invalid.*(?:id|destination|recipient|page|organization)|not found/.test(msg)) return 'DESTINATION_INVALID';
  if (/timeout|timed out|abort|network|econn|fetch failed/.test(msg)) return 'NETWORK_ERROR';
  return 'PLATFORM_ERROR';
}

export function isRetryableDeliveryError(code: SocialDeliveryErrorCode): boolean {
  return ['RATE_LIMITED', 'MEDIA_UNREACHABLE', 'NETWORK_ERROR', 'PLATFORM_ERROR'].includes(code);
}

export function deliveryRetryDelayMinutes(attempts: number): number {
  const n = Math.max(1, attempts);
  return Math.min(60, 5 * Math.pow(3, n - 1));
}
