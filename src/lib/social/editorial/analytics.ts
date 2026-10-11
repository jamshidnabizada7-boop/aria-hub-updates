/**
 * Manual Meta insights aggregation. Compare per-post median, not a boosted
 * account-wide view total with an organic post reach number.
 */
export type EditorialInsight = {
  campaignId: string; pillar: string; platform: string; paid: boolean | null;
  capturedAt: Date; views: number | null; reach: number | null; interactions: number | null;
};
export type EditorialSummary = {
  label: string; posts: number; medianViews: number | null;
  medianReach: number | null; medianInteractions: number | null;
};
export function median(values: (number | null | undefined)[]): number | null {
  const xs = values.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)).sort((a,b)=>a-b);
  if(!xs.length)return null;
  const half=Math.floor(xs.length/2);
  return xs.length%2?xs[half]:(xs[half-1]+xs[half])/2;
}
export function summarizeEditorialInsights(items: EditorialInsight[]): {
  totalPosts: number; organic: EditorialSummary[]; paid: EditorialSummary[]; unclassified: EditorialSummary[];
} {
  // A campaign can have many snapshots; each post counts once using the latest.
  const latest = new Map<string,EditorialInsight>();
  for(const row of items){
    const key=row.campaignId+':'+row.platform;
    const previous=latest.get(key);
    if(!previous||new Date(row.capturedAt).getTime()>new Date(previous.capturedAt).getTime())latest.set(key,row);
  }
  const entries=[...latest.values()];
  const group=(paid:boolean|null)=>{
    const map=new Map<string,EditorialInsight[]>();
    for(const v of entries.filter(x=>x.paid===paid)){
      const key=v.platform+' / '+v.pillar;
      map.set(key,[...(map.get(key)??[]),v]);
    }
    return [...map.entries()].map(([label,rows])=>({
      label, posts:rows.length,
      medianViews:median(rows.map(x=>x.views)),
      medianReach:median(rows.map(x=>x.reach)),
      medianInteractions:median(rows.map(x=>x.interactions)),
    })).sort((a,b)=>(b.medianReach??-1)-(a.medianReach??-1));
  };
  return { totalPosts:entries.length,organic:group(false),paid:group(true),unclassified:group(null) };
}
