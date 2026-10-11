import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import OpenAI from 'openai';
import { put } from '@vercel/blob';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { canManageSocial } from '@/lib/social/permissions';
import { db } from '@/lib/db';

export const dynamic='force-dynamic';
export const maxDuration=120;
const input=z.object({
  prompt:z.string().trim().min(30).max(900),
  acknowledgeCost:z.literal(true),
  acknowledgeArtworkReview:z.literal(true),
}).strict();

/**
 * Explicitly optional; both a server-side feature flag and a per-request
 * admin confirmation are required. Generated art is stored as disabled in
 * StudioVisual until an administrator reviews/approves it.
 */
export async function POST(req:NextRequest){
  const admin=await getCurrentAdmin();
  if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!canManageSocial(admin.role))return NextResponse.json({error:'Forbidden'},{status:403});
  if(process.env.STUDIO_IMAGE_GENERATION_ENABLED!=='true'){
    return NextResponse.json({error:'Image generation is disabled. Configure STUDIO_IMAGE_GENERATION_ENABLED to enable pay-per-use requests.'},{status:503});
  }
  if(!process.env.OPENAI_API_KEY || !process.env.BLOB_READ_WRITE_TOKEN){
    return NextResponse.json({error:'Image generation requires configured OpenAI and Blob storage credentials.'},{status:503});
  }
  const parsed=input.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'Prompt and explicit usage acknowledgement required'},{status:400});
  const {prompt}=parsed.data;
  const creativeBrief=[
    'Generate original editorial background artwork for ARIA HUB, a multilingual education and career opportunities platform.',
    'Avoid any lettering, text, numbers, brand marks, or watermarks. Those are added in an editable text layer later.',
    'Do not copy PIXGRAP designs, competitor robot mascots or existing copyrighted artwork.',
    'One strong visual subject, crisp silhouette and compositional whitespace for a later headline.',
    'Premium cinematic commercial art direction, adaptable to portrait social media.',
    'The artwork must not pretend to show a real scholarship recipient, real applicant, or real documented event.',
    prompt,
  ].join('\n');
  try {
    const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:95000,maxRetries:0});
    const image=await client.images.generate({model:'gpt-image-1',prompt:creativeBrief,size:'1024x1536',n:1});
    const encoded=image.data?.[0]?.b64_json;
    if(!encoded)throw new Error('Image provider did not return artwork bytes');
    const buffer=Buffer.from(encoded,'base64');
    if(buffer.length===0||buffer.length>15*1024*1024)throw new Error('Image output exceeds expected size');
    const path=`studio-visuals/creative-${crypto.randomUUID()}.png`;
    const blob=await put(path,buffer,{access:'public',contentType:'image/png',addRandomSuffix:false,token:process.env.BLOB_READ_WRITE_TOKEN});
    const visual=await db.studioVisual.create({
      data:{label:'Generated artwork — review before enabling',category:'generated-review',url:blob.url,enabled:false,order:1000},
    });
    return NextResponse.json({
      ok:true,asset:{id:visual.id,url:visual.url,enabled:false},
      note:'Asset is disabled until an administrator reviews rights, quality, and factual context in Studio Visuals.',
    });
  }catch{
    // Do not return raw provider errors; these can contain partial request details.
    return NextResponse.json({error:'Artwork generation or storage failed. Check provider quota and storage configuration.'},{status:502});
  }
}
