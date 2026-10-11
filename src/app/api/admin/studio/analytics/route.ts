import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { canManageSocial } from '@/lib/social/permissions';
import { summarizeEditorialInsights } from '@/lib/social/editorial/analytics';

export const dynamic='force-dynamic';

export async function GET(){
  const admin=await getCurrentAdmin();
  if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!canManageSocial(admin.role))return NextResponse.json({error:'Forbidden'},{status:403});
  const rows=await db.studioCampaignMetric.findMany({
    take:2000,orderBy:{capturedAt:'desc'},
    select:{
      campaignId:true,platform:true,paid:true,capturedAt:true,
      views:true,reach:true,interactions:true,
      campaign:{select:{pillar:true}},
    },
  });
  const summary=summarizeEditorialInsights(rows.map(x=>({
    campaignId:x.campaignId,platform:x.platform,paid:x.paid,capturedAt:x.capturedAt,
    pillar:x.campaign.pillar,views:x.views,reach:x.reach,interactions:x.interactions,
  })));
  return NextResponse.json({
    ok:true,origin:'manual',sampleSize:rows.length,
    note:'Manual snapshots only; paid vs organic is user-classified. Missing values are not zeros.',
    summary,
  });
}
