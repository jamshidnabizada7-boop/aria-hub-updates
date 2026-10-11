import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { canManageSocial } from '@/lib/social/permissions';

export const dynamic='force-dynamic';
const schema=z.object({
  campaignId:z.string().min(1).max(80),
  confirmManualQueue:z.literal(true),
}).strict();

export async function POST(req:NextRequest){
  const admin=await getCurrentAdmin();
  if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!canManageSocial(admin.role))return NextResponse.json({error:'Forbidden'},{status:403});
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'Explicit queue confirmation required'},{status:400});
  try {
    const result=await db.$transaction(async tx=>{
      const c=await tx.studioCampaign.findUnique({where:{id:parsed.data.campaignId}});
      if(!c)throw new Error('Campaign not found');
      if(c.queueId)return {id:c.queueId,existing:true};
      if(c.status!=='approved'||!c.posterUrl)throw new Error('An approved campaign and durable final poster are required');
      const url=new URL(c.posterUrl);
      if(url.protocol!=='https:'||!url.hostname.endsWith('.public.blob.vercel-storage.com'))throw new Error('Only durable approved public image URLs are permitted');
      const fields=c.content as {headline:string;caption:string;note?:string};
      if(!fields.caption.trim()||!fields.headline.trim())throw new Error('Empty headline or caption');
      const row=await tx.socialPostQueue.create({data:{
        scheduledFor:new Date(),
        templateType:'promo',
        contentRef:'editorial-'+c.id,
        contentJson:{template:'promo',lang:c.language,size:c.format,title:fields.headline,note:fields.note||'',source:'studio-campaign',campaignId:c.id},
        captionJson:{[c.language]:fields.caption},
        status:'ready',imageStatus:'ready',
        imagePaths:{square:c.posterUrl,portrait:c.posterUrl},
        requiresManualPublish:true,
      }});
      const changed=await tx.studioCampaign.updateMany({
        where:{id:c.id,queueId:null,status:'approved'},
        data:{queueId:row.id},
      });
      if(!changed.count)throw new Error('Campaign was concurrently updated; retry');
      return {id:row.id,existing:false};
    });
    return NextResponse.json({ok:true,queueId:result.id,existing:result.existing,note:'Manual-only queue row created. This endpoint never sends a social post.'});
  }catch(e){
    return NextResponse.json({error:e instanceof Error?e.message:'Queue operation failed'},{status:409});
  }
}
