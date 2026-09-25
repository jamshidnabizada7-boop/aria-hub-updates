import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_OPPORTUNITY_BATCH_SIZE,
  DEFAULT_OPPORTUNITY_BATCH_TIMES_AFT,
  DEFAULT_OPPORTUNITY_DAILY_TARGET,
  opportunityDistributionCapacity,
  opportunityScheduleForIndex,
} from '../src/lib/social/opportunity-distribution-schedule';

describe('opportunity distribution scheduling', () => {
  test('default schedule supports the default 30-post target', () => {
    expect(DEFAULT_OPPORTUNITY_DAILY_TARGET).toBe(30);
    expect(opportunityDistributionCapacity(
      DEFAULT_OPPORTUNITY_BATCH_TIMES_AFT,
      DEFAULT_OPPORTUNITY_BATCH_SIZE,
    )).toBe(30);
  });

  test('five posts in a batch are staggered by two minutes', () => {
    const slots = ['08:00', '13:00'];
    expect(opportunityScheduleForIndex(0, slots, 5)).toEqual({ slot: '08:00', offsetMinutes: 0 });
    expect(opportunityScheduleForIndex(1, slots, 5)).toEqual({ slot: '08:00', offsetMinutes: 2 });
    expect(opportunityScheduleForIndex(4, slots, 5)).toEqual({ slot: '08:00', offsetMinutes: 8 });
    expect(opportunityScheduleForIndex(5, slots, 5)).toEqual({ slot: '13:00', offsetMinutes: 0 });
  });

  test('indices beyond configured daily capacity are rejected', () => {
    expect(opportunityScheduleForIndex(10, ['08:00', '13:00'], 5)).toBeNull();
  });
});
