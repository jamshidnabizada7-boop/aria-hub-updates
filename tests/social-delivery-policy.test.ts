import { describe, expect, test } from 'bun:test';
import {
  classifySocialDeliveryError,
  deliveryRetryDelayMinutes,
  isRetryableDeliveryError,
} from '../src/lib/social/delivery-policy';

describe('social delivery policy', () => {
  test('classifies authentication and rate limits explicitly', () => {
    expect(classifySocialDeliveryError({ tokenExpired: true })).toBe('AUTH_EXPIRED');
    expect(classifySocialDeliveryError({ rateLimited: true })).toBe('RATE_LIMITED');
  });

  test('classifies permission, media, destination and network failures', () => {
    expect(classifySocialDeliveryError({ error: '403 insufficient permission scope' })).toBe('PERMISSION_MISSING');
    expect(classifySocialDeliveryError({ error: 'image fetch 404 failed' })).toBe('MEDIA_UNREACHABLE');
    expect(classifySocialDeliveryError({ error: 'invalid page id does not exist' })).toBe('DESTINATION_INVALID');
    expect(classifySocialDeliveryError({ error: 'network timeout while fetching' })).toBe('NETWORK_ERROR');
  });

  test('only transient categories are retryable', () => {
    expect(isRetryableDeliveryError('RATE_LIMITED')).toBe(true);
    expect(isRetryableDeliveryError('NETWORK_ERROR')).toBe(true);
    expect(isRetryableDeliveryError('MEDIA_UNREACHABLE')).toBe(true);
    expect(isRetryableDeliveryError('AUTH_EXPIRED')).toBe(false);
    expect(isRetryableDeliveryError('PERMISSION_MISSING')).toBe(false);
    expect(isRetryableDeliveryError('DESTINATION_INVALID')).toBe(false);
  });

  test('retry delay uses bounded exponential backoff', () => {
    expect(deliveryRetryDelayMinutes(1)).toBe(5);
    expect(deliveryRetryDelayMinutes(2)).toBe(15);
    expect(deliveryRetryDelayMinutes(3)).toBe(45);
    expect(deliveryRetryDelayMinutes(4)).toBe(60);
  });
});
