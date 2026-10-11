import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { canManageSocial } from '@/lib/social/permissions';

export const dynamic='force-dynamic';
export const maxDuration=60;
const schema=z.object({
  campaignId:z.string().min(1).max(80),
  headline:z.string().max(200),
  recipeId:z.string().max(80),
  png:z.string().max(16_000_000),
}).strict();

export async function POST(req:NextRequest){
  const admin=await getCurrentAdmin();
  if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!canManageSocial(admin.role))return NextResponse.json({error:'Forbidden'},{status:403});
  if(!process.env.BLOB_READ_WRITE_TOKEN)return NextResponse.json({error:'Durable media storage not configured'},{status:503});
  const p=schema.safeParse(await req.json().catch(()=>null));
  if(!p.success)return NextResponse.json({error:'Invalid media upload'},{status:400});
  const c=await db.studioCampaign.findUnique({where:{id:p.data.campaignId}});
  if(!c||c.status!=='approved'||c.queueId)return NextResponse.json({error:'Campaign must be approved and not queued'},{status:409});
  const saved=c.content as {headline?:string};
  if(saved.headline!==p.data.headline||c.recipeId!==p.data.recipeId)return NextResponse.json({error:'Preview differs from approved campaign; save and reapprove before upload'},{status:409});
  if(!p.data.png.startsWith('data:image/png;base64,'))return NextResponse.json({error:'PNG image data required'},{status:400});
  const bytes=Buffer.from(p.data.png.slice('data:image/png;base64,'.length),'base64');
  const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
  if(bytes.length<1024||bytes.length>11*1024*1024||!bytes.subarray(0,8).equals(pngSignature))return NextResponse.json({error:'Invalid PNG file'},{status:400});
  try {
    const blob=await put(`studio-posters/${c.id}-${crypto.randomUUID()}.png`,bytes,{
      token:process.env.BLOB_READ_WRITE_TOKEN,access:'public',contentType:'image/png',addRandomSuffix:false,
    });
    await db.studioCampaign.update({where:{id:c.id},data:{posterUrl:blob.url}});
    return NextResponse.json({ok:true,posterUrl:blob.url,note:'Durable approved PNG saved. This does not queue or publish the campaign.'});
  }catch{
    return NextResponse.json({error:'Unable to store approved poster'},{status:502});
  }
}
