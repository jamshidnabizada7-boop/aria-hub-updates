import {describe,test,expect} from 'bun:test';
import {median,summarizeEditorialInsights} from '../src/lib/social/editorial/analytics';

describe('editorial analytics',()=>{
 test('keeps unknown values unknown, including paid classification',()=>{
   expect(median([null,undefined])).toBeNull();
   expect(median([2,4,12])).toBe(4);
   expect(median([2,6])).toBe(4);
 });
 test('does not double-count later analytics snapshots',()=>{
   const base={campaignId:'c1',pillar:'career-skills',platform:'facebook',paid:false,interactions:0};
   const s=summarizeEditorialInsights([
     {...base,capturedAt:new Date('2026-10-01'),views:20,reach:7},
     {...base,capturedAt:new Date('2026-10-02'),views:50,reach:20},
     {...base,campaignId:'c2',capturedAt:new Date('2026-10-01'),views:30,reach:10},
     {...base,campaignId:'c3',paid:null,capturedAt:new Date('2026-10-01'),views:100,reach:40},
   ]);
   expect(s.totalPosts).toBe(3);
   expect(s.organic[0].posts).toBe(2);
   expect(s.organic[0].medianViews).toBe(40);
   expect(s.organic[0].medianReach).toBe(15);
   expect(s.unclassified[0].posts).toBe(1);
   expect(s.paid).toHaveLength(0);
 });
});
