import { describe, expect, test } from 'bun:test';
import { deadlineSnapshot, rotatedFamily, ROTATION_POOLS } from '../src/lib/social/studio/rotation';
import { designFamiliesForTemplate } from '../src/lib/social/studio/registry';

describe('editorial distribution', () => {
  test('rotates each category without adjacent repeats and survives retry', () => {
    for (const [template, category, pool] of [['spotlight','Job',ROTATION_POOLS.career],['spotlight','Scholarship',ROTATION_POOLS.scholarship],['deadline','Job',ROTATION_POOLS.deadline]] as const) {
      const results = Array.from({length:12},(_,i)=>rotatedFamily(template,category,'2026-10-11',i));
      expect(new Set(results).size).toBe(3);
      results.forEach((id,i)=>{
        expect(pool as readonly string[]).toContain(id!);
        expect(designFamiliesForTemplate(template).map(f=>f.id)).toContain(id!);
        expect(id).toBe(rotatedFamily(template,category,'2026-10-11',i));
        if (i) expect(id).not.toBe(results[i-1]);
      });
    }
    expect(rotatedFamily('news','News','day')).toBeNull();
  });
  test('countdown handles missing, invalid, expired and exact boundaries honestly', () => {
    const now = Date.parse('2026-10-11T12:00:00Z');
    expect(deadlineSnapshot(null,now)).toBeNull();
    expect(deadlineSnapshot('invalid',now)).toBeNull();
    expect(deadlineSnapshot('2026-10-11T12:00:00Z',now)?.status).toBe('closed');
    expect(deadlineSnapshot('2026-10-10T12:00:00Z',now)?.value).toBe(0);
    expect(deadlineSnapshot('2026-10-11T12:01:00Z',now)).toEqual({status:'urgent',value:1,unit:'hours'});
    expect(deadlineSnapshot('2026-10-14T12:00:00Z',now)).toEqual({status:'open',value:3,unit:'days'});
    expect(deadlineSnapshot('2026-10-11',now)?.status).toBe('urgent');
  });
});
