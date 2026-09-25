export const DEFAULT_OPPORTUNITY_DAILY_TARGET = 30;
export const DEFAULT_OPPORTUNITY_BATCH_SIZE = 5;
export const DEFAULT_OPPORTUNITY_REPEAT_DAYS = 14;
export const DEFAULT_OPPORTUNITY_BATCH_TIMES_AFT = [
  '08:00',
  '10:30',
  '13:00',
  '15:30',
  '18:00',
  '20:30',
];

export function opportunityDistributionCapacity(slots: string[], batchSize: number): number {
  return Math.max(0, slots.length) * Math.max(1, Math.floor(batchSize || 1));
}

export function opportunityScheduleForIndex(
  index: number,
  slots: string[],
  batchSize: number,
): { slot: string; offsetMinutes: number } | null {
  if (!slots.length || index < 0) return null;
  const safeBatchSize = Math.max(1, Math.floor(batchSize || 1));
  const batchIndex = Math.floor(index / safeBatchSize);
  if (batchIndex >= slots.length) return null;
  return {
    slot: slots[batchIndex],
    offsetMinutes: (index % safeBatchSize) * 2,
  };
}
