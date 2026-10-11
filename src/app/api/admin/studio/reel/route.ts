import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { put } from '@vercel/blob';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { db } from '@/lib/db';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { canManageSocial } from '@/lib/social/permissions';
import { isAllowedStudioMediaUrl } from '@/lib/social/studio/media-url';
import { renderStoryboard } from '@/../scripts/studio/render-storyboard';

export const dynamic='force-dynamic';
export const maxDuration=120;

const schema=z.object({
  visualIds:z.array(z.string().min(1).max(80)).min(2).max(6),
  secondsPerSlide:z.number().int().min(2).max(8),
  acknowledgeRights:z.literal(true),
  acknowledgeRenderingCost:z.literal(true),
}).strict();

/**
 * Optional admin-triggered Reel assembler. All slides must be enabled
 * StudioVisual records already approved by the owner; no arbitrary URL input.
 * Uses local ffmpeg, limited temp storage, and the existing durable Blob path.
 */
export async function POST(req:NextRequest){
  const admin=await getCurrentAdmin();
  if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(!canManageSocial(admin.role))return NextResponse.json({error:'Forbidden'},{status:403});
  if(process.env.STUDIO_REEL_RENDER_ENABLED!=='true'||!process.env.BLOB_READ_WRITE_TOKEN){
    return NextResponse.json({error:'Reel rendering disabled or media storage not configured'},{status:503});
  }
  const p=schema.safeParse(await req.json().catch(()=>null));
  if(!p.success)return NextResponse.json({error:'Select 2–6 approved slides and acknowledge usage'},{status:400});
  const items=await db.studioVisual.findMany({where:{id:{in:p.data.visualIds},enabled:true}});
  const byId=new Map(items.map(v=>[v.id,v]));
  const visuals=p.data.visualIds.map(id=>byId.get(id));
  if(visuals.some(v=>!v||!isAllowedStudioMediaUrl(v.url))){
    return NextResponse.json({error:'Only enabled, approved Studio visuals can be used'},{status:400});
  }
  const temporary=await mkdtemp(join(tmpdir(),'aria-studio-video-'));
  try{
    const frames:string[]=[];
    for(let i=0;i<visuals.length;i++){
      const url=visuals[i]!.url;
      let bytes:Buffer;
      let extension='.png';
      if(url.startsWith('/')){
        if(url.split('/').includes('..'))throw new Error('Unsafe path');
        const source=join(process.cwd(),'public',url);
        bytes=await readFile(source);
        extension=extname(source).toLowerCase();
      }else{
        const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)});
        if(!response.ok)throw new Error('Asset unreachable');
        const type=response.headers.get('content-type')||'';
        if(!/^image\/(png|jpeg)(?:;|$)/i.test(type))throw new Error('Only PNG or JPEG assets can be rendered');
        extension=type.includes('jpeg')?'.jpg':'.png';
        const data=await response.arrayBuffer();
        bytes=Buffer.from(data);
      }
      if(!['.png','.jpg','.jpeg'].includes(extension)||bytes.length<100||bytes.length>12*1024*1024)throw new Error('Invalid image dimensions or byte size');
      const frame=join(temporary,`scene-${i}${extension}`);
      await writeFile(frame,bytes);
      frames.push(frame);
    }
    const output=join(temporary,'reel.mp4');
    await renderStoryboard(['--output',output,'--duration',String(p.data.secondsPerSlide),...frames]);
    const video=await readFile(output);
    if(video.length<1000||video.length>90*1024*1024)throw new Error('Video output invalid or too large');
    const upload=await put(`studio-videos/reel-${crypto.randomUUID()}.mp4`,video,{
      access:'public',contentType:'video/mp4',addRandomSuffix:false,token:process.env.BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ok:true,videoUrl:upload.url,format:'mp4',note:'Silent slideshow reel, not AI-generated motion footage. Preview the output before publishing.'});
  }catch{
    return NextResponse.json({error:'Reel rendering failed. Verify approved image URLs, ffmpeg installation, Blob storage, and resource limits.'},{status:502});
  }finally{
    await rm(temporary,{recursive:true,force:true}).catch(()=>{});
  }
}
